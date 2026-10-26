#!/usr/bin/env bash
# PreToolUse guard for Bash. Exit 2 blocks the call and shows the reason to the agent.
# Evidence for each rule: Valor-Core/OUR-WAY.md.
cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')

block() { echo "blocked: $1" >&2; exit 2; }

# Build 12 retro: #702/#703 merged before CI started. One merge path, and it waits for every check.
if grep -Eq '(^|[;&| ])gh +pr +merge' <<<"$cmd" && ! grep -q 'scripts/merge-pr.sh' <<<"$cmd"; then
  block "merge only with scripts/merge-pr.sh <PR> (waits for every check to exist and pass), and only when the founder asked"
fi
# Map rule 10: never push to main.
if grep -Eq 'git +push\b.*\b(main|HEAD:main)\b' <<<"$cmd"; then
  block "no pushes to main; open a PR"
fi
if grep -Eq -- '--no-verify|--force([^-]|$)|push +-f\b' <<<"$cmd"; then
  block "no --no-verify or force-push; fix the failing check instead"
fi
# Map rules 4 and 5: SQL, deploys and production need the founder's exact approval.
if grep -Eq 'supabase +db +(push|reset)|psql .*(prod|supabase\.co)|docker +compose .*hostinger|ssh .*(omen-prod|kvm1)' <<<"$cmd"; then
  block "production, SQL apply and deploys need the founder's approval for the exact command; propose it instead"
fi
exit 0
