#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$repo_root/warehouse/migrations/0001_football_warehouse.sql"
receipt="$repo_root/warehouse/migrations/0002_record_migration.sh"
access_policy="$repo_root/warehouse/migrations/0003_warehouse_access_policy.sql"
apply_access="$repo_root/warehouse/migrations/0004_apply_access_policy.sh"
provision="$repo_root/infra/warehouse/provision-login-roles.sh"
verification="$repo_root/warehouse/test/verify_access_policy.sql"
production_verification="$repo_root/warehouse/verify/production_readonly.sql"
temp_root="$(mktemp -d "${TMPDIR:-/tmp}/omen-warehouse-access.XXXXXX")"
server_started=false

cleanup() {
  if [[ "$server_started" == true ]]; then
    "$(pg_config --bindir)/pg_ctl" --pgdata "$temp_root/data" --mode fast stop >/dev/null 2>&1 || true
  fi
  rm -rf -- "$temp_root"
}
trap cleanup EXIT

if ! command -v pg_config >/dev/null 2>&1 \
   || [[ "$(pg_config --version)" != PostgreSQL\ 17.11* ]] \
   || [[ ! -x "$(pg_config --bindir)/initdb" ]] \
   || [[ ! -x "$(pg_config --bindir)/pg_ctl" ]]; then
  echo "PostgreSQL 17.11 server binaries are required" >&2
  exit 2
fi

mkdir -p "$temp_root/socket" "$temp_root/secrets"
"$(pg_config --bindir)/initdb" --pgdata "$temp_root/data" --auth-local=trust --auth-host=reject --username=postgres >/dev/null
"$(pg_config --bindir)/pg_ctl" --pgdata "$temp_root/data" \
  --options="-F -k $temp_root/socket -h ''" --wait start >/dev/null
server_started=true
export PGHOST="$temp_root/socket"
export PGPORT=5432

createdb --username postgres omen_football
POSTGRES_USER=postgres POSTGRES_DB=omen_football WAREHOUSE_MIGRATION_FILE="$migration" "$receipt" >/dev/null
POSTGRES_USER=postgres POSTGRES_DB=omen_football WAREHOUSE_ACCESS_POLICY_FILE="$access_policy" "$apply_access" >/dev/null

printf '%s\n' \
  'local all postgres trust' \
  'local all all scram-sha-256' > "$temp_root/data/pg_hba.conf"
"$(pg_config --bindir)/pg_ctl" --pgdata "$temp_root/data" reload >/dev/null

provision_env=(
  OMEN_WAREHOUSE_LOGIN_SECRET_DIR="$temp_root/secrets"
  OMEN_WAREHOUSE_PROVISION_TEST_MODE=disposable-pg17
  OMEN_WAREHOUSE_HOST=warehouse.internal
  OMEN_WAREHOUSE_PROBE_HOST="$temp_root/socket"
)
if ! env "${provision_env[@]}" "$provision" >"$temp_root/provision.out" 2>"$temp_root/provision.err"; then
  echo "initial warehouse LOGIN provisioning failed" >&2
  sed -n '1,5p' "$temp_root/provision.err" >&2
  exit 1
fi
if ! env "${provision_env[@]}" "$provision" >"$temp_root/provision-rerun.out" 2>"$temp_root/provision-rerun.err"; then
  echo "idempotent warehouse LOGIN provisioning failed" >&2
  sed -n '1,5p' "$temp_root/provision-rerun.err" >&2
  exit 1
fi

