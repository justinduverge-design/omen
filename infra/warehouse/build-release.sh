#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "usage: build-release.sh <git-commit> <output-directory> <worker-image-by-digest>" >&2
  exit 64
fi

commit="$(git rev-parse --verify "$1^{commit}")"
output="$2"
bundle="$output.tar"
bundle_hash="$bundle.sha256"
worker_image="$3"
if [[ ! "$worker_image" =~ ^ghcr\.io/justinduverge-design/omen-warehouse-ingest@sha256:[0-9a-f]{64}$ ]]; then
  echo "worker image must be the approved GHCR repository pinned by sha256 digest" >&2
  exit 1
fi
if [[ ! "$commit" =~ ^[0-9a-f]{40}$ ]] || [[ -e "$output" ]] || [[ -e "$bundle" ]] || [[ -e "$bundle_hash" ]]; then
  echo "release commit is invalid or output already exists" >&2
  exit 1
fi

script_path="$(cd "$(dirname "$0")" && pwd -P)/$(basename "$0")"
if ! git show "$commit:infra/warehouse/build-release.sh" | cmp -s - "$script_path"; then
  echo "release builder does not match the requested commit" >&2
  exit 1
fi

parent="$(cd "$(dirname "$output")" && pwd)"
stage="$(mktemp -d "$parent/.warehouse-release.XXXXXX")"
cleanup() {
  [[ -d "$stage" ]] && rm -rf -- "$stage"
  rm -f -- "$bundle.tmp.$$" "$bundle_hash.tmp.$$"
}
trap cleanup EXIT

paths=(
  Dockerfile.warehouse-ingest
  infra/warehouse/build-release.sh
  infra/warehouse/docker-compose.yml
  infra/warehouse/verify-release.sh
  infra/warehouse/provision-credentials.sh
  infra/warehouse/provision-login-roles.sh
  infra/warehouse/verify-production-readonly.sh
  infra/warehouse/backup/README.md
  infra/warehouse/backup/apply-retention.sh
  infra/warehouse/backup/create-snapshot.sh
  infra/warehouse/backup/export-restore-file.sh
  infra/warehouse/backup/manifest.js
  infra/warehouse/backup/omen-warehouse-backup.service
  infra/warehouse/backup/omen-warehouse-backup.timer
  infra/warehouse/backup/omen-warehouse-restore-proof.service
  infra/warehouse/backup/omen-warehouse-restore-proof.timer
  infra/warehouse/backup/receive-restore-source.sh
  infra/warehouse/backup/restore-isolated.sh
  infra/warehouse/backup/run-nightly-backup.sh
  infra/warehouse/backup/run-weekly-restore-proof.sh
  infra/warehouse/monitor/status-export
  infra/warehouse/monitor/status.js
  warehouse/migrations/0001_football_warehouse.sql
  warehouse/migrations/0002_record_migration.sh
  warehouse/migrations/0003_warehouse_access_policy.sql
  warehouse/migrations/0004_apply_access_policy.sh
  warehouse/verify/production_readonly.sql
)
git archive --format=tar "$commit" -- "${paths[@]}" | tar -xf - -C "$stage"
printf '%s\n' "$commit" > "$stage/COMMIT"
cat > "$stage/RELEASE-CONTRACT" <<EOF
contract_version=omen-football-warehouse-release.v1
commit=$commit
platform=linux/amd64
image=postgres:17.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3
worker_image=$worker_image
install_root=/opt/omen/warehouse/releases
EOF
(
  cd "$stage"
  sha256sum COMMIT RELEASE-CONTRACT "${paths[@]}" > SHA256SUMS
  sha256sum SHA256SUMS | awk '{print $1}' > MANIFEST-SHA256
)
chmod 0444 "$stage/COMMIT" "$stage/RELEASE-CONTRACT" "$stage/SHA256SUMS" "$stage/MANIFEST-SHA256"

# Emit a deterministic USTAR bundle for the independently trusted publisher.
# The publisher is deliberately not part of this commit-bound release.
STAGE="$stage" BUNDLE="$bundle.tmp.$$" python3 - <<'PY'
import os
import pathlib
import tarfile

root = pathlib.Path(os.environ["STAGE"])
output = pathlib.Path(os.environ["BUNDLE"])
with tarfile.open(output, "x:", format=tarfile.USTAR_FORMAT) as archive:
    for source in sorted(root.rglob("*"), key=lambda item: item.relative_to(root).as_posix()):
        relative = source.relative_to(root).as_posix()
        if source.is_symlink() or not (source.is_dir() or source.is_file()):
            raise SystemExit("unsafe release entry")
        info = archive.gettarinfo(str(source), arcname=relative)
        info.uid = info.gid = 0
        info.uname = info.gname = "root"
        info.mtime = 0
        if source.is_dir():
            archive.addfile(info)
        else:
            with source.open("rb") as handle:
                archive.addfile(info, handle)
PY
sha256sum "$bundle.tmp.$$" | awk '{print $1}' > "$bundle_hash.tmp.$$"
chmod 0444 "$bundle.tmp.$$" "$bundle_hash.tmp.$$"
mv -- "$stage" "$output"
mv -- "$bundle.tmp.$$" "$bundle"
mv -- "$bundle_hash.tmp.$$" "$bundle_hash"
trap - EXIT
echo "warehouse release and deterministic bundle built for commit $commit"
