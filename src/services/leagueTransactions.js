"use strict";

const { abbreviationForProviderNumber } = require("./footballIntelligence/nflTeams");

/**
 * League transactions feed (G4): adds, drops, waiver claims and trades, one contract for all three
 * providers, with an honest label for what each provider actually answered.
 *
 *   Sleeper  documented (`GET /league/{id}/transactions/{round}`), public, read live. On unless
 *            `LEAGUE_TRANSACTIONS_SLEEPER_DISABLED=1`.
 *   Yahoo    `GET /league/{key}/transactions`. Documented by Yahoo, NOT exercised against a live
 *            league. Dark until `LEAGUE_TRANSACTIONS_YAHOO=1`.
 *   ESPN     `view=mTransactions2`. Community-documented, NOT exercised. Dark until
 *            `LEAGUE_TRANSACTIONS_ESPN=1`.
 *
 * A dark or failed provider answers `status: "unavailable"` with a reason, never `empty`: an empty
 * feed means "the provider answered and nothing happened", and an unread feed must not look like it.
 *
 * Parsers here are pure, defensive and fail closed: a payload that does not match the documented
 * shape yields zero items, and the caller reports `empty` only for a provider that is `live`; a
 * `documented_not_exercised` provider that yields zero items reports `unavailable` instead,
 * because "no items" could just as well mean "the shape is not what the docs say".
 */

const CONTRACT = "league-transactions.v1";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const SLEEPER_ROUNDS_BACK = 1; // this week and the one before: bounded provider calls.

const PLAYERS_BUDGET_MS = 1500;

function withTimeout(promise, ms) {
  let timer;
  const budget = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), ms);
    timer.unref?.();
  });
  return Promise.race([Promise.resolve(promise), budget]).finally(() => clearTimeout(timer));
}

