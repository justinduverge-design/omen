"use strict";

/**
 * Scoring a projected (or actual) stat line.
 *
 * A projection is a stat line in nflverse keys. Points come from applying a scoring contract
 * (`scoringContract.calculateContractScore`, the same engine that grades real points), so a projection can be
 * scored in any league's rules. The three presets below are the backtest's reference scorings only.
 */

const { calculateContractScore } = require("../scoringContract");
const { SLEEPER_EVENT_MAP } = require("../scoringRuleSnapshot");

const RULESET_VERSION = "omen-scoring-contract-v1";

function contract(receptionPoints) {
  return Object.freeze({
    ruleset_version: RULESET_VERSION,
    coverage_state: "supported",
    rules: Object.freeze([
      { event_key: "passing_yards", operator: "per_event", value: 0.04 },
      { event_key: "passing_touchdowns", operator: "per_event", value: 4 },
      { event_key: "passing_interceptions", operator: "per_event", value: -2 },
      { event_key: "rushing_yards", operator: "per_event", value: 0.1 },
      { event_key: "rushing_touchdowns", operator: "per_event", value: 6 },
      { event_key: "receiving_receptions", operator: "per_event", value: receptionPoints },
      { event_key: "receiving_yards", operator: "per_event", value: 0.1 },
      { event_key: "receiving_touchdowns", operator: "per_event", value: 6 },
      { event_key: "fumbles_lost", operator: "per_event", value: -2 },
    ]),
  });
}

const SCORING_PRESETS = Object.freeze({
  standard: contract(0),
  half_ppr: contract(0.5),
  ppr: contract(1),
});

/** nflverse stat keys -> the scoring contract's event keys. Missing keys are zero. */
function statLineToFacts(statLine) {
  const s = statLine || {};
  const n = (key) => (Number.isFinite(Number(s[key])) ? Number(s[key]) : 0);
  return {
    passing_yards: n("passing_yards"),
    passing_touchdowns: n("passing_tds"),
    passing_interceptions: n("passing_interceptions"),
    rushing_yards: n("rushing_yards"),
    rushing_touchdowns: n("rushing_tds"),
    receiving_receptions: n("receptions"),
    receiving_yards: n("receiving_yards"),
    receiving_touchdowns: n("receiving_tds"),
    fumbles_lost: n("fumbles_lost"),
  };
}

/** Points for a stat line under a preset name or a full scoring contract. */
function scoreStatLine(statLine, scoring = "ppr") {
  const resolved = typeof scoring === "string" ? SCORING_PRESETS[scoring] : scoring;
  if (!resolved) throw new TypeError(`unknown scoring preset: ${scoring}`);
  return calculateContractScore(resolved, statLineToFacts(statLine)).points;
}

/**
 * A Sleeper projection stat line (pass_yd, rec, ...) -> scoring-contract facts. Several Sleeper keys can map to
 * one event key (the three two-point keys), so they are added, never overwritten. `pts_*` totals are ignored:
 * a provider's points are never used, only its stat line.
 */
function sleeperStatLineToFacts(sleeperLine) {
  const facts = {};
  for (const [key, quantity] of Object.entries(sleeperLine || {})) {
    if (key.startsWith("pts_")) continue;
    const mapping = SLEEPER_EVENT_MAP[key];
    const count = Number(quantity);
    if (!mapping || !Number.isFinite(count)) continue;
    facts[mapping.event_key] = (facts[mapping.event_key] || 0) + count;
  }
  return facts;
}

function scoreSleeperStatLine(sleeperLine, scoring = "ppr") {
  const resolved = typeof scoring === "string" ? SCORING_PRESETS[scoring] : scoring;
  if (!resolved) throw new TypeError(`unknown scoring preset: ${scoring}`);
  return calculateContractScore(resolved, sleeperStatLineToFacts(sleeperLine)).points;
}

/**
 * An Omen stat line in Sleeper's key names, so every existing consumer of a Sleeper stat line
 * (`yahooProjections.scoreStatLine`, the optimizer, the Omen call) can score an Omen projection unchanged.
 */
function toSleeperStatLine(statLine) {
  const s = statLine || {};
  const out = {
    pass_att: s.attempts, pass_cmp: s.completions, pass_yd: s.passing_yards, pass_td: s.passing_tds,
    pass_int: s.passing_interceptions, rush_att: s.carries, rush_yd: s.rushing_yards, rush_td: s.rushing_tds,
    rec_tgt: s.targets, rec: s.receptions, rec_yd: s.receiving_yards, rec_td: s.receiving_tds, fum_lost: s.fumbles_lost,
  };
  for (const key of Object.keys(out)) if (!Number.isFinite(Number(out[key]))) delete out[key];
  return out;
}

module.exports = {
  SCORING_PRESETS, scoreSleeperStatLine, scoreStatLine, sleeperStatLineToFacts, statLineToFacts, toSleeperStatLine,
};
