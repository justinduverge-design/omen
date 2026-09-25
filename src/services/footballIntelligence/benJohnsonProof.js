"use strict";

const crypto = require("node:crypto");
const { parseCsvObjects } = require("../footballData/scoringAcceptance");
const { CONTRACTS, MODELS } = require("./contracts");
const { hashCanonical } = require("./canonicalize");
const { buildFeatureWindow } = require("./featureWindows");
const { compareSchemeDna, computeSchemeDna } = require("./schemeDna");
const { buildSystemSignal } = require("./systemSignal");
const { createConfirmedAssignmentEdge, createInferredInfluenceEdge, projectCoachingTree } = require("./coachingTree");
const { buildFootballIntelligenceReadModel } = require("./readModel");

const REQUIRED_COLUMNS = Object.freeze([
  "season", "week", "nflverse_game_id", "nflverse_play_id", "possession_team", "offense_formation",
  "offense_personnel", "defenders_in_box", "defense_personnel", "number_of_pass_rushers", "starting_hash",
  "qb_location", "n_offense_backfield", "n_defense_box", "is_no_huddle", "is_motion", "is_play_action",
  "is_screen_pass", "is_rpo", "is_trick_play", "is_qb_out_of_pocket", "is_qb_sneak", "n_blitzers", "n_pass_rushers",
]);
const COHORTS = Object.freeze([
  { team: "DET", season: 2024, windowId: "DET-2024" },
  { team: "CHI", season: 2024, windowId: "CHI-2024" },
  { team: "CHI", season: 2025, windowId: "CHI-2025" },
]);
const METRICS = Object.freeze([
  ["is_motion", "offense_motion", "boolean"], ["is_no_huddle", "no_huddle", "boolean"],
  ["is_play_action", "play_action", "boolean"], ["is_rpo", "rpo", "boolean"],
  ["is_screen_pass", "screen", "boolean"], ["is_qb_out_of_pocket", "qb_out_of_pocket", "boolean"],
  ["qb_location", "qb_location", "qb_location"], ["n_offense_backfield", "backfield_count", "category"],
  ["n_defense_box", "box_count", "category"], ["n_blitzers", "blitzers", "category"],
  ["n_pass_rushers", "pass_rushers", "category"],
]);
const BIO_URL = "https://www.chicagobears.com/team/coaches/ben-johnson";
const EXPECTED_FIXTURE_SHA256 = "855297819f3d252c50e90b08fdef721f6371b93fd648881825fcc4c44c582b63";
const EXPECTED_DERIVATION_VERSION = "football-intelligence-fixture-derivation.v1";
const EXPECTED_SOURCE_HASHES = Object.freeze({
  "ftn_charting_2024.csv": "6faae8118cc13ce62589210d553733128ed35e558671009b4a7a8fc5c674c2cb",
  "ftn_charting_2025.csv": "62a66416043ff08d43303bf5f3af5390e3fe0f29461a1fc6e295a15cac6ea994",
  "pbp_participation_2024.csv": "b1f436a98b2a7759eb4ed1181e072a35c2666f9aeb356a49c943d28d6be6b0b9",
  "pbp_participation_2025.csv": "59069adfee7b0f464befba8a5e8be331e523633cc6a7ab403d37bcbcdfbe66ac",
  "games.csv": "44ea79b765e734f75cc65ad6bf8d22f3ea70fdd9560af728421501fa758845fd",
});
const OFFICIAL_ASSIGNMENTS = Object.freeze([
  officialAssignment("DET", "offensive_coordinator", 2022, 2024, "Detroit offensive coordinator from 2022 through 2024", "detroit-oc-2022-2024"),
  officialAssignment("CHI", "head_coach", 2025, 2025, "Became Chicago Bears head coach on January 21 2025", "head-coach-2025"),
]);

