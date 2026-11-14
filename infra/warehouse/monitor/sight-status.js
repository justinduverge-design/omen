#!/usr/bin/env node
"use strict";

/**
 * Sight in shadow, as one small aggregate JSON for the Valor loop board (Valor-Core ops/sight-pull).
 *
 *   sight-status.js                        collect on KVM1 and print omen-sight-status.v1
 *   sight-status.js --out FILE             collect and write it to FILE atomically
 *   sight-status.js from-dir DIR           build the report from raw inputs sight-status-run collected into DIR
 *   sight-status.js summarize FILE NOW     summarize already-collected evidence (tests, replays)
 *
 * KVM1 has no host Node, so on the host omen-sight-status.timer runs sight-status-run (sh, as root): it
 * collects the raw inputs, then runs `from-dir` inside the release's own pinned ingest image with no network.
 * It writes /var/lib/omen-sight-status/status.json; the read-only `omen-football-status` forced-command channel
 * only `cat`s that file (`sight-status`), so no SSH identity gets docker, journal or database access.
 * The inputs, and all it reads:
 *   - football.football_metric_runs (omen_sight, omen_sight_accuracy) in a read-only transaction, with
 *     default_transaction_read_only on for the session (as monitor/status-export does): states,
 *     weeks, error codes and the graders' per-position summaries. Never football_metric_values, never a player.
 *   - the daily ingest's own summary line from the journal (derived.sight, derived.sightAccuracy: states, counts)
 *   - the grading switch from this release's docker-compose.yml (in git, not a secret)
 *   - the served switch from the API's public GET /api/version on 127.0.0.1 (the env file is never read)
 * Each source fails on its own and says so; nothing here can change Sight or the warehouse.
 * Exit 0 with a report (even a partial one), 1 when no report could be made.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const VERSION = "omen-sight-status.v1";
const CONTAINER = "omen_football_warehouse";
const JOB = "football-warehouse-current-season";
const API_VERSION_URL = "http://127.0.0.1:3000/api/version";
const COMPOSE = path.join(__dirname, "..", "docker-compose.yml");
const CODE = /^[a-z0-9_]{1,64}$/;
const SIGHT_VERSION = /^v[0-9]{1,3}$/;
const POSITION = /^[A-Z]{1,4}$/;
const MAX_WEEKS = 23;

// Sight's rows for the latest season it has computed (sight-status.sql, shared with sight-status-run).
const SQL = fs.readFileSync(path.join(__dirname, "sight-status.sql"), "utf8");

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const int = (v) => (Number.isSafeInteger(v) ? v : null);
const code = (v) => (v == null ? null : typeof v === "string" && CODE.test(v) ? v : "unrecognized");
const version = (v) => (typeof v === "string" && SIGHT_VERSION.test(v) ? v : null);
const iso = (v) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null);
const round = (v) => (v == null ? null : Math.round(v * 100) / 100);
const state = (v) => (typeof v === "string" && /^[a-z_]{1,32}$/.test(v) ? v : null);

/** The ingest container's SIGHT_ENABLED / SIGHT_VERSION, as committed in this release's compose file. */
function gradingSwitch(composeText) {
  const enabled = /^\s*SIGHT_ENABLED:\s*"?([A-Za-z]+)"?\s*$/m.exec(composeText || "");
  const ver = /^\s*SIGHT_VERSION:\s*"?([A-Za-z0-9]+)"?\s*$/m.exec(composeText || "");
  return { enabled: enabled ? enabled[1].toLowerCase() === "true" : false, version: version(ver?.[1] || "v1") };
}

/** The last finished daily ingest, from the journal's JSON records (MESSAGE is the worker's one-line summary). */
function lastJob(journalText) {
  let found = null;
  for (const line of (journalText || "").split("\n")) {
    let entry;
    let record;
    try {
      entry = JSON.parse(line);
      record = JSON.parse(entry.MESSAGE);
    } catch {
      continue;
    }
    if (record?.job !== JOB || !["succeeded", "failed"].includes(record.state)) continue;
    const at = Number(entry.__REALTIME_TIMESTAMP);
    const sight = record.derived?.sight;
    const acc = record.derived?.sightAccuracy;
    const versions = {};
    for (const [v, r] of Object.entries(acc?.versions || {})) {
      if (version(v)) versions[v] = { state: state(r?.state), graded_weeks: int(r?.gradedWeeks) };
    }
    found = {
      finished_at: Number.isFinite(at) && at > 0 ? new Date(at / 1000).toISOString() : null,
      state: record.state,
      code: code(record.code),
      sight: sight ? { state: state(sight.state), values: int(sight.valueCount), code: code(sight.code) } : null,
      grading: acc ? { state: state(acc.state), code: code(acc.code), versions } : null,
    };
  }
  return found;
}

