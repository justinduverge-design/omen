"use strict";

/**
 * Weekly projections for Yahoo players.
 *
 * Yahoo's roster and available-player responses carry no per-player projection, so a Yahoo league
 * reached the engine with `projected_points: null` everywhere and the Omen call could only say
 * "cannot rank". Sleeper and ESPN rosters carry projections, so this is what makes Yahoo a peer.
 *
 * How a number is made (nothing here is invented):
 *   1. The player's Yahoo id is mapped to a Sleeper id through the `yahoo_id` field of Sleeper's
 *      public player list, the same list the warehouse crosswalk takes its Yahoo ids from
 *      (`playerCrosswalk.js`). A pairing is used only when the names agree and the Yahoo id is
 *      claimed by exactly one Sleeper player, otherwise the player stays unprojected.
 *   2. Sleeper's public weekly projection STAT LINE for that player (yards, TDs, receptions, ...)
 *      is multiplied by THIS Yahoo league's own scoring rules (`/league/{key}/settings`
 *      `stat_modifiers`, mapped by `scoringRuleSnapshot.deriveYahooRules`). Sleeper's own
 *      `pts_ppr` total is never used: it is PPR and this league may not be.
 *   3. If the league carries a rule Omen cannot map, the number is still computed from the rules
 *      Omen does know, but it is labelled `approximate`, and only for the positions that rule can
 *      touch (a points-allowed tier does not make a running back's number approximate).
 *   4. If the league's rules cannot be read, there is NO projection. A PPR guess for a league whose
 *      scoring is unknown can flip a start/sit call, so the engine keeps saying "cannot rank".
 *
 * Latency: everything slow is cached already (Sleeper stat lines 1 h and players 24 h in Redis,
 * players also memoised in-process) and league rules are memoised here for 30 minutes. The whole
 * enrichment runs under a hard budget; when it trips, the in-flight reads keep warming the caches
 * and this request simply carries no projections.
 */

const sleeperAdapter = require("../adapters/sleeper");
const { deriveScoringSnapshot, SLEEPER_EVENT_MAP, SLEEPER_FG_BANDS } = require("./scoringRuleSnapshot");
const { normalizeName } = require("./playerCrosswalk");
const { getCurrentNflWeekContext } = require("./nflSchedule");

const SOURCE = "sleeper_public_projections";
const BASIS_LEAGUE = "league_scoring";
const BASIS_APPROX = "approximate_scoring";
const BASIS_BYE = "bye_week";

const BUDGET_MS = 2500;
const POOL_GRACE_MS = 150;
const RULES_TTL_MS = 30 * 60 * 1000;
const RULES_FAILURE_TTL_MS = 60 * 1000;
const RULES_MAX_ENTRIES = 200;

// Sleeper projects these. Yahoo team defences have no player id on the Sleeper side.
const POSITION_TYPE = Object.freeze({ QB: "O", RB: "O", WR: "O", TE: "O", K: "K" });

const rulesMemo = new Map();

function isDisabled() {
  const value = String(process.env.YAHOO_PROJECTIONS_DISABLED || "").trim().toLowerCase();
  return value === "1" || value === "true";
}

// Reasons that mean "try again soon", not "this league has no projections": callers keep such a
// pass out of long-lived caches.
const TRANSIENT_REASONS = new Set(["timed_out", "provider_error"]);

function isTransientMeta(meta) {
  return Boolean(meta && TRANSIENT_REASONS.has(meta.reason));
}

/**
 * Remove projections this module wrote. Used on a cached roster when the kill switch is on, so
 * flipping it takes effect now instead of when the 5-minute roster cache expires.
 */
