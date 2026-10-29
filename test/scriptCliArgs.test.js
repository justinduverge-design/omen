"use strict";

// Pins the flag behaviour of the seven scripts that moved from hand-written
// loops to node:util parseArgs (STANDARDS card B). Written against the old
// parsers first, so a pass here means the swap kept each script's behaviour.

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { CliArgsError, parseCliArgs } = require("../scripts/lib/cli-args");
const footballData = require("../scripts/football-data");
const staging = require("../scripts/football-data-staging");
const readiness = require("../scripts/football-data-readiness");
const acceptance = require("../scripts/validate-football-acceptance");
const ratQb = require("../scripts/rat-qb-face-validity");
const fixture = require("../scripts/build-football-intelligence-fixture");
const backtest = require("../scripts/omen-projections-backtest");

test("cli-args refuses repeats, empty values and unknown flags with the argument named", () => {
  const options = { a: { type: "string" } };
  assert.deepEqual(parseCliArgs(["--a", "1"], options).values, { a: "1" });
  for (const [argv, reason, argument] of [
    [["--a", "1", "--a", "2"], "duplicate", "--a"],
    [["--a", ""], "empty-value", "--a"],
    [["--b", "1"], "unknown", "--b"],
    [["--a"], "missing-value", "--a"],
    [["x"], "positional", "x"],
  ]) {
    assert.throws(
      () => parseCliArgs(argv, options),
      (error) => error instanceof CliArgsError && error.reason === reason && error.argument === argument,
    );
  }
});

for (const [name, mod, a, b] of [
  ["football-data", footballData, "root", "out"],
  ["football-data-staging", staging, "hash", "backup-root"],
]) {
  test(`${name}: command plus --key value options`, () => {
    for (const argv of [[], ["--help"], ["-h"]]) assert.deepEqual(mod.parseArgs(argv), { command: "help" });
    assert.deepEqual(mod.parseArgs(["cmd", `--${a}`, "/r", `--${b}`, "/o"]), { command: "cmd", [a]: "/r", [b]: "/o" });
    assert.throws(() => mod.parseArgs(["cmd", `--${a}`]), new RegExp(`invalid argument near --${a}`));
    assert.throws(() => mod.parseArgs(["cmd", `--${a}`, `--${b}`, "/o"]), new RegExp(`invalid argument near --${a}`));
    assert.throws(() => mod.parseArgs(["cmd", `--${a}`, ""]), new RegExp(`invalid argument near --${a}`));
    assert.throws(() => mod.parseArgs(["cmd", "stray"]), /invalid argument near stray/);
    assert.throws(() => mod.parseArgs(["cmd", `--${a}`, "/a", `--${a}`, "/b"]), new RegExp(`duplicate option --${a}`));
    // Changed by card B: a flag no subcommand takes is refused while parsing, not later in main().
    assert.throws(() => mod.parseArgs(["cmd", "--nope", "x"]), /unsupported option --nope/);
  });
}

test("football-data-readiness: assess --evidence only", () => {
  assert.deepEqual(readiness.parseArgs(["assess", "--evidence", "e.json"]), {
    command: "assess",
    evidence: path.resolve("e.json"),
  });
  for (const argv of [
    [],
    ["assess"],
    ["assess", "--evidence"],
    ["assess", "--evidence", ""],
    ["assess", "--host", "kvm1"],
    ["assess", "--evidence", "a", "--evidence", "b"],
    ["assess", "--evidence", "a", "extra"],
    ["activate", "--evidence", "e.json"],
  ]) {
    assert.throws(() => readiness.parseArgs(argv), /Usage:/, JSON.stringify(argv));
  }
});

