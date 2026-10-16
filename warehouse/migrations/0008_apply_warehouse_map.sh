#!/usr/bin/env bash
set -euo pipefail

migration="${WAREHOUSE_MAP_FILE:-/opt/omen-warehouse/migrations/0007_warehouse_map.sql}"
expected_checksum="c078344a7fb3f6f884f584617915b0b3c3c053cf5b8463d668859013e7d4a5cb"
if [[ ! -f "$migration" ]]; then
  echo "warehouse map migration file is missing" >&2
  exit 1
fi

checksum="$(sha256sum "$migration" | awk '{print $1}')"
if [[ "$checksum" != "$expected_checksum" ]]; then
  echo "warehouse map checksum does not match the approved manifest" >&2
  exit 1
fi

stripped="$(mktemp)"
trap 'rm -f -- "$stripped"' EXIT
# NOT idempotent: a second run fails cleanly on "relation already exists" and the single transaction rolls back.
# Bounded waits so the apply fails fast instead of queueing behind (or blocking) a running ingest.
printf "set local lock_timeout = '5s';\nset local statement_timeout = '60s';\n" > "$stripped"
sed -e '/^begin;$/d' -e '/^commit;$/d' "$migration" >> "$stripped"
cat >> "$stripped" <<'SQL'
insert into football.warehouse_schema_migrations (version, name, checksum)
values (4, '0007_warehouse_map', :'migration_checksum')
on conflict (version) do nothing;

select 1 / case when exists (
  select 1 from football.warehouse_schema_migrations
  where version = 4
    and name = '0007_warehouse_map'
    and checksum = :'migration_checksum'
) then 1 else 0 end as migration_receipt_verified;
SQL

psql --no-psqlrc --set ON_ERROR_STOP=1 --single-transaction \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set "migration_checksum=$checksum" --file "$stripped"
