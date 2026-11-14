"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  VERSION,
  SQL,
  summarize,
  collectEvidence,
  gradingSwitch,
  lastJob,
} = require("../infra/warehouse/monitor/sight-status");

const NOW = Date.parse("2026-11-07T15:00:00Z");
const SCRIPT = path.join(__dirname, "..", "infra", "warehouse", "monitor", "sight-status.js");

const pos = (n, sightSame, provider) => ({
  n: n + 4,
  sight: { corr: 0.5, mae: 6 },
  ppg_to_date: { corr: 0.4, mae: 7 },
  provider: { n, corr: 0.6, mae: provider, sight_corr_same_players: 0.5, sight_mae_same_players: sightSame },
});

function evidence() {
  return {
    runs: [
      {
        metric: "omen_sight",
        version: "v1",
        season: 2026,
        week: 8,
        state: "succeeded",
        finished_at: "2026-11-01T12:20:00Z",
      },
      {
        metric: "omen_sight",
        version: "v1",
        season: 2026,
        week: 9,
        state: "succeeded",
        finished_at: "2026-11-06T12:21:00Z",
      },
      {
        metric: "omen_sight",
        version: "v2",
        season: 2026,
        week: 9,
        state: "failed",
        finished_at: "2026-11-06T12:22:00Z",
        error_code: "values_invalid",
      },
      {
        metric: "omen_sight_accuracy",
        version: "v1",
        season: 2026,
        week: 9,
        state: "succeeded",
        finished_at: "2026-11-05T12:30:00Z",
        // 10 RBs: Sight 5 vs provider 6; 30 WRs: Sight 7 vs provider 6. Weighted: 6.5 vs 6.0.
        positions: {
          RB: pos(10, 5, 6),
          WR: pos(30, 7, 6),
          player_id: { provider: { n: 1, mae: 1, sight_mae_same_players: 1 } },
        },
      },
      {
        metric: "omen_sight_accuracy",
        version: "v1",
        season: 2026,
        week: 10,
        state: "succeeded",
        finished_at: "2026-11-06T12:30:00Z",
        positions: { RB: pos(10, 4, 6), QB: { n: 3, provider: { n: 2, reason: "no_stored_provider_projections" } } },
      },
      {
        metric: "omen_sight_accuracy",
        version: "v2",
        season: 2026,
        week: 10,
        state: "failed",
        finished_at: "2026-11-06T12:31:00Z",
        error_code: "Bad Code; DROP",
      },
    ],
    job: {
      finished_at: "2026-11-06T12:35:00.000Z",
      state: "succeeded",
      code: null,
      sight: { state: "succeeded", values: 900, code: null },
      grading: null,
    },
    grading: { enabled: true, version: "v2" },
    served: { enabled: false, version: "v1" },
  };
}

test("summary: computed and graded weeks per version, Sight against the provider on the same players", () => {
  const out = summarize(evidence(), { nowMs: NOW });
  assert.equal(out.contract_version, VERSION);
  assert.equal(out.checker_completed, true);
  assert.equal(out.generated_at, "2026-11-07T15:00:00.000Z");
  assert.equal(out.season, 2026);
  assert.deepEqual(out.switch, {
    grading: { enabled: true, version: "v2" },
    served: { enabled: false, version: "v1" },
    served_error: null,
  });

  const v1 = out.versions.v1;
  assert.deepEqual(v1.computed, { weeks: 2, latest_week: 9, latest_change_at: "2026-11-06T12:21:00.000Z", failed: [] });
  assert.deepEqual(v1.graded.weeks, [
    { week: 9, n: 40, sight_mae: 6.5, provider_mae: 6, beat: false },
    { week: 10, n: 10, sight_mae: 4, provider_mae: 6, beat: true },
  ]);
  // (40*6.5 + 10*4) / 50 = 6.0 against (40*6 + 10*6) / 50 = 6.0
  assert.deepEqual(v1.graded.season, { n: 50, sight_mae: 6, provider_mae: 6, weeks_compared: 2, weeks_beat: 1 });
  assert.deepEqual(v1.graded.by_position, {
    RB: { n: 20, sight_mae: 4.5, provider_mae: 6 },
    WR: { n: 30, sight_mae: 7, provider_mae: 6 },
  });

  const v2 = out.versions.v2;
  assert.deepEqual(v2.computed.failed, [{ week: 9, code: "values_invalid" }]);
  assert.deepEqual(v2.graded.failed, [{ week: 10, code: "unrecognized" }]);
  assert.equal(v2.graded.season, null);
});

