#!/usr/bin/env python3
"""Build a stable alert identity without discarding the current display text.

The dispatcher persists the output of this program, not the human-facing
message.  In particular, elapsed age must not turn one stale condition into a
new incident every hour.
"""
import re
import sys

STALE = re.compile(r"^(Omen football status payload is STALE): .*? \(generated .*\)$")


def canonical_line(line: str) -> str:
    line = line.rstrip("\r\n")
    match = STALE.match(line)
    return match.group(1) if match else line


def main() -> int:
    lines = [line for line in sys.stdin.read().splitlines() if line.strip()]
    print("\n".join(sorted(canonical_line(line) for line in lines)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
