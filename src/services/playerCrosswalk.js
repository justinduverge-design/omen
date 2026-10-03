"use strict";

/**
 * Player crosswalk (database redo step 04 tables; plan A, item A1).
 *
 * Builds one Omen player identity per NFL player and maps each provider's player id onto it, so a
 * roster player (`espn:4241478`, `sleeper:6794`, `yahoo:33536`) can be joined to nflverse football
 * data. Pure: takes the two source files' parsed contents and returns the rows to store.
 *
 * Sources (both open):
 *   - nflverse `players.csv` (CC BY 4.0): the NFL game-stats id (gsis), birth date, and ESPN id.
 *   - Sleeper's public player list: Sleeper ids, names, birth dates, and the Yahoo ids Sleeper carries.
 *
 * Rules (redo design §D3: "a player it cannot match with certainty goes to unresolved; never guessed"):
 *   - The canonical id is `omen:player:gsis.<gsis_id>`, assigned from nflverse, never from a name.
 *   - ESPN ids come straight from nflverse (provider_supplied).
 *   - A Sleeper player matches on normalized full name + birth date, which must hit exactly one gsis
 *     id. If Sleeper's own gsis id is present it must agree, or the player is unresolved ('conflict').
 *     A Sleeper player with no name+birth-date hit but a gsis id nflverse knows matches on that id.
 *   - Yahoo ids are taken from a matched Sleeper record only.
 *   - Two provider ids that would land on the same player for one provider are both unresolved
 *     ('conflict'), because the table allows one id per player per provider.
 */

const crypto = require("crypto");

const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K"]);
const SUFFIX = /\b(jr|sr|ii|iii|iv|v)\b\.?/g;

