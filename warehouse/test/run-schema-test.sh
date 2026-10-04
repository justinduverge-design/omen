#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$repo_root/warehouse/migrations/0001_football_warehouse.sql"
verification="$repo_root/warehouse/test/verify_schema.sql"
container="omen-warehouse-schema-test-$$"
temp_root=''
local_server_started=false

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  if [[ "$local_server_started" == true ]]; then
    "$(pg_config --bindir)/pg_ctl" --pgdata "$temp_root/data" --mode fast stop >/dev/null 2>&1 || true
  fi
  if [[ -n "$temp_root" && -d "$temp_root" ]]; then
    rm -rf -- "$temp_root"
  fi
}
trap cleanup EXIT

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker run --detach --rm --name "$container" \
    --tmpfs /var/lib/postgresql/data \
    --env POSTGRES_PASSWORD=local-schema-test-only \
    postgres:17-alpine >/dev/null

  for _ in $(seq 1 60); do
    if docker exec "$container" pg_isready --username postgres --dbname postgres >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  docker exec "$container" pg_isready --username postgres --dbname postgres >/dev/null
  docker exec --interactive "$container" psql --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$migration"
  docker exec --interactive "$container" psql --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$verification"
elif command -v pg_config >/dev/null 2>&1 \
  && [[ -x "$(pg_config --bindir)/initdb" ]] \
  && [[ -x "$(pg_config --bindir)/pg_ctl" ]]; then
  temp_root="$(mktemp -d "${TMPDIR:-/tmp}/omen-warehouse-schema.XXXXXX")"
  mkdir -p "$temp_root/socket"
  "$(pg_config --bindir)/initdb" --pgdata "$temp_root/data" --auth=trust --username=postgres >/dev/null
  "$(pg_config --bindir)/pg_ctl" --pgdata "$temp_root/data" \
    --options="-F -k $temp_root/socket -h ''" --wait start >/dev/null
  local_server_started=true

  psql --host "$temp_root/socket" --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$migration"
  psql --host "$temp_root/socket" --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$verification"
else
  echo 'SKIP: Docker or local PostgreSQL 17 server binaries are required' >&2
  exit 2
fi
