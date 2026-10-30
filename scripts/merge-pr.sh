#!/usr/bin/env bash
# The only merge path (Build 12 retro: #702/#703 merged before CI started; a later wait hung on a PR
# with only three checks). Waits for checks to exist, then for every one of them to finish, then
# merges only if all passed. Works for any number of checks.
#
#   scripts/merge-pr.sh <PR> [--squash|--merge]   (default --squash)
#
# <PR> is a bare number (not #N, a URL or a branch). Exit 0 merged, 1 refused (not open/ready, no
# checks, checks pending too long or failing), 2 usage error; a failing gh or git call exits with its
# own code. Refusals go to stderr (STANDARDS card E, rule 7).
set -euo pipefail
usage() { echo "usage: scripts/merge-pr.sh <PR> [--squash|--merge]   (default --squash)"; }
refuse() { echo "merge-pr: $*" >&2; exit 1; }
case "${1:-}" in
  -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  ''|*[!0-9]*) usage >&2; exit 2 ;;
esac
pr=$1
mode=${2:---squash}
case "$mode" in --squash|--merge) ;; *) usage >&2; exit 2 ;; esac
appear_timeout=${APPEAR_TIMEOUT:-300}   # seconds for the first check to show up
finish_timeout=${FINISH_TIMEOUT:-3600}

state=$(gh pr view "$pr" --json state,isDraft -q '.state + " " + (.isDraft|tostring)')
[[ $state == "OPEN false" ]] || refuse "PR $pr is not an open, ready PR ($state)"

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
  (( waited >= appear_timeout )) && refuse "no checks appeared on #$pr after ${appear_timeout}s"
  sleep 10; waited=$((waited + 10))
done

# 2. Every check must finish. Re-read the list each pass: workflows can start late.
waited=0
while :; do
  pending=$(gh pr checks "$pr" --json bucket -q '[.[] | select(.bucket=="pending")] | length')
  [[ $pending -eq 0 ]] && break
  (( waited >= finish_timeout )) && refuse "#$pr still has $pending pending checks after ${finish_timeout}s"
  sleep 20; waited=$((waited + 20))
done
sleep 20   # catch a workflow that starts as another one finishes
[[ $(gh pr checks "$pr" --json bucket -q '[.[] | select(.bucket=="pending")] | length') -eq 0 ]] \
  || exec "$0" "$@"

# 3. All finished checks must pass (skipped is fine).
failed=$(gh pr checks "$pr" --json name,bucket -q '[.[] | select(.bucket=="fail" or .bucket=="cancel")] | map(.name) | join(", ")')
[[ -z $failed ]] || refuse "#$pr has failing checks: $failed"

total=$(gh pr checks "$pr" --json name -q 'length')
echo "#$pr: all $total checks passed; merging ($mode)"
head=$(gh pr view "$pr" --json headRefOid -q .headRefOid)   # merge only the commit whose checks passed
gh pr merge "$pr" "$mode" --delete-branch --match-head-commit "$head"
