#!/usr/bin/env bash
# PreToolUse guard for Bash. Exit 2 blocks the call and shows the reason to the agent.
# Evidence for each rule: Valor-Core/OUR-WAY.md.
# No set -e: every path must end in an explicit exit 0 or exit 2.

block() { echo "blocked: $1" >&2; exit 2; }

# STANDARDS card G: an unreadable command used to read as empty and pass every check. Fail closed.
if ! cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null); then
  block "guard could not read the command (bad hook input or no python3); fix the hook before running commands"
fi

# Build 12 retro: #702/#703 merged before CI started. One merge path, and it waits for every check.
# A merge-pr.sh call never contains "gh pr merge", so there is no exception to dodge with a comment.
if grep -Eq '(^|[;&| ])gh +pr +merge' <<<"$cmd"; then
  block "merge only with scripts/merge-pr.sh <PR> (waits for every check to exist and pass); safe PRs merge after two reviews, risky ones wait for Justin"
fi
# STANDARDS card G: the REST merge endpoint (via gh api, curl or anything else) and the GraphQL
# mutation merge without the words "gh pr merge". Still open: a GraphQL query read from a file.
if grep -Eq 'pulls/[^/[:space:]]+/merge([^a-z]|$)' <<<"$cmd" || { grep -Eq 'gh +api\b' <<<"$cmd" && grep -q 'mergePullRequest' <<<"$cmd"; }; then
  block "no merging through gh api; use scripts/merge-pr.sh <PR>"
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
