#!/usr/bin/env bash
set -euo pipefail

migration="${WAREHOUSE_WEEKLY_PROJECTIONS_FILE:-/opt/omen-warehouse/migrations/0005_weekly_projections.sql}"
expected_checksum="f0219156d480f6e4607e19e81a1dee2b4810c29df5c37c1b739142aa832b55fb"
if [[ ! -f "$migration" ]]; then
  echo "warehouse weekly-projections migration file is missing" >&2
  exit 1
fi

checksum="$(sha256sum "$migration" | awk '{print $1}')"
if [[ "$checksum" != "$expected_checksum" ]]; then
  echo "warehouse weekly-projections checksum does not match the approved manifest" >&2
  exit 1
fi

stripped="$(mktemp)"
trap 'rm -f -- "$stripped"' EXIT
sed -e '/^begin;$/d' -e '/^commit;$/d' "$migration" > "$stripped"
cat >> "$stripped" <<'SQL'
insert into football.warehouse_schema_migrations (version, name, checksum)
values (3, '0005_weekly_projections', :'migration_checksum')
on conflict (version) do nothing;

select 1 / case when exists (
  select 1 from football.warehouse_schema_migrations
  where version = 3
    and name = '0005_weekly_projections'
    and checksum = :'migration_checksum'
) then 1 else 0 end as migration_receipt_verified;
SQL

psql --no-psqlrc --set ON_ERROR_STOP=1 --single-transaction \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set "migration_checksum=$checksum" --file "$stripped"
