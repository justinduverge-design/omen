"use strict";

/**
 * Projection explainer, layer 1: "where the points come from"
 * (`Blueprints/specs/omen-projection-explainer-v1.md`).
 *
 * The provider's projected stat line multiplied by the league's own scoring rules, broken
 * into points by source. Everything here is labelled **Projected**: it is the provider's
 * number and arithmetic on it, nothing Omen predicts.
 *
 * The honesty rule: the parts must add up to the provider's projected number. When they do
 * not (the provider's number is not in this league's scoring, or a rule Omen cannot see is in
 * play), the breakdown is `unavailable` with a reason and no lines, never a split that looks
 * exact and is not. Small sources are folded into `other_points`, never dropped.
 *
 * Pure: provider reads stay in the routes and adapters. League rules are used in memory only
 * and never stored (spec phase 1).
 */

// Provider numbers are two-decimal and stat lines are rounded. A gap above this is a rule
// disagreement, not rounding.
const RECONCILE_TOLERANCE = 0.1;
// Sources worth less than this are folded into "other" to keep the line short.
const MIN_LINE_POINTS = 0.5;

const PROVIDER_LABELS = Object.freeze({ sleeper: "Sleeper", espn: "ESPN", yahoo: "Yahoo" });

const SLEEPER_LABELS = Object.freeze({
  pass_yd: "pass yds", pass_td: "pass TD", pass_int: "INT thrown", pass_cmp: "completions",
  pass_att: "pass att", pass_inc: "incompletions", pass_sack: "sacks taken", pass_2pt: "2-pt passes",
  rush_yd: "rush yds", rush_td: "rush TD", rush_att: "carries", rush_2pt: "2-pt runs",
  rec: "receptions", rec_yd: "rec yds", rec_td: "rec TD", rec_tgt: "targets", rec_2pt: "2-pt catches",
  bonus_rec_te: "TE reception bonus", bonus_rec_rb: "RB reception bonus", bonus_rec_wr: "WR reception bonus",
  fum_lost: "fumbles lost", fum: "fumbles",
  xpm: "extra points", xpmiss: "missed XP", fgm: "field goals", fgmiss: "missed FG",
  fgm_0_19: "FG 0-19", fgm_20_29: "FG 20-29", fgm_30_39: "FG 30-39", fgm_40_49: "FG 40-49", fgm_50p: "FG 50+",
  sack: "sacks", int: "interceptions", fum_rec: "fumble recoveries", def_td: "defensive TD",
  safe: "safeties", blk_kick: "blocked kicks", def_st_td: "return TD", st_td: "return TD",
});

// Only ids whose meaning is certain (scoringRuleSnapshot.ESPN_EVENT_MAP). Any other scored id
// still counts toward the total; it is shown as "other" rather than given a guessed name.
const ESPN_LABELS = Object.freeze({
  3: "pass yds", 4: "pass TD", 20: "INT thrown", 24: "rush yds", 25: "rush TD",
  42: "rec yds", 43: "rec TD", 53: "receptions", 72: "fumbles lost",
});

function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function providerLabel(provider) {
  return PROVIDER_LABELS[provider] || "The provider";
}

function reasonFor(provider, code) {
  const label = providerLabel(provider);
  switch (code) {
    case "no_stat_line":
      return provider === "yahoo"
        ? "Yahoo does not give Omen a projected stat line."
        : `${label} gave no projected stat line for this player.`;
    case "no_projection":
      return `${label} gave no projected points for this player.`;
    case "no_league_scoring":
      return "Omen could not read this league's scoring rules.";
    case "does_not_reconcile":
      return `The stat line under this league's scoring does not add up to ${label}'s projection, so Omen is not showing a split.`;
    default:
      return `Omen does not read ${label}'s projected stat line here yet.`;
  }
}

function unavailableBreakdown(provider, reasonCode) {
  return {
    status: "unavailable",
    label: "Projected",
    provider: provider || null,
    reason_code: reasonCode,
    reason: reasonFor(provider, reasonCode),
  };
}

/** parts: [{ stat, label, quantity, points_per, points }], label null means "other". */
function reconcile({ provider, parts, providerPoints }) {
  if (providerPoints == null) return unavailableBreakdown(provider, "no_projection");
  const total = parts.reduce((sum, part) => sum + part.points, 0);
  if (Math.abs(total - providerPoints) > RECONCILE_TOLERANCE) {
    return unavailableBreakdown(provider, "does_not_reconcile");
  }

  const shown = parts
    .filter((part) => part.label && Math.abs(part.points) >= MIN_LINE_POINTS)
    .sort((a, b) => b.points - a.points);
  const shownSet = new Set(shown);
  const other = parts.filter((part) => !shownSet.has(part)).reduce((sum, part) => sum + part.points, 0);

  return {
    status: "available",
    label: "Projected",
    provider,
    provider_points: round2(providerPoints),
    total: round2(total),
    lines: shown.map((part) => ({
      stat: part.stat,
      label: part.label,
      quantity: round2(part.quantity),
      points_per: part.points_per,
      points: round2(part.points),
    })),
    other_points: round2(other),
  };
}

