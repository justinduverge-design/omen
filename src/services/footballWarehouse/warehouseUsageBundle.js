"use strict";

const { resolveGsis, summarize } = require("../playerUsage");

function weeklyRows(rows, beforeWeek) {
  return (rows || [])
    .filter((row) => Number(row?.week) < beforeWeek)
    .map((row) => ({
      week: Number(row.week),
      snap_share: row.snap_share == null ? null : Number(row.snap_share),
      targets: Number(row.targets) || 0,
      receptions: Number(row.receptions) || 0,
      carries: Number(row.carries) || 0,
      attempts: Number(row.attempts) || 0,
      target_share: row.target_share == null ? null : Number(row.target_share),
    }))
    .sort((left, right) => left.week - right.week);
}

/**
 * Resolve private provider roster keys in Supabase, then read only public GSIS-keyed
 * facts from the warehouse. Provider keys never cross the warehouse connection.
 */
async function getWarehouseUsageBundle({ supabase, repository, playerKeys, season, beforeWeek }) {
  if (!supabase || !repository || typeof repository.readPlayerWeeks !== "function") {
    throw new TypeError("warehouse usage dependencies are required");
  }
  if (!Array.isArray(playerKeys) || !playerKeys.length) return { usage: new Map(), weekly: new Map() };
  const gsisByKey = await resolveGsis(supabase, playerKeys);
  if (!gsisByKey.size) return { usage: new Map(), weekly: new Map() };
  const rowsByGsis = await repository.readPlayerWeeks({
    gsisIds: [...new Set(gsisByKey.values())], season, beforeWeek,
  });
  const usage = new Map();
  const weekly = new Map();
  for (const [providerKey, gsisId] of gsisByKey) {
    const rows = rowsByGsis.get(gsisId) || [];
    const snaps = rows
      .filter((row) => row.snap_share != null)
      .map((row) => ({ week: row.week, offense_pct: row.snap_share }));
    const summary = summarize(rows, beforeWeek, snaps);
    if (summary) usage.set(providerKey, summary);
    const facts = weeklyRows(rows, beforeWeek);
    if (facts.length) weekly.set(providerKey, facts);
  }
  return { usage, weekly };
}

module.exports = { getWarehouseUsageBundle, weeklyRows };
