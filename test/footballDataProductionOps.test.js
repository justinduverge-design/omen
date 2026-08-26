"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { assertLocalVaultRoot } = require("../src/services/footballData/rawVault");
const {
  FIXED_CONTAINER_STATE_ROOT,
  REQUIRED_ALERT_CODES,
  buildPayloadFreeStatus,
  captureProductionSet,
  classifyProductionFailure,
  parseArgs,
  recordProductionFailure,
  validateProductionBatch,
} = require("../src/services/footballData/productionRunner");

test("the local CLI still refuses the host production root while the production CLI exposes no root option", () => {
  assert.throws(
    () => assertLocalVaultRoot("/var/lib/omen-football-data/vault"),
    (error) => error.code === "PRODUCTION_ROOT_REFUSED",
  );
  assert.equal(FIXED_CONTAINER_STATE_ROOT, "/state");
  assert.deepEqual(parseArgs(["capture-set", "--season", "2026"]), {
    command: "capture-set",
    season: 2026,
  });
  assert.throws(() => parseArgs(["capture-set", "--root", "/tmp/elsewhere"]), /unsupported option --root/);
  assert.throws(() => parseArgs(["capture-set", "--season", "latest"]), /season/);
});

test("production failures map to all seven payload-free alert families without carrying messages", () => {
  const cases = [
    ["RUNNER_EXIT", "job_failure"],
    ["SOURCE_UNAVAILABLE", "source_loss"],
    ["SCHEMA_DRIFT", "schema_drift"],
    ["SOURCE_STALE", "stale_data"],
    ["DISK_LOW", "disk_low"],
    ["WITNESS_MISMATCH", "witness_mismatch"],
    ["WITNESS_OUTAGE", "witness_outage"],
  ];
  assert.deepEqual([...REQUIRED_ALERT_CODES].sort(), cases.map((entry) => entry[1]).sort());
  for (const [input, expected] of cases) {
    assert.deepEqual(classifyProductionFailure({ code: input, message: "private payload" }), {
      code: expected,
      severity: expected === "witness_mismatch" || expected === "schema_drift" ? "critical" : "high",
    });
  }
});

test("a failed production job retains both job-failure and its specific fail-closed cause", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omen-football-failure-test-"));
  const status = await recordProductionFailure({
    stateRoot: root,
    command: "capture-set",
    error: { code: "SOURCE_UNAVAILABLE", message: "private upstream detail" },
    now: () => new Date("2026-08-26T18:00:00.000Z"),
  });
  assert.deepEqual(status.alerts, [
    { code: "job_failure", severity: "high" },
    { code: "source_loss", severity: "high" },
  ]);
  assert.equal(JSON.stringify(status).includes("private upstream detail"), false);
});

test("the KVM1 status export contains hashes and state only", () => {
  const status = buildPayloadFreeStatus({
    generatedAt: "2026-08-26T18:00:00.000Z",
    job: "capture-set",
    state: "pass",
    batchId: "20260826T180000000Z-1234567890abcdef",
    datasets: {
      stats_player: { sha256: "a".repeat(64), byteLength: 123 },
      stats_team: { sha256: "b".repeat(64), byteLength: 456 },
      schedules: { sha256: "c".repeat(64), byteLength: 789 },
    },
    alerts: [],
    sourceUrl: "https://example.invalid/private",
    rawRows: [{ player_name: "must-not-leak" }],
  });
  assert.equal(status.schema, "omen-football-production-status.v1");
  assert.equal(status.datasets.stats_player.sha256, "a".repeat(64));
  assert.equal(status.datasets.stats_player.byte_length, 123);
  assert.equal(JSON.stringify(status).includes("example.invalid"), false);
  assert.equal(JSON.stringify(status).includes("must-not-leak"), false);
});

test("capture-set records one exact immutable manifest per admitted dataset and validation reopens those exact paths", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omen-football-production-test-"));
  const calls = [];
  const hashes = {
    stats_player: "a".repeat(64),
    stats_team: "b".repeat(64),
    schedules: "c".repeat(64),
  };
  const captured = await captureProductionSet({
    stateRoot: root,
    season: 2026,
    now: () => new Date("2026-08-26T18:00:00.000Z"),
    captureImpl: async ({ dataset, season, root: vaultRoot, userAgent }) => {
      calls.push({ dataset, season, vaultRoot, userAgent });
      const manifestPath = path.join(vaultRoot, "manifests", dataset, `${dataset}.json`);
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      const manifest = {
        snapshot_id: `${dataset}-exact-snapshot`,
        raw: { sha256: hashes[dataset], byte_length: dataset.length * 100 },
      };
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
      return { manifest, manifestPath, rawCreated: true };
    },
  });
  assert.deepEqual(calls.map((call) => call.dataset), ["stats_player", "stats_team", "schedules"]);
  assert.ok(calls.every((call) => call.userAgent === "OmenFootballDataCollector/1.0 (production)"));
  assert.equal(captured.batch.schema, "omen-football-production-capture-batch.v1");
  assert.equal(captured.batch.publication_authorized, false);
  assert.equal(captured.batch.production_scoring_authorized, false);

  const reopened = [];
  const validated = await validateProductionBatch({
    stateRoot: root,
    batchId: captured.batch.batch_id,
    now: () => new Date("2026-08-26T18:01:00.000Z"),
    readImpl: async ({ root: vaultRoot, manifestPath, expectedDataset }) => {
      reopened.push({ vaultRoot, manifestPath, expectedDataset });
      const bytes = fs.readFileSync(manifestPath);
      return {
        manifestHash: require("node:crypto").createHash("sha256").update(bytes).digest("hex"),
        manifest: JSON.parse(bytes),
      };
    },
  });
  assert.deepEqual(reopened.map((entry) => entry.expectedDataset), ["stats_player", "stats_team", "schedules"]);
  assert.equal(validated.receipt.status, "pass");
  assert.equal(validated.receipt.batch_id, captured.batch.batch_id);
  assert.equal(validated.receipt.publication_authorized, false);
});

