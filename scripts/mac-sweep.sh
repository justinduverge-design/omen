#!/usr/bin/env bash
# Weekly Mac sweep — the build machine's half of "prune as we build".
#
# Clears only what rebuilds itself: broken simulators, idle simulator data, Xcode build caches,
# DeviceSupport (re-fetched on next device connect), Homebrew and pip caches. Booted simulators,
# installed runtimes, Playwright browsers and anything in a repo are never touched.
#
#   scripts/mac-sweep.sh            dry run: what would go, and how big it is
#   scripts/mac-sweep.sh --apply    do it, then print space freed
#
# First run 2026-10-18 took the disk from 5.7 GB to 68 GB free (with the manual runtime,
# Cowork VM and Chrome model removals). Rule: Blueprints/definition-of-done.md → "Removal".

set -euo pipefail
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

DEV="$HOME/Library/Developer"
TARGETS=(
  "$DEV/Xcode/DerivedData"
  "$DEV/Xcode/iOS DeviceSupport"
  "$HOME/Library/Caches/Homebrew"
  "$HOME/Library/Caches/pip"
)

free_gb() { df -g / | awk 'NR==2{print $4}'; }
before=$(free_gb)

echo "Folders (contents cleared):"
for t in "${TARGETS[@]}"; do
  [[ -d "$t" ]] || continue
  printf '  %-8s %s\n' "$(du -sh "$t" 2>/dev/null | cut -f1)" "$t"
  if (( APPLY )); then find "$t" -mindepth 1 -maxdepth 1 -exec rm -rf {} + || echo "  (some files in use, skipped)"; fi
done

unavailable=$(xcrun simctl list devices unavailable 2>/dev/null | grep -cE '\([0-9A-F-]{36}\)' || true)
idle_ids() { xcrun simctl list devices available 2>/dev/null | grep Shutdown | grep -oE '[0-9A-F-]{36}' || true; }
echo "Simulators: $unavailable unavailable to delete; $(idle_ids | grep -c . || true) idle to erase (booted ones kept)"

if (( APPLY )); then
  xcrun simctl delete unavailable || true
  idle_ids | while read -r u; do xcrun simctl erase "$u" || true; done
  command -v brew >/dev/null && brew cleanup -s --prune=all >/dev/null 2>&1 || true
  echo "Freed about $(( $(free_gb) - before )) GB; $(free_gb) GB free."
else
  echo "Dry run. Re-run with --apply to clear."
fi
