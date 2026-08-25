"use strict";

const crypto = require("node:crypto");

const TOLERANCE = 1e-8;
const EXPECTED_KICKER_RULES = Object.freeze({
  pat_made: 1,
  fg_made_0_19: 3,
  fg_made_20_29: 3,
  fg_made_30_39: 3,
  fg_made_40_49: 4,
  fg_made_50_59: 5,
  fg_made_60_plus: 6,
});
const EXPECTED_DST_RULES = Object.freeze({
  sack: 1,
  interception: 2,
  fumble_recovery: 2,
  touchdown: 6,
  safety: 2,
  blocked_kick: 2,
  points_allowed: Object.freeze([
    Object.freeze({ min: 0, max: 0, points: 10 }),
    Object.freeze({ min: 1, max: 6, points: 7 }),
    Object.freeze({ min: 7, max: 13, points: 4 }),
    Object.freeze({ min: 14, max: 20, points: 1 }),
    Object.freeze({ min: 21, max: 27, points: 0 }),
    Object.freeze({ min: 28, max: 34, points: -1 }),
    Object.freeze({ min: 35, max: null, points: -4 }),
  ]),
});

class FootballDataValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FootballDataValidationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new FootballDataValidationError(code, message);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    fail("INVALID_VALIDATION_INPUT", `${label} is not valid JSON`);
  }
}

function near(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= TOLERANCE;
}

function key(row) {
  return `${row.game_id}|${row.subject_id}`;
}

function uniqueMap(rows, label) {
  const map = new Map();
  for (const row of rows || []) {
    const rowKey = key(row);
    if (map.has(rowKey)) fail("VALIDATION_DUPLICATE", `${label} repeats ${rowKey}`);
    map.set(rowKey, row);
  }
  return map;
}

function expectedOffense(fact) {
  const standard = fact.passing_yards / 25
    + 4 * fact.passing_touchdowns
    - 2 * fact.passing_interceptions
    + (fact.rushing_yards + fact.receiving_yards) / 10
    + 6 * (fact.rushing_touchdowns + fact.receiving_touchdowns + fact.special_teams_touchdowns)
    + 2 * (fact.passing_two_point_conversions
      + fact.rushing_two_point_conversions
      + fact.receiving_two_point_conversions)
    - 2 * fact.lost_fumbles;
  return { standard, half_ppr: standard + 0.5 * fact.receptions, ppr: standard + fact.receptions };
}

function expectedKicker(fact) {
  return fact.pat_made
    + 3 * (fact.fg_made_0_19 + fact.fg_made_20_29 + fact.fg_made_30_39)
    + 4 * fact.fg_made_40_49
    + 5 * fact.fg_made_50_59
    + 6 * fact.fg_made_60_plus;
}

function pointsAllowed(points) {
  if (points === 0) return 10;
  if (points <= 6) return 7;
  if (points <= 13) return 4;
  if (points <= 20) return 1;
  if (points <= 27) return 0;
  if (points <= 34) return -1;
  return -4;
}

function expectedDst(fact) {
  return fact.sacks
    + 2 * fact.interceptions
    + 2 * fact.fumble_recoveries
    + 6 * fact.touchdowns
    + 2 * fact.safeties
    + 2 * fact.blocked_kicks
    + pointsAllowed(fact.points_allowed);
}

function assertRules(result) {
  if (result.rulesets?.offensive?.version !== "omen-fantasy-v1"
      || result.rulesets?.kicker?.version !== "omen-kicker-v1"
      || result.rulesets?.dst?.version !== "omen-dst-v1"
      || JSON.stringify(result.rulesets.kicker.rules) !== JSON.stringify(EXPECTED_KICKER_RULES)
      || JSON.stringify(result.rulesets.dst.rules) !== JSON.stringify(EXPECTED_DST_RULES)) {
    fail("VALIDATION_RULESET_MISMATCH", "acceptance artifact does not contain the reviewed v1 rule tables");
  }
}

