#!/usr/bin/env bash
# The only merge path (Build 12 retro: #702/#703 merged before CI started; a later wait hung on a PR
# with only three checks). Waits for checks to exist, then for every one of them to finish, then
# merges only if all passed. Works for any number of checks.
#
#   scripts/merge-pr.sh <PR> [--squash|--merge]   (default --squash)
set -euo pipefail
pr=${1:?usage: merge-pr.sh <PR> [--squash|--merge]}
mode=${2:---squash}
appear_timeout=${APPEAR_TIMEOUT:-300}   # seconds for the first check to show up
finish_timeout=${FINISH_TIMEOUT:-3600}

state=$(gh pr view "$pr" --json state,isDraft -q '.state + " " + (.isDraft|tostring)')
[[ $state == "OPEN false" ]] || { echo "PR $pr is not an open, ready PR ($state)"; exit 1; }

# 1. Checks must exist. A PR with zero checks is never mergeable here.
waited=0
until [[ $(gh pr checks "$pr" --json name -q 'length' 2>/dev/null || echo 0) -gt 0 ]]; do
  (( waited >= appear_timeout )) && { echo "no checks appeared on #$pr after ${appear_timeout}s"; exit 1; }
  sleep 10; waited=$((waited + 10))
done

# 2. Every check must finish. Re-read the list each pass: workflows can start late.
waited=0
while :; do
  pending=$(gh pr checks "$pr" --json bucket -q '[.[] | select(.bucket=="pending")] | length')
  [[ $pending -eq 0 ]] && break
  (( waited >= finish_timeout )) && { echo "#$pr still has $pending pending checks after ${finish_timeout}s"; exit 1; }
  sleep 20; waited=$((waited + 20))
done
sleep 20   # catch a workflow that starts as another one finishes
[[ $(gh pr checks "$pr" --json bucket -q '[.[] | select(.bucket=="pending")] | length') -eq 0 ]] \
  || exec "$0" "$@"

# 3. All finished checks must pass (skipped is fine).
failed=$(gh pr checks "$pr" --json name,bucket -q '[.[] | select(.bucket=="fail" or .bucket=="cancel")] | map(.name) | join(", ")')
[[ -z $failed ]] || { echo "#$pr has failing checks: $failed"; exit 1; }

total=$(gh pr checks "$pr" --json name -q 'length')
echo "#$pr: all $total checks passed; merging ($mode)"
gh pr merge "$pr" "$mode" --delete-branch
