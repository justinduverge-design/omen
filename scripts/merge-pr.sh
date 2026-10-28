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

# 0. A build-package row may name the PR's branch instead of its number (an agent's first push can't
#    know the number; Agent guards accepts either). Swap in #<PR> on the branch now, then let the
#    checks below re-run on that commit.
#    Fork PRs are skipped: their branch isn't on origin, so they must carry #<PR> themselves.
read -r branch cross < <(gh pr view "$pr" --json headRefName,isCrossRepository -q '.headRefName + " " + (.isCrossRepository|tostring)')
if [[ $cross == false ]]; then
git fetch -q origin "$branch"
tmp=$(mktemp -d)
trap 'git worktree remove --force "$tmp" 2>/dev/null || true' EXIT
git worktree add -q --detach "$tmp" FETCH_HEAD
pkg=$(cd "$tmp" && grep -l '^\*\*Open' Direction/release/builds/build-*.md | sort -V | tail -1 || true)
if [[ -n $pkg ]] && ! grep -q "#$pr\b" "$tmp/$pkg" && grep -qF "\`$branch\`" "$tmp/$pkg"; then
  B="$branch" N="#$pr" perl -pi -e 's/\Q`$ENV{B}`\E/$ENV{N}/g' "$tmp/$pkg"
  git -C "$tmp" commit -q -am "Build package: #$pr in place of its branch name"
  git -C "$tmp" push -q origin "HEAD:refs/heads/$branch"
  echo "#$pr filled in on $pkg; waiting for checks on the new commit"
  sleep 15
fi
fi

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
head=$(gh pr view "$pr" --json headRefOid -q .headRefOid)   # merge only the commit whose checks passed
gh pr merge "$pr" "$mode" --delete-branch --match-head-commit "$head"