function blankVersion() {
  return {
    computed: { weeks: 0, latest_week: null, latest_change_at: null, failed: [] },
    graded: { weeks: [], latest_change_at: null, failed: [], season: null, by_position: {} },
  };
}

const later = (a, b) => (a == null ? b : b == null ? a : a > b ? a : b);

/** Sight's and the provider's MAE on the same players, n-weighted over the positions where both exist. */
function weekGrade(positions) {
  let n = 0;
  let sight = 0;
  let provider = 0;
  const byPosition = {};
  for (const [pos, p] of Object.entries(positions || {})) {
    if (!POSITION.test(pos)) continue;
    const pn = int(p?.provider?.n);
    const sm = num(p?.provider?.sight_mae_same_players);
    const pm = num(p?.provider?.mae);
    if (!pn || sm == null || pm == null) continue;
    n += pn;
    sight += pn * sm;
    provider += pn * pm;
    byPosition[pos] = { n: pn, sight: sm, provider: pm };
  }
  return n ? { n, sight_mae: sight / n, provider_mae: provider / n, byPosition } : { n: 0, byPosition };
}

/** Evidence (rows, journal, switches) -> the published report. Pure, so tests can drive every case. */
function summarize(evidence, { nowMs = Date.now() } = {}) {
  const versions = {};
  const grades = new Map();
  let season = null;
  const rows = Array.isArray(evidence?.runs) ? evidence.runs : null;
  for (const r of rows || []) {
    const v = version(r?.version);
    const week = int(r?.week);
    if (!v || week == null || week < 1 || week > MAX_WEEKS) continue;
    season = int(r.season) ?? season;
    const out = (versions[v] ||= blankVersion());
    const at = iso(r.finished_at);
    if (r.metric === "omen_sight") {
      const c = out.computed;
      c.latest_change_at = later(c.latest_change_at, at);
      if (r.state === "succeeded") {
        c.weeks += 1;
        c.latest_week = Math.max(c.latest_week ?? 0, week);
      } else if (r.state === "failed") c.failed.push({ week, code: code(r.error_code) });
    } else if (r.metric === "omen_sight_accuracy") {
      const g = out.graded;
      g.latest_change_at = later(g.latest_change_at, at);
      if (r.state === "failed") g.failed.push({ week, code: code(r.error_code) });
      if (r.state !== "succeeded") continue;
      const w = weekGrade(r.positions);
      const row = {
        week,
        n: w.n,
        sight_mae: round(w.sight_mae ?? null),
        provider_mae: round(w.provider_mae ?? null),
        beat: w.n ? w.sight_mae < w.provider_mae : null,
      };
      grades.set(row, w);
      g.weeks.push(row);
    }
  }
  for (const out of Object.values(versions)) {
    const g = out.graded;
    g.weeks.sort((a, b) => a.week - b.week);
    let n = 0;
    let s = 0;
    let p = 0;
    const pos = {};
    for (const row of g.weeks) {
      const w = grades.get(row);
      if (!w.n) continue;
      n += w.n;
      s += w.n * w.sight_mae;
      p += w.n * w.provider_mae;
      for (const [k, v] of Object.entries(w.byPosition)) {
        const acc = (pos[k] ||= { n: 0, s: 0, p: 0 });
        acc.n += v.n;
        acc.s += v.n * v.sight;
        acc.p += v.n * v.provider;
      }
    }
    const compared = g.weeks.filter((row) => row.beat != null);
    g.season = n
      ? {
          n,
          sight_mae: round(s / n),
          provider_mae: round(p / n),
          weeks_compared: compared.length,
          weeks_beat: compared.filter((row) => row.beat).length,
        }
      : null;
    g.by_position = Object.fromEntries(
      Object.keys(pos)
        .sort()
        .map((k) => [k, { n: pos[k].n, sight_mae: round(pos[k].s / pos[k].n), provider_mae: round(pos[k].p / pos[k].n) }]),
    );
  }
  const served = evidence?.served;
  const servedOk = served && typeof served.enabled === "boolean";
  return {
    contract_version: VERSION,
    checker_completed: rows != null,
    generated_at: new Date(nowMs).toISOString(),
    season,
    switch: {
      grading: evidence?.grading
        ? { enabled: evidence.grading.enabled === true, version: version(evidence.grading.version) }
        : null,
      served: servedOk ? { enabled: served.enabled, version: version(served.version) } : null,
      served_error: servedOk ? null : code(evidence?.served_error) || "not_reported",
    },
    job: evidence?.job ?? null,
    job_error: evidence?.job ? null : code(evidence?.job_error) || "not_found",
    db_error: rows ? null : code(evidence?.db_error) || "unreadable",
    versions,
  };
}

