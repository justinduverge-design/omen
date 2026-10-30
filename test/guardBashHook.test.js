"use strict";

// STANDARDS card G: the Bash guard hook must fail closed and block merges outside merge-pr.sh
// that the command line shows (a GraphQL query read from a file is out of reach).
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

// The .codex copy is gitignored (local only), so only the .claude hook is tested here; card H merges them.
const HOOKS = [path.join(__dirname, "..", ".claude/hooks/guard-bash.sh")];
const BASH = spawnSync("bash", ["-c", "command -v bash"], { encoding: "utf8" }).stdout.trim();

function run(hook, input, env = process.env) {
  return spawnSync(BASH, [hook], { input, env, encoding: "utf8" });
}
const call = (command) => JSON.stringify({ tool_input: { command } });

for (const hook of HOOKS) {
  const name = path.relative(path.join(__dirname, ".."), hook);

  test(`${name}: allows ordinary commands and calls with no command`, () => {
    assert.equal(run(hook, call("npm test")).status, 0);
    assert.equal(run(hook, JSON.stringify({ tool_input: {} })).status, 0);
    assert.equal(run(hook, call("scripts/merge-pr.sh 799")).status, 0);
  });

  test(`${name}: fails closed when the input can't be read`, () => {
    const bad = run(hook, "not json");
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /could not read the command/);
    const noPython = run(hook, call("npm test"), { PATH: "/nonexistent" });
    assert.equal(noPython.status, 2);
  });

  test(`${name}: blocks merges outside merge-pr.sh`, () => {
    for (const command of [
      "gh pr merge 799 --squash",
      "gh api -X PUT repos/o/r/pulls/799/merge",
      "gh api --method PUT /repos/o/r/pulls/799/merge -f merge_method=squash",
      "gh api -X PUT repos/o/r/pulls/$N/merge",
      'gh api -X PUT repos/o/r/pulls/"799"/merge',
      "curl -X PUT https://api.github.com/repos/o/r/pulls/1/merge",
      "gh pr merge 1 # scripts/merge-pr.sh",
      "gh api graphql -f query='mutation { mergePullRequest(input:{}) { clientMutationId } }'",
    ]) {
      assert.equal(run(hook, call(command)).status, 2, command);
    }
    assert.equal(run(hook, call("gh api repos/o/r/pulls/799")).status, 0);
    assert.equal(run(hook, call("gh api repos/o/r/pulls/799/merges")).status, 0);
  });
}
