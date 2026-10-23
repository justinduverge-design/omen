#!/usr/bin/env node
"use strict";

// Captures a user's ESPN and Yahoo leagues as decision cases, run inside the API container, where the provider
// sessions live. It uses Omen's own reads: the waiver route's roster and free-agent load, and the trade route's
// every-team roster read (mounted on a loopback port with the user's id). Read-only. Prints JSON to stdout, one
// snapshot per league, with other managers renamed "Team A", "Team B"...; no cookie, token or secret is ever read
// into the output. Sleeper leagues are captured from the public API by capture-sleeper.mjs instead.
//
// Usage (in the container): node evals/decision-cases/capture-server.js <user_id> [week]

const http = require("node:http");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../../src/config");
const { readConnectionsWithSelection } = require("../../src/services/activeSelection");
const { getCurrentNflWeekContext } = require("../../src/services/nflSchedule");
const waivers = require("../../src/routes/waivers");
const { createTradeRouter } = require("../../src/routes/trade");

const KEEP = ["player_id", "player_key", "name", "position", "eligible_positions", "team", "pro_team", "status", "injury_status", "projected_points", "selected_position", "acquisition", "waiver_status", "ownership_type", "percent_owned"];

function playerRow(raw) {
  const row = {};
  for (const key of KEEP) if (raw?.[key] != null) row[key] = raw[key];
  return row;
}

async function rosterRead(userId, platform, leagueId, week) {
  const app = express();
  app.use("/", createTradeRouter({ authenticate: async () => ({ id: userId }) }));
  const server = http.createServer(app).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/roster?platform=${platform}&league_id=${encodeURIComponent(leagueId)}&week=${week}&fresh=1`;
    const response = await fetch(url, { headers: { authorization: "Bearer capture" } });
    return response.json();
  } finally {
    server.close();
  }
}

async function main() {
  // Extra leagues on the same provider sessions: "espn:<league>:<team>,yahoo:<league>:<team>". A connection row points
  // at one league per provider; the same session reads the others.
  const [userId, weekArg, extraArg] = process.argv.slice(2);
  if (!userId) throw new Error("usage: capture-server.js <user_id> [week]");
  const context = getCurrentNflWeekContext();
  const week = Number(weekArg) || context.week;
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  const { rows } = await readConnectionsWithSelection(supabase, userId, waivers.CONNECTION_COLUMNS);
  const out = [];
  const base = rows.filter((r) => r.platform === "espn" || r.platform === "yahoo");
  const extra = String(extraArg || "")
    .split(",")
    .filter(Boolean)
    .map((spec) => {
      const [platform, leagueId, teamId] = spec.split(":");
      const row = base.find((r) => r.platform === platform);
      return row ? { ...row, league_id: leagueId, espn_team_id: platform === "espn" ? teamId : row.espn_team_id } : null;
    })
    .filter(Boolean);
  for (const connection of [...base, ...extra]) {
    const snapshot = { source: { provider: connection.platform, league_id: String(connection.league_id), captured_at: new Date().toISOString(), decision_week: week, season: context.season } };
    try {
      const [loaded, roster] = await Promise.all([
        waivers.loadForConnection(connection, userId, week, context.season),
        rosterRead(userId, connection.platform, connection.league_id, week),
      ]);
      const ownKey = String(loaded.roster?.team_key ?? connection.espn_team_id ?? "");
      let letter = 0;
      snapshot.league = { roster_positions: roster.roster_positions || [], scoring_format: loaded.scoringFormat || null, waiver_system: loaded.waiverSystem?.type ?? null };
      snapshot.weeks = [week];
      snapshot.teams = (roster.teams || []).map((team) => {
        const own = String(team.team_id) === ownKey || String(team.team_id).endsWith(`.t.${connection.espn_team_id}`) || (loaded.roster?.team_key && String(team.team_id) === String(loaded.roster.team_key));
        return {
          team_id: String(team.team_id),
          team_name: own ? "You" : `Team ${String.fromCharCode(65 + letter++)}`,
          own,
          players: (team.players || []).map(playerRow).map((p) => ({ ...p, projected_points_by_week: { [week]: p.projected_points ?? null } })),
        };
      });
      snapshot.pool = (loaded.pool || []).map(playerRow).map((p) => ({
        ...p,
        acquisition: p.acquisition || p.waiver_status || p.ownership_type || "unknown",
        projected_points_by_week: { [week]: p.projected_points ?? null },
      }));
      snapshot.limitations = loaded.limitations || [];
    } catch (error) {
      // Never the provider's message: it can carry credential fragments.
      snapshot.error = { status: error?.status ?? null };
    }
    out.push(snapshot);
  }
  // Marked so the caller can pick it out from the server's own log lines; written fully before exiting.
  await new Promise((resolve) => process.stdout.write(`DECISION_CASES ${JSON.stringify(out)}\n`, resolve));
}

main().then(
  () => process.exit(0),
  (error) => {
    process.stderr.write(`capture failed: ${error?.message?.split("\n")[0] ?? "unknown"}\n`);
    process.exit(1);
  },
);
