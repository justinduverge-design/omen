#!/usr/bin/env bash
set -euo pipefail
umask 077

# Creates one transactionally consistent custom-format dump, binds it to
# count/receipt evidence, then sends that directory through Omen's already
# commissioned encrypted Restic/SFTP identity. It never reads a credential into
# argv or the environment and never prints credential contents.

EXPECTED_HOST="omen-prod"
CONTAINER="omen_football_warehouse"
DATABASE="omen_football"
BACKUP_ROLE="omen_warehouse_backup_agent"
BACKUP_USER="omen-backup-client"
BACKUP_HOME="/var/lib/omen-backup-client"
PGPASS_FILE="/var/lib/omen/secrets/warehouse-backup-pgpass"
RESTIC_PASSWORD_FILE="$BACKUP_HOME/restic-password"
COMMISSIONED_BACKUP="/opt/omen-backup/bin/backup-supabase.sh"
SNAPSHOT_ROOT="/var/lib/omen/warehouse-backups"

[[ "$(hostname)" == "$EXPECTED_HOST" ]] || { echo "warehouse backup refused: wrong host" >&2; exit 69; }
[[ "$(id -u)" -eq 0 ]] || { echo "warehouse backup requires root orchestration" >&2; exit 77; }
for command in docker restic runuser python3 sha256sum; do
  command -v "$command" >/dev/null || { echo "warehouse backup requires $command" >&2; exit 69; }
done
docker inspect --format '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null | grep -qx healthy || {
  echo "warehouse backup refused: warehouse is not healthy" >&2
  exit 69
}
[[ -f "$PGPASS_FILE" && ! -L "$PGPASS_FILE" && "$(stat -c '%a:%U:%G' "$PGPASS_FILE")" == "600:root:root" ]] || {
  echo "warehouse backup refused: backup credential metadata is unsafe" >&2
  exit 77
}
[[ -f "$RESTIC_PASSWORD_FILE" && ! -L "$RESTIC_PASSWORD_FILE" ]] || {
  echo "warehouse backup refused: commissioned Restic credential is unavailable" >&2
  exit 78
}
[[ -r "$COMMISSIONED_BACKUP" ]] || { echo "warehouse backup refused: commissioned repository configuration is unavailable" >&2; exit 78; }

