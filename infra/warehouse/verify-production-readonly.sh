#!/usr/bin/env bash
set -euo pipefail

# This command has no network path and no credential input. It executes the
# catalog verifier through the fixed, private PostgreSQL container as the local
# bootstrap administrator. The SQL starts an explicit READ ONLY transaction.

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
verification="$repo_root/warehouse/verify/production_readonly.sql"
container="omen_football_warehouse"

[[ -f "$verification" && ! -L "$verification" ]] || {
  echo "production warehouse verifier is missing or unsafe" >&2
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  echo "production warehouse verification requires Docker" >&2
  exit 1
}
docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null | grep -qx true || {
  echo "private warehouse container is not running" >&2
  exit 1
}

docker exec --interactive "$container" \
  psql --no-psqlrc --set ON_ERROR_STOP=1 --quiet \
    --username postgres --dbname omen_football < "$verification"