function clampLimit(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function isoFromMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  const date = new Date(n);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function kindFor({ adds, drops }) {
  if (adds && drops) return "add_drop";
  if (adds) return "add";
  if (drops) return "drop";
  return "other";
}

function listNames(players) {
  const names = players.map((p) => p.name).filter(Boolean);
  if (!names.length) return players.length === 1 ? "a player" : `${players.length} players`;
  return names.join(", ");
}

function teamLabel(team) {
  return team?.team_name || (team?.team_id ? `Team ${team.team_id}` : "A team");
}

/** A one-line factual summary built only from fields the provider returned. */
function summarize(item) {
  const who = item.teams.map(teamLabel);
  if (item.kind === "trade") {
    const gave = item.drops.length ? ` (${listNames(item.drops)})` : "";
    const got = item.adds.length ? ` (${listNames(item.adds)})` : "";
    const picks = item.draft_picks ? `, ${item.draft_picks} draft pick${item.draft_picks === 1 ? "" : "s"}` : "";
    return `${who.join(" and ")} traded${gave}${got}${picks}.`;
  }
  const actor = who[0] || "A team";
  const adds = item.adds.length ? `${item.kind === "waiver_claim" ? "claimed" : "added"} ${listNames(item.adds)}` : "";
  const drops = item.drops.length ? `dropped ${listNames(item.drops)}` : "";
  const joined = [adds, drops].filter(Boolean).join(" and ");
  return `${actor} ${joined || "made a roster move"}.`;
}

function finalize(item) {
  return { ...item, summary: summarize(item) };
}

// ---------------------------------------------------------------------------------------------
// Sleeper
// ---------------------------------------------------------------------------------------------

function sleeperPlayer(playerId, rosterId, players) {
  const record = players?.[playerId] || null;
  const name = record
    ? record.full_name || [record.first_name, record.last_name].filter(Boolean).join(" ") || null
    : null;
  return {
    player_key: `sleeper:${playerId}`,
    name,
    position: record?.position || null,
    nfl_team: record?.team || null,
    team_id: rosterId == null ? null : String(rosterId),
  };
}

/**
 * Sleeper transaction rows -> feed items. Documented fields: `type` (trade | free_agent | waiver),
 * `status` (complete | failed), `roster_ids`, `adds` / `drops` (`{playerId: rosterId}`),
 * `draft_picks`, `leg`, `created` and `status_updated` (ms), `transaction_id`. Only `complete`
 * transactions are feed items; a failed waiver is not league activity.
 */
function parseSleeperTransactions(rows, { players = {}, teamNames = {} } = {}) {
  const items = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object" || row.status !== "complete") continue;
    const adds = Object.entries(row.adds && typeof row.adds === "object" ? row.adds : {}).map(([playerId, rosterId]) =>
      sleeperPlayer(playerId, rosterId, players),
    );
    const drops = Object.entries(row.drops && typeof row.drops === "object" ? row.drops : {}).map(
      ([playerId, rosterId]) => sleeperPlayer(playerId, rosterId, players),
    );
    const draftPicks = Array.isArray(row.draft_picks) ? row.draft_picks.length : 0;
    const rosterIds = (Array.isArray(row.roster_ids) ? row.roster_ids : []).map(String);
    const teams = rosterIds.map((id) => ({ team_id: id, team_name: teamNames[id] || null }));

    let kind;
    if (row.type === "trade") kind = "trade";
    else if (row.type === "waiver") kind = "waiver_claim";
    else if (row.type === "free_agent") kind = kindFor({ adds: adds.length, drops: drops.length });
    else continue;
    if (kind === "other" && !draftPicks) continue;

    items.push(
      finalize({
        id: `sleeper:${row.transaction_id ?? `${row.leg}:${row.created}`}`,
        kind,
        status: "complete",
        occurred_at: isoFromMs(row.status_updated || row.created),
        round: Number.isFinite(Number(row.leg)) ? Number(row.leg) : null,
        teams,
        adds,
        drops,
        draft_picks: draftPicks,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------------------------
// Yahoo
// ---------------------------------------------------------------------------------------------

function indexed(value) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value;
  return Object.keys(value)
    .filter((k) => k !== "count")
    .map((k) => value[k]);
}

function mergeAttrs(list) {
  const out = {};
  for (const part of Array.isArray(list) ? list : [list]) {
    if (part && typeof part === "object" && !Array.isArray(part)) Object.assign(out, part);
  }
  return out;
}

/**
 * Yahoo `/league/{key}/transactions` -> feed items. Documented layout:
 * `fantasy_content.league[1].transactions = { "0": { transaction: [meta, { players }] }, count }`,
 * `meta = { transaction_key, type, status, timestamp (seconds), trader_team_key?, ... }`, each
 * player `[ [attributes...], { transaction_data: { type: add|drop, source_*, destination_* } } ]`.
 * Not exercised against a live league; anything unrecognised is skipped.
 */
function parseYahooTransactions(raw) {
  const container = raw?.fantasy_content?.league?.[1]?.transactions;
  const items = [];
  for (const entry of indexed(container)) {
    const parts = entry?.transaction;
    if (!Array.isArray(parts)) continue;
    const meta = mergeAttrs(parts[0]);
    if (String(meta.status || "successful").toLowerCase() !== "successful") continue;

    const adds = [];
    const drops = [];
    const teams = new Map();
    const rememberTeam = (key, name) => {
      if (!key) return;
      if (!teams.has(key) || (!teams.get(key).team_name && name))
        teams.set(key, { team_id: String(key), team_name: name || null });
    };

    for (const playerEntry of indexed(parts[1]?.players)) {
      const node = playerEntry?.player;
      if (!Array.isArray(node)) continue;
      const attrs = mergeAttrs(Array.isArray(node[0]) ? node[0] : []);
      const data = mergeAttrs(
        Array.isArray(node[1]?.transaction_data) ? node[1].transaction_data : node[1]?.transaction_data,
      );
      const type = String(data.type || "").toLowerCase();
      const player = {
        player_key: attrs.player_id != null ? `yahoo:${attrs.player_id}` : null,
        name: attrs.name?.full || null,
        position: attrs.display_position || null,
        nfl_team: attrs.editorial_team_abbr || null,
        team_id: null,
      };
      if (type === "add") {
        player.team_id = data.destination_team_key || null;
        rememberTeam(data.destination_team_key, data.destination_team_name);
        adds.push(player);
      } else if (type === "drop") {
        player.team_id = data.source_team_key || null;
        rememberTeam(data.source_team_key, data.source_team_name);
        drops.push(player);
      }
    }
    rememberTeam(meta.trader_team_key, meta.trader_team_name);
    rememberTeam(meta.tradee_team_key, meta.tradee_team_name);

    const type = String(meta.type || "").toLowerCase();
    let kind;
    if (type === "trade") kind = "trade";
    else if (type.startsWith("add") || type === "drop") kind = kindFor({ adds: adds.length, drops: drops.length });
    else continue;
    if (kind === "other") continue;

    items.push(
      finalize({
        id: `yahoo:${meta.transaction_key ?? meta.transaction_id ?? `${meta.timestamp}:${items.length}`}`,
        kind,
        status: "complete",
        occurred_at: isoFromMs(Number(meta.timestamp) * 1000),
        round: null,
        teams: [...teams.values()],
        adds,
        drops,
        draft_picks: 0,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------------------------
// ESPN
// ---------------------------------------------------------------------------------------------

/** Sleeper's player list carries each player's ESPN id: espn id -> { name, position, nfl_team }. */
function espnNamesFromSleeperPlayers(players) {
  const byEspnId = new Map();
  for (const player of Object.values(players || {})) {
    if (player?.espn_id == null) continue;
    const name = player.full_name || [player.first_name, player.last_name].filter(Boolean).join(" ") || null;
    if (!name) continue;
    byEspnId.set(String(player.espn_id), { name, position: player.position || null, nfl_team: player.team || null });
  }
  return byEspnId;
}

/**
 * ESPN `view=mTransactions2` -> feed items. Community-documented layout: `transactions[]` with
 * `type` (FREEAGENT | WAIVER | TRADE_ACCEPT | ...), `status` (EXECUTED), `teamId`, `proposedDate`
 * / `processDate` (ms), `scoringPeriodId`, `items[] { type: ADD | DROP | TRADE, playerId,
 * fromTeamId, toTeamId }`. ESPN returns player ids only; names come from `espnNames` (Sleeper's ESPN ids). Exercised live 2026-10-19.
 */
/** ESPN D/ST player ids are -16000 minus ESPN's team number (-16012 = KC); Sleeper has no ESPN id for them. */
function espnDefense(playerId) {
  const id = Number(playerId);
  if (!Number.isInteger(id) || id > -16001 || id < -16034) return null;
  const abbr = abbreviationForProviderNumber(-16000 - id);
  return abbr ? { name: `${abbr} D/ST`, position: "DEF", nfl_team: abbr } : null;
}

function parseEspnTransactions(data, { teamNames = {}, espnNames = new Map() } = {}) {
  const items = [];
  for (const row of Array.isArray(data?.transactions) ? data.transactions : []) {
    if (!row || typeof row !== "object") continue;
    if (String(row.status || "").toUpperCase() !== "EXECUTED") continue;
    const type = String(row.type || "").toUpperCase();
    const adds = [];
    const drops = [];
    const teams = new Map();
    const rememberTeam = (id) => {
      if (id == null || id === -1) return;
      const key = String(id);
      if (!teams.has(key)) teams.set(key, { team_id: key, team_name: teamNames[key] || null });
    };
    rememberTeam(row.teamId);
    for (const entry of Array.isArray(row.items) ? row.items : []) {
      const entryType = String(entry?.type || "").toUpperCase();
      const known =
        entry?.playerId != null ? espnNames.get(String(entry.playerId)) || espnDefense(entry.playerId) : null;
      const player = {
        player_key: entry?.playerId != null ? `espn:${entry.playerId}` : null,
        name: known?.name ?? null,
        position: known?.position ?? null,
        nfl_team: known?.nfl_team ?? null,
        team_id: null,
      };
      if (entryType === "ADD" || (entryType === "TRADE" && entry.toTeamId != null)) {
        player.team_id = entry.toTeamId != null ? String(entry.toTeamId) : null;
        rememberTeam(entry.toTeamId);
        adds.push(player);
      } else if (entryType === "DROP") {
        player.team_id = entry.fromTeamId != null ? String(entry.fromTeamId) : null;
        rememberTeam(entry.fromTeamId);
        drops.push(player);
      }
      if (entryType === "TRADE") rememberTeam(entry.fromTeamId);
    }

    let kind;
    if (type.startsWith("TRADE")) kind = "trade";
    else if (type === "WAIVER") kind = "waiver_claim";
    else if (type === "FREEAGENT") kind = kindFor({ adds: adds.length, drops: drops.length });
    else continue;
    if (kind === "other") continue;

    items.push(
      finalize({
        id: `espn:${row.id ?? `${row.scoringPeriodId}:${row.processDate}:${items.length}`}`,
        kind,
        status: "complete",
        occurred_at: isoFromMs(row.processDate || row.proposedDate),
        round: Number.isFinite(Number(row.scoringPeriodId)) ? Number(row.scoringPeriodId) : null,
        teams: [...teams.values()],
        adds,
        drops,
        draft_picks: 0,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------------------------

function newest(items, limit) {
  const seen = new Set();
  return items
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .sort((a, b) => String(b.occurred_at || "").localeCompare(String(a.occurred_at || "")))
    .slice(0, limit);
}

function envelope(connection, context, fields) {
  return {
    contract_version: CONTRACT,
    generated_at: new Date().toISOString(),
    platform: connection.platform,
    league_id: String(connection.league_id),
    season: Number(context.season),
    week: Number(context.week),
    status: "unavailable",
    reason: null,
    provider_read: "not_enabled",
    coverage: { rounds: [], limit: DEFAULT_LIMIT, truncated: false },
    items: [],
    limitations: [],
    ...fields,
  };
}

function flagOn(env, name) {
  return String(env?.[name] ?? "") === "1";
}

function failureReason(error) {
  const status = Number(error?.status);
  if (status === 401 || error?.message === "yahoo_token_expired") return "reauth_required";
  if (status === 429 || status === 503 || status === 999) return "rate_limited";
  return "provider_failed";
}

/**
 * `deps`: { sleeper, espn, getYahooClient(userId), getEspnCredentials(userId), env }.
 * Never throws for a provider failure: the feed is its own failure domain.
 */
async function readLeagueTransactions({ connection, userId, context, deps, limit }) {
  const env = deps.env || process.env;
  const cap = clampLimit(limit);
  const base = (fields) =>
    envelope(connection, context, { coverage: { rounds: [], limit: cap, truncated: false }, ...fields });

  try {
    if (connection.platform === "sleeper") {
      if (flagOn(env, "LEAGUE_TRANSACTIONS_SLEEPER_DISABLED")) {
        return base({ reason: "disabled", provider_read: "not_enabled" });
      }
      const week = Number(context.week);
      const rounds = [];
      for (let r = week; r >= Math.max(1, week - SLEEPER_ROUNDS_BACK); r -= 1) rounds.push(r);
      // No in-season round (preseason or week 0): nothing was read, so this is not an empty feed.
      if (!rounds.length) return base({ reason: "no_round", provider_read: "not_enabled" });
      const [roundRows, teamNames, players] = await Promise.all([
        Promise.all(rounds.map((r) => deps.sleeper.fetchSleeperTransactions(connection.league_id, r))),
        deps.sleeper.fetchSleeperTeamNames(connection.league_id).catch(() => ({})),
        // Names are decoration: a failed players read costs the names, not the feed.
        // Bounded: a cold players load must not hold the feed.
        withTimeout(deps.sleeper.fetchSleeperPlayers(), PLAYERS_BUDGET_MS).catch(() => ({})),
      ]);
      const all = roundRows.flatMap((rows) => parseSleeperTransactions(rows, { players, teamNames }));
      const items = newest(all, cap);
      const limitations = [];
      if (!players || !Object.keys(players).length) limitations.push("Player names were not available for this read.");
      return base({
        status: items.length ? "available" : "empty",
        provider_read: "live",
        coverage: { rounds, limit: cap, truncated: all.length > items.length },
        items,
        limitations,
      });
    }

    if (connection.platform === "yahoo") {
      if (!flagOn(env, "LEAGUE_TRANSACTIONS_YAHOO")) {
        return base({
          reason: "provider_read_not_enabled",
          provider_read: "not_enabled",
          limitations: [
            "Yahoo's transactions endpoint is documented but has not been exercised against a live league, so Omen does not read it yet.",
          ],
        });
      }
      const { client } = await deps.getYahooClient(userId);
      const raw = await client.getTransactions(connection.league_id, { count: cap });
      const all = parseYahooTransactions(raw);
      const items = newest(all, cap);
      if (!items.length) {
        return base({
          reason: "shape_not_recognised",
          provider_read: "documented_not_exercised",
          limitations: [
            "Yahoo returned no transactions Omen could read. The response shape is documented but not yet verified, so Omen does not call this an empty feed.",
          ],
        });
      }
      // Exercised against live Yahoo leagues 2026-10-19 (Build 12 probe): 2 of 2 read, with names.
      return base({
        status: "available",
        provider_read: "live",
        coverage: { rounds: [], limit: cap, truncated: all.length > items.length },
        items,
        limitations: [],
      });
    }

    if (connection.platform === "espn") {
      if (!flagOn(env, "LEAGUE_TRANSACTIONS_ESPN")) {
        return base({
          reason: "provider_read_not_enabled",
          provider_read: "not_enabled",
          limitations: [
            "ESPN's transactions view is community-documented and has not been exercised against a live league, so Omen does not read it yet.",
          ],
        });
      }
      const credentials = await deps.getEspnCredentials(userId);
      const [read, players] = await Promise.all([
        deps.espn.fetchEspnTransactions(connection.league_id, credentials.espn_s2, credentials.swid, {
          seasonId: context.season,
          week: context.week,
        }),
        // ESPN sends player ids only. Names come from Sleeper's public player list, which carries
        // each player's ESPN id. Decoration, bounded like the Sleeper path: a miss costs the names.
        deps.sleeper?.fetchSleeperPlayers
          ? withTimeout(deps.sleeper.fetchSleeperPlayers(), PLAYERS_BUDGET_MS).catch(() => ({}))
          : Promise.resolve({}),
      ]);
      const espnNames = espnNamesFromSleeperPlayers(players);
      const all = parseEspnTransactions(read?.data ?? read, { teamNames: read?.teamNames || {}, espnNames });
      const items = newest(all, cap);
      if (!items.length) {
        return base({
          reason: "shape_not_recognised",
          provider_read: "documented_not_exercised",
          limitations: [
            "ESPN returned no transactions Omen could read. The response shape is community-documented, so Omen does not call this an empty feed.",
          ],
        });
      }
      return base({
        status: "available",
        // Exercised against live ESPN leagues 2026-10-19 (Build 12 probe): 3 of 3 read.
        provider_read: "live",
        coverage: { rounds: [], limit: cap, truncated: all.length > items.length },
        items,
        limitations: espnNames.size ? [] : ["Player names were not available for this read."],
      });
    }
  } catch (error) {
    return base({
      reason: failureReason(error),
      provider_read: "failed",
    });
  }

  return base({ reason: "unsupported_platform", provider_read: "not_enabled" });
}

/** Off season: no provider call, and an honest unavailable rather than an empty feed. */
function offSeasonEnvelope(connection, context, limit) {
  return envelope(connection, context, {
    reason: "off_season",
    coverage: { rounds: [], limit: clampLimit(limit), truncated: false },
  });
}

module.exports = {
  CONTRACT,
  offSeasonEnvelope,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  clampLimit,
  espnNamesFromSleeperPlayers,
  parseEspnTransactions,
  parseSleeperTransactions,
  parseYahooTransactions,
  readLeagueTransactions,
};
