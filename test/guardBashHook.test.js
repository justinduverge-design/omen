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

  test(`${name}: refuses the founder's --justin flag to agents`, () => {
    assert.equal(run(hook, call("scripts/merge-pr.sh 799 --justin")).status, 2);
    assert.equal(run(hook, call("bash scripts/merge-pr.sh 799 --merge --justin")).status, 2);
    for (const command of [
      "scripts/merge-pr.sh 799 \\\n  --justin",
      "scripts/merge-pr.sh 799\n--justin",
      'scripts/merge-pr.sh 799 --"justin"',
      "J=--justin; scripts/merge-pr.sh 799 $J",
      "x=merge; scripts/${x}-pr.sh 799 --justin",
    ]) {
      assert.equal(run(hook, call(command)).status, 2, command);
    }
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

  // 2026-11-05: a merge typed inside a quoted shell wrapper passed, because the merge rule wanted a space
  // or ;&| before "gh". The REST, GraphQL and push rules are unanchored; these lock that in.
  test(`${name}: blocks merges and pushes inside a shell wrapper or subshell`, () => {
    for (const command of [
      "/bin/zsh -lc 'gh pr merge 1 --merge'",
      'bash -c "gh pr merge 1"',
      "(gh pr merge 2)",
      "echo $(gh pr merge 3)",
      "echo `gh pr merge 4`",
      "/opt/homebrew/bin/gh pr merge 5",
      "gh\tpr\tmerge 6",
      "gh pr -R o/r merge 7",
      "gh pr --repo o/r merge 8",
      "gh pr --repo=o/r merge 9",
      "gh pr -Ro/r merge 9",
      "gh pr \\\n  merge 9",
      "gh pr 'mer'ge 9",
      "g''h pr merge 9",
      "bash -c \"zsh -lc 'gh pr merge 10'\"",
      "bash -c 'gh api -X PUT repos/o/r/pulls/1/merge'",
      "zsh -lc 'gh api graphql -f query=\"mutation { mergePullRequest(input:{}) { clientMutationId } }\"'",
      "bash -c 'git push origin main'",
      "zsh -lc 'git push origin HEAD:main'",
      "sh -c 'git push -f origin feat'",
      "bash -c 'git push --force origin feat'",
    ]) {
      assert.equal(run(hook, call(command)).status, 2, command);
    }
    for (const command of [
      "bash -c 'gh pr view 1'",
      "zsh -lc 'git push -u origin feat/x'",
      "bash -c 'scripts/merge-pr.sh 799'",
      "ghpr merge-notes",
      "gh pr view 1 --json mergeable",
    ]) {
      assert.equal(run(hook, call(command)).status, 0, command);
    }
  });

  // production is what deploys (deploy.yml); only the founder's release-PR merge moves it.
  test(`${name}: blocks pushes to production and manual deploy runs`, () => {
    for (const command of [
      "git push origin production",
      "git push origin HEAD:production",
      "bash -c 'git push origin production'",
      "git push origin refs/heads/production",
      'git push origin "production"',
      "gh workflow run deploy.yml --ref production",
      "gh workflow run deploy-kvm1-tailscale-fallback.yml",
      "gh workflow run --ref main deploy.yml",
      "gh workflow run 'Deploy to Hostinger KVM1 over Tailscale'",
      "gh workflow run 123456",
      "GH workflow run x",
      "gh workflow run release-pr.yml; gh workflow run deploy.yml",
      "gh api -X POST repos/o/omen/actions/workflows/deploy.yml/dispatches -f ref=production",
      "gh api -X POST repos/o/omen/actions/workflows/123456/dispatches",
    ]) {
      assert.equal(run(hook, call(command)).status, 2, command);
    }
    for (const command of [
      "gh workflow run release-pr.yml",
      "gh workflow list",
      "git push -u origin claude/deploy-on-release",
      "git push -u origin claude/omen-production-notes",
      "git push -u origin feature/main-menu",
      "git log origin/production..origin/main",
    ]) {
      assert.equal(run(hook, call(command)).status, 0, command);
    }
  });
}