test("summary carries no entity ids, no free text and no keys a grader didn't vouch for", () => {
  const e = evidence();
  e.runs.push({ metric: "omen_sight", version: "../etc", season: 2026, week: 9, state: "succeeded" });
  e.runs.push({ metric: "omen_sight", version: "v1", season: 2026, week: 99, state: "succeeded" });
  const text = JSON.stringify(summarize(e, { nowMs: NOW }));
  assert.doesNotMatch(text, /player_id|DROP|\.\.\/etc|sight_corr/);
  assert.equal(summarize(e, { nowMs: NOW }).versions.v1.computed.weeks, 2);
});

test("each missing source says so instead of passing", () => {
  const out = summarize({ db_error: "db_unreadable", job_error: "journal_unreadable" }, { nowMs: NOW });
  assert.equal(out.checker_completed, false);
  assert.equal(out.db_error, "db_unreadable");
  assert.equal(out.job, null);
  assert.equal(out.job_error, "journal_unreadable");
  assert.equal(out.switch.grading, null);
  assert.equal(out.switch.served, null);
  assert.equal(out.switch.served_error, "not_reported");
  assert.deepEqual(out.versions, {});
});

test("the grading switch is read from this release's compose file", () => {
  const compose = fs.readFileSync(path.join(__dirname, "..", "infra", "warehouse", "docker-compose.yml"), "utf8");
  const parsed = gradingSwitch(compose);
  assert.equal(typeof parsed.enabled, "boolean");
  assert.match(parsed.version, /^v[0-9]+$/);
  assert.deepEqual(gradingSwitch('      SIGHT_ENABLED: "false"\n'), { enabled: false, version: "v1" });
  assert.deepEqual(gradingSwitch(""), { enabled: false, version: "v1" });
});

test("the last finished ingest comes from the journal; other lines are ignored", () => {
  const line = (us, message) => JSON.stringify({ __REALTIME_TIMESTAMP: String(us), MESSAGE: message });
  const job = (state, extra = {}) => JSON.stringify({ job: "football-warehouse-current-season", state, ...extra });
  const journal = [
    line(1762430000000000, job("succeeded", { derived: { sight: { state: "unchanged", valueCount: 0 } } })),
    line(1762440000000000, "Starting omen-warehouse-ingest.service"),
    line(1762450000000000, job("started")),
    line(
      1762516800000000,
      job("succeeded", {
        derived: {
          sight: { state: "succeeded", valueCount: 812 },
          sightAccuracy: {
            state: "unchanged",
            version: "v2",
            versions: {
              v1: { state: "unchanged", gradedWeeks: 0 },
              v2: { state: "succeeded", gradedWeeks: 1 },
              "x;y": {},
            },
          },
        },
      }),
    ),
    "not json",
  ].join("\n");
  assert.deepEqual(lastJob(journal), {
    finished_at: "2025-11-07T12:00:00.000Z",
    state: "succeeded",
    code: null,
    sight: { state: "succeeded", values: 812, code: null },
    grading: {
      state: "unchanged",
      code: null,
      versions: { v1: { state: "unchanged", graded_weeks: 0 }, v2: { state: "succeeded", graded_weeks: 1 } },
    },
  });
  assert.equal(lastJob(line(1, job("failed", { code: "ingest_disabled" }))).code, "ingest_disabled");
  assert.equal(lastJob(""), null);
});

