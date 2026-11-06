#!/usr/bin/env bash
# The only merge path (Build 12 retro: #702/#703 merged before CI started; a later wait hung on a PR
# with only three checks). Waits for checks to exist, then for every one of them to finish, then
# merges only if all passed. Works for any number of checks.
#
#   scripts/merge-pr.sh <PR> [--squash|--merge] [--justin]   (default --squash)
#
# Class (Valor-Core rules/base.md, rules/guards/classes.py): merging to main deploys nothing; Justin
# merging the release PR into production does (deploy.yml, release-pr.yml). Without --justin only PRs into
# main merge, and only docs (*.md, Direction/, Blueprints/, References/), tests-only changes, or a
# Dependabot/Renovate patch or minor bump of package manifests and lockfiles; never the agent rule files.
# --justin is the founder's; the guard hook refuses it to agents.
#
# <PR> is a bare number (not #N, a URL or a branch). Exit 0 merged, 1 refused (not open/ready, no
# checks, checks pending too long or failing), 2 usage error; a failing gh or git call exits with its
# own code. Refusals go to stderr (STANDARDS card E, rule 7).
set -euo pipefail
usage() { echo "usage: scripts/merge-pr.sh <PR> [--squash|--merge] [--justin]   (default --squash)"; }
refuse() { echo "merge-pr: $*" >&2; exit 1; }
# merge_class <author> <title>: prints the regex of paths an agent may merge for this PR, or refuses.
# A dependency bot gets manifests and lockfiles, and only for patch/minor bumps (0.x minors are major);
# anyone else gets docs and tests. Same rule as Valor-Core rules/guards/classes.py.
merge_class() {
  case $1 in
    app/dependabot|dependabot|dependabot\[bot\]|app/renovate|renovate|renovate\[bot\]) ;;
    *) echo '\.md$|^(Direction|Blueprints|References)/|(^|/)(tests?|__tests__)/|\.(test|spec)\.[a-z]+$|(^|/)test_[^/]*\.py$|_test\.py$'; return 0 ;;
  esac
  local bumps from to fa fb ta tb _
  bumps=$(grep -oiE 'from v?[0-9]+\.[0-9]+[^ ]* to v?[0-9]+\.[0-9]+' <<<"$2" || true)
  [[ -n $bumps ]] || refuse "dependency PR whose title shows no from/to version; it waits for Justin"
  # Every "from" must be a pair read above, so "a from 1.0.0 to 1.1.0 and b from 1 to 2" can't pass on the first.
  [[ $(grep -oiE '(^|[[:space:]])from[[:space:]]' <<<"$2" | wc -l) -eq $(wc -l <<<"$bumps") ]] \
    || refuse "dependency PR title with a version pair it can't read; it waits for Justin"
  while read -r _ from _ to; do
    IFS=. read -r fa fb _ <<<"${from#[vV]}"; IFS=. read -r ta tb _ <<<"${to#[vV]}"
    [[ $fa == "$ta" && ( $fa != 0 || $fb == "$tb" ) ]] || refuse "major bump ($from -> $to; 0.x minors count as major); it waits for Justin"
  done <<<"$bumps"
  echo '(^|/)(package(-lock)?\.json|Cargo\.(toml|lock)|pyproject\.toml|uv\.lock)$'
}
# Always Justin's, whatever class matched (Valor-Core classes.py JUSTIN and RISKY): agent rules, CI and
# deploy config, migrations and SQL, the guard checks, and auth, payments or secrets in a code path.
RULES='(^|/)(agents|claude|gemini)(\.local)?\.md$|^\.(claude|codex|agents|github)/|(^|/)(Dockerfile|docker-compose)[^/]*$|^(deploy|infra|sql|supabase)/|(^|/)migrations/|^scripts/(checks/|merge-pr\.sh$)'
RISKY='(^|[/_.-])(o?auth|login|sign-?in|sign-?up|passwords?|billing|payments?|stripe|secrets?|infisical|credentials?|tokens?|jwt|api-?keys?|private-?keys?)([/_.-]|$)'
# unsafe_files <ok-regex>: reads changed paths on stdin and prints each one an agent may not merge.
unsafe_files() {
  local files; files=$(cat)
  { grep -vE "$1" <<<"$files"; grep -iE "$RULES" <<<"$files"; grep -vE '\.md$' <<<"$files" | grep -iE "$RISKY"; } | sort -u || true
}
[[ ${MERGE_PR_SOURCE_ONLY:-} == 1 ]] && return 0 2>/dev/null
case "${1:-}" in
  -h|--help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  ''|*[!0-9]*) usage >&2; exit 2 ;;
esac
pr=$1; shift
mode=--squash; justin=0
for arg in "$@"; do
  case "$arg" in --squash|--merge) mode=$arg ;; --justin) justin=1 ;; *) usage >&2; exit 2 ;; esac
done
appear_timeout=${APPEAR_TIMEOUT:-300}   # seconds for the first check to show up
finish_timeout=${FINISH_TIMEOUT:-3600}

state=$(gh pr view "$pr" --json state,isDraft -q '.state + " " + (.isDraft|tostring)')
[[ $state == "OPEN false" ]] || refuse "PR $pr is not an open, ready PR ($state)"

if [[ $justin -ne 1 ]]; then
  read -r base author < <(gh pr view "$pr" --json baseRefName,author -q '.baseRefName + " " + .author.login')
  [[ $base == main ]] || refuse "#$pr goes into $base, not main; only Justin merges it (the release PR deploys production)"
  read -r listed total < <(gh pr view "$pr" --json files,changedFiles -q '"\(.files|length) \(.changedFiles)"')
  [[ $listed == "$total" ]] || refuse "gh listed $listed of $total files on #$pr; it waits for Justin"
  files=$(gh pr view "$pr" --json files -q '.files[].path')
  # A bot's versions come from its own commit, not the PR title (anyone with write access can edit a title).
  title=$(gh pr view "$pr" --json title -q .title)
  if [[ $author == *dependabot* || $author == *renovate* ]]; then
    title=$(gh pr view "$pr" --json commits -q '.commits[-1].messageHeadline')
  fi
  ok=$(merge_class "$author" "$title") || exit 1
  unsafe=$(unsafe_files "$ok" <<<"$files" | head -5 | tr '\n' ' ')
  [[ -z $unsafe ]] || refuse "#$pr changes behaviour, deploy config or rules ($unsafe); it waits for Justin (label needs-justin)"
fi

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