function stripYahooProjections(players) {
  for (const player of Array.isArray(players) ? players : []) {
    if (player && player.projection_source === SOURCE) {
      player.projected_points = null;
      delete player.projection_source;
      delete player.projection_basis;
    }
  }
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function positionTypeOf(player) {
  return POSITION_TYPE[String(player?.position || "").toUpperCase()] || null;
}

function settingsFromLeague(league) {
  const settings = Array.isArray(league) ? league[1]?.settings : league?.settings;
  return (Array.isArray(settings) ? settings[0] : settings) || null;
}

/** statId -> Set("O"|"K"|"DT") from Yahoo's own `stat_categories`; empty when the shape is not there. */
function positionTypesByStat(settings) {
  const out = new Map();
  const raw = settings?.stat_categories?.stats;
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
  for (const entry of list) {
    const stat = entry?.stat || entry;
    const id = stat?.stat_id;
    if (id == null) continue;
    const types = new Set();
    if (stat.position_type) types.add(String(stat.position_type));
    const many = Array.isArray(stat.position_types) ? stat.position_types : [];
    for (const item of many) {
      const type = item?.position_type || item;
      if (typeof type === "string") types.add(type);
    }
    if (types.size) out.set(String(id), types);
  }
  return out;
}

/**
 * Which position types ("O", "K") an unmapped rule can change. A rule whose type Omen cannot tell
 * counts against every position: never assume a rule is irrelevant.
 */
function affectedTypes(unmappedRule, byStat) {
  const rule = String(unmappedRule);
  if (rule.startsWith("field_goals")) return new Set(["K"]);
  const id = /^stat_(\d+)$/.exec(rule)?.[1];
  const types = id ? byStat.get(id) : null;
  if (!types) return new Set(["O", "K"]);
  const out = new Set();
  for (const type of types) {
    if (type === "O" || type === "K") out.add(type);
  }
  return out;
}

/**
 * Read this Yahoo league's scoring and reduce it to what projection scoring needs.
 * Returns `{ values: Map(event_key -> points), approximateFor: Set(type), unmapped: [...] }` or null
 * when the rules could not be read.
 */
function scoringFromSettings(settings) {
  const snapshot = deriveScoringSnapshot({ platform: "yahoo", leagueSettings: settings });
  if (snapshot.coverage_state !== "supported" && snapshot.coverage_state !== "ambiguous") return null;
  const rules = snapshot.contract?.rules || [];
  if (!rules.length) return null;
  const values = new Map();
  for (const rule of rules) {
    if (rule.operator === "per_event" && Number.isFinite(rule.value)) values.set(rule.event_key, rule.value);
  }
  const byStat = positionTypesByStat(settings);
  const approximateFor = new Set();
  for (const unmapped of snapshot.unmapped_rules || []) {
    for (const type of affectedTypes(unmapped, byStat)) approximateFor.add(type);
  }
  return { values, approximateFor, unmapped: [...(snapshot.unmapped_rules || [])] };
}

async function leagueScoring(client, leagueKey, { now = Date.now() } = {}) {
  const hit = rulesMemo.get(leagueKey);
  if (hit && hit.expires > now) return hit.value;
  let value = null;
  let ttl = RULES_FAILURE_TTL_MS;
  try {
    value = scoringFromSettings(settingsFromLeague(await client.getLeagueSettings(leagueKey)));
    if (value) ttl = RULES_TTL_MS;
  } catch {
    value = null;
  }
  if (rulesMemo.size >= RULES_MAX_ENTRIES) rulesMemo.delete(rulesMemo.keys().next().value);
  rulesMemo.set(leagueKey, { value, expires: now + ttl });
  return value;
}

/**
 * A stat line scored under league rules. Null when no stat in the line is scored by a rule Omen
 * knows, because "nothing to score" must not read as "projects zero".
 */
function scoreStatLine(statLine, values) {
  if (!statLine || typeof statLine !== "object") return null;
  let total = 0;
  let scored = 0;
  for (const [key, quantity] of Object.entries(statLine)) {
    if (key.startsWith("pts_")) continue;
    const event = SLEEPER_EVENT_MAP[key]?.event_key || SLEEPER_FG_BANDS[key];
    if (!event) continue;
    const perUnit = values.get(event);
    const count = Number(quantity);
    if (perUnit == null || !Number.isFinite(count)) continue;
    total += count * perUnit;
    scored += 1;
  }
  return scored ? round2(total) : null;
}

const yahooToSleeperMemo = new WeakMap();

/** yahoo_id -> sleeper player id, with ids claimed by more than one Sleeper player left out. */
function yahooIndex(sleeperPlayers) {
  if (!sleeperPlayers || typeof sleeperPlayers !== "object") return new Map();
  const cached = yahooToSleeperMemo.get(sleeperPlayers);
  if (cached) return cached;
  const index = new Map();
  const claimed = new Set();
  for (const [sleeperId, player] of Object.entries(sleeperPlayers)) {
    const yahooId = player?.yahoo_id;
    if (yahooId == null || yahooId === "") continue;
    const key = String(yahooId);
    if (index.has(key) || claimed.has(key)) {
      index.delete(key);
      claimed.add(key);
      continue;
    }
    index.set(key, String(sleeperId));
  }
  yahooToSleeperMemo.set(sleeperPlayers, index);
  return index;
}

const TEAM_ALIASES = Object.freeze({ JAC: "JAX", WSH: "WAS", LA: "LAR", SD: "LAC", OAK: "LV", STL: "LAR", ARZ: "ARI", CLV: "CLE", BLT: "BAL", HST: "HOU" });
function normTeam(team) {
  const t = String(team || "").trim().toUpperCase();
  return TEAM_ALIASES[t] || t;
}

const nameIndexMemo = new WeakMap();

/** normalized full name -> [sleeper ids], for the fallback when Sleeper's yahoo_id map has no entry. */
function nameIndex(sleeperPlayers) {
  if (!sleeperPlayers || typeof sleeperPlayers !== "object") return new Map();
  const cached = nameIndexMemo.get(sleeperPlayers);
  if (cached) return cached;
  const index = new Map();
  for (const [sleeperId, player] of Object.entries(sleeperPlayers)) {
    if (!player || player.active === false) continue;
    const key = normalizeName(sleeperFullName(player));
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(String(sleeperId));
  }
  nameIndexMemo.set(sleeperPlayers, index);
  return index;
}

/**
 * Sleeper's `yahoo_id` field is incomplete (on a live 12-team league it matched about a quarter of
 * rostered players), so an unmatched Yahoo player is paired by name + position + NFL team instead.
 * Used only when exactly one active Sleeper player fits all three; a namesake, a missing team on
 * either side or any ambiguity leaves the player unprojected.
 */
function fallbackSleeperId(yahooPlayer, sleeperPlayers) {
  const candidates = (nameIndex(sleeperPlayers).get(normalizeName(yahooPlayer?.name)) || [])
    .filter((id) => positionsAgree(yahooPlayer, sleeperPlayers[id]));
  const team = normTeam(yahooPlayer?.team);
  if (!team) return null;
  const fits = candidates.filter((id) => normTeam(sleeperPlayers[id]?.team) === team);
  return fits.length === 1 ? fits[0] : null;
}

function sleeperFullName(player) {
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim();
}

/** Yahoo's primary position must be one Sleeper lists for the player (a same-named namesake differs). */
function positionsAgree(yahooPlayer, sleeperPlayer) {
  const wanted = String(yahooPlayer?.position || "").toUpperCase();
  const listed = [sleeperPlayer?.position, ...(Array.isArray(sleeperPlayer?.fantasy_positions) ? sleeperPlayer.fantasy_positions : [])]
    .filter(Boolean)
    .map((position) => String(position).toUpperCase());
  return Boolean(wanted) && listed.includes(wanted);
}

// A projection feed this small is a partial read, not a league-wide bye: do not infer byes from it.
const MIN_STAT_LINES_FOR_BYE_INFERENCE = 100;

/** NFL teams with at least one projected player this week, or null when the feed is too thin to tell. */
function teamsWithProjections(statLines, sleeperPlayers) {
  const ids = statLines && typeof statLines === "object" ? Object.keys(statLines) : [];
  if (ids.length < MIN_STAT_LINES_FOR_BYE_INFERENCE) return null;
  const teams = new Set();
  for (const id of ids) {
    const team = sleeperPlayers?.[id]?.team;
    if (team) teams.add(team);
  }
  return teams.size ? teams : null;
}

function namesAgree(yahooName, sleeperPlayer) {
  const a = normalizeName(yahooName);
  const b = normalizeName(sleeperFullName(sleeperPlayer));
  return Boolean(a) && a === b;
}

function emptyMeta(total, reason) {
  return {
    available: false,
    source: SOURCE,
    scoring_basis: null,
    players_total: total,
    players_with_projection: 0,
    reason,
  };
}

function withBudget(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(BUDGET_MS_EXCEEDED), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
const BUDGET_MS_EXCEEDED = Symbol("budget_exceeded");

async function load({ client, leagueKey, season, week, deps }) {
  const scoring = await (deps.leagueScoring || leagueScoring)(client, leagueKey);
  if (!scoring) return { reason: "scoring_unreadable" };
  const [statLines, sleeperPlayers] = await Promise.all([
    (deps.fetchStatLines || sleeperAdapter.fetchSleeperProjectionStatLines)(season, week),
    (deps.fetchPlayers || sleeperAdapter.fetchSleeperPlayers)(),
  ]);
  return { scoring, statLines, sleeperPlayers };
}

/**
 * Fill `projected_points` on Yahoo players in place and describe what was done.
 *
 * Players that cannot be projected are left with `projected_points: null`. Every projected player
 * gets `projection_source` and `projection_basis` so a response can say where the number came from.
 * Never throws.
 *
 * @returns {{available:boolean, source:string, scoring_basis:string|null, players_total:number,
 *   players_with_projection:number, reason:string|null}}
 */
async function enrichYahooPlayers(players, { client, leagueKey, week, season, budgetMs = BUDGET_MS, deps = {} } = {}) {
  const list = Array.isArray(players) ? players.filter(Boolean) : [];
  const total = list.length;
  if (isDisabled()) return emptyMeta(total, "disabled");
  const projectable = list.filter((player) => positionTypeOf(player) && (player.yahoo_id ?? player.player_id) != null);
  if (!projectable.length) return emptyMeta(total, "no_projectable_players");

  const effectiveWeek = Number(week);
  if (!Number.isInteger(effectiveWeek) || effectiveWeek < 1 || effectiveWeek > 18) return emptyMeta(total, "week_unknown");
  const effectiveSeason = season || getCurrentNflWeekContext().season;

  let loaded;
  try {
    loaded = await withBudget(load({ client, leagueKey, season: effectiveSeason, week: effectiveWeek, deps }), budgetMs);
  } catch {
    return emptyMeta(total, "provider_error");
  }
  if (loaded === BUDGET_MS_EXCEEDED) return emptyMeta(total, "timed_out");
  if (loaded.reason) return emptyMeta(total, loaded.reason);

  const { scoring, statLines, sleeperPlayers } = loaded;
  const index = yahooIndex(sleeperPlayers);
  const playingTeams = teamsWithProjections(statLines, sleeperPlayers);
  let projected = 0;
  let approximate = false;
  for (const player of projectable) {
    const yahooId = String(player.yahoo_id ?? player.player_id);
    let sleeperId = index.get(yahooId);
    if (!sleeperId) sleeperId = fallbackSleeperId(player, sleeperPlayers);
    const sleeperPlayer = sleeperId ? sleeperPlayers[sleeperId] : null;
    if (!sleeperPlayer || !namesAgree(player.name, sleeperPlayer) || !positionsAgree(player, sleeperPlayer)) continue;
    const points = scoreStatLine(statLines?.[sleeperId], scoring.values);
    if (points == null) {
      // A player whose whole NFL team has no projection this week is on a bye: he scores zero, which is
      // a fact, and the lineup must be able to move him (a null would block the swap).
      if (playingTeams && sleeperPlayer.team && !playingTeams.has(sleeperPlayer.team)) {
        player.projected_points = 0;
        player.projection_source = SOURCE;
        player.projection_basis = BASIS_BYE;
        projected += 1;
      }
      continue;
    }
    const basis = scoring.approximateFor.has(positionTypeOf(player)) ? BASIS_APPROX : BASIS_LEAGUE;
    if (basis === BASIS_APPROX) approximate = true;
    player.projected_points = points;
    player.projection_source = SOURCE;
    player.projection_basis = basis;
    projected += 1;
  }

  return {
    available: projected > 0,
    source: SOURCE,
    scoring_basis: projected > 0 ? (approximate ? BASIS_APPROX : BASIS_LEAGUE) : null,
    players_total: total,
    players_with_projection: projected,
    reason: projected > 0 ? null : "no_matching_projections",
  };
}

/**
 * Project an available-player pool the same way as a roster. The pool keeps its shape
 * (`projected_points` stays null where no honest number exists); the meta says what was covered.
 */
async function projectYahooPool(client, leagueKey, week, pool, { rosterMeta = null } = {}) {
  // One budget per request: when the roster pass already spent it and timed out, the pool only gets a
  // short grace for the in-flight reads to land, not a second 2.5 s.
  const budgetMs = isTransientMeta(rosterMeta) ? POOL_GRACE_MS : BUDGET_MS;
  const projectionMeta = await enrichYahooPlayers(pool, { client, leagueKey, week, budgetMs });
  return { pool, projectionMeta };
}

function resetYahooProjectionMemo() {
  rulesMemo.clear();
}

module.exports = {
  BASIS_APPROX,
  BASIS_LEAGUE,
  SOURCE,
  enrichYahooPlayers,
  isDisabled,
  isTransientMeta,
  stripYahooProjections,
  positionTypesByStat,
  projectYahooPool,
  resetYahooProjectionMemo,
  scoreStatLine,
  scoringFromSettings,
  settingsFromLeague,
};
