#!/usr/bin/env bash
set -euo pipefail

# Reconciles fixed warehouse LOGIN roles without carrying credential values in
# argv, environment variables, or output. Secret directory overrides exist only
# so the same implementation can be exercised against a disposable local PG17.

umask 077
if [[ "${OMEN_WAREHOUSE_PROVISION_TEST_MODE:-}" == "disposable-pg17" ]]; then
  secret_dir="${OMEN_WAREHOUSE_LOGIN_SECRET_DIR:?test secret directory is required}"
  host="${OMEN_WAREHOUSE_HOST:-warehouse.test.invalid}"
else
  [[ -z "${OMEN_WAREHOUSE_LOGIN_SECRET_DIR:-}" ]] || { echo "production warehouse secret directory is fixed" >&2; exit 1; }
  [[ -z "${OMEN_WAREHOUSE_HOST:-}" ]] || { echo "production warehouse host is fixed" >&2; exit 1; }
  secret_dir="/var/lib/omen/secrets"
  host="omen_football_warehouse"
fi
database="omen_football"
port="5432"

[[ "$secret_dir" == /* && "$secret_dir" != "/" ]] || { echo "invalid warehouse secret directory" >&2; exit 1; }
[[ "$database" == "omen_football" ]] || { echo "unexpected warehouse database" >&2; exit 1; }
[[ "$host" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "invalid warehouse host" >&2; exit 1; }
[[ "$port" =~ ^[0-9]{1,5}$ ]] || { echo "invalid warehouse port" >&2; exit 1; }

if [[ "$(id -u)" -eq 0 ]]; then
  install -d -m 0700 -o root -g root "$secret_dir"
else
  [[ "${OMEN_WAREHOUSE_PROVISION_TEST_MODE:-}" == "disposable-pg17" ]] || {
    echo "warehouse LOGIN provisioning requires root" >&2
    exit 1
  }
  install -d -m 0700 "$secret_dir"
fi
if [[ "${OMEN_WAREHOUSE_PROVISION_TEST_MODE:-}" == "disposable-pg17" ]]; then
  secret_dir="$(cd "$secret_dir" && pwd -P)"
fi
[[ ! -L "$secret_dir" && "$(cd "$secret_dir" && pwd -P)" == "$secret_dir" ]] || {
  echo "warehouse secret directory is unsafe" >&2
  exit 1
}
[[ "$(stat -c '%a' "$secret_dir" 2>/dev/null || stat -f '%Lp' "$secret_dir")" == "700" ]] || {
  echo "warehouse secret directory mode is unsafe" >&2
  exit 1
}
[[ "$(stat -c '%u' "$secret_dir" 2>/dev/null || stat -f '%u' "$secret_dir")" == "$(id -u)" ]] || {
  echo "warehouse secret directory owner is unsafe" >&2
  exit 1
}

if command -v flock >/dev/null 2>&1; then
  exec 9>"$secret_dir/.login-role-provision.lock"
  flock -n 9 || { echo "warehouse LOGIN provisioning is already active" >&2; exit 1; }
elif [[ "${OMEN_WAREHOUSE_PROVISION_TEST_MODE:-}" == "disposable-pg17" ]]; then
  lock_dir="$secret_dir/.login-role-provision.lockdir"
  mkdir "$lock_dir" 2>/dev/null || { echo "warehouse LOGIN provisioning is already active" >&2; exit 1; }
  trap 'rmdir "$lock_dir" 2>/dev/null || true' EXIT
else
  echo "warehouse LOGIN provisioning requires flock" >&2
  exit 1
fi

psql_admin=(psql --no-psqlrc --set ON_ERROR_STOP=1 --quiet --username postgres --dbname "$database")
identity="$("${psql_admin[@]}" --tuples-only --no-align --command \
  "select current_database() || ':' || exists(select 1 from football.warehouse_schema_migrations where version=2 and name='0003_warehouse_access_policy')::text")"
[[ "$identity" == "omen_football:true" ]] || { echo "warehouse target identity lacks access-policy version 2" >&2; exit 1; }

roles=(omen_warehouse_ingest omen_warehouse_read omen_warehouse_backup_agent)
groups=(omen_warehouse_writer omen_warehouse_reader omen_warehouse_backup)
limits=(4 8 1)
kinds=(url url pgpass)
names=(warehouse-ingest-url warehouse-reader-url warehouse-backup-pgpass)
passwords=()
pending_flags=()

read_final_password() {
  local role="$1" kind="$2" file="$3" value
  [[ -f "$file" && ! -L "$file" ]] || return 1
  [[ "$(stat -c '%a' "$file" 2>/dev/null || stat -f '%Lp' "$file")" == "600" ]] || return 1
  [[ "$(stat -c '%u' "$file" 2>/dev/null || stat -f '%u' "$file")" == "$(id -u)" ]] || return 1
  value="$(<"$file")"
  if [[ "$kind" == "url" ]]; then
    [[ "$value" =~ ^postgresql://${role}:([0-9a-f]{64})@${host}:${port}/${database}$ ]] || return 1
    printf '%s' "${BASH_REMATCH[1]}"
  else
    [[ "$value" =~ ^${host}:${port}:${database}:${role}:([0-9a-f]{64})$ ]] || return 1
    printf '%s' "${BASH_REMATCH[1]}"
  fi
}

for index in "${!roles[@]}"; do
  role="${roles[$index]}"
  final="$secret_dir/${names[$index]}"
  pending="$secret_dir/.${role}.pending"
  role_exists="$("${psql_admin[@]}" --tuples-only --no-align --command \
    "select exists(select 1 from pg_roles where rolname='$role')")"
  [[ ! -e "$final" || ! -e "$pending" ]] || { echo "ambiguous warehouse credential state for $role" >&2; exit 1; }

  if [[ -e "$final" ]]; then
    password="$(read_final_password "$role" "${kinds[$index]}" "$final")" || {
      echo "invalid warehouse credential file for $role" >&2
      exit 1
    }
    pending_flags+=(false)
  elif [[ -e "$pending" ]]; then
    [[ -f "$pending" && ! -L "$pending" ]] || { echo "invalid pending warehouse credential for $role" >&2; exit 1; }
    [[ "$(stat -c '%a' "$pending" 2>/dev/null || stat -f '%Lp' "$pending")" == "600" ]] || {
      echo "invalid pending warehouse credential mode for $role" >&2
      exit 1
    }
    [[ "$(stat -c '%u' "$pending" 2>/dev/null || stat -f '%u' "$pending")" == "$(id -u)" ]] || {
      echo "invalid pending warehouse credential owner for $role" >&2
      exit 1
    }
    password="$(<"$pending")"
    [[ "$password" =~ ^[0-9a-f]{64}$ ]] || { echo "invalid pending warehouse credential for $role" >&2; exit 1; }
    pending_flags+=(true)
  else
    [[ "$role_exists" == "f" ]] || { echo "warehouse role has no recoverable credential: $role" >&2; exit 1; }
    pending_temp="$(mktemp "$secret_dir/.${role}.pending.XXXXXX")"
    openssl rand -hex 32 > "$pending_temp"
    chmod 0600 "$pending_temp"
    mv -- "$pending_temp" "$pending"
    password="$(<"$pending")"
    pending_flags+=(true)
  fi
  passwords+=("$password")
done

{
  printf '%s\n' 'begin;'
  printf '%s\n' "set local password_encryption = 'scram-sha-256';"
  for index in "${!roles[@]}"; do
    role="${roles[$index]}"; group="${groups[$index]}"; limit="${limits[$index]}"; password="${passwords[$index]}"
    printf "do \$\$ begin if not exists (select 1 from pg_roles where rolname='%s') then create role %s; end if; end \$\$;\n" "$role" "$role"
    printf "alter role %s login inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit %s password '%s' valid until 'infinity';\n" "$role" "$limit" "$password"
    printf "alter role %s reset all;\n" "$role"
    printf "alter role %s set search_path = pg_catalog, football;\n" "$role"
    printf "alter role %s set statement_timeout = '5min';\n" "$role"
    printf "alter role %s set lock_timeout = '15s';\n" "$role"
    printf "do \$\$ declare membership record; begin for membership in select parent.rolname from pg_auth_members m join pg_roles parent on parent.oid=m.roleid join pg_roles member on member.oid=m.member where member.rolname='%s' and parent.rolname<>'%s' loop execute format('revoke %%I from %s', membership.rolname); end loop; end \$\$;\n" "$role" "$group" "$role"
    printf "grant %s to %s;\n" "$group" "$role"
    printf "revoke all privileges on database %s from %s;\n" "$database" "$role"
    printf "revoke all privileges on schema football from %s;\n" "$role"
    printf "revoke all privileges on all tables in schema football from %s;\n" "$role"
    printf "revoke all privileges on all sequences in schema football from %s;\n" "$role"
    printf "revoke execute on all functions in schema football from %s;\n" "$role"
  done
  printf '%s\n' 'commit;'
} | "${psql_admin[@]}" >/dev/null

for index in "${!roles[@]}"; do
  role="${roles[$index]}"; password="${passwords[$index]}"
  probe="$(mktemp "$secret_dir/.${role}.probe.XXXXXX")"
  printf '*:*:%s:%s:%s\n' "$database" "$role" "$password" > "$probe"
  chmod 0600 "$probe"
  if ! PGPASSFILE="$probe" psql --no-psqlrc --set ON_ERROR_STOP=1 --quiet \
      --host "${OMEN_WAREHOUSE_PROBE_HOST:-$host}" --port "$port" --username "$role" --dbname "$database" \
      --tuples-only --no-align --command 'select current_user' 2>/dev/null | grep -qx "$role"; then
    rm -f -- "$probe"
    echo "warehouse credential probe failed for $role" >&2
    exit 1
  fi
  rm -f -- "$probe"

  if [[ "${pending_flags[$index]}" == true ]]; then
    pending="$secret_dir/.${role}.pending"
    final_temp="$(mktemp "$secret_dir/.${names[$index]}.XXXXXX")"
    if [[ "${kinds[$index]}" == "url" ]]; then
      printf 'postgresql://%s:%s@%s:%s/%s\n' "$role" "$password" "$host" "$port" "$database" > "$final_temp"
    else
      printf '%s:%s:%s:%s:%s\n' "$host" "$port" "$database" "$role" "$password" > "$final_temp"
    fi
    chmod 0600 "$final_temp"
    mv -- "$final_temp" "$secret_dir/${names[$index]}"
    rm -f -- "$pending"
  fi
done

echo "warehouse LOGIN roles reconciled"
