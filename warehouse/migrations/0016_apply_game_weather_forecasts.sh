#!/usr/bin/env bash
set -euo pipefail

migration="${WAREHOUSE_WEATHER_FILE:-/opt/omen-warehouse/migrations/0015_game_weather_forecasts.sql}"
expected_checksum="7fc07093fcdba2759c3df5aa827913eabc52f718108b39c591df399f475bb75e"
if [[ ! -f "$migration" ]]; then
  echo "warehouse weather forecasts migration file is missing" >&2
  exit 1
fi

checksum="$(sha256sum "$migration" | awk '{print $1}')"
if [[ "$checksum" != "$expected_checksum" ]]; then
  echo "warehouse weather forecasts checksum does not match the approved manifest" >&2
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
values (8, '0015_game_weather_forecasts', :'migration_checksum')
on conflict (version) do nothing;

select 1 / case when exists (
  select 1 from football.warehouse_schema_migrations
  where version = 8
    and name = '0015_game_weather_forecasts'
    and checksum = :'migration_checksum'
) then 1 else 0 end as migration_receipt_verified;
SQL

psql --no-psqlrc --set ON_ERROR_STOP=1 --single-transaction \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set "migration_checksum=$checksum" --file "$stripped"
