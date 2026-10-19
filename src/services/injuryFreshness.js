"use strict";

/**
 * Tiered freshness for the Sleeper players file (injury designations) and projections.
 *
 * Pure policy + pure overlay/diff helpers. No I/O here: the adapter owns fetching and
 * single-flight, this module only answers "how old is too old right now" and "what changed".
 *
 * Kill switch: INJURY_FRESHNESS_TIERS_DISABLED=1 returns the adapter to its previous fixed TTLs.
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const TIERS = Object.freeze({
  // Hours around kickoff, when designations flip (Q -> Out, inactives ~90 min before kickoff).
  game_window: { players_ttl_ms: 10 * MIN, projections_ttl_ms: 20 * MIN, healthy_projections_ttl_ms: 40 * MIN },
  // In-season day with no games nearby.
  in_season: { players_ttl_ms: 2 * HOUR, projections_ttl_ms: 2 * HOUR, healthy_projections_ttl_ms: 6 * HOUR },
  off_season: { players_ttl_ms: 12 * HOUR, projections_ttl_ms: 12 * HOUR, healthy_projections_ttl_ms: 24 * HOUR },
});

// The values the adapter used before this change (kept for the kill switch).
const LEGACY = Object.freeze({
  tier: "legacy",
  players_ttl_ms: 20 * MIN,
  projections_ttl_ms: HOUR,
  healthy_projections_ttl_ms: HOUR,
});

function tiersDisabled(env = process.env) {
  return env.INJURY_FRESHNESS_TIERS_DISABLED === "1" || env.INJURY_FRESHNESS_TIERS_DISABLED === "true";
}

function easternParts(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dow: days[get("weekday")], hour: Number(get("hour")), month: Number(get("month")), day: Number(get("day")) };
}

/** Fallback when the schedule service is unavailable: the NFL year runs September to early February. */
function fallbackIsOffSeason(month) {
  return month >= 3 && month <= 8;
}

/**
 * Day-of-week game window in Eastern time, hours before kickoff included:
 *   Thu 12:00 -> Fri 04:00, Sun 07:00 -> Mon 04:00 (early London games), Mon 12:00 -> Tue 04:00.
 * Saturday and holiday games (late season) are covered by `kickoffs` when the caller has them.
 */
function inDayWindow({ dow, hour }, playoffs = false) {
  const at = dow * 24 + hour;
  const within = (fromDow, fromHour, toDow, toHour) => at >= fromDow * 24 + fromHour && at < toDow * 24 + toHour;
  // Playoffs add Saturday games (Sat 12:00 -> Sun 04:00).
  return within(4, 12, 5, 4) || within(0, 7, 1, 4) || within(1, 12, 2, 4) || (playoffs && within(6, 12, 7, 4));
}

/** Wild card through the Super Bowl: January 1 to February 15. The regular-season week count calls these "off-season". */
function inPlayoffPeriod({ month, day }) {
  return month === 1 || (month === 2 && day <= 15);
}

/**
 * @param {Date|number} now
 * @param {{ kickoffs?: Array<Date|number|string>, offSeason?: boolean|null, env?: object }} [opts]
 *   kickoffs: known kickoff times; within 4h before to 5h after one counts as a game window.
 *   offSeason: the schedule service's answer; null/undefined falls back to a month rule.
 */
function freshnessPolicy(now = new Date(), { kickoffs = null, offSeason = null, env = process.env } = {}) {
  if (tiersDisabled(env)) return { ...LEGACY };
  const at = now instanceof Date ? now : new Date(now);
  const parts = easternParts(at);
  const playoffs = inPlayoffPeriod(parts);
  // Playoff weeks (raw week > 18) are still games and still injury reports: in-season, not off-season.
  const off = !playoffs && (typeof offSeason === "boolean" ? offSeason : fallbackIsOffSeason(parts.month));
  if (off) return { tier: "off_season", ...TIERS.off_season };

  const t = at.getTime();
  const nearKickoff =
    Array.isArray(kickoffs) &&
    kickoffs.some((k) => {
      const ms = new Date(k).getTime();
      return Number.isFinite(ms) && t >= ms - 4 * HOUR && t <= ms + 5 * HOUR;
    });
  if (nearKickoff || inDayWindow(parts, playoffs)) return { tier: "game_window", ...TIERS.game_window };
  return { tier: "in_season", ...TIERS.in_season };
}

// ---- injury overlay ---------------------------------------------------------------------------

const SEVERE = new Set(["out", "doubtful", "ir", "pup", "sus", "dnr", "nfi"]);

function norm(value) {
  return value == null || value === "" ? null : String(value);
}

/** playerId -> {injury_status, injury_body_part, status, news_updated} for anyone not plainly healthy. */
function buildInjuryOverlay(players) {
  const overlay = new Map();
  if (!players || typeof players !== "object") return overlay;
  for (const [id, p] of Object.entries(players)) {
    if (!p || typeof p !== "object") continue;
    const injury = norm(p.injury_status);
    const status = norm(p.status);
    if (!injury && (!status || /^active$/i.test(status))) continue;
    overlay.set(id, {
      injury_status: injury,
      injury_body_part: norm(p.injury_body_part),
      status,
      news_updated: p.news_updated ?? null,
    });
  }
  return overlay;
}

const designation = (entry) => (entry ? `${entry.injury_status || ""}|${entry.status || ""}` : "");
const label = (entry) => (entry ? entry.injury_status || entry.status : null);

/** Designation changes between two overlays. A body-part or news-timestamp edit alone is not a change. */
function diffInjuryOverlay(prev, next) {
  const changes = [];
  const ids = new Set([...(prev ? prev.keys() : []), ...next.keys()]);
  for (const id of ids) {
    const a = prev ? prev.get(id) : undefined;
    const b = next.get(id);
    if (designation(a) === designation(b)) continue;
    changes.push({ player_id: id, from: label(a), to: label(b) });
  }
  const severe = (v) => v != null && SEVERE.has(String(v).toLowerCase());
  const questionable = (v) => /^questionable$/i.test(v || "");
  return {
    changes,
    counts: {
      tracked: next.size,
      changed: changes.length,
      newly_severe: changes.filter((c) => severe(c.to) && !severe(c.from)).length,
      newly_questionable: changes.filter((c) => questionable(c.to) && !questionable(c.from)).length,
      cleared: changes.filter((c) => c.to == null).length,
    },
  };
}

module.exports = { freshnessPolicy, tiersDisabled, buildInjuryOverlay, diffInjuryOverlay, TIERS, LEGACY };