repository="$(sed -n 's/^RESTIC_REPOSITORY="\([^"]*\)"$/\1/p' "$COMMISSIONED_BACKUP")"
[[ "$(printf '%s\n' "$repository" | wc -l)" -eq 1 && "$repository" == sftp:* ]] || {
  echo "warehouse backup refused: commissioned repository assignment is invalid" >&2
  exit 78
}

# The backup-only account must be able to traverse to the one final directory
# handed to Restic.  Keep the parent non-listable and each snapshot private.
install -d -m 0711 -o root -g root "$SNAPSHOT_ROOT"
run_id="warehouse-$(date -u '+%Y%m%dT%H%M%SZ')"
stage="$(mktemp -d "$SNAPSHOT_ROOT/.${run_id}.XXXXXX")"
final="$SNAPSHOT_ROOT/$run_id"
[[ ! -e "$final" ]] || { echo "warehouse backup refused: duplicate run id" >&2; exit 65; }
cleanup() { rm -rf -- "$stage"; }
trap cleanup EXIT

query_evidence() {
  local destination="$1"
  docker exec --interactive "$CONTAINER" sh -eu -c '
    passfile="$(mktemp /tmp/omen-warehouse-backup.XXXXXX)"
    trap '\''rm -f -- "$passfile"'\'' EXIT
    cat > "$passfile"
    chmod 0600 "$passfile"
    PGPASSFILE="$passfile" psql --no-psqlrc --set ON_ERROR_STOP=1 --quiet \
      --host "$(hostname -i | cut -d\  -f1)" --port 5432 --username "$1" --dbname "$2" \
      --tuples-only --no-align --command "
        set default_transaction_read_only=on;
        select json_build_object(
          '\''schema_version'\'', (select max(version) from football.warehouse_schema_migrations),
          '\''receipts'\'', json_build_object(
            '\''succeeded'\'', count(*) filter (where state='\''succeeded'\''),
            '\''started'\'', count(*) filter (where state='\''started'\''),
            '\''high_water'\'', coalesce(max(finished_at) filter (where state='\''succeeded'\'')::text, '\'''\'')
          ),
          '\''row_counts'\'', json_build_object(
            '\''football_teams'\'', (select count(*) from football.football_teams),
            '\''football_players'\'', (select count(*) from football.football_players),
            '\''nfl_games'\'', (select count(*) from football.nfl_games),
            '\''nfl_player_weekly_stats'\'', (select count(*) from football.nfl_player_weekly_stats),
            '\''nfl_team_weekly_stats'\'', (select count(*) from football.nfl_team_weekly_stats),
            '\''nfl_weekly_rosters'\'', (select count(*) from football.nfl_weekly_rosters),
            '\''nfl_plays'\'', (select count(*) from football.nfl_plays)
          )
        )
        from football.warehouse_ingest_events"
  ' sh "$BACKUP_ROLE" "$DATABASE" < "$PGPASS_FILE" > "$destination"
}

query_evidence "$stage/before.json"
python3 - "$stage/before.json" <<'PY'
import json, sys
evidence = json.load(open(sys.argv[1], encoding="utf-8"))
if evidence["receipts"]["started"] != 0 or evidence["receipts"]["succeeded"] < 1:
    raise SystemExit("warehouse backup refused: receipt state is not backup-ready")
PY

docker exec --interactive "$CONTAINER" sh -eu -c '
  passfile="$(mktemp /tmp/omen-warehouse-dump.XXXXXX)"
  trap '\''rm -f -- "$passfile"'\'' EXIT
  cat > "$passfile"
  chmod 0600 "$passfile"
  PGPASSFILE="$passfile" pg_dump --host "$(hostname -i | cut -d\  -f1)" --port 5432 --username "$1" --dbname "$2" \
    --format=custom --compress=9 --no-owner --no-privileges --schema=football
' sh "$BACKUP_ROLE" "$DATABASE" < "$PGPASS_FILE" > "$stage/warehouse.dump"
[[ -s "$stage/warehouse.dump" ]] || { echo "warehouse backup refused: dump is empty" >&2; exit 65; }

query_evidence "$stage/after.json"
cmp -s "$stage/before.json" "$stage/after.json" || {
  echo "warehouse backup refused: ingest evidence changed during dump" >&2
  exit 75
}

python3 - "$stage/before.json" "$stage/warehouse.dump" "$stage/manifest.json" "$run_id" <<'PY'
import datetime, hashlib, json, os, sys
evidence_path, dump_path, manifest_path, run_id = sys.argv[1:]
with open(evidence_path, encoding="utf-8") as handle:
    evidence = json.load(handle)
digest = hashlib.sha256()
with open(dump_path, "rb") as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
        digest.update(chunk)
manifest = {
    "contract_version": "omen-football-warehouse-backup.v1",
    "state": "created",
    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
    "postgres_version": "postgres:17.11",
    "schema_version": evidence["schema_version"],
    "backup_run_id": run_id,
    "dump": {"filename": "warehouse.dump", "bytes": os.path.getsize(dump_path), "sha256": digest.hexdigest()},
    "receipts": {"succeeded": evidence["receipts"]["succeeded"], "started": evidence["receipts"]["started"]},
    "row_counts": evidence["row_counts"],
    "restic_tags": ["omen-football-warehouse", "schema-v%s" % evidence["schema_version"]],
}
with open(manifest_path, "x", encoding="utf-8") as handle:
    json.dump(manifest, handle, sort_keys=True, separators=(",", ":"))
    handle.write("\n")
PY
rm -f -- "$stage/before.json" "$stage/after.json"
chown -R "$BACKUP_USER:$BACKUP_USER" "$stage"
chmod 0700 "$stage"
chmod 0400 "$stage/warehouse.dump" "$stage/manifest.json"
mv -- "$stage" "$final"
trap - EXIT

restic_json="$(mktemp /run/omen-warehouse-restic.XXXXXX)"
trap 'rm -f -- "$restic_json"' EXIT
runuser -u "$BACKUP_USER" -- env HOME="$BACKUP_HOME" RESTIC_REPOSITORY="$repository" RESTIC_PASSWORD_FILE="$RESTIC_PASSWORD_FILE" \
  restic backup --json --no-cache --tag omen-football-warehouse --tag "schema-v$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["schema_version"])' "$final/manifest.json")" "$final" > "$restic_json"
snapshot_id="$(python3 - "$restic_json" <<'PY'
import json, sys
snapshot = None
for line in open(sys.argv[1], encoding="utf-8"):
    record = json.loads(line)
    if record.get("message_type") == "summary": snapshot = record.get("snapshot_id")
if not snapshot or len(snapshot) != 64: raise SystemExit(1)
print(snapshot)
PY
)"
rm -f -- "$restic_json"
trap - EXIT
rm -rf -- "$final"
printf 'warehouse backup completed: run=%s snapshot=%s\n' "$run_id" "$snapshot_id"
