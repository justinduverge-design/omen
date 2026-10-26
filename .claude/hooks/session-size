#!/usr/bin/env python3
"""UserPromptSubmit: past ~250k tokens of context, tell the agent to finish and hand off to a fresh session.

Evidence: Valor-Core ops/cost-report.py. Omen's costliest weeks were single marathon sessions
(2026-10-21: 1,656 turns, 771M tokens, mostly re-read context).
"""
import json, sys

hook = json.load(sys.stdin)
ctx = 0
try:
    for line in open(hook.get("transcript_path", "")):
        try:
            u = (json.loads(line).get("message") or {}).get("usage")
        except Exception:
            continue
        if u:
            ctx = u.get("input_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
except OSError:
    pass
if ctx > 250_000:
    print(f"Session context is ~{ctx // 1000}k tokens. Finish the current step, write the handoff, "
          "and suggest a fresh session for anything new.")