function officialAssignment(teamId, role, fromSeason, throughSeason, fact, key) {
  return {
    teamId, role, effectiveWindow: { from: { season: fromSeason, week: 1 }, through: { season: throughSeason, week: 22 } },
    source: { artifact_sha256: hashCanonical({ url: BIO_URL, fact }), row_key: `chicago-bears-biography:ben-johnson:${key}`, publisher: "Chicago Bears", url: BIO_URL },
  };
}

function parseBenJohnsonFixture(csv, manifest) {
  if (typeof csv !== "string" || !manifest || typeof manifest !== "object") throw invalid("fixture CSV and manifest are required");
  if (manifest.schema !== "football-intelligence-source-fixture-manifest.v1") throw invalid("unsupported fixture manifest schema");
  if (manifest.derivation_version !== EXPECTED_DERIVATION_VERSION || manifest.output?.sha256 !== EXPECTED_FIXTURE_SHA256 || manifest.output?.bytes !== Buffer.byteLength(csv)) throw invalid("fixture is not the reviewed pinned snapshot");
  const sourceHashes = Object.fromEntries((manifest.source_artifacts || []).map((item) => [item.filename, item.sha256]));
  if (JSON.stringify(sourceHashes) !== JSON.stringify(EXPECTED_SOURCE_HASHES)) throw invalid("fixture source artifacts are not the reviewed pinned snapshot");
  const digest = crypto.createHash("sha256").update(csv).digest("hex");
  if (digest !== manifest.output?.sha256) throw invalid("fixture SHA-256 does not match manifest");
  const rows = parseCsvObjects(csv, REQUIRED_COLUMNS);
  if (rows.length !== manifest.output.rows) throw invalid("fixture row count does not match manifest");
  if (JSON.stringify(manifest.schema_columns) !== JSON.stringify(REQUIRED_COLUMNS)) throw invalid("fixture columns do not match the bounded proof schema");
  return rows;
}

function mapRowsToObservedFacts(rows, manifest) {
  const facts = [];
  const artifactHash = `sha256:${manifest.output.sha256}`;
  for (const row of rows) {
    const season = strictInteger(row.season, "season");
    const week = strictInteger(row.week, "week");
    if (!COHORTS.some((item) => item.team === row.possession_team && item.season === season)) throw invalid("fixture row is outside the bounded cohorts");
    if (!["U", "S", "P"].includes(row.qb_location)) continue;
    for (const [column, metric, kind] of METRICS) {
      if (row[column] === "") continue;
      facts.push({
        contract_version: CONTRACTS.observedFact,
        fact_key: `${row.nflverse_game_id}:${row.nflverse_play_id}:${row.possession_team}:${metric}`,
        game_id: row.nflverse_game_id, play_id: row.nflverse_play_id, team_id: row.possession_team,
        subject_type: "team", subject_id: row.possession_team, season, week, metric,
        value: parseValue(row[column], kind, column), availability: "observed",
        source: { artifact_sha256: artifactHash, row_key: `${row.nflverse_game_id}:${row.nflverse_play_id}` },
        normalization_version: MODELS.normalization,
      });
    }
  }
  return facts;
}

function buildBenJohnsonVerticalProof({ csv, manifest }) {
  const rows = parseBenJohnsonFixture(csv, manifest);
  return buildBenJohnsonVerticalProofFromRows(rows, manifest);
}

