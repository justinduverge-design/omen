#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$repo_root/warehouse/migrations/0001_football_warehouse.sql"
integration="$repo_root/warehouse/test/schedule-to-player-week-integration.js"
fixture="$repo_root/warehouse/test/fixtures/player-week-2026.csv"
temp_root="$(mktemp -d "${TMPDIR:-/tmp}/omen-schedule-chain.XXXXXX")"
postgres_bin=''
server_started=false

cleanup() {
  if [[ "$server_started" == true ]]; then
    "$postgres_bin/pg_ctl" --pgdata "$temp_root/data" --mode fast stop >/dev/null 2>&1 || true
  fi
  rm -rf -- "$temp_root"
}
trap cleanup EXIT

if ! command -v pg_config >/dev/null 2>&1; then
  echo 'PostgreSQL 17 server binaries are required' >&2
  exit 2
fi
postgres_bin="$(pg_config --bindir)"
if [[ "$(pg_config --version)" != PostgreSQL\ 17.* ]]; then
  echo "PostgreSQL 17 is required; found $(pg_config --version)" >&2
  exit 2
fi

mkdir -p "$temp_root/socket"
"$postgres_bin/initdb" --pgdata "$temp_root/data" --auth=trust --username=postgres >/dev/null
"$postgres_bin/pg_ctl" --pgdata "$temp_root/data" \
  --options="-F -k $temp_root/socket -h ''" --wait start >/dev/null
server_started=true

psql --host "$temp_root/socket" --username postgres --dbname postgres --set ON_ERROR_STOP=1 \
  < "$migration" >/dev/null
node "$integration" "$temp_root/socket" "$fixture"