test("validate-football-acceptance: --acceptance and --receipt", () => {
  assert.deepEqual(acceptance.parseArgs(["--acceptance", "a", "--receipt", "r"]), { acceptance: "a", receipt: "r" });
  assert.throws(() => acceptance.parseArgs(["--acceptance", "a"]), /missing required option --receipt/);
  assert.throws(() => acceptance.parseArgs(["--acceptance"]), /invalid argument near --acceptance/);
  assert.throws(() => acceptance.parseArgs(["--acceptance", "--receipt", "r"]), /invalid argument near --acceptance/);
  assert.throws(() => acceptance.parseArgs(["stray"]), /invalid argument near stray/);
  assert.throws(
    () => acceptance.parseArgs(["--acceptance", "a", "--acceptance", "b", "--receipt", "r"]),
    /duplicate option --acceptance/,
  );
});

test("rat-qb-face-validity: --season required, numeric flags checked", () => {
  assert.deepEqual(ratQb.parseArgs(["--season", "2025"]), { season: 2025, week: null, socket: null, limit: 10 });
  assert.deepEqual(ratQb.parseArgs(["--season", "2025", "--week", "4", "--limit", "5", "--socket", "/s"]), {
    season: 2025,
    week: 4,
    socket: "/s",
    limit: 5,
  });
  assert.throws(() => ratQb.parseArgs(["--season", "2025", "--bogus", "1"]), /unknown flag --bogus/);
  assert.throws(() => ratQb.parseArgs([]), /--season is required/);
  assert.throws(() => ratQb.parseArgs(["--season", "x"]), /--season is required/);
  assert.throws(() => ratQb.parseArgs(["--season", "2025", "--week", "1.5"]), /--week must be an integer/);
  assert.throws(() => ratQb.parseArgs(["--season", "2025", "--limit", "51"]), /--limit must be 1-50/);
});

test("build-football-intelligence-fixture: --source-dir and --output-dir resolve to paths", () => {
  assert.deepEqual(fixture.parseArgs([]), {});
  assert.deepEqual(fixture.parseArgs(["--source-dir", "s", "--output-dir", "o"]), {
    sourceDir: path.resolve("s"),
    outputDir: path.resolve("o"),
  });
  assert.throws(() => fixture.parseArgs(["--other", "x"]), /unknown argument: --other/);
  assert.throws(() => fixture.parseArgs(["stray"]), /unknown argument: stray/);
  assert.throws(() => fixture.parseArgs(["--source-dir"]), /--source-dir requires a path/);
  assert.throws(() => fixture.parseArgs(["--source-dir", "--output-dir", "o"]), /--source-dir requires a path/);
});

test("omen-projections-backtest: defaults, --sleeper boolean, validation", () => {
  assert.deepEqual(backtest.parseArgs(["--seasons", "2023-2024", "--out-dir", "/tmp/x"]), {
    seasons: [2023, 2024],
    warmup: 2,
    positions: ["QB", "RB", "WR", "TE"],
    sleeper: false,
    socket: null,
    urlFile: null,
    outDir: "/tmp/x",
  });
  const full = backtest.parseArgs([
    "--sleeper",
    "--seasons",
    "2024",
    "--warmup",
    "0",
    "--positions",
    "qb, wr",
    "--socket",
    "/s",
    "--url-file",
    "/u",
    "--out-dir",
    "/tmp/x",
  ]);
  assert.equal(full.sleeper, true);
  assert.equal(full.warmup, 0);
  assert.deepEqual(full.positions, ["QB", "WR"]);
  assert.equal(full.urlFile, "/u");
  assert.throws(() => backtest.parseArgs(["--seasons", "2024", "--out-dir", "/x", "--bogus", "1"]), /unknown flag/);
  assert.throws(() => backtest.parseArgs(["--out-dir", "/x"]), /--seasons is required/);
  assert.throws(() => backtest.parseArgs(["--seasons", "2024", "--out-dir", "rel"]), /absolute/);
  assert.throws(() => backtest.parseArgs(["--seasons", "2024", "--out-dir", "/x", "--warmup", "11"]), /--warmup/);
  assert.throws(() => backtest.parseArgs(["--seasons", "2024", "--out-dir", "/x", "--positions", "K"]), /K/);
});
