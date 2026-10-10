"use strict";

const { refKey } = require("./outcomeRepository");

const PLAYER_KEY = /^(yahoo|espn|sleeper):([0-9A-Za-z_-]{1,64})$/;

/** The provider player id the engine stored with the call (`primary_player.id`), or null. Never a name. */
function providerRefFromDecision(decision) {
  const id = decision?.recommendation?.primary_player?.id;
  const match = typeof id === "string" ? PLAYER_KEY.exec(id) : null;
  return match ? { provider: match[1], providerId: match[2] } : null;
}

/**
 * Resolve the warehouse outcome for each entry that still needs a player line.
 * Returns Map(decisionId -> { kind, ... }) where kind is:
 *   pending     the week has no warehouse stat lines yet (not played / not ingested): leave Pending
 *   unresolved  no provider id on the call, or the id has no football_player_ids row
 *   no_line     the player resolves but has no regular-season line for that week
 *   points      { ppr, receptions } a usable line
 * Throws if the warehouse cannot be read; the caller then falls back to the existing path.
 */
async function resolveWarehouseOutcomes({ entries, repository }) {
  const results = new Map();
  const byWeek = new Map();
  for (const entry of entries) {
    const { decision } = entry;
    const key = `${decision.season}:${decision.week}`;
    if (!byWeek.has(key)) byWeek.set(key, { season: Number(decision.season), week: Number(decision.week), entries: [] });
    byWeek.get(key).entries.push(entry);
  }

  for (const group of byWeek.values()) {
    if (!(await repository.isWeekIngested({ season: group.season, week: group.week }))) {
      for (const { decision } of group.entries) results.set(decision.id, { kind: "pending" });
      continue;
    }
    const refs = [];
    for (const { decision } of group.entries) {
      const ref = providerRefFromDecision(decision);
      if (ref) refs.push(ref);
    }
    const found = refs.length
      ? await repository.readWeekOutcomes({ refs, season: group.season, week: group.week })
      : new Map();
    for (const { decision } of group.entries) {
      const ref = providerRefFromDecision(decision);
      const row = ref ? found.get(refKey(ref.provider, ref.providerId)) : null;
      if (!row || !row.resolved) results.set(decision.id, { kind: "unresolved" });
      else if (!row.hasLine || row.ppr == null) results.set(decision.id, { kind: "no_line" });
      else results.set(decision.id, { kind: "points", ppr: row.ppr, receptions: row.receptions });
    }
  }
  return results;
}

module.exports = { providerRefFromDecision, resolveWarehouseOutcomes };
