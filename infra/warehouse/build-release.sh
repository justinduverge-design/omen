#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: build-release.sh <git-commit> <output-directory>" >&2
  exit 64
fi

commit="$(git rev-parse --verify "$1^{commit}")"
output="$2"
bundle="$output.tar"
bundle_hash="$bundle.sha256"
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

# Write a deterministic, uncompressed USTAR archive. This logic is part of this
# commit-bound builder; the independently trusted root publisher does not run it.
STAGE="$stage" BUNDLE="$bundle.tmp.$$" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const root = process.env.STAGE;
const output = process.env.BUNDLE;
const entries = [];
function walk(relative) {
  const absolute = path.join(root, relative);
  for (const name of fs.readdirSync(absolute).sort()) {
    const child = relative ? `${relative}/${name}` : name;
    const stat = fs.lstatSync(path.join(root, child));
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new Error("unsafe release entry");
    if (stat.isDirectory()) { entries.push({ name: `${child}/`, stat }); walk(child); }
    else entries.push({ name: child, stat });
  }
}
walk("");

function octal(value, width) {
  const text = value.toString(8);
  if (text.length > width - 1) throw new Error("tar numeric field overflow");
  return `${"0".repeat(width - 1 - text.length)}${text}\0`;
}
function header(entry) {
  const block = Buffer.alloc(512);
  const name = Buffer.from(entry.name, "utf8");
  if (name.length === 0 || name.length > 100 || /[^\x20-\x7e]/.test(entry.name)) throw new Error("tar path is not canonical");
  name.copy(block, 0);
  block.write(octal(entry.stat.mode & 0o7777, 8), 100, "ascii");
  block.write(octal(0, 8), 108, "ascii");
  block.write(octal(0, 8), 116, "ascii");
  block.write(octal(entry.stat.isFile() ? entry.stat.size : 0, 12), 124, "ascii");
  block.write(octal(0, 12), 136, "ascii");
  block.fill(0x20, 148, 156);
  block[156] = entry.stat.isDirectory() ? 0x35 : 0x30;
  block.write("ustar\0", 257, "ascii");
  block.write("00", 263, "ascii");
  block.write("root", 265, "ascii");
  block.write("root", 297, "ascii");
  const sum = block.reduce((total, byte) => total + byte, 0);
  block.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  return block;
}

const fd = fs.openSync(output, "wx", 0o400);
try {
  for (const entry of entries) {
    fs.writeSync(fd, header(entry));
    if (entry.stat.isFile()) {
      const contents = fs.readFileSync(path.join(root, entry.name));
      fs.writeSync(fd, contents);
      const padding = (512 - (contents.length % 512)) % 512;
      if (padding) fs.writeSync(fd, Buffer.alloc(padding));
    }
  }
  fs.writeSync(fd, Buffer.alloc(1024));
  fs.fsyncSync(fd);
} finally { fs.closeSync(fd); }
NODE
sha256sum "$bundle.tmp.$$" | awk '{print $1}' > "$bundle_hash.tmp.$$"
chmod 0444 "$bundle.tmp.$$" "$bundle_hash.tmp.$$"
mv -- "$stage" "$output"
mv -- "$bundle.tmp.$$" "$bundle"
mv -- "$bundle_hash.tmp.$$" "$bundle_hash"
trap - EXIT
echo "warehouse release and deterministic bundle built for commit $commit"
