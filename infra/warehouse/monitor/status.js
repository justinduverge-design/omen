#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const VERSION = "omen-football-warehouse-lifecycle-status.v1";
const CONTAINER = "omen_football_warehouse";
const FACT_TABLES = [
  "football_teams",
  "football_players",
  "nfl_games",
  "nfl_player_weekly_stats",
  "nfl_team_weekly_stats",
  "nfl_weekly_rosters",
  "nfl_plays",
];

function finiteAge(timestamp, nowMs) {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? nowMs - parsed : Infinity;
}

function evaluateStatus(evidence, { nowMs = Date.now(), maxIngestAgeMs = 36 * 3600e3 } = {}) {
  const rows = evidence?.rows || {};
  const checks = {
    checker_completed: evidence?.checker_completed === true,
    database_running: evidence?.database?.state === "running",
    database_healthy: evidence?.database?.health === "healthy",
    restart_policy: evidence?.database?.restart_policy === "unless-stopped",
    no_host_postgres_listener: evidence?.host_postgres_listeners === 0,
    schema_verified: evidence?.schema_verified === true,
    no_started_receipts: evidence?.receipts?.started === 0,
    latest_ingest_succeeded: evidence?.receipts?.latest_state === "succeeded",
    ingest_fresh: finiteAge(evidence?.receipts?.latest_finished_at, nowMs) >= 0
      && finiteAge(evidence?.receipts?.latest_finished_at, nowMs) <= maxIngestAgeMs,
    facts_populated: FACT_TABLES.every((table) => Number.isSafeInteger(rows[table]) && rows[table] > 0),
    no_orphan_facts: evidence?.orphan_facts === 0,
  };
  return {
    contract_version: VERSION,
    state: Object.values(checks).every(Boolean) ? "UP" : "DOWN",
    observed_at: evidence?.observed_at || null,
    checks,
    evidence: {
      receipts: evidence?.receipts || null,
      rows: Object.fromEntries(FACT_TABLES.map((table) => [table, rows[table] ?? null])),
    },
  };
}

function command(run, command, args, options = {}) {
  return run(command, args, { encoding: "utf8", timeout: 15000, ...options }).trim();
}

function collectEvidence({ run = execFileSync, now = () => new Date() } = {}) {
  const inspect = JSON.parse(command(run, "docker", ["inspect", CONTAINER]))[0];
  const listeners = command(run, "ss", ["-ltnH", "sport = :5432"]);
  const sql = `begin transaction read only;
select json_build_object(
  'schema_verified', (select count(*) = 2 from football.warehouse_schema_migrations where
    (version = 1 and name = '0001_football_warehouse' and checksum = '27fb1e8dd4a5167ffc27660f165f326e7c9a6e3b4aaf2e04ec16ec4e55448f1c')
    or (version = 2 and name = '0003_warehouse_access_policy' and checksum = '0b0577edd8995fad967409a37012390d77447cf55595fd4a310270b56f7a169d')),
  'receipts', json_build_object(
    'started', count(*) filter (where state = 'started'),
    'latest_state', (array_agg(state order by started_at desc, id desc))[1],
    'latest_finished_at', (array_agg(finished_at order by started_at desc, id desc))[1]
  ),
  'rows', json_build_object(
    'football_teams', (select count(*) from football.football_teams),
    'football_players', (select count(*) from football.football_players),
    'nfl_games', (select count(*) from football.nfl_games),
    'nfl_player_weekly_stats', (select count(*) from football.nfl_player_weekly_stats),
    'nfl_team_weekly_stats', (select count(*) from football.nfl_team_weekly_stats),
    'nfl_weekly_rosters', (select count(*) from football.nfl_weekly_rosters),
    'nfl_plays', (select count(*) from football.nfl_plays)
  ),
  'orphan_facts',
    (select count(*) from football.nfl_player_weekly_stats f left join football.warehouse_ingest_events e on e.id=f.ingest_event_id where e.id is null or e.state <> 'succeeded')
    + (select count(*) from football.nfl_team_weekly_stats f left join football.warehouse_ingest_events e on e.id=f.ingest_event_id where e.id is null or e.state <> 'succeeded')
    + (select count(*) from football.nfl_weekly_rosters f left join football.warehouse_ingest_events e on e.id=f.ingest_event_id where e.id is null or e.state <> 'succeeded')
    + (select count(*) from football.nfl_plays f left join football.warehouse_ingest_events e on e.id=f.ingest_event_id where e.id is null or e.state <> 'succeeded')
) from football.warehouse_ingest_events;
commit;`;
  const database = JSON.parse(command(run, "docker", [
    "exec", CONTAINER, "psql", "-U", "postgres", "-d", "omen_football", "-Atq", "-c", sql,
  ]));
  return {
    checker_completed: true,
    observed_at: now().toISOString(),
    database: {
      state: inspect.State?.Status,
      health: inspect.State?.Health?.Status,
      restart_policy: inspect.HostConfig?.RestartPolicy?.Name,
    },
    host_postgres_listeners: listeners ? listeners.split("\n").filter(Boolean).length : 0,
    ...database,
  };
}

function failure(code = "checker_failure") {
  return {
    contract_version: VERSION,
    state: "DOWN",
    observed_at: new Date().toISOString(),
    code,
    checks: { checker_completed: false },
  };
}

function main(argv = process.argv.slice(2)) {
  try {
    let evidence;
    let options;
    if (argv.length) {
      if (argv.length !== 3 || argv[0] !== "evaluate" || !path.isAbsolute(argv[1])) throw new Error("usage");
      const nowMs = Date.parse(argv[2]);
      if (!Number.isFinite(nowMs)) throw new Error("usage");
      evidence = JSON.parse(fs.readFileSync(argv[1], "utf8"));
      options = { nowMs };
    } else {
      evidence = collectEvidence();
    }
    const result = evaluateStatus(evidence, options);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.state !== "UP") process.exitCode = 2;
  } catch (_) {
    process.stdout.write(`${JSON.stringify(failure())}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { VERSION, FACT_TABLES, evaluateStatus, collectEvidence, failure };
