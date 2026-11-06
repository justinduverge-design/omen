#!/usr/bin/env bash
# PreToolUse guard for Bash. Exit 2 blocks the call and shows the reason to the agent.
# Evidence for each rule: Valor-Core/OUR-WAY.md.
# No set -e: every path must end in an explicit exit 0 or exit 2.

block() { echo "blocked: $1" >&2; exit 2; }

# STANDARDS card G: an unreadable command used to read as empty and pass every check. Fail closed.
if ! cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null); then
  block "guard could not read the command (bad hook input or no python3); fix the hook before running commands"
fi

# grep reads one line at a time, so join lines and drop quotes and backslashes first: "a \<newline> --justin",
# --jus""tin and g''h pr mer'ge would slip past otherwise. Still open: words split across variables (J=--jus; K=tin).
flat=$(tr '\n' ' ' <<<"$cmd" | tr -d '\\"'"'")

# Build 12 retro: #702/#703 merged before CI started. One merge path, and it waits for every check.
# A merge-pr.sh call never contains "gh pr merge", so there is no exception to dodge with a comment.
# Any non-word character may come before gh: a quote (zsh -lc 'gh pr merge 1'), ( $( or a backtick, or a
# path (/opt/homebrew/bin/gh). Tabs count as spaces, and -R/--repo may sit between pr and merge.
s='[[:space:]]+'
if grep -Eq "(^|[^[:alnum:]_.-])gh${s}pr${s}((-R|--repo)(${s}|=)?[^[:space:]]+${s})?merge([^[:alnum:]_-]|$)" <<<"$flat"; then
  block "merge only with scripts/merge-pr.sh <PR> (waits for every check to exist and pass); safe PRs merge after two reviews, risky ones wait for Justin"
fi
# STANDARDS card G: the REST merge endpoint (via gh api, curl or anything else) and the GraphQL
# mutation merge without the words "gh pr merge". Still open: a GraphQL query read from a file.
if grep -Eq 'pulls/[^/[:space:]]+/merge([^a-z]|$)' <<<"$cmd" || { grep -Eq 'gh +api\b' <<<"$cmd" && grep -q 'mergePullRequest' <<<"$cmd"; }; then
  block "no merging through gh api; use scripts/merge-pr.sh <PR>"
fi
# Valor-Core rules/base.md: --justin merges a deploying PR; it is the founder's flag, never an agent's.
# Uses $flat from above.
if grep -q -- '--justin' <<<"$flat" && grep -Eq 'merge|pr\.sh' <<<"$flat"; then
  block "--justin is the founder's flag; agents merge only docs-only PRs (rules/base.md)"
fi
# Map rule 10: never push to main. production is what deploys; only the founder's release-PR merge moves it.
# The branch must stand alone (origin main, HEAD:production, refs/heads/main), so claude/omen-production-notes passes.
if grep -Eq 'git +push\b.*[[:space:]:+](refs/heads/)?(main|production)([[:space:];&|)]|$)' <<<"$flat"; then
  block "no pushes to main or production; open a PR"
fi
# A manual workflow run can deploy any ref it is given (by file name, display name or id), so an agent may
# start only release-pr.yml. The REST dispatches endpoint is refused outright.
runs=$(grep -Eio '(^|[^[:alnum:]_.-])gh[[:space:]]+workflow[[:space:]]+run([[:space:]]|$)' <<<"$flat" | wc -l)
allowed=$(grep -Eo '(^|[^[:alnum:]_.-])gh[[:space:]]+workflow[[:space:]]+run[[:space:]]+release-pr\.yml[[:space:]]*($|[;&|)])' <<<"$flat" | wc -l)
if (( runs > allowed )); then
  block "manual workflow runs can deploy; only 'gh workflow run release-pr.yml' is an agent's (deploys are the founder's)"
fi
if grep -Eiq '/dispatches([^[:alnum:]_]|$)' <<<"$flat"; then
  block "no workflow dispatch through the API; deploys are the founder's"
fi
if grep -Eq -- '--no-verify|--force([^-]|$)|push +-f\b' <<<"$cmd"; then
  block "no --no-verify or force-push; fix the failing check instead"
fi
# Map rules 4 and 5: SQL, deploys and production need the founder's exact approval.
if grep -Eq 'supabase +db +(push|reset)|psql .*(prod|supabase\.co)|docker +compose .*hostinger|ssh .*(omen-prod|kvm1)' <<<"$cmd"; then
  block "production, SQL apply and deploys need the founder's approval for the exact command; propose it instead"
fi
exit 0
