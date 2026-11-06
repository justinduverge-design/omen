#!/usr/bin/env python3
"""Stop hook for unattended runs: a text-only end of turn is a report, not proof the task is done.

Anthropic, prompting Claude Opus 5.5: some updates "end the turn with text rather than a tool call", and
"Treat a text-only end of turn as a report rather than as proof the task is done."
(platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5)

Active only when VALOR_RUN=1 (ops/maintain.sh sets it today; interactive sessions are untouched). The run may stop
only when its last message carries a status line:
    STATUS: done      (the card's done-when is met; the evidence is in the message)
    STATUS: blocked   (say why and what would unblock it)
    STATUS: budget    (the run budget is spent; say what is left)
Otherwise the stop is blocked once with that instruction. If the stop comes back with `stop_hook_active`
set (this hook already nudged), it is allowed, so the gate never loops; Claude Code also caps repeated
blocks (code.claude.com/docs/en/best-practices).
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hookio  # noqa: E402

STATUS = re.compile(r"^\W*STATUS:\s*(done|blocked|budget)\b", re.I | re.M)


def last_text(event):
    msg = event.get("last_assistant_message")
    if isinstance(msg, str):
        return msg
    if isinstance(msg, dict):
        content = msg.get("content") or []
        return "\n".join(c.get("text", "") for c in content if isinstance(c, dict)) if isinstance(content, list) else str(content)
    text = ""
    try:
        for line in open(event.get("transcript_path", "")):
            try:
                m = json.loads(line).get("message") or {}
            except ValueError:
                continue
            obj = json.loads(line)
            if obj.get("type") == "PLANNER_RESPONSE" and isinstance(obj.get("content"), str):   # Antigravity
                text = obj["content"] or text
                continue
            if m.get("role") == "assistant" and isinstance(m.get("content"), list):
                t = "\n".join(c.get("text", "") for c in m["content"] if c.get("type") == "text")
                text = t or text
    except (OSError, TypeError):
        pass
    return text


def decide(event, env=os.environ):
    if env.get("VALOR_RUN") != "1" or event.get("stop_hook_active") is True or STATUS.search(last_text(event)):
        return None
    return {"decision": "block", "reason": (
        "This run is unattended, so ending the turn with text is a report, not done. If the card's "
        "done-when is not met and budget remains, take the next step now. Otherwise end with one line: "
        "`STATUS: done` (with the check's evidence), `STATUS: blocked: <why>`, or `STATUS: budget`.")}


if __name__ == "__main__":
    try:
        ev = hookio.read_event()
        out = decide(ev)
    except Exception:
        ev, out = {}, None
    if out:
        hookio.keep_going(out["reason"], ev.get("runtime") == "antigravity")
    sys.exit(0)
