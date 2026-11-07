// scripts/merge-pr.sh merge_class + unsafe_files: which paths an agent may merge alone, per author and title.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const script = new URL("../scripts/merge-pr.sh", import.meta.url).pathname;

// {unsafe: [paths an agent may not merge]} for one PR, or {refused: message} when the class check refuses.
function check(author, title, files) {
  const r = spawnSync(
    "bash",
    [
      "-c",
      'MERGE_PR_SOURCE_ONLY=1 source "$0"; ok=$(merge_class "$1" "$2") || exit 1; unsafe_files "$ok"',
      script,
      author,
      title,
    ],
    { encoding: "utf8", input: files.join("\n") },
  );
  if (r.status !== 0) return { refused: r.stderr.trim() };
  return { unsafe: r.stdout.split("\n").filter(Boolean) };
}

test("people: docs and tests merge alone, code does not", () => {
  assert.deepEqual(
    check("justinduverge-design", "Tests: cover x", [
      "test/a.test.js",
      "src/x/__tests__/b.js",
      "README.md",
      "Direction/m.md",
      "warehouse/test/test_x.py",
    ]).unsafe,
    [],
  );
  assert.deepEqual(check("someone", "Fix", ["src/server.js", "test/a.test.js", "package.json"]).unsafe, [
    "package.json",
    "src/server.js",
  ]);
});

test("test-shaped paths that are CI, migrations, rules or auth still wait", () => {
  const files = [
    ".github/actions/test/action.yml",
    "warehouse/migrations/test_x.py",
    "test/auth.test.js",
    "test/CLAUDE.md",
    "scripts/checks/test/x.test.js",
  ];
  assert.deepEqual([...check("someone", "Tests", files).unsafe].sort(), [...files].sort());
  // Compared as sorted sets: merge-pr.sh `sort -u` follows the locale, JS sort does not.
});

test("dependabot patch and minor bumps of manifests merge alone", () => {
  assert.deepEqual(
    check("app/dependabot", "build(deps-dev): Bump impeccable from 4.7.0 to 4.8.0 in the development-tooling group", [
      "package.json",
      "package-lock.json",
    ]).unsafe,
    [],
  );
  assert.deepEqual(
    check("app/dependabot", "Bump serde from 1.0.1 to 1.0.2", ["Cargo.toml", "Cargo.lock", "crates/a/Cargo.toml"])
      .unsafe,
    [],
  );
});

test("dependabot workflow bumps and other files still wait", () => {
  assert.deepEqual(
    check("app/dependabot", "build(deps): Bump Swatinem/rust-cache from 2.9.2 to 2.9.3", [
      ".github/workflows/rust-ci.yml",
    ]).unsafe,
    [".github/workflows/rust-ci.yml"],
  );
});

test("major, 0.x minor, unreadable and group bumps are refused", () => {
  assert.match(check("app/dependabot", "Bump x from 4.7.0 to 5.0.0", ["package.json"]).refused, /major bump/);
  assert.match(check("app/dependabot", "Bump x from 0.3.1 to 0.4.0", ["package.json"]).refused, /major bump/);
  assert.match(
    check("app/dependabot", "Bump a from 1.0.0 to 1.1.0 and b from 2.0.0 to 3.0.0", ["package.json"]).refused,
    /major bump/,
  );
  assert.match(
    check("app/dependabot", "Bump a from 1.0.0 to 1.1.0 and b from 1 to 2", ["package.json"]).refused,
    /can't read/,
  );
  assert.match(
    check("app/dependabot", "Bump the production-dependencies group with 4 updates", ["package.json"]).refused,
    /no from\/to/,
  );
});
