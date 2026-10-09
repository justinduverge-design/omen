#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: verify-release.sh <staged-release-directory> <approved-manifest-sha256>" >&2
  exit 64
fi

release_dir="$(cd "$1" && pwd -P)"
approved_manifest="$2"
[[ "$approved_manifest" =~ ^[0-9a-f]{64}$ ]] || { echo "approved manifest is invalid" >&2; exit 1; }

expected_files=(COMMIT MANIFEST-SHA256 RELEASE-CONTRACT SHA256SUMS Dockerfile.warehouse-ingest infra/warehouse/build-release.sh infra/warehouse/docker-compose.yml infra/warehouse/provision-credentials.sh infra/warehouse/provision-login-roles.sh infra/warehouse/verify-production-readonly.sh infra/warehouse/verify-release.sh infra/warehouse/backup/README.md infra/warehouse/backup/apply-retention.sh infra/warehouse/backup/create-snapshot.sh infra/warehouse/backup/export-restore-file.sh infra/warehouse/backup/manifest.js infra/warehouse/backup/omen-warehouse-backup.service infra/warehouse/backup/omen-warehouse-backup.timer infra/warehouse/backup/omen-warehouse-restore-proof.service infra/warehouse/backup/omen-warehouse-restore-proof.timer infra/warehouse/backup/receive-restore-source.sh infra/warehouse/backup/restore-isolated.sh infra/warehouse/backup/run-nightly-backup.sh infra/warehouse/backup/run-weekly-restore-proof.sh infra/warehouse/monitor/status-export infra/warehouse/monitor/status.js warehouse/migrations/0001_football_warehouse.sql warehouse/migrations/0002_record_migration.sh warehouse/migrations/0003_warehouse_access_policy.sql warehouse/migrations/0004_apply_access_policy.sh warehouse/verify/production_readonly.sql)
expected_dirs=(infra infra/warehouse infra/warehouse/backup infra/warehouse/monitor warehouse warehouse/migrations warehouse/verify)
actual_list="$(mktemp)"
allowed_list="$(mktemp)"
expected_contract="$(mktemp)"
trap 'rm -f -- "$actual_list" "$allowed_list" "$expected_contract"' EXIT
(cd "$release_dir" && find . -mindepth 1 -print | sed 's#^\./##' | LC_ALL=C sort) > "$actual_list"
printf '%s\n' "${expected_files[@]}" "${expected_dirs[@]}" | LC_ALL=C sort > "$allowed_list"
cmp -s "$actual_list" "$allowed_list" || { echo "release inventory is invalid" >&2; exit 1; }
for relative in "${expected_files[@]}"; do
  file="$release_dir/$relative"
  [[ -f "$file" && ! -L "$file" ]] || { echo "release file type is invalid" >&2; exit 1; }
  links="$(stat -c '%h' "$file" 2>/dev/null || stat -f '%l' "$file")"
  [[ "$links" -eq 1 ]] || { echo "release contains a hard-linked file" >&2; exit 1; }
  mode="$(stat -c '%a' "$file" 2>/dev/null || stat -f '%Lp' "$file")"
  case "$relative" in
    COMMIT|MANIFEST-SHA256|RELEASE-CONTRACT|SHA256SUMS) expected_mode=444 ;;
    *.sh|infra/warehouse/monitor/status-export|infra/warehouse/monitor/status.js) expected_mode=755 ;;
    *) expected_mode=644 ;;
  esac
  [[ "$mode" == "$expected_mode" ]] || { echo "release file mode is invalid" >&2; exit 1; }
done
for relative in "${expected_dirs[@]}"; do
  mode="$(stat -c '%a' "$release_dir/$relative" 2>/dev/null || stat -f '%Lp' "$release_dir/$relative")"
  [[ "$mode" == 755 ]] || { echo "release directory mode is invalid" >&2; exit 1; }
done

commit="$(tr -d '\n' < "$release_dir/COMMIT")"
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo "release commit is invalid" >&2; exit 1; }
worker_image="$(sed -n 's/^worker_image=//p' "$release_dir/RELEASE-CONTRACT")"
[[ "$worker_image" =~ ^ghcr\.io/justinduverge-design/omen-warehouse-ingest@sha256:[0-9a-f]{64}$ ]] || { echo "worker image contract is invalid" >&2; exit 1; }
(cd "$release_dir" && test "$(sha256sum SHA256SUMS | awk '{print $1}')" = "$approved_manifest")
(cd "$release_dir" && test "$(tr -d '\n' < MANIFEST-SHA256)" = "$approved_manifest")
(cd "$release_dir" && sha256sum --check --strict SHA256SUMS >/dev/null)

cat > "$expected_contract" <<EOF
contract_version=omen-football-warehouse-release.v1
commit=$commit
platform=linux/amd64
image=postgres:17.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3
worker_image=$worker_image
install_root=/opt/omen/warehouse/releases
EOF
cmp -s "$expected_contract" "$release_dir/RELEASE-CONTRACT" || { echo "release contract is invalid" >&2; exit 1; }
echo "warehouse release verified for commit $commit"