test("the runner wrapper pins an image digest and applies every required Docker restriction", () => {
  const wrapper = fs.readFileSync(path.join(__dirname, "..", "ops", "football-data", "kvm1", "omen-football-run"), "utf8");
  assert.match(wrapper, /sha256:\[a-f0-9\]\{64\}/);
  assert.match(wrapper, /--user/);
  assert.match(wrapper, /--cap-drop ALL/);
  assert.match(wrapper, /--security-opt no-new-privileges/);
  assert.match(wrapper, /--read-only/);
  assert.match(wrapper, /--cpus 1\.0/);
  assert.match(wrapper, /\/var\/lib\/omen-football-data:\/state:rw/);
  assert.doesNotMatch(wrapper, /\.env|env-file/);
});

test("the Command Center witness imports only the Python standard library and emits bounded signal JSON", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omen-football-witness-test-"));
  const script = path.join(__dirname, "..", "ops", "football-data", "command-center", "omen_football_witness.py");
  const source = fs.readFileSync(script, "utf8");
  assert.doesNotMatch(source, /requests|httpx|pydantic|yaml|numpy|pandas/);
  const run = spawnSync("python3", [script, "exercise", "--root", root, "--code", "witness_outage", "--state", "active"], {
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  const signal = JSON.parse(fs.readFileSync(path.join(root, "signals.json"), "utf8"));
  assert.deepEqual(signal.conditions, [{ code: "witness_outage", severity: "high" }]);
  assert.equal(JSON.stringify(signal).length < 2048, true);
});

test("the witness compares all exact dataset hashes and fails closed on mismatch or outage", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "omen-football-witness-compare-"));
  const script = path.join(__dirname, "..", "ops", "football-data", "command-center", "omen_football_witness.py");
  const hashes = { stats_player: "a".repeat(64), stats_team: "b".repeat(64), schedules: "c".repeat(64) };
  fs.mkdirSync(path.join(root, "status"), { recursive: true });
  fs.writeFileSync(path.join(root, "status", "current.json"), `${JSON.stringify({
    schema: "omen-football-witness-current.v1",
    generated_at_utc: "2026-08-26T18:00:00.000Z",
    datasets: Object.fromEntries(Object.entries(hashes).map(([name, sha256]) => [name, { sha256 }])),
  })}\n`);
  const remote = path.join(root, "remote.json");
  fs.writeFileSync(remote, `${JSON.stringify({
    schema: "omen-football-production-status.v1",
    generated_at_utc: "2026-08-26T18:00:00.000Z",
    state: "pass",
    datasets: Object.fromEntries(Object.entries(hashes).map(([name, sha256]) => [name, { sha256, byte_length: 1 }])),
    alerts: [],
  })}\n`);

  const match = spawnSync("python3", [script, "compare", "--root", root, "--status-file", remote, "--now", "2026-08-26T18:10:00.000Z", "--minimum-free-bytes", "0"], { encoding: "utf8" });
  assert.equal(match.status, 0, match.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "signals.json"), "utf8")).conditions, []);
  assert.equal(JSON.parse(match.stdout).status, "match");

  const changed = JSON.parse(fs.readFileSync(remote, "utf8"));
  changed.datasets.stats_player.sha256 = "d".repeat(64);
  fs.writeFileSync(remote, `${JSON.stringify(changed)}\n`);
  const mismatch = spawnSync("python3", [script, "compare", "--root", root, "--status-file", remote, "--now", "2026-08-26T18:10:00.000Z", "--minimum-free-bytes", "0"], { encoding: "utf8" });
  assert.equal(mismatch.status, 2, mismatch.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "signals.json"), "utf8")).conditions, [{ code: "witness_mismatch", severity: "critical" }]);

  const outage = spawnSync("python3", [script, "compare", "--root", root, "--status-file", path.join(root, "missing.json"), "--now", "2026-08-26T18:10:00.000Z", "--minimum-free-bytes", "0"], { encoding: "utf8" });
  assert.equal(outage.status, 3, outage.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "signals.json"), "utf8")).conditions, [{ code: "witness_outage", severity: "high" }]);
});

test("the dispatcher gives football alerts independent delivery-before-state and one recovery", () => {
  const dispatcher = fs.readFileSync(path.join(__dirname, "..", "ops", "command-center", "slops-alert-dispatcher"), "utf8");
  assert.match(dispatcher, /football_state=\/var\/lib\/slops-alerting\/football-last-signature/);
  assert.match(dispatcher, /SLOPS RECOVERY: Omen football-data alert conditions are healthy again/);
  const footballBlock = dispatcher.slice(dispatcher.indexOf('if [ "$football" != "$football_old" ]'), dispatcher.indexOf('sig="$(printf'));
  assert.ok(footballBlock.indexOf("send ") < footballBlock.indexOf("football_state\""));
  assert.doesNotMatch(dispatcher.match(/sig="\$\(printf[^\n]+/)?.[0] || "", /football/);
  const exercises = fs.readFileSync(path.join(__dirname, "..", "ops", "football-data", "command-center", "omen-football-alert-exercises"), "utf8");
  for (const code of REQUIRED_ALERT_CODES) assert.match(exercises, new RegExp(`\\b${code}\\b`));
  assert.ok(exercises.indexOf("slops-alert-dispatcher") < exercises.indexOf("football-last-signature"));
});
