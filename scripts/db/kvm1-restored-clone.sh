#!/usr/bin/env bash
# Restored-clone rehearsal environment on KVM1 — the 2026-09-30 method, scripted.
# Run on KVM1 with sudo. Founder-approved 2026-10-01 for verifying the database redo.
#
#   sudo bash kvm1-restored-clone.sh up [snapshot-id]   # restore newest omen-supabase-auto snapshot into an isolated Postgres 17
#   sudo bash kvm1-restored-clone.sh down               # delete the container, network and restored files
#
# Isolation: the clone runs on a Docker --internal network (no internet, no published ports). Only the
# KVM1 host can reach it, by container IP; an operator tunnels to it with `ssh -L`. Restored files live in
# a 0700 directory and are deleted by `down`. The clone holds real user data: never copy rows off the host.
# Restic credentials are read by restic from their files; this script never prints them.
set -euo pipefail

EXPECTED_MACHINE_ID="703b26f40b344c39b87bdf2802a623e7"
BACKUP_USER="omen-backup-client"
BACKUP_BASE="/var/lib/omen-backup-client"
RESTIC_REPOSITORY="sftp:100.67.187.57:repository"
SCRATCH="/var/tmp/omen-redo-clone"
NET="omen-redo-scratch"
NAME="omen-redo-clone"

[ "$(cat /etc/machine-id)" = "$EXPECTED_MACHINE_ID" ] || { echo "refusing: not KVM1" >&2; exit 2; }
[ "$(id -u)" = 0 ] || { echo "run with sudo" >&2; exit 2; }

restic_as_backup() {
  runuser -u "$BACKUP_USER" -- env HOME="$BACKUP_BASE" RESTIC_REPOSITORY="$RESTIC_REPOSITORY" \
    RESTIC_PASSWORD_FILE="$BACKUP_BASE/restic-password" restic "$@"
}
in_clone() { docker exec -i "$NAME" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d omen "$@"; }

down() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$SCRATCH"
  echo "clone removed: container, network and restored files deleted"
}

up() {
  [ ! -e "$SCRATCH" ] || { echo "refusing: $SCRATCH exists; run down first" >&2; exit 2; }
  local snap="${1:-}"
  if [ -z "$snap" ]; then
    snap="$(restic_as_backup snapshots --tag omen-supabase-auto --latest 1 --json | python3 -c 'import json,sys; print(json.load(sys.stdin)[-1]["id"])')"
  fi
  install -d -m 0700 -o "$BACKUP_USER" -g "$BACKUP_USER" "$SCRATCH"
  restic_as_backup restore "$snap" --target "$SCRATCH" >/dev/null
  local export
  export="$(find "$SCRATCH" -type d -name export-current | head -1)"
  [ -n "$export" ] || { echo "no export-current in snapshot" >&2; exit 1; }
  (cd "$export" && sha256sum -c --quiet SHA256SUMS) || { echo "checksum failure in restored backup" >&2; exit 1; }
  echo "snapshot $snap restored and checksummed"

  docker network create --internal "$NET" >/dev/null
  docker run -d --name "$NAME" --network "$NET" -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=omen \
    -v "$export:/export:ro" postgres:17 >/dev/null
  for _ in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres -d omen >/dev/null 2>&1 && break; sleep 1; done
  sleep 2

  # The documented restore order (Blueprints/handoffs/2026-09-29-wo-15-backup-repair.md).
  in_clone <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
drop schema public;
create schema auth;
SQL
  in_clone -f /export/auth-types.sql
  docker exec "$NAME" pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d omen /export/auth-core-schema.dump
  in_clone <<'SQL'
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
SQL
  for t in auth-users auth-identities auth-mfa-factors; do
    docker exec "$NAME" pg_restore --exit-on-error --no-owner --no-privileges --data-only -U postgres -d omen "/export/$t.dump"
  done
  docker exec "$NAME" pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d omen /export/public.dump

  echo "--- row counts: restored clone vs the backup's own source counts"
  in_clone -c "analyze" >/dev/null
  in_clone -At <<'SQL'
select format('%s %s', c.relname, (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text)
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1;
SQL
  echo "--- source-table-counts.txt"
  cat "$export/source-table-counts.txt"
  # Mark this database as a rehearsal clone, outside `public`, so scripts/db/production-order-run.sh can
  # verify the server it reached is this clone and never production (Codex, #530).
  in_clone -c "create schema rehearsal_target; create table rehearsal_target.marker (kind text not null); insert into rehearsal_target.marker values ('clone')"
  echo "clone ready: container $NAME on internal network $NET, IP $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$NAME")"
}

case "${1:-}" in
  up) shift; up "$@" ;;
  down) down ;;
  *) echo "usage: $0 up [snapshot-id] | down" >&2; exit 2 ;;
esac