function command(run, cmd, args) {
  return run(cmd, args, { encoding: "utf8", timeout: 20000, maxBuffer: 8 * 1024 * 1024 }).trim();
}

async function collectEvidence({
  run = execFileSync,
  fetchImpl = globalThis.fetch,
  readFile = (p) => fs.readFileSync(p, "utf8"),
} = {}) {
  const evidence = {};
  try {
    evidence.runs = JSON.parse(
      command(run, "docker", ["exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", CONTAINER, "psql", "-U", "postgres", "-d", "omen_football", "-Atq", "-c", SQL]),
    );
  } catch {
    evidence.db_error = "db_unreadable";
  }
  try {
    evidence.job = lastJob(
      command(run, "journalctl", [
        "-u",
        "omen-warehouse-ingest.service",
        "--since",
        "-3 days",
        "-o",
        "json",
        "--output-fields=MESSAGE,__REALTIME_TIMESTAMP",
        "--no-pager",
      ]),
    );
    if (!evidence.job) evidence.job_error = "no_finished_ingest_in_3_days";
  } catch {
    evidence.job_error = "journal_unreadable";
  }
  try {
    evidence.grading = gradingSwitch(readFile(COMPOSE));
  } catch {
    evidence.grading = null;
  }
  let res;
  try {
    res = await fetchImpl(API_VERSION_URL, { signal: AbortSignal.timeout(5000) });
  } catch {
    evidence.served_error = "api_unreachable";
  }
  if (res) {
    try {
      if (res.ok === false) throw new Error("status");
      const body = await res.json();
      if (body?.sight) evidence.served = body.sight;
      else evidence.served_error = "api_does_not_report_sight";
    } catch {
      evidence.served_error = "api_bad_reply";
    }
  }
  return evidence;
}

/** Write the report beside FILE, then rename over it: a reader never sees half a report. */
function writeAtomic(file, text) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}`);
  try {
    fs.writeFileSync(tmp, text, { mode: 0o644 });
    fs.chmodSync(tmp, 0o644);
    fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** collectEvidence's sources, answered from the files sight-status-run wrote; a missing file is a failed source. */
function fromDir(dir) {
  const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
  return {
    run: (cmd) => read(cmd === "docker" ? "runs" : cmd === "journalctl" ? "journal" : "unknown"),
    fetchImpl: async () => {
      const text = read("version");
      return { ok: true, json: async () => JSON.parse(text) };
    },
  };
}

async function main(argv = process.argv.slice(2), { collect = collectEvidence } = {}) {
  let out = null;
  let line;
  try {
    let evidence;
    let options = {};
    if (argv.length === 2 && argv[0] === "from-dir") {
      if (!path.isAbsolute(argv[1])) throw new Error("usage");
      evidence = await collect(fromDir(argv[1]));
    } else if (argv.length === 2 && argv[0] === "--out") {
      if (!path.isAbsolute(argv[1])) throw new Error("usage");
      out = argv[1];
      evidence = await collect();
    } else if (argv.length) {
      if (argv.length !== 3 || argv[0] !== "summarize" || !path.isAbsolute(argv[1])) throw new Error("usage");
      const nowMs = Date.parse(argv[2]);
      if (!Number.isFinite(nowMs)) throw new Error("usage");
      evidence = JSON.parse(fs.readFileSync(argv[1], "utf8"));
      options = { nowMs };
    } else {
      evidence = await collect();
    }
    line = `${JSON.stringify(summarize(evidence, options))}\n`;
  } catch {
    line = `${JSON.stringify({ contract_version: VERSION, checker_completed: false, code: "checker_failure" })}\n`;
    process.exitCode = 1;
  }
  if (!out) {
    process.stdout.write(line);
    return;
  }
  // The failure line is written too, so the pull says "checker_failure" instead of serving an old report.
  try {
    writeAtomic(out, line);
  } catch {
    process.stderr.write("sight-status: cannot write the report\n");
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { VERSION, SQL, summarize, collectEvidence, gradingSwitch, lastJob, weekGrade, fromDir, main };