function validateAcceptanceDocument(result) {
  if (result?.schema !== "omen-football-scoring-acceptance.v1"
      || result?.normalization_version !== "omen-football-normalization.v1") {
    fail("VALIDATION_SCHEMA_MISMATCH", "acceptance schema or normalization version is unsupported");
  }
  if (result.publication?.authorized !== false || result.publication?.promoted !== false) {
    fail("VALIDATION_PUBLICATION_REFUSED", "Phase 2 artifact must remain non-publication evidence");
  }
  if (result.quality?.status !== "accepted" || result.scope?.weeks?.length < 4) {
    fail("VALIDATION_SCOPE_MISMATCH", "acceptance status or four-week scope is missing");
  }
  assertRules(result);

  const factOffense = uniqueMap(result.facts?.offensive, "offensive facts");
  const factKicker = uniqueMap(result.facts?.kicker, "kicker facts");
  const factDst = uniqueMap(result.facts?.dst, "DST facts");
  const derivedOffense = uniqueMap(result.derived?.offensive, "offensive results");
  const derivedKicker = uniqueMap(result.derived?.kicker, "kicker results");
  const derivedDst = uniqueMap(result.derived?.dst, "DST results");
  let maxOffensiveDelta = 0;

  for (const [rowKey, fact] of factOffense) {
    const derived = derivedOffense.get(rowKey);
    if (!derived) fail("VALIDATION_MISSING_RESULT", `offensive result missing for ${rowKey}`);
    const expected = expectedOffense(fact);
    const deltas = [
      Math.abs(expected.standard - derived.standard),
      Math.abs(expected.half_ppr - derived.half_ppr),
      Math.abs(expected.ppr - derived.ppr),
      Math.abs(expected.standard - derived.publisher_reference?.standard),
      Math.abs(expected.ppr - derived.publisher_reference?.ppr),
    ];
    maxOffensiveDelta = Math.max(maxOffensiveDelta, ...deltas);
    if (!near(expected.standard, derived.standard)
        || !near(expected.half_ppr, derived.half_ppr)
        || !near(expected.ppr, derived.ppr)
        || !near(expected.standard, derived.publisher_reference?.standard)
        || !near(expected.ppr, derived.publisher_reference?.ppr)) {
      fail("VALIDATION_OFFENSIVE_MISMATCH", `independent offensive recomputation failed for ${rowKey}`);
    }
  }
  for (const [rowKey, fact] of factKicker) {
    const derived = derivedKicker.get(rowKey);
    const expected = expectedKicker(fact);
    if (!derived || !near(expected, derived.standard)
        || !near(expected, derived.half_ppr) || !near(expected, derived.ppr)) {
      fail("VALIDATION_KICKER_MISMATCH", `independent kicker recomputation failed for ${rowKey}`);
    }
  }
  for (const [rowKey, fact] of factDst) {
    const derived = derivedDst.get(rowKey);
    const expected = expectedDst(fact);
    if (!derived || !near(expected, derived.standard)
        || !near(expected, derived.half_ppr) || !near(expected, derived.ppr)) {
      fail("VALIDATION_DST_MISMATCH", `independent DST recomputation failed for ${rowKey}`);
    }
  }
  if (factOffense.size !== derivedOffense.size
      || factKicker.size !== derivedKicker.size
      || factDst.size !== derivedDst.size) {
    fail("VALIDATION_CARDINALITY_MISMATCH", "fact/result cardinality differs");
  }

  return {
    status: "validated",
    scope: result.scope,
    completed_games: result.quality.completed_games,
    offensive_rows: factOffense.size,
    kicker_rows: factKicker.size,
    dst_rows: factDst.size,
    offensive_mismatches: 0,
    kicker_mismatches: 0,
    dst_mismatches: 0,
    max_offensive_delta: maxOffensiveDelta,
    publication_authorized: false,
    promoted: false,
  };
}

function validateAcceptanceArtifact({ acceptanceBytes, receiptBytes } = {}) {
  const result = parseJson(acceptanceBytes, "acceptance artifact");
  const receipt = parseJson(receiptBytes, "acceptance receipt");
  if (receipt.schema !== "omen-football-scoring-replay.v1"
      || receipt.acceptance_sha256 !== sha256(acceptanceBytes)
      || receipt.source_bundle_hash !== result.source_bundle_hash) {
    fail("VALIDATION_RECEIPT_MISMATCH", "acceptance bytes do not match their exact receipt");
  }
  return {
    ...validateAcceptanceDocument(result),
    acceptance_sha256: receipt.acceptance_sha256,
    source_bundle_hash: result.source_bundle_hash,
  };
}

module.exports = {
  FootballDataValidationError,
  validateAcceptanceArtifact,
  validateAcceptanceDocument,
};
