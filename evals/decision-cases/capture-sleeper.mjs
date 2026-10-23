#!/usr/bin/env node
// Captures one Sleeper league as a frozen decision case: the league's slots and scoring, every roster, the players
// who could be added (free agent now, or claim on waivers), and each player's projected points for this week and the
// next three, scored with this league's own settings. Writes to evals/decision-cases/private/ (gitignored): the
// projections are licensed provider data and other managers' rosters are theirs, so neither goes into the public repo.
//
// Usage: node evals/decision-cases/capture-sleeper.mjs <league_id> <owner_user_id> <case_name> [weeks=4]

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [leagueId, ownerId, caseName, weeksArg] = process.argv.slice(2);
if (!leagueId || !ownerId || !caseName) {
  console.error("usage: capture-sleeper.mjs <league_id> <owner_user_id> <case_name> [weeks]");
  process.exit(2);
}
const WEEKS = Number(weeksArg) || 4;
const API = "https://api.sleeper.app/v1";
const get = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
};

const state = await get(`${API}/state/nfl`);
const week = Number(state.week);
const season = Number(state.season);
const [league, users, rosters, players] = await Promise.all([
  get(`${API}/league/${leagueId}`),
  get(`${API}/league/${leagueId}/users`),
  get(`${API}/league/${leagueId}/rosters`),
  get(`${API}/players/nfl`),
]);
const transactions = await get(`${API}/league/${leagueId}/transactions/${week}`).catch(() => []);
const previous = week > 1 ? await get(`${API}/league/${leagueId}/transactions/${week - 1}`).catch(() => []) : [];

// This week and the next WEEKS-1, scored with the league's own settings from the provider's stat lines.
const scoring = league.scoring_settings || {};
const projected = {};
for (let w = week; w < week + WEEKS; w += 1) {
  const url = `https://api.sleeper.app/projections/nfl/${season}/${w}?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF`;
  const rows = await get(url).catch(() => []);
  for (const row of rows) {
    if (!row?.player_id || !row.stats) continue;
    const points = Object.entries(row.stats).reduce((sum, [stat, value]) => sum + (Number(scoring[stat]) || 0) * (Number(value) || 0), 0);
    (projected[row.player_id] ||= {})[w] = Math.round(points * 100) / 100;
  }
}

// Byes: a week with no projection row for a player whose team is on bye counts as 0.
const schedule = await get(`https://api.sleeper.app/schedule/nfl/regular/${season}`).catch(() => []);
const teamsPlaying = {};
for (const game of schedule) (teamsPlaying[game.week] ||= new Set()).add(game.home).add(game.away);

function playerRow(id) {
  const p = players[id] || {};
  const weeks = {};
  for (let w = week; w < week + WEEKS; w += 1) {
    const plays = teamsPlaying[w] ? teamsPlaying[w].has(p.team) : true;
    weeks[w] = plays ? (projected[id]?.[w] ?? null) : 0;
  }
  return {
    player_id: id,
    name: p.full_name || (p.position === "DEF" ? `${p.team} DEF` : id),
    position: p.position || null,
    eligible_positions: p.fantasy_positions || (p.position ? [p.position] : []),
    team: p.team || null,
    injury_status: p.injury_status || null,
    years_exp: p.years_exp ?? null,
    projected_points_by_week: weeks,
  };
}

// Other managers become "Team A", "Team B"...; only the owner's roster is marked as theirs.
const labels = new Map();
let letter = 0;
const teams = rosters.map((roster) => {
  const own = String(roster.owner_id) === String(ownerId);
  if (!own) labels.set(roster.roster_id, `Team ${String.fromCharCode(65 + letter++)}`);
  return {
    team_id: String(roster.roster_id),
    team_name: own ? "You" : labels.get(roster.roster_id),
    own,
    record: { wins: roster.settings?.wins ?? 0, losses: roster.settings?.losses ?? 0, ties: roster.settings?.ties ?? 0 },
    faab_remaining: (league.settings?.waiver_budget ?? 0) - (roster.settings?.waiver_budget_used ?? 0),
    players: (roster.players || []).map(playerRow).map((row) => ({
      ...row,
      reserve: (roster.reserve || []).includes(row.player_id),
      starter_now: (roster.starters || []).includes(row.player_id),
    })),
  };
});
if (!teams.some((t) => t.own)) throw new Error("owner has no roster in this league");

// The add pool: every fantasy-relevant player on no roster. A player dropped this week or last is on waivers (a
// claim, maybe a bid); everyone else can be added now.
const rostered = new Set(rosters.flatMap((r) => r.players || []));
const recentlyDropped = new Set(
  [...transactions, ...previous].flatMap((t) => Object.keys(t.drops || {})),
);
const pool = Object.keys(projected)
  .filter((id) => !rostered.has(id) && players[id]?.team)
  .map((id) => ({ ...playerRow(id), acquisition: recentlyDropped.has(id) ? "waiver_claim" : "free_agent" }))
  .filter((row) => Object.values(row.projected_points_by_week).some((v) => v > 0))
  .sort((a, b) => (b.projected_points_by_week[week] ?? 0) - (a.projected_points_by_week[week] ?? 0));

// The league's FAAB history (bids kept), for the market phase.
const claims = [...transactions, ...previous]
  .filter((t) => t.type === "waiver")
  .map((t) => ({ status: t.status, week: t.leg, bid: t.settings?.waiver_bid ?? null, adds: Object.keys(t.adds || {}).map((id) => players[id]?.full_name || id) }));

const out = {
  case: caseName,
  source: { provider: "sleeper", captured_at: new Date().toISOString(), decision_week: week, season },
  league: {
    roster_positions: league.roster_positions,
    team_count: league.total_rosters,
    scoring_settings: scoring,
    waiver_type: league.settings?.waiver_type ?? null,
    waiver_budget: league.settings?.waiver_budget ?? null,
    playoff_week_start: league.settings?.playoff_week_start ?? null,
    playoff_teams: league.settings?.playoff_teams ?? null,
  },
  weeks: Array.from({ length: WEEKS }, (_, i) => week + i),
  teams,
  pool: pool.slice(0, 300),
  claims,
  owners_in_league: users.length,
};

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "private", `${caseName}.json`);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${caseName}: week ${week}, ${teams.length} teams, pool ${out.pool.length}, claims ${claims.length} -> ${file}`);