function normalizeName(name) {
  return String(name || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(SUFFIX, "").replace(/[^a-z]/g, "");
}

function playerIdFor(gsisId) {
  return `omen:player:gsis.${String(gsisId).toLowerCase()}`;
}

function text(value) {
  const s = value == null ? "" : String(value).trim();
  return s && s.toUpperCase() !== "NA" ? s : null;
}

function isoDate(value) {
  const s = text(value);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * @param {object} input
 * @param {Array<object>} input.nflversePlayers rows of nflverse players.csv
 * @param {object} input.sleeperPlayers Sleeper's /v1/players/nfl object, keyed by Sleeper id
 * @param {number} input.minLastSeason nflverse players last seen before this season are left out,
 *   unless a provider id maps to them
 */
function buildCrosswalk({ nflversePlayers, sleeperPlayers, minLastSeason }) {
  const byGsis = new Map();
  const byNameBirth = new Map();
  for (const row of nflversePlayers) {
    const gsis = text(row.gsis_id);
    const name = text(row.display_name);
    const position = text(row.position);
    if (!gsis || !name || !position) continue;
    byGsis.set(gsis, row);
    const birth = isoDate(row.birth_date);
    if (!birth) continue;
    const names = new Set([row.display_name, `${row.first_name} ${row.last_name}`, `${row.football_name} ${row.last_name}`]
      .map(normalizeName).filter(Boolean));
    for (const n of names) {
      const key = `${n}|${birth}`;
      if (!byNameBirth.has(key)) byNameBirth.set(key, new Set());
      byNameBirth.get(key).add(gsis);
    }
  }

  const ids = [];
  const unresolved = [];

  for (const [gsis, row] of byGsis) {
    ids.push({ provider: "nflverse", provider_player_id: gsis, gsis, match_method: "provider_supplied" });
    const espn = text(row.espn_id);
    if (espn) ids.push({ provider: "espn", provider_player_id: espn, gsis, match_method: "provider_supplied" });
  }

  for (const [sleeperId, p] of Object.entries(sleeperPlayers || {})) {
    if (!p || !FANTASY_POSITIONS.has(p.position) || !p.active) continue;
    const fullName = text(p.full_name) || text(`${p.first_name || ""} ${p.last_name || ""}`);
    if (!fullName) continue;
    const birth = isoDate(p.birth_date);
    const candidates = birth ? [...(byNameBirth.get(`${normalizeName(fullName)}|${birth}`) || [])] : [];
    const sleeperGsis = text(p.gsis_id);
    let gsis = null;
    let method = null;
    let reason = null;
    if (candidates.length === 1) {
      gsis = candidates[0];
      method = "name_birth_date";
      if (sleeperGsis && byGsis.has(sleeperGsis) && sleeperGsis !== gsis) reason = "conflict";
    } else if (candidates.length > 1) {
      reason = "ambiguous";
    } else if (sleeperGsis && byGsis.has(sleeperGsis)) {
      gsis = sleeperGsis;
      method = "provider_supplied";
    } else {
      reason = "no_match";
    }
    if (reason) {
      // A free agent with no team is not on any roster Omen reads; recording it would only add noise.
      if (!text(p.team)) continue;
      unresolved.push({
        provider: "sleeper", provider_player_id: String(sleeperId), full_name: fullName,
        position: p.position, nfl_team: text(p.team), birth_date: birth, reason,
        candidates: candidates.map(playerIdFor).sort(),
      });
      continue;
    }
    ids.push({ provider: "sleeper", provider_player_id: String(sleeperId), gsis, match_method: method });
    const yahoo = text(p.yahoo_id);
    if (yahoo) ids.push({ provider: "yahoo", provider_player_id: yahoo, gsis, match_method: "provider_supplied", via_sleeper: String(sleeperId) });
  }

  // One id per provider per player, and one player per provider id: anything else is a conflict.
  const perPlayer = new Map();
  const perId = new Map();
  for (const m of ids) {
    const pk = `${m.provider}|${m.gsis}`;
    const ik = `${m.provider}|${m.provider_player_id}`;
    perPlayer.set(pk, (perPlayer.get(pk) || 0) + 1);
    perId.set(ik, (perId.get(ik) || new Set()).add(m.gsis));
  }
  const clashes = (m) => perPlayer.get(`${m.provider}|${m.gsis}`) > 1 || perId.get(`${m.provider}|${m.provider_player_id}`).size > 1;
  // A Yahoo id is only as good as the Sleeper record it came from.
  const refusedSleeper = new Set(ids.filter((m) => m.provider === "sleeper" && clashes(m)).map((m) => m.provider_player_id));
  const providerIds = [];
  for (const m of ids) {
    if (m.via_sleeper && refusedSleeper.has(m.via_sleeper)) continue;
    const clash = clashes(m);
    if (clash) {
      if (m.provider === "nflverse") continue;
      const row = byGsis.get(m.gsis);
      unresolved.push({
        provider: m.provider, provider_player_id: m.provider_player_id, full_name: text(row?.display_name) || m.provider_player_id,
        position: text(row?.position), nfl_team: text(row?.latest_team), birth_date: isoDate(row?.birth_date),
        reason: "conflict", candidates: [playerIdFor(m.gsis)],
      });
      continue;
    }
    providerIds.push({ provider: m.provider, provider_player_id: m.provider_player_id, player_id: playerIdFor(m.gsis), match_method: m.match_method });
  }
  const dedupUnresolved = new Map(unresolved.map((u) => [`${u.provider}|${u.provider_player_id}`, u]));

  const players = [];
  for (const [gsis, row] of byGsis) {
    const lastSeason = Number(row.last_season);
    const recent = Number.isFinite(lastSeason) && lastSeason >= minLastSeason;
    const mappedByProvider = providerIds.some((m) => m.provider !== "nflverse" && m.provider !== "espn" && m.player_id === playerIdFor(gsis));
    if (!recent && !mappedByProvider) continue;
    players.push({
      id: playerIdFor(gsis), full_name: text(row.display_name), position: text(row.position),
      nfl_team: text(row.latest_team), birth_date: isoDate(row.birth_date), gsis_id: gsis, status: text(row.status),
    });
  }
  const kept = new Set(players.map((p) => p.id));
  return {
    players,
    providerIds: providerIds.filter((m) => kept.has(m.player_id)),
    unresolved: [...dedupUnresolved.values()],
  };
}

function sourceRef(...parts) {
  const hash = crypto.createHash("sha256");
  for (const part of parts) hash.update(part);
  return `sha256:${hash.digest("hex")}`;
}

module.exports = { buildCrosswalk, normalizeName, playerIdFor, sourceRef, FANTASY_POSITIONS };
