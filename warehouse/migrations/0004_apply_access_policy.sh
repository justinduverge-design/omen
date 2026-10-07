#!/usr/bin/env bash
set -euo pipefail

migration="${WAREHOUSE_ACCESS_POLICY_FILE:-/opt/omen-warehouse/migrations/0003_warehouse_access_policy.sql}"
expected_checksum="0b0577edd8995fad967409a37012390d77447cf55595fd4a310270b56f7a169d"
if [[ ! -f "$migration" ]]; then
  echo "warehouse access-policy migration file is missing" >&2
  exit 1
fi

checksum="$(sha256sum "$migration" | awk '{print $1}')"
if [[ "$checksum" != "$expected_checksum" ]]; then
  echo "warehouse access-policy checksum does not match the approved manifest" >&2
  exit 1
fi

stripped="$(mktemp)"
trap 'rm -f -- "$stripped"' EXIT
sed -e '/^begin;$/d' -e '/^commit;$/d' "$migration" > "$stripped"
cat >> "$stripped" <<'SQL'
insert into football.warehouse_schema_migrations (version, name, checksum)
values (2, '0003_warehouse_access_policy', :'migration_checksum')
on conflict (version) do nothing;

select 1 / case when exists (
  select 1 from football.warehouse_schema_migrations
  where version = 2
    and name = '0003_warehouse_access_policy'
    and checksum = :'migration_checksum'
) then 1 else 0 end as migration_receipt_verified;
SQL

psql --no-psqlrc --set ON_ERROR_STOP=1 --single-transaction \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set "migration_checksum=$checksum" --file "$stripped"
