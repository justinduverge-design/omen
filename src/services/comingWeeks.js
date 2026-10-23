"use strict";

/**
 * The coming weeks' projections for every player a waiver judgement weighs, on all three providers
 * (founder, 2026-10-23: "Please don't make me go back in a month").
 *
 * Each player is matched to Sleeper's public player list (Sleeper ids directly, ESPN and Yahoo through
 * the ids Sleeper carries, else one unique name + position match). Sleeper's projection for a coming
 * week is scaled by how this league scores the player this week, so an ESPN or Yahoo league keeps its
 * own scoring and only the week-to-week shape comes from Sleeper. Sleeper's 0 (bye, out) stays 0.
 *
 * Writes `projected_points_by_week` onto the players in place. A week Sleeper has no row for is left
 * out, and the engine falls back to this week's value for it, as before.
 */

const { normalizeName } = require("./playerCrosswalk");

const EXTRA_WEEKS = 3;
const MIN_RATIO = 0.5;
const MAX_RATIO = 2;

function sleeperIndex(players) {
  const byEspn = new Map();
  const byYahoo = new Map();
  const byName = new Map();
  for (const [id, player] of Object.entries(players || {})) {
    if (player?.espn_id != null) byEspn.set(String(player.espn_id), id);
    if (player?.yahoo_id != null) byYahoo.set(String(player.yahoo_id), id);
    const name = normalizeName(player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`);
    if (!name || !player?.position) continue;
    const key = `${name}|${player.position}`;
    byName.set(key, byName.has(key) ? null : id);
  }
  return { byEspn, byYahoo, byName };
}

function rawId(player) {
  const id = String(player?.player_id ?? "");
  return id.includes(".p.") ? id.split(".p.").pop() : id;
}

function sleeperIdFor(platform, player, index) {
  const id = rawId(player);
  if (platform === "sleeper") return id || null;
  const direct = platform === "espn" ? index.byEspn.get(id) : index.byYahoo.get(String(player?.yahoo_id ?? id)) || null;
  if (direct) return direct;
  const position = String(player?.position || "").toUpperCase();
  return index.byName.get(`${normalizeName(player?.name)}|${position}`) || null;
}

function scaled(value, now, sleeperNow) {
  if (value === 0) return 0;
  if (!(now > 0) || !(sleeperNow > 0)) return value;
  const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, now / sleeperNow));
  return Number((value * ratio).toFixed(2));
}

async function attachComingWeeks({ platform, players, week, season, weeks = EXTRA_WEEKS + 1, deps }) {
  const list = (players || []).filter(Boolean);
  const extra = Math.min(EXTRA_WEEKS, Math.max(0, Number(weeks) - 1));
  const first = Number(week);
  if (!list.length || !extra || !Number.isInteger(first)) return;
  const coming = Array.from({ length: extra }, (_, i) => first + 1 + i).filter((w) => w <= 18);
  const [sleeperPlayers, now, ...ahead] = await Promise.all([
    platform === "sleeper" ? null : deps.fetchSleeperPlayers(),
    deps.fetchSleeperProjections(season, first),
    ...coming.map((w) => deps.fetchSleeperProjections(season, w).catch(() => null)),
  ]);
  const index = sleeperIndex(sleeperPlayers);
  for (const player of list) {
    const id = sleeperIdFor(platform, player, index);
    if (!id) continue;
    const current = Number(player.projected_points);
    const byWeek = { ...(player.projected_points_by_week || {}) };
    if (player.projected_points != null && Number.isFinite(current)) byWeek[first] = current;
    coming.forEach((w, i) => {
      const value = Number(ahead[i]?.[id]);
      if (ahead[i]?.[id] != null && Number.isFinite(value)) byWeek[w] = scaled(value, current, Number(now?.[id]));
    });
    player.projected_points_by_week = byWeek;
  }
}

module.exports = { attachComingWeeks, sleeperIdFor, sleeperIndex, EXTRA_WEEKS };
