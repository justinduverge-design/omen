#!/usr/bin/env python3
"""Run-budget stop. Replaces "one task per session" (rules/mapping.md, ourway-1).

A run's budget comes from its task card: env VALOR_BUDGET_TURNS / VALOR_BUDGET_TOKENS, or a
`Run budget: 60 turns, 3M tokens` line in the card file named by VALOR_CARD.
- PreToolUse: once either budget is spent, every tool call is blocked (exit 2) with the reason, so the
  agent can only write its report. `claude -p --max-turns` stays as the outer backstop.
- UserPromptSubmit (interactive): past 80% it says so; with no budget set it keeps the old warning at
  ~250k tokens of context (Omen 2026-10-21: 1,656 turns, 771M tokens, mostly re-read context).

Turns are assistant API responses; tokens are input + cache writes + cache reads + output, summed over
them (the same fields ops/cost-report.py reads). Only the main transcript is counted; subagents have
their own (and their own maxTurns). Stdlib only. Unreadable input fails open here, on purpose: the hard
limits live in guard.py and --max-turns, and a broken counter must not stop every tool call.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hookio  # noqa: E402

UNIT = {"": 1, "k": 1_000, "m": 1_000_000}


def parse_budget(text):
    text = re.sub(r"(?<=\d),(?=\d{3})", "", text)   # 1,500,000 tokens
    turns = re.search(r"(\d+)\s*turns?\b", text, re.I)
    toks = re.search(r"(\d+(?:\.\d+)?)\s*([kKmM]?)\s*tokens?\b", text)
    return (int(turns.group(1)) if turns else None,
            int(float(toks.group(1)) * UNIT[toks.group(2).lower()]) if toks else None)


def budget(env=os.environ):
    turns = int(env["VALOR_BUDGET_TURNS"]) if env.get("VALOR_BUDGET_TURNS", "").isdigit() else None
    toks = int(env["VALOR_BUDGET_TOKENS"]) if env.get("VALOR_BUDGET_TOKENS", "").isdigit() else None
    card = env.get("VALOR_CARD")
    if card and (turns is None or toks is None):
        try:
            line = next((l for l in open(card) if re.match(r"\W*run budget\b", l, re.I)), "")
        except OSError:
            line = ""
        ct, ck = parse_budget(line)
        turns, toks = turns if turns is not None else ct, toks if toks is not None else ck
    return turns, toks


def usage(transcript):
    """(turns, total tokens, last context size). Antigravity transcripts carry no token counts, so there
    a turn is one PLANNER_RESPONSE step and tokens stay 0 (its format is not in Google's docs: not verified)."""
    seen, total, ctx = set(), 0, 0
    try:
        with open(transcript) as f:
            for line in f:
                if '"PLANNER_RESPONSE"' in line:
                    seen.add(("agy", len(seen)))
                    continue
                if '"usage"' not in line:
                    continue
                try:
                    msg = json.loads(line).get("message") or {}
                except ValueError:
                    continue
                u = msg.get("usage")
                if msg.get("role") != "assistant" or not u or msg.get("id") in seen:
                    continue
                seen.add(msg.get("id"))
                ctx = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
                total += ctx + u.get("output_tokens", 0)
    except (OSError, TypeError):
        pass
    return len(seen), total, ctx


def main(event, env=os.environ):
    turns_cap, tok_cap = budget(env)
    turns, total, ctx = usage(event.get("transcript_path", ""))
    spent = [f"{turns} of {turns_cap} turns"] if turns_cap and turns >= turns_cap else []
    spent += [f"{total:,} of {tok_cap:,} tokens"] if tok_cap and total >= tok_cap else []
    if event.get("hook_event_name") == "PreToolUse":
        if spent:
            hookio.deny("run budget spent (" + "; ".join(spent) + "). Start nothing new. End with the report: "
                        "what is done, what is not, the next step, and `STATUS: budget`.", event.get("runtime") == "antigravity")
        return 0
    if spent:
        print("Run budget spent (" + "; ".join(spent) + "). Write the report and stop.")
    elif (turns_cap and turns >= 0.8 * turns_cap) or (tok_cap and total >= 0.8 * tok_cap):
        print(f"Run budget: {turns}/{turns_cap or '-'} turns, {total:,}/{tok_cap or '-'} tokens. Plan to finish inside it.")
    elif not (turns_cap or tok_cap) and ctx > 250_000:
        print(f"Context is ~{ctx // 1000}k tokens. Finish the current step and write the handoff; "
              "give the next job its own card and budget.")
    return 0


if __name__ == "__main__":
    try:
        ev = hookio.read_event()
    except Exception:
        sys.exit(0)
    sys.exit(main(ev))
