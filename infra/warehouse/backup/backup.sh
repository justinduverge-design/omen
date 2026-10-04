#!/usr/bin/env bash
set -euo pipefail

echo "REFUSED: legacy gzip/scp backup is retired; use the encrypted Restic recovery workflow." >&2
exit 64