test("collector: read-only SQL, local API only, no env file, and each source fails on its own", async () => {
  assert.match(SQL.replace(/^--.*\n/gm, ""), /^begin transaction read only;/);
  assert.doesNotMatch(SQL, /football_metric_values|insert|update|delete/i);
  const calls = [];
  const urls = [];
  const files = [];
  const evidenceOk = await collectEvidence({
    run: (cmd, args) => {
      calls.push([cmd, args]);
      if (cmd === "docker") return JSON.stringify(evidence().runs);
      return "";
    },
    fetchImpl: async (url) => {
      urls.push(url);
      return { json: async () => ({ contract_version: "system-version.v1", sight: { enabled: true, version: "v2" } }) };
    },
    readFile: (p) => {
      files.push(p);
      return 'SIGHT_ENABLED: "true"\nSIGHT_VERSION: "v2"\n';
    },
  });
  assert.equal(evidenceOk.runs.length, 6);
  assert.equal(evidenceOk.job_error, "no_finished_ingest_in_3_days");
  assert.deepEqual(evidenceOk.served, { enabled: true, version: "v2" });
  assert.deepEqual(urls, ["http://127.0.0.1:3000/api/version"]);
  assert.equal(files.length, 1);
  assert.match(files[0], /infra[/\\]warehouse[/\\]docker-compose\.yml$/);
  assert.deepEqual(
    calls.map(([c]) => c),
    ["docker", "journalctl"],
  );
  assert.doesNotMatch(JSON.stringify([calls, files]), /\.env|password|secret|PGPASSWORD/i);

  const broken = await collectEvidence({
    run: () => {
      throw new Error("nope");
    },
    fetchImpl: async () => {
      throw new Error("down");
    },
    readFile: () => {
      throw new Error("missing");
    },
  });
  assert.deepEqual(broken, {
    db_error: "db_unreadable",
    job_error: "journal_unreadable",
    grading: null,
    served_error: "api_unreachable",
  });
  assert.equal(summarize(broken, { nowMs: NOW }).checker_completed, false);
});