/**
 * Sleeper scores a player as sum(stat × scoring_settings[stat]) over the same keys, so the
 * league's settings apply to the projected stat line directly. The provider number defaults to
 * the stat line's own `pts_ppr`, which is what Omen's Sleeper rosters show as projected points.
 */
function sleeperProjectionBreakdown({ statLine, scoringSettings, providerPoints = null } = {}) {
  if (!statLine || typeof statLine !== "object") return unavailableBreakdown("sleeper", "no_stat_line");
  if (!scoringSettings || typeof scoringSettings !== "object" || !Object.keys(scoringSettings).length) {
    return unavailableBreakdown("sleeper", "no_league_scoring");
  }

  const parts = [];
  for (const [stat, rawQuantity] of Object.entries(statLine)) {
    if (stat.startsWith("pts_")) continue;
    const quantity = finite(rawQuantity);
    const perUnit = finite(scoringSettings[stat]);
    if (quantity == null || !perUnit) continue;
    const points = quantity * perUnit;
    if (!points) continue;
    parts.push({ stat, label: SLEEPER_LABELS[stat] || stat.replace(/_/g, " "), quantity, points_per: perUnit, points });
  }
  if (!parts.length) return unavailableBreakdown("sleeper", "no_stat_line");

  return reconcile({
    provider: "sleeper",
    parts,
    providerPoints: finite(providerPoints) ?? finite(statLine.pts_ppr),
  });
}

/**
 * ESPN keys the league's rules and the projected stat line by the same numeric stat id
 * (`espnAppliedPoints` in the ESPN adapter, verified 15 of 15 against `appliedTotal`).
 * `projection` is `{ position_id, applied_total, stats }` from the week's projected row.
 */
function espnProjectionBreakdown({ projection, rules, providerPoints = null } = {}) {
  if (!projection?.stats || typeof projection.stats !== "object") return unavailableBreakdown("espn", "no_stat_line");
  if (!rules?.byStatId || !rules.byStatId.size) return unavailableBreakdown("espn", "no_league_scoring");

  const parts = [];
  for (const [stat, rawQuantity] of Object.entries(projection.stats)) {
    const rule = rules.byStatId.get(String(stat));
    if (!rule) continue;
    const override = rule.overrides?.[String(projection.position_id)];
    const perUnit = finite(override === undefined ? rule.points : override);
    const quantity = finite(rawQuantity);
    if (quantity == null || !perUnit) continue;
    const points = quantity * perUnit;
    if (!points) continue;
    parts.push({ stat: String(stat), label: ESPN_LABELS[stat] || null, quantity, points_per: perUnit, points });
  }
  if (!parts.length) return unavailableBreakdown("espn", "no_stat_line");

  return reconcile({
    provider: "espn",
    parts,
    providerPoints: finite(providerPoints) ?? finite(projection.applied_total),
  });
}

function formatNumber(value, digits = 2) {
  return String(Number(Number(value).toFixed(digits)));
}

function formatSigned(value) {
  const rounded = Number(Number(value).toFixed(1));
  return rounded >= 0 ? `+${rounded}` : String(rounded);
}

/** "Chris Olave's 15.72 from Sleeper: 72 rec yds × 0.1 = 7.2; 6.1 receptions × 1 = 6.1." */
function breakdownStatement(name, breakdown) {
  if (breakdown?.status !== "available") return null;
  const parts = breakdown.lines.map((line) =>
    `${formatNumber(line.quantity)} ${line.label} × ${formatNumber(line.points_per, 4)} = ${formatNumber(line.points, 1)}`);
  if (Math.abs(breakdown.other_points) >= 0.05) parts.push(`other scoring ${formatSigned(breakdown.other_points)}`);
  return `${name}'s ${formatNumber(breakdown.provider_points)} from ${providerLabel(breakdown.provider)}: ${parts.join("; ")}.`;
}

/**
 * Evidence rows for a set of players. An available breakdown is a `projected` row; an
 * unavailable one is a `limitation` row, shared when every player has the same gap. A player
 * with no breakdown at all (a read failed) contributes nothing.
 */
