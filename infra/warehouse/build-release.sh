#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: build-release.sh <git-commit> <output-directory>" >&2
  exit 64
fi

commit="$(git rev-parse --verify "$1^{commit}")"
output="$2"
if [[ ! "$commit" =~ ^[0-9a-f]{40}$ ]] || [[ -e "$output" ]]; then
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
cleanup() { [[ -d "$stage" ]] && rm -rf -- "$stage"; }
trap cleanup EXIT

paths=(
  infra/warehouse/build-release.sh
  infra/warehouse/docker-compose.yml
  infra/warehouse/verify-release.sh
  infra/warehouse/provision-credentials.sh
  warehouse/migrations/0001_football_warehouse.sql
  warehouse/migrations/0002_record_migration.sh
)
git archive --format=tar "$commit" -- "${paths[@]}" | tar -xf - -C "$stage"
printf '%s\n' "$commit" > "$stage/COMMIT"
cat > "$stage/RELEASE-CONTRACT" <<EOF
contract_version=omen-football-warehouse-release.v1
commit=$commit
platform=linux/amd64
image=postgres:17.11-bookworm@sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3
install_root=/opt/omen/warehouse/releases
EOF
(
  cd "$stage"
  sha256sum COMMIT RELEASE-CONTRACT "${paths[@]}" > SHA256SUMS
  sha256sum SHA256SUMS | awk '{print $1}' > MANIFEST-SHA256
)
chmod 0444 "$stage/COMMIT" "$stage/RELEASE-CONTRACT" "$stage/SHA256SUMS" "$stage/MANIFEST-SHA256"
mv -- "$stage" "$output"
trap - EXIT
echo "warehouse release built for commit $commit"