test("CLI summarizes collected evidence, and fails closed on bad usage", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sight-status-"));
  const file = path.join(dir, "evidence.json");
  fs.writeFileSync(file, JSON.stringify(evidence()));
  const ok = spawnSync(process.execPath, [SCRIPT, "summarize", file, "2026-11-07T15:00:00Z"], { encoding: "utf8" });
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).versions.v1.graded.season.weeks_beat, 1);
  const bad = spawnSync(process.execPath, [SCRIPT, "summarize", "relative.json", "now"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.deepEqual(JSON.parse(bad.stdout), {
    contract_version: VERSION,
    checker_completed: false,
    code: "checker_failure",
  });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("--out writes the report atomically for the timer, and writes the failure line too", async () => {
  const { main } = require("../infra/warehouse/monitor/sight-status");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sight-out-"));
  const file = path.join(dir, "status.json");
  const before = process.exitCode;
  try {
    await main(["--out", file], { collect: async () => evidence() });
    const report = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(report.contract_version, VERSION);
    assert.equal(report.checker_completed, true);
    assert.equal(fs.statSync(file).mode & 0o777, 0o644);
    assert.deepEqual(fs.readdirSync(dir), ["status.json"]);
    await main(["--out", file], {
      collect: async () => {
        throw new Error("boom");
      },
    });
    assert.equal(process.exitCode, 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), {
      contract_version: VERSION,
      checker_completed: false,
      code: "checker_failure",
    });
    process.exitCode = before;
    await main(["--out", "relative.json"], { collect: async () => evidence() });
    assert.equal(process.exitCode, 1);
    assert.equal(fs.existsSync("relative.json"), false);
  } finally {
    process.exitCode = before;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("collector: psql runs in a read-only session, and a bad API reply is not 'unreachable'", async () => {
  const calls = [];
  const e = await collectEvidence({
    run: (cmd, args) => {
      calls.push([cmd, args]);
      return cmd === "docker" ? "[]" : "";
    },
    fetchImpl: async () => ({ ok: false, json: async () => ({ sight: { enabled: true, version: "v2" } }) }),
    readFile: () => "",
  });
  const docker = calls.find(([c]) => c === "docker")[1];
  assert.deepEqual(docker.slice(0, 3), ["exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on"]);
  assert.equal(e.served_error, "api_bad_reply");
  const notJson = await collectEvidence({
    run: () => "[]",
    fetchImpl: async () => ({ ok: true, json: async () => JSON.parse("<html>") }),
    readFile: () => "",
  });
  assert.equal(notJson.served_error, "api_bad_reply");
});

test("the timer's unit runs the release's script as root into its own state dir; the channel only cats it", () => {
  const dir = path.join(__dirname, "..", "infra", "warehouse", "monitor");
  const unit = fs.readFileSync(path.join(dir, "omen-sight-status.service"), "utf8");
  const timer = fs.readFileSync(path.join(dir, "omen-sight-status.timer"), "utf8");
  assert.match(unit, /^ExecStart=\/opt\/omen\/warehouse\/current\/infra\/warehouse\/monitor\/sight-status-run$/m);
  assert.match(unit, /^StateDirectory=omen-sight-status$/m);
  assert.match(unit, /^ProtectSystem=strict$/m);
  assert.doesNotMatch(unit, /EnvironmentFile|\.env/);
  assert.match(timer, /^OnCalendar=\*-\*-\* \*:20:00$/m);
  const exporter = path.join(__dirname, "..", "ops", "football-data", "kvm1", "omen-football-status-export");
  const text = fs.readFileSync(exporter, "utf8");
  assert.match(text, /^ {2}sight-status\) exec cat \/var\/lib\/omen-sight-status\/status\.json ;;$/m);
  const refused = spawnSync("sh", [exporter], {
    env: { PATH: process.env.PATH, SSH_ORIGINAL_COMMAND: "sight-status; id" },
  });
  assert.equal(refused.status, 64);
});

// omen-prod runs Tailscale SSH, which ignores authorized_keys: the export is omen-football-status's login shell,
// run as `<export> -c "<cmd>"` with no SSH_ORIGINAL_COMMAND. A stub `cat` on PATH reports which file it would serve
// (with no arguments it is the real cat, for --help's heredoc).
function exportCall(args, env = {}) {
  const exporter = path.join(__dirname, "..", "ops", "football-data", "kvm1", "omen-football-status-export");
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "status-export-"));
  fs.writeFileSync(path.join(bin, "cat"), '#!/bin/sh\n[ "$#" -eq 0 ] && exec /bin/cat\nprintf "served %s\\n" "$*"\n', {
    mode: 0o755,
  });
  const res = spawnSync("sh", [exporter, ...args], {
    encoding: "utf8",
    env: { PATH: `${bin}:${process.env.PATH}`, ...env },
  });
  fs.rmSync(bin, { recursive: true, force: true });
  return res;
}

test("status export: login shell takes -c, forced command takes SSH_ORIGINAL_COMMAND, default is status", () => {
  const files = {
    status: "/var/lib/omen-football-data/exports/status.json",
    "a4-gates": "/var/lib/omen-a4-gates/state.json",
    "sight-status": "/var/lib/omen-sight-status/status.json",
  };
  for (const [name, file] of Object.entries(files)) {
    for (const res of [exportCall(["-c", name]), exportCall([], { SSH_ORIGINAL_COMMAND: name })]) {
      assert.equal(res.status, 0, `${name}: ${res.stderr}`);
      assert.equal(res.stdout, `served ${file}\n`);
    }
  }
  assert.equal(exportCall([]).stdout, `served ${files.status}\n`);
  // -c wins over a stray SSH_ORIGINAL_COMMAND; the login-shell path never reads it.
  assert.equal(
    exportCall(["-c", "sight-status"], { SSH_ORIGINAL_COMMAND: "status" }).stdout,
    `served ${files["sight-status"]}\n`,
  );
  assert.match(exportCall(["--help"]).stdout, /login shell/);
  assert.equal(exportCall(["--help"]).status, 0);
});

test("status export: anything but exactly one known name exits 64 and serves nothing", () => {
  const refusals = [
    ["-c", "sight-status extra"],
    ["-c", "status; id"],
    ["-c", "id"],
    ["-c", ""],
    ["-c"],
    ["-c", "status", "a4-gates"],
    ["-c", "/usr/lib/openssh/sftp-server"],
    ["-c", "internal-sftp"],
    ["-c", "scp -f /etc/passwd"],
    ["-c", "scp -t /tmp"],
    ["-l"],
    ["status"],
  ];
  for (const args of refusals) {
    const res = exportCall(args);
    assert.equal(res.status, 64, JSON.stringify(args));
    assert.equal(res.stdout, "", JSON.stringify(args));
  }
  for (const cmd of ["sight-status extra", "internal-sftp", "scp -f x", "other"]) {
    const res = exportCall([], { SSH_ORIGINAL_COMMAND: cmd });
    assert.equal(res.status, 64, cmd);
    assert.equal(res.stdout, "", cmd);
  }
});

// KVM1 has no host Node: the runner collects in sh and summarizes in the release's ingest image. Stub docker,
// journalctl and curl on PATH; the stub's `docker run` maps the two read-only mounts and runs this node.
function runner({
  dockerExec = "ok",
  image = `ghcr.io/justinduverge-design/omen-warehouse-ingest@sha256:${"b".repeat(64)}`,
  nodeOut,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sight-run-"));
  const bin = path.join(root, "bin");
  const release = path.join(root, "release");
  const state = path.join(root, "state");
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(release, "infra"), { recursive: true });
  fs.symlinkSync(path.join(__dirname, "..", "infra", "warehouse"), path.join(release, "infra", "warehouse"));
  fs.writeFileSync(path.join(release, "RELEASE-CONTRACT"), `contract_version=x\nworker_image=${image}\n`);
  const log = path.join(root, "calls");
  const runs = path.join(root, "runs.json");
  fs.writeFileSync(runs, JSON.stringify(evidence().runs));
  const stub = (name, body) =>
    fs.writeFileSync(path.join(bin, name), `#!/bin/sh\necho "${name} $*" >> "${log}"\n${body}\n`, { mode: 0o755 });
  stub(
    "docker",
    `case "$1" in
  exec) cat > /dev/null; ${dockerExec === "ok" ? `cat "${runs}"` : "exit 1"} ;;
  run) ${
    nodeOut
      ? `printf '%s\\n' '${nodeOut}'`
      : `w=""; i=""; while [ $# -gt 0 ]; do case "$1" in -v) case "$2" in *:/w:ro) w="\${2%:/w:ro}";; *:/in:ro) i="\${2%:/in:ro}";; esac; shift;; esac; shift; done
       exec "${process.execPath}" "$w/monitor/sight-status.js" from-dir "$i"`
  } ;;
esac`,
  );
  stub("journalctl", "exit 1");
  stub("curl", `echo '{"contract_version":"system-version.v1","sight":{"enabled":true,"version":"v2"}}'`);
  const res = spawnSync("sh", [path.join(__dirname, "..", "infra", "warehouse", "monitor", "sight-status-run")], {
    encoding: "utf8",
    env: { PATH: `${bin}:${process.env.PATH}`, OMEN_WAREHOUSE_RELEASE: release, OMEN_SIGHT_STATE_DIR: state },
  });
  const out = { res, calls: fs.readFileSync(log, "utf8"), files: fs.readdirSync(state) };
  out.report = JSON.parse(fs.readFileSync(path.join(state, "status.json"), "utf8"));
  out.mode = fs.statSync(path.join(state, "status.json")).mode & 0o777;
  fs.rmSync(root, { recursive: true, force: true });
  return out;
}

test("runner: collects on the host, summarizes in the pinned image with no network, publishes atomically", () => {
  const ok = runner();
  assert.equal(ok.res.status, 0, ok.res.stderr);
  assert.equal(ok.report.checker_completed, true);
  assert.equal(ok.report.versions.v1.graded.season.weeks_beat, 1);
  assert.deepEqual(ok.report.switch.served, { enabled: true, version: "v2" });
  assert.equal(ok.report.job_error, "journal_unreadable");
  assert.equal(ok.mode, 0o644);
  assert.deepEqual(ok.files, ["status.json"]);
  const run = ok.calls.split("\n").find((l) => l.startsWith("docker run"));
  for (const flag of ["--network none", "--read-only", "--pull never", "--cap-drop ALL", "/w:ro", "/in:ro"])
    assert.ok(run.includes(flag), flag);
  assert.match(
    ok.calls,
    /docker exec -i -e PGOPTIONS=-c default_transaction_read_only=on omen_football_warehouse psql/,
  );
  assert.doesNotMatch(ok.calls, /\.env/);

  const noDb = runner({ dockerExec: "fail" });
  assert.equal(noDb.report.checker_completed, false);
  assert.equal(noDb.report.db_error, "db_unreadable");

  const failure = { contract_version: VERSION, checker_completed: false, code: "checker_failure" };
  assert.deepEqual(runner({ image: "evil/image:latest" }).report, failure);
  assert.deepEqual(runner({ nodeOut: '{"contract_version":"other"}' }).report, failure);
  assert.deepEqual(runner({ nodeOut: "not json" }).report, failure);
});
