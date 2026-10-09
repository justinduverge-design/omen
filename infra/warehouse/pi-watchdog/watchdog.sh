#!/usr/bin/env bash
set -euo pipefail

echo "REFUSED: remote witness collection requires the separately approved pinned forced-command dispatcher; use status.js to evaluate an already-collected status artifact." >&2
exit 64