extract_password() {
  local role="$1" file="$2" value
  value="$(<"$file")"
  if [[ "$value" == postgresql://* ]]; then
    value="${value#postgresql://${role}:}"
    printf '%s' "${value%%@*}"
  else
    printf '%s' "${value##*:}"
  fi
}

role_command() {
  local role="$1" secret_file="$2" sql="$3" output="$4" password passfile status
  password="$(extract_password "$role" "$secret_file")"
  [[ "$password" =~ ^[0-9a-f]{64}$ ]] || { echo "invalid test credential material" >&2; return 1; }
  passfile="$(mktemp "$temp_root/.pgpass.XXXXXX")"
  printf '*:*:omen_football:%s:%s\n' "$role" "$password" > "$passfile"
  chmod 0600 "$passfile"
  set +e
  PGPASSFILE="$passfile" psql --no-psqlrc --set ON_ERROR_STOP=1 --quiet \
    --host "$temp_root/socket" --username "$role" --dbname omen_football \
    --command "$sql" >"$output" 2>&1
  status=$?
  set -e
  if grep -Fq "$password" "$output"; then
    rm -f -- "$passfile"
    echo "credential leaked into command output" >&2
    return 1
  fi
  rm -f -- "$passfile"
  return "$status"
}

psql --username postgres --dbname omen_football --set ON_ERROR_STOP=1 --quiet <<'SQL'
create table football.access_policy_probe (
  id bigint generated always as identity primary key,
  note text not null
);
SQL

# A credential-valid LOGIN with no capability membership cannot CONNECT through
# PUBLIC. The test-only password is sent through psql stdin and a 0600 pgpass
# file, never argv, environment, or output.
outsider_password="$(openssl rand -hex 32)"
printf "create role warehouse_access_outsider login password '%s';\n" "$outsider_password" | \
  psql --username postgres --dbname omen_football --set ON_ERROR_STOP=1 --quiet >/dev/null
outsider_passfile="$(mktemp "$temp_root/.outsider-pgpass.XXXXXX")"
printf '*:*:omen_football:warehouse_access_outsider:%s\n' "$outsider_password" > "$outsider_passfile"
chmod 0600 "$outsider_passfile"
if PGPASSFILE="$outsider_passfile" psql --no-psqlrc --quiet --host "$temp_root/socket" \
    --username warehouse_access_outsider --dbname omen_football --command 'select 1' \
    >"$temp_root/outsider.out" 2>&1; then
  echo "PUBLIC unexpectedly allowed an unrelated LOGIN to connect" >&2; exit 1
fi
! grep -Fq "$outsider_password" "$temp_root/outsider.out" || { echo "outsider credential leaked" >&2; exit 1; }
rm -f -- "$outsider_passfile"

ingest_secret="$temp_root/secrets/warehouse-ingest-url"
reader_secret="$temp_root/secrets/warehouse-reader-url"
backup_secret="$temp_root/secrets/warehouse-backup-pgpass"

role_command omen_warehouse_ingest "$ingest_secret" \
  "begin; create temp table ingest_stage(v integer); insert into ingest_stage values (1); insert into football.access_policy_probe(note) values ('ok'); update football.access_policy_probe set note='updated'; select nextval('football.access_policy_probe_id_seq'); delete from football.access_policy_probe; select pg_advisory_xact_lock(17); commit;" \
  "$temp_root/ingest-positive.out"
if role_command omen_warehouse_ingest "$ingest_secret" \
    "create table football.ingest_must_not_create(id integer)" "$temp_root/ingest-ddl.out"; then
  echo "ingest unexpectedly created a persistent table" >&2; exit 1
fi
if role_command omen_warehouse_ingest "$ingest_secret" \
    "truncate football.access_policy_probe" "$temp_root/ingest-truncate.out"; then
  echo "ingest unexpectedly truncated a table" >&2; exit 1
fi

role_command omen_warehouse_read "$reader_secret" \
  "select count(*) from football.access_policy_probe" "$temp_root/reader-select.out"
if role_command omen_warehouse_read "$reader_secret" \
    "create temp table reader_must_not_create(id integer)" "$temp_root/reader-temp.out"; then
  echo "reader unexpectedly created a temporary table" >&2; exit 1
fi
if role_command omen_warehouse_read "$reader_secret" \
    "insert into football.access_policy_probe(note) values ('forbidden')" "$temp_root/reader-write.out"; then
  echo "reader unexpectedly wrote warehouse data" >&2; exit 1
fi

role_command omen_warehouse_backup_agent "$backup_secret" \
  "select count(*) from football.access_policy_probe; select last_value from football.access_policy_probe_id_seq" \
  "$temp_root/backup-select.out"
if role_command omen_warehouse_backup_agent "$backup_secret" \
    "create temp table backup_must_not_create(id integer)" "$temp_root/backup-temp.out"; then
  echo "backup unexpectedly created a temporary table" >&2; exit 1
fi
if role_command omen_warehouse_backup_agent "$backup_secret" \
    "insert into football.access_policy_probe(note) values ('forbidden')" "$temp_root/backup-write.out"; then
  echo "backup unexpectedly wrote warehouse data" >&2; exit 1
fi

backup_password="$(extract_password omen_warehouse_backup_agent "$backup_secret")"
backup_passfile="$(mktemp "$temp_root/.backup-pgpass.XXXXXX")"
printf '*:*:omen_football:omen_warehouse_backup_agent:%s\n' "$backup_password" > "$backup_passfile"
chmod 0600 "$backup_passfile"
PGPASSFILE="$backup_passfile" pg_dump --host "$temp_root/socket" --username omen_warehouse_backup_agent \
  --dbname omen_football --format=custom --schema=football --no-owner --no-privileges \
  --file "$temp_root/football.dump" 2>"$temp_root/pg-dump.err"
[[ -s "$temp_root/football.dump" ]] || { echo "scoped warehouse pg_dump is empty" >&2; exit 1; }
! grep -Fq "$backup_password" "$temp_root/pg-dump.err" || { echo "backup credential leaked" >&2; exit 1; }
rm -f -- "$backup_passfile"

psql --username postgres --dbname omen_football --set ON_ERROR_STOP=1 --quiet --file "$verification" >/dev/null

# Drift is normalized without rotating or printing the authoritative files.
psql --username postgres --dbname omen_football --set ON_ERROR_STOP=1 --quiet <<'SQL'
create role warehouse_unexpected_group nologin;
grant warehouse_unexpected_group to omen_warehouse_read with admin option;
grant omen_warehouse_reader to omen_warehouse_read with admin option;
alter role omen_warehouse_read createdb connection limit 99;
grant temporary on database omen_football to omen_warehouse_read;
grant insert on football.access_policy_probe to omen_warehouse_read;
SQL
env "${provision_env[@]}" "$provision" >"$temp_root/provision-drift.out" 2>"$temp_root/provision-drift.err"
psql --username postgres --dbname omen_football --set ON_ERROR_STOP=1 --quiet --file "$verification" >/dev/null

# A role without either final or pending credential fails closed.
mv "$reader_secret" "$temp_root/reader-secret-held"
if env "${provision_env[@]}" "$provision" >"$temp_root/missing.out" 2>"$temp_root/missing.err"; then
  echo "role without a recoverable credential did not fail closed" >&2; exit 1
fi
mv "$temp_root/reader-secret-held" "$reader_secret"

# Final plus pending is ambiguous and fails closed.
printf '%064d\n' 0 > "$temp_root/secrets/.omen_warehouse_read.pending"
chmod 0600 "$temp_root/secrets/.omen_warehouse_read.pending"
if env "${provision_env[@]}" "$provision" >"$temp_root/ambiguous.out" 2>"$temp_root/ambiguous.err"; then
  echo "ambiguous credential state did not fail closed" >&2; exit 1
fi
rm -f "$temp_root/secrets/.omen_warehouse_read.pending"

# Existing final material recreates a missing LOGIN role.
psql --username postgres --dbname omen_football --set ON_ERROR_STOP=1 --quiet \
  --command 'drop role omen_warehouse_read' >/dev/null
env "${provision_env[@]}" "$provision" >"$temp_root/provision-recreate.out" 2>"$temp_root/provision-recreate.err"
role_command omen_warehouse_read "$reader_secret" \
  "select current_user" "$temp_root/reader-recreated.out"

# A committed role with pending material resumes and promotes that material.
reader_password="$(extract_password omen_warehouse_read "$reader_secret")"
printf '%s\n' "$reader_password" > "$temp_root/secrets/.omen_warehouse_read.pending"
chmod 0600 "$temp_root/secrets/.omen_warehouse_read.pending"
rm -f "$reader_secret"
env "${provision_env[@]}" "$provision" >"$temp_root/provision-resume.out" 2>"$temp_root/provision-resume.err"
[[ -f "$reader_secret" && ! -e "$temp_root/secrets/.omen_warehouse_read.pending" ]] || {
  echo "pending credential was not promoted" >&2; exit 1
}

for secret_file in "$ingest_secret" "$reader_secret"; do
  [[ "$(stat -c '%a' "$secret_file" 2>/dev/null || stat -f '%Lp' "$secret_file")" == "440" ]] || {
    echo "runtime credential file mode is not 440" >&2; exit 1
  }
  [[ "$(stat -c '%g' "$secret_file" 2>/dev/null || stat -f '%g' "$secret_file")" == "$(id -g)" ]] || {
    echo "runtime credential file group is unsafe" >&2; exit 1
  }
done
[[ "$(stat -c '%a' "$backup_secret" 2>/dev/null || stat -f '%Lp' "$backup_secret")" == "600" ]] || {
  echo "backup credential file mode is not 600" >&2; exit 1
}

for role_secret in \
  "$(extract_password omen_warehouse_ingest "$ingest_secret")" \
  "$(extract_password omen_warehouse_read "$reader_secret")" \
  "$(extract_password omen_warehouse_backup_agent "$backup_secret")"; do
  if find "$temp_root" -maxdepth 1 \( -name '*.out' -o -name '*.err' \) -type f \
      -exec grep -Fq "$role_secret" {} \; -print -quit | grep -q .; then
    echo "credential appeared in captured output" >&2
    exit 1
  fi
done

psql --host "$temp_root/socket" --username postgres --dbname omen_football \
  --set ON_ERROR_STOP=1 --quiet < "$production_verification"

echo "VERIFIED warehouse LOGIN access policy on PostgreSQL 17.11"
