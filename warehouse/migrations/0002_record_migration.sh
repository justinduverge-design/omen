#!/usr/bin/env bash
set -euo pipefail

migration="${WAREHOUSE_MIGRATION_FILE:-/opt/omen-warehouse/migrations/0001_football_warehouse.sql}"
expected_checksum="27fb1e8dd4a5167ffc27660f165f326e7c9a6e3b4aaf2e04ec16ec4e55448f1c"
if [[ ! -f "$migration" ]]; then
  echo "warehouse migration file is missing" >&2
  exit 1
fi

checksum="$(sha256sum "$migration" | awk '{print $1}')"
if [[ "$checksum" != "$expected_checksum" ]]; then
  echo "warehouse migration checksum does not match the approved manifest" >&2
  exit 1
fi

stripped="$(mktemp)"
trap 'rm -f -- "$stripped"' EXIT
sed -e '/^begin;$/d' -e '/^commit;$/d' "$migration" > "$stripped"
cat >> "$stripped" <<'SQL'
insert into football.warehouse_schema_migrations (version, name, checksum)
values (1, '0001_football_warehouse', :'migration_checksum')
on conflict (version) do nothing;

select 1 / case when exists (
  select 1 from football.warehouse_schema_migrations
  where version = 1
    and name = '0001_football_warehouse'
    and checksum = :'migration_checksum'
) then 1 else 0 end as migration_receipt_verified;
SQL

psql --set ON_ERROR_STOP=1 --single-transaction --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set "migration_checksum=$checksum" --file "$stripped"
