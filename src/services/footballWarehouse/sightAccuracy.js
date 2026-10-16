"use strict";

// Grade Sight against what happened (pure math). For one version and one graded week G, take the Sight run
// through week G-1 (its read of week G) and each player's actual PPR in week G. Beside it, two yardsticks:
// points per game to date (what a fan would guess) and the provider's projection when one is stored.
// A player who did not play in week G has no row and is not graded (injury and byes are not the question).

const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
function corr(a, b) {
  if (a.length < 3) return null;
  const ma = mean(a); const mb = mean(b);
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < a.length; i += 1) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? Math.round((num / Math.sqrt(da * db)) * 1000) / 1000 : null;
}
const mae = (a, b) => (a.length ? Math.round(mean(a.map((x, i) => Math.abs(x - b[i]))) * 100) / 100 : null);
const r2 = (x) => Math.round(x * 100) / 100;

/**
 * @param {Array<{entityId, value, components}>} sight values of the Sight run through week G-1
 * @param {Map<string, number>} actual player id -> PPR in week G
 * @param {Map<string, number>} provider player id -> provider PPR projection for week G (may be empty)
 */
function gradeSight(sight, actual, provider = new Map()) {
  const values = [];
  const byPosition = {};
  for (const s of sight) {
    const y = actual.get(s.entityId);
    if (y == null) continue;
    const position = s.components?.position || "UNK";
    const row = { predicted: s.value, actual: y, ppg_baseline: s.components?.production_ppg ?? null, provider: provider.get(s.entityId) ?? null };
    (byPosition[position] ||= []).push(row);
    values.push({ entityType: "player", entityId: s.entityId, value: r2(y - s.value), components: { position, ...row } });
  }
  const positions = {};
  for (const [position, rows] of Object.entries(byPosition)) {
    const y = rows.map((r) => r.actual);
    const withProvider = rows.filter((r) => r.provider != null);
    positions[position] = {
      n: rows.length,
      sight: { corr: corr(rows.map((r) => r.predicted), y), mae: mae(rows.map((r) => r.predicted), y) },
      ppg_to_date: { corr: corr(rows.map((r) => r.ppg_baseline ?? 0), y), mae: mae(rows.map((r) => r.ppg_baseline ?? 0), y) },
      provider: withProvider.length >= 3
        ? { n: withProvider.length, corr: corr(withProvider.map((r) => r.provider), withProvider.map((r) => r.actual)), mae: mae(withProvider.map((r) => r.provider), withProvider.map((r) => r.actual)),
            sight_corr_same_players: corr(withProvider.map((r) => r.predicted), withProvider.map((r) => r.actual)) }
        : { n: withProvider.length, reason: "no_stored_provider_projections" },
    };
  }
  return { values, summary: { outcome: values.length ? "graded" : "nothing_to_grade", positions } };
}

module.exports = { gradeSight };
