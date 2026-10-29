#!/usr/bin/env bash
# Lists every tracked shell script, NUL-separated, for ShellCheck in CI (lint-quality.yml).
# Why: CI used to lint only '*.sh', so 24 extensionless scripts (the ops/ backup, restore and run
# jobs among them) were never checked. STANDARDS card A, rule 8: lint by the #! line, not the name.
# Skips mobile/android/gradlew, the generated Gradle wrapper, and zsh (ShellCheck can't lint it).
# Pass a directory to list a git repo other than this one (the test uses it).
set -euo pipefail

case "${1:-}" in
  -h|--help) echo "usage: scripts/list-shell-scripts.sh [repo-dir]   (prints tracked shell scripts, NUL-separated)"; exit 0 ;;
esac

cd "$(git -C "${1:-.}" rev-parse --show-toplevel)"
git ls-files -z | while IFS= read -r -d '' f; do
  [[ -f $f && $f != mobile/android/gradlew ]] || continue
  if [[ $f == *.sh ]] || head -n1 -- "$f" 2>/dev/null | grep -Eq '^#!.*\b(ba|da)?sh\b'; then
    printf '%s\0' "$f"
  fi
done
