#!/bin/bash
# Keep 14 days of shipped logs on Command Center (daily directories under logs/). Runs from omen-vector-prune.timer.
set -euo pipefail
root=/opt/omen-vector/logs
[ -d "$root" ] || exit 0
find "$root" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended -regex '.*/[0-9]{4}-[0-9]{2}-[0-9]{2}' -mtime +14 -print -exec rm -rf -- {} +
