#!/usr/bin/env bash
set -euo pipefail

echo "REFUSED: legacy warehouse backfill is retired; use the receipt-backed transactional writer." >&2
exit 64
