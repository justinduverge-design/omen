#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$repo_root/warehouse/migrations/0001_football_warehouse.sql"
receipt="$repo_root/warehouse/migrations/0002_record_migration.sh"
image="postgres:17.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3"
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
    --env POSTGRES_DB=omen_football \
    --volume "$migration:/opt/omen-warehouse/migrations/0001_football_warehouse.sql:ro" \
    --volume "$receipt:/docker-entrypoint-initdb.d/0001_apply_warehouse.sh:ro" \
    "$image" >/dev/null

  for _ in $(seq 1 60); do
    if docker exec "$container" pg_isready --username postgres --dbname postgres >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  docker exec "$container" pg_isready --username postgres --dbname postgres >/dev/null
  docker exec --interactive "$container" psql --username postgres --dbname omen_football --set ON_ERROR_STOP=1 < "$verification"
  docker exec "$container" sh -c "test \"\$(psql -U postgres -d omen_football -Atc 'select checksum from football.warehouse_schema_migrations where version=1')\" = \"\$(sha256sum /opt/omen-warehouse/migrations/0001_football_warehouse.sql | awk '{print \$1}')\""
elif command -v pg_config >/dev/null 2>&1 \
  && [[ -x "$(pg_config --bindir)/initdb" ]] \
  && [[ -x "$(pg_config --bindir)/pg_ctl" ]]; then
  temp_root="$(mktemp -d "${TMPDIR:-/tmp}/omen-warehouse-schema.XXXXXX")"
  mkdir -p "$temp_root/socket"
  "$(pg_config --bindir)/initdb" --pgdata "$temp_root/data" --auth=trust --username=postgres >/dev/null
  "$(pg_config --bindir)/pg_ctl" --pgdata "$temp_root/data" \
    --options="-F -k $temp_root/socket -h ''" --wait start >/dev/null
  local_server_started=true

  PGHOST="$temp_root/socket" POSTGRES_USER=postgres POSTGRES_DB=postgres \
    WAREHOUSE_MIGRATION_FILE="$migration" "$receipt"
  psql --host "$temp_root/socket" --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$verification"
else
  echo 'SKIP: Docker or local PostgreSQL 17 server binaries are required' >&2
  exit 2
fi