function buildBenJohnsonVerticalProofFromRows(rows, manifest) {
  if (!Array.isArray(rows) || !manifest || typeof manifest !== "object") throw invalid("validated fixture rows and manifest are required");
  const facts = mapRowsToObservedFacts(rows, manifest);
  const dnaByWindow = {};
  for (const cohort of COHORTS) {
    const window = buildFeatureWindow({ facts, subject: { type: "team", id: cohort.team }, from: { season: cohort.season, week: 1 }, through: { season: cohort.season, week: 22 }, windowId: cohort.windowId });
    window.limitations.push(`${rows.filter((row) => Number(row.season) === cohort.season && row.possession_team === cohort.team && !["U", "S", "P"].includes(row.qb_location)).length} non-offense/special-teams rows with no valid quarterback location were excluded from eligible plays.`);
    dnaByWindow[cohort.windowId] = computeSchemeDna(window);
  }
  const det = dnaByWindow["DET-2024"];
  const chiBefore = dnaByWindow["CHI-2024"];
  const chiAfter = dnaByWindow["CHI-2025"];
  const beforeSimilarity = compareSchemeDna(det, chiBefore);
  const afterSimilarity = compareSchemeDna(det, chiAfter);
  const movedTowardBaseline = afterSimilarity.score > beforeSimilarity.score;
  const signal = buildSystemSignal({
    subject: { type: "team", id: "CHI" }, baseline: det, comparison: chiAfter,
    fantasyImplications: ["Treat changes in Chicago player usage as a system tendency to investigate, not proof of an individual-player outcome."],
    alternativeExplanations: ["Roster, quarterback, opponent, injury, and game-state changes may explain part of the observed movement."],
    limitations: [
      `Chicago's similarity to the Detroit 2024 baseline ${movedTowardBaseline ? "increased" : "did not increase"} from ${beforeSimilarity.score} to ${afterSimilarity.score}; this is association, not causation.`,
      "The fixture does not establish play-calling ownership.",
    ],
  });
  const assignments = OFFICIAL_ASSIGNMENTS.map((assignment) => createConfirmedAssignmentEdge({ coachId: "ben-johnson", ...assignment }));
  const influence = createInferredInfluenceEdge({
    coachId: "ben-johnson", teamId: "CHI", effectiveWindow: OFFICIAL_ASSIGNMENTS[1].effectiveWindow,
    baselineDna: det, comparisonDna: chiAfter, similarity: afterSimilarity, confidence: signal.confidence,
    limitations: ["Similarity cannot establish that a coach caused the observed tendencies."],
  });
  const coachingTree = projectCoachingTree([...assignments, influence]);
  const provenance = manifest.source_artifacts.map((source) => ({
    source_family: source.source_family, source_season: source.source_season,
    artifact_sha256: `sha256:${source.sha256}`, licence: source.licence, attribution: source.attribution,
  }));
  provenance.push(...OFFICIAL_ASSIGNMENTS.map((item) => ({ source_family: "official_coach_biography", artifact_sha256: item.source.artifact_sha256, publisher: item.source.publisher, url: item.source.url })));
  provenance.push({ source_family: "fixture_derivation", artifact_sha256: `sha256:${manifest.output.sha256}`, excluded_non_offense_rows: rows.length - new Set(facts.map((fact) => `${fact.game_id}:${fact.play_id}`)).size });
  const readModel = buildFootballIntelligenceReadModel({ schemeDna: COHORTS.map((item) => dnaByWindow[item.windowId]), systemSignals: [signal], coachingTree, provenance });
  return { rows, facts, dnaByWindow, beforeSimilarity, afterSimilarity, movedTowardBaseline, signal, coachingTree, readModel };
}

function parseValue(value, kind, column) {
  if (kind === "boolean") { if (value === "TRUE") return true; if (value === "FALSE") return false; throw invalid(`${column} must be TRUE or FALSE`); }
  if (kind === "qb_location") return { U: "under_center", S: "shotgun", P: "pistol" }[value];
  return String(strictInteger(value, column));
}
function strictInteger(value, name) { if (!/^-?\d+$/.test(String(value))) throw invalid(`${name} must be an integer`); return Number(value); }
function invalid(message) { const error = new TypeError(message); error.code = "FOOTBALL_INTELLIGENCE_FIXTURE_INVALID"; return error; }

module.exports = { COHORTS, METRICS, OFFICIAL_ASSIGNMENTS, REQUIRED_COLUMNS, buildBenJohnsonVerticalProof, buildBenJohnsonVerticalProofFromRows, mapRowsToObservedFacts, parseBenJohnsonFixture };
