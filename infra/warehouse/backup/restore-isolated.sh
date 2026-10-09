#!/usr/bin/env bash
set -euo pipefail
umask 077

# KVM2-side restore gate. The manifest and dump must already have been restored
# from Restic into a root-owned 0700 directory by a separately commissioned
# dispatcher. This script does not receive, copy, or decrypt backup credentials.

EXPECTED_HOST="model-host"
IMAGE="postgres:17.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3"
[[ $# -eq 2 ]] || { echo "usage: restore-isolated.sh /absolute/manifest.json /absolute/restore-proof.json" >&2; exit 64; }
manifest="$1"
proof="$2"
[[ "$(hostname)" == "$EXPECTED_HOST" ]] || { echo "warehouse restore refused: wrong host" >&2; exit 69; }
[[ "$(id -u)" -eq 0 ]] || { echo "warehouse restore requires root orchestration" >&2; exit 77; }
[[ "$manifest" == /* && "$proof" == /* && "$manifest" != "$proof" ]] || { echo "warehouse restore requires distinct absolute paths" >&2; exit 64; }
[[ -f "$manifest" && ! -L "$manifest" ]] || { echo "warehouse restore manifest is unsafe" >&2; exit 65; }
snapshot_dir="$(cd "$(dirname "$manifest")" && pwd -P)"
[[ "$(stat -c '%a:%U:%G' "$snapshot_dir")" == "700:root:root" ]] || { echo "warehouse restore source metadata is unsafe" >&2; exit 77; }
proof_parent="$(cd "$(dirname "$proof")" && pwd -P)"
[[ "$(stat -c '%a:%U:%G' "$proof_parent")" == "700:root:root" ]] || { echo "warehouse restore proof directory metadata is unsafe" >&2; exit 77; }
dump="$snapshot_dir/warehouse.dump"
[[ -f "$dump" && ! -L "$dump" ]] || { echo "warehouse restore dump is absent" >&2; exit 65; }
command -v docker >/dev/null || { echo "warehouse restore requires Docker" >&2; exit 69; }
docker image inspect "$IMAGE" >/dev/null 2>&1 || { echo "warehouse restore requires the pre-staged pinned PostgreSQL 17 image" >&2; exit 69; }

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
node "$script_dir/manifest.js" verify "$manifest" >/dev/null
run_id="$(node -e 'const m=require(process.argv[1]); process.stdout.write(m.backup_run_id)' "$manifest")"
safe_id="$(printf '%s' "$run_id" | tr -cd 'A-Za-z0-9' | tail -c 24)"
container="omen-warehouse-restore-$safe_id"
volume="omen-warehouse-restore-$safe_id"
[[ -n "$safe_id" ]] || { echo "warehouse restore run id is unsafe" >&2; exit 65; }
docker inspect "$container" >/dev/null 2>&1 && { echo "warehouse restore target already exists" >&2; exit 65; }
docker volume inspect "$volume" >/dev/null 2>&1 && { echo "warehouse restore volume already exists" >&2; exit 65; }

success=false
cleanup() {
  if [[ "$success" == true ]]; then
    docker rm -f "$container" >/dev/null 2>&1 || true
    docker volume rm "$volume" >/dev/null 2>&1 || true
  else
    echo "warehouse restore failed; preserved container/volume for bounded diagnosis: $container $volume" >&2
  fi
}
trap cleanup EXIT
docker volume create "$volume" >/dev/null
docker run --detach --name "$container" --network none --read-only --tmpfs /tmp:size=64m,mode=1777 --tmpfs /var/run/postgresql:size=16m,uid=999,gid=999 \
  --security-opt no-new-privileges:true --cap-drop ALL --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER --cap-add SETGID --cap-add SETUID \
  --memory 2g --cpus 1.25 --pids-limit 200 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=omen_football \
  --mount "type=volume,src=$volume,dst=/var/lib/postgresql/data" --mount "type=bind,src=$snapshot_dir,dst=/restore,readonly" "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  docker exec "$container" pg_isready --username postgres --dbname omen_football >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$container" pg_isready --username postgres --dbname omen_football >/dev/null
docker exec --interactive "$container" psql --no-psqlrc --set ON_ERROR_STOP=1 --username postgres --dbname omen_football <<'SQL'
create role omen_warehouse_reader nologin;
create role omen_warehouse_writer nologin;
create role omen_warehouse_backup nologin;
SQL
docker exec "$container" pg_restore --exit-on-error --no-owner --no-privileges --username postgres --dbname omen_football /restore/warehouse.dump

evidence="$(docker exec "$container" psql --no-psqlrc --set ON_ERROR_STOP=1 --tuples-only --no-align --username postgres --dbname omen_football --command "
select json_build_object(
  'schema_version', (select max(version) from football.warehouse_schema_migrations),
  'receipts', json_build_object('succeeded', count(*) filter (where state='succeeded'), 'started', count(*) filter (where state='started')),
  'row_counts', json_build_object(
    'football_teams', (select count(*) from football.football_teams), 'football_players', (select count(*) from football.football_players),
    'nfl_games', (select count(*) from football.nfl_games), 'nfl_player_weekly_stats', (select count(*) from football.nfl_player_weekly_stats),
    'nfl_team_weekly_stats', (select count(*) from football.nfl_team_weekly_stats), 'nfl_weekly_rosters', (select count(*) from football.nfl_weekly_rosters),
    'nfl_plays', (select count(*) from football.nfl_plays)),
  'representative_queries_passed', (
    (select count(*) > 0 from football.nfl_games) and
    (select count(*) = 0 from football.nfl_player_weekly_stats s left join football.warehouse_ingest_events e on e.id=s.ingest_event_id where e.id is null or e.state <> 'succeeded') and
    (select count(*) = 0 from football.nfl_plays p left join football.warehouse_ingest_events e on e.id=p.ingest_event_id where e.id is null or e.state <> 'succeeded'))
from football.warehouse_ingest_events")"
dump_sha="$(sha256sum "$dump" | awk '{print $1}')"
python3 - "$manifest" "$proof" "$evidence" "$dump_sha" "$run_id" "$safe_id" <<'PY'
import datetime, json, os, sys
manifest_path, proof_path, evidence_json, digest, run_id, safe_id = sys.argv[1:]
if os.path.exists(proof_path): raise SystemExit("restore proof target already exists")
evidence = json.loads(evidence_json)
proof = {
  "contract_version": "omen-football-warehouse-restore-proof.v1", "backup_run_id": run_id,
  "verifier_run_id": "restore-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
  "target_cluster_id": "kvm2-isolated-" + safe_id, "postgres_version": "postgres:17.11",
  "schema_version": evidence["schema_version"], "dump_sha256": digest,
  "verified_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
  "representative_queries_passed": evidence["representative_queries_passed"],
  "receipts": evidence["receipts"], "row_counts": evidence["row_counts"]}
with open(proof_path, "x", encoding="utf-8") as handle:
  json.dump(proof, handle, sort_keys=True, separators=(",", ":")); handle.write("\n")
os.chmod(proof_path, 0o400)
PY
node "$script_dir/manifest.js" verify-restore "$manifest" "$proof" >/dev/null
success=true
echo "warehouse restore verified: run=$run_id"
