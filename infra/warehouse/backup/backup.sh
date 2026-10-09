#!/usr/bin/env bash
set -euo pipefail

echo "REFUSED: backup transport requires the separately approved pinned-host Restic dispatcher; use manifest.js to verify local backup evidence." >&2
exit 64