function breakdownEvidence(entries = []) {
  const rows = [];
  const unavailable = [];
  for (const { name, breakdown } of entries) {
    if (!breakdown) continue;
    if (breakdown.status === "available") {
      rows.push({ category: "points_breakdown", kind: "projected", statement: breakdownStatement(name, breakdown) });
    } else {
      unavailable.push({ name, breakdown });
    }
  }
  const reasons = new Set(unavailable.map((entry) => entry.breakdown.reason));
  if (unavailable.length > 1 && reasons.size === 1) {
    rows.push({
      category: "points_breakdown",
      kind: "limitation",
      statement: `Points breakdown unavailable: ${unavailable[0].breakdown.reason}`,
    });
  } else {
    for (const { name, breakdown } of unavailable) {
      rows.push({
        category: "points_breakdown",
        kind: "limitation",
        statement: `Points breakdown unavailable for ${name}: ${breakdown.reason}`,
      });
    }
  }
  return rows;
}

function rosterPlayers(roster) {
  return [
    ...(Array.isArray(roster?.slots?.starters) ? roster.slots.starters : []),
    ...(Array.isArray(roster?.slots?.bench) ? roster.slots.bench : []),
  ];
}

function sleeperIdFromKey(playerKey) {
  const match = /^sleeper:(.+)$/.exec(String(playerKey || ""));
  return match ? match[1] : null;
}

/**
 * `player_key -> breakdown` for every rostered player.
 *
 * @param {object} input
 * @param {"sleeper"|"espn"|"yahoo"} input.platform
 * @param {object} input.roster normalized roster
 * @param {{statLines: object, scoringSettings: object}} [input.sleeper]
 * @param {{projections: Map|object, rules: object}} [input.espn]
 */
function rosterProjectionBreakdowns({ platform, roster, sleeper = null, espn = null } = {}) {
  const out = new Map();
  for (const player of rosterPlayers(roster)) {
    const key = player?.player_key;
    if (!key) continue;
    if (platform === "sleeper") {
      const id = sleeperIdFromKey(key) ?? player.player_id;
      out.set(key, sleeperProjectionBreakdown({
        statLine: id == null ? null : sleeper?.statLines?.[String(id)],
        scoringSettings: sleeper?.scoringSettings,
        providerPoints: player.projected_points,
      }));
    } else if (platform === "espn") {
      const projections = espn?.projections;
      const projection = projections instanceof Map ? projections.get(key) : projections?.[key];
      out.set(key, espnProjectionBreakdown({ projection, rules: espn?.rules, providerPoints: player.projected_points }));
    } else {
      out.set(key, unavailableBreakdown(platform, "no_stat_line"));
    }
  }
  return out;
}

/**
 * The Omen call: an optional `projection_breakdown` for the recommendation's primary player
 * (the spec's additive field on the decision brief). Sleeper only for now; the Omen call does
 * not carry ESPN's projected stat row, so ESPN is named unavailable rather than re-read.
 *
 * `loadSleeperInputs({ leagueId, season, week })` returns `{ statLines, scoringSettings }`.
 * A thrown loader is the caller's to absorb: the field is then simply absent.
 */
async function attachOmenProjectionBreakdown({ response, loadSleeperInputs } = {}) {
  if (!response || response.state !== "success") return response;
  const primary = response.recommendation?.primary_player;
  if (!primary?.id) return response;

  const platform = response.platform?.name || null;
  let breakdown;
  if (platform === "sleeper") {
    const id = sleeperIdFromKey(primary.id);
    const { statLines, scoringSettings } = await loadSleeperInputs({
      leagueId: response.league?.id ?? null,
      season: Number(response.league?.season),
      week: Number(response.league?.week),
    });
    breakdown = sleeperProjectionBreakdown({ statLine: id == null ? null : statLines?.[id], scoringSettings });
  } else {
    breakdown = unavailableBreakdown(platform, platform === "yahoo" ? "no_stat_line" : "not_read_here");
  }

  response.projection_breakdown = {
    player_id: primary.id,
    player_name: primary.name || null,
    ...breakdown,
    statement: breakdown.status === "available"
      ? breakdownStatement(primary.name || "This player", breakdown)
      : `Points breakdown unavailable: ${breakdown.reason}`,
  };
  return response;
}

module.exports = {
  MIN_LINE_POINTS,
  attachOmenProjectionBreakdown,
  RECONCILE_TOLERANCE,
  breakdownEvidence,
  breakdownStatement,
  espnProjectionBreakdown,
  rosterProjectionBreakdowns,
  sleeperIdFromKey,
  sleeperProjectionBreakdown,
  unavailableBreakdown,
};
