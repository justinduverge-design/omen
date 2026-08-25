"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  StagingShadowError,
  buildCorrectionCandidate,
  classifyPipelineFailure,
  evaluateOperationalHealth,
  evaluateWitness,
  recoverPrimaryEvidence,
  runFailureInjectionMatrix,
  stageShadowAcceptance,
} = require("../src/services/footballData/stagingShadow");

const KICKER_RULES = {
  pat_made: 1,
  fg_made_0_19: 3,
  fg_made_20_29: 3,
  fg_made_30_39: 3,
  fg_made_40_49: 4,
  fg_made_50_59: 5,
  fg_made_60_plus: 6,
};

const DST_RULES = {
  sack: 1,
  interception: 2,
  fumble_recovery: 2,
  touchdown: 6,
  safety: 2,
  blocked_kick: 2,
  points_allowed: [
    { min: 0, max: 0, points: 10 },
    { min: 1, max: 6, points: 7 },
    { min: 7, max: 13, points: 4 },
    { min: 14, max: 20, points: 1 },
    { min: 21, max: 27, points: 0 },
    { min: 28, max: 34, points: -1 },
    { min: 35, max: null, points: -4 },
  ],
};

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function acceptanceFixture({ receivingYards = 50, manifestDigit = "1" } = {}) {
  const sourceManifests = {
    schedules: "3".repeat(64),
    stats_player: manifestDigit.repeat(64),
    stats_team: "2".repeat(64),
  };
  const sourceBundleHash = hash(Buffer.from(JSON.stringify(Object.entries(sourceManifests).sort())));
  const weeks = [1, 7, 14, 17];
  const games = [];
  const offensive = [];
  const kicker = [];
  const dst = [];
  const derivedOffensive = [];
  const derivedKicker = [];
  const derivedDst = [];

  for (const week of weeks) {
    const gameId = `2025_${String(week).padStart(2, "0")}_ARI_NO`;
    const canonicalGameId = `nfl:2025:${gameId}`;
    const base = {
      season: 2025,
      season_type: "REG",
      week,
      game_id: gameId,
      canonical_game_id: canonicalGameId,
      raw_manifest_hash: sourceBundleHash,
    };
    const playerId = `00-${String(3000000 + week).padStart(7, "0")}`;
    const offenseFact = {
      ...base,
      fact_version: "omen-offensive-facts.v1",
      subject_id: playerId,
      team_id: "nfl:ARI:2025",
      passing_yards: 0,
      passing_touchdowns: 0,
      passing_interceptions: 0,
      passing_two_point_conversions: 0,
      rushing_yards: 0,
      rushing_touchdowns: 0,
      rushing_two_point_conversions: 0,
      receptions: 4,
      receiving_yards: receivingYards,
      receiving_touchdowns: 0,
      receiving_two_point_conversions: 0,
      special_teams_touchdowns: 0,
      lost_fumbles: 0,
    };
    const standard = receivingYards / 10;
    offensive.push(offenseFact);
    derivedOffensive.push({
      ...base,
      subject_type: "offensive_player",
      subject_id: playerId,
      ruleset_version: "omen-fantasy-v1",
      standard,
      half_ppr: standard + 2,
      ppr: standard + 4,
      publisher_reference: { standard, ppr: standard + 4 },
    });

    const kickerId = `00-${String(4000000 + week).padStart(7, "0")}`;
    kicker.push({
      ...base,
      fact_version: "omen-kicker-facts.v1",
      subject_id: kickerId,
      team_id: "nfl:ARI:2025",
      fg_made: 1,
      fg_att: 1,
      fg_missed: 0,
      fg_blocked: 0,
      fg_made_0_19: 0,
      fg_made_20_29: 0,
      fg_made_30_39: 0,
      fg_made_40_49: 1,
      fg_made_50_59: 0,
      fg_made_60_plus: 0,
      pat_made: 1,
      pat_att: 1,
      pat_missed: 0,
      pat_blocked: 0,
    });
    derivedKicker.push({
      ...base,
      subject_type: "kicker",
      subject_id: kickerId,
      ruleset_version: "omen-kicker-v1",
      standard: 5,
      half_ppr: 5,
      ppr: 5,
    });

    const teamId = "nfl:ARI:2025";
    dst.push({
      ...base,
      fact_version: "omen-dst-facts.v1",
      subject_id: teamId,
      opponent_team_id: "nfl:NO:2025",
      sacks: 2,
      interceptions: 1,
      fumble_recoveries: 1,
      touchdowns: 0,
      safeties: 0,
      blocked_kicks: 0,
      points_allowed: 13,
    });
    derivedDst.push({
      ...base,
      subject_type: "team_dst",
      subject_id: teamId,
      ruleset_version: "omen-dst-v1",
      standard: 10,
      half_ppr: 10,
      ppr: 10,
    });
    games.push({ canonical_id: canonicalGameId, season: 2025, season_type: "REG", week, game_id: gameId });
  }

  return {
    schema: "omen-football-scoring-acceptance.v1",
    normalization_version: "omen-football-normalization.v1",
    source_manifests: sourceManifests,
    source_bundle_hash: sourceBundleHash,
    scope: { season: 2025, season_type: "REG", weeks },
    rulesets: {
      offensive: { version: "omen-fantasy-v1" },
      kicker: { version: "omen-kicker-v1", rules: KICKER_RULES },
      dst: { version: "omen-dst-v1", rules: DST_RULES },
    },
    normalized: { games, players: [], teams: [], player_aliases: [], team_aliases: [] },
    facts: { offensive, kicker, dst },
    derived: { offensive: derivedOffensive, kicker: derivedKicker, dst: derivedDst },
    quality: {
      status: "accepted",
      completed_games: 4,
      row_cardinality: { offensive: 4, kicker: 4, dst: 4, excluded_non_scoreable_rows: 0 },
    },
    publication: { authorized: false, promoted: false },
  };
}

function artifact(fixture = acceptanceFixture(), generatedAt = "2026-08-25T20:00:00.000Z") {
  const acceptanceBytes = Buffer.from(`${JSON.stringify(fixture, null, 2)}\n`);
  const acceptanceHash = hash(acceptanceBytes);
  const receipt = {
    schema: "omen-football-scoring-replay.v1",
    replay_id: "fixture-replay",
    generated_at_utc: generatedAt,
    acceptance_sha256: acceptanceHash,
    source_bundle_hash: fixture.source_bundle_hash,
    scope: fixture.scope,
    publication: fixture.publication,
  };
  return {
    acceptanceBytes,
    acceptanceHash,
    acceptance: fixture,
    receiptBytes: Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`),
  };
}

async function roots(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "omen-a7b-stage-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    backupRoot: path.join(root, "backup"),
    primaryRoot: path.join(root, "primary"),
    recoveryRoot: path.join(root, "recovery"),
    witnessRoot: path.join(root, "witness"),
  };
}

const HIGH_CAPACITY = async () => ({ bavail: 10_000_000, bsize: 4096 });

test("witness evaluation distinguishes match, mismatch, and unavailability", () => {
  const expected = "a".repeat(64);
  assert.equal(evaluateWitness({ expectedHash: expected, observedHash: expected }).status, "pass");
  assert.equal(evaluateWitness({ expectedHash: expected, observedHash: "b".repeat(64) }).status, "hard_stop");
  assert.equal(evaluateWitness({ expectedHash: expected, observedHash: null }).status, "alert");
});

test("freshness and disk thresholds produce explicit alerts", () => {
  assert.equal(evaluateOperationalHealth({
    generatedAt: "2026-08-25T20:00:00.000Z",
    now: "2026-08-25T21:00:00.000Z",
    freeBytes: 10_000,
    minFreeBytes: 1_000,
    maxAgeMs: 2 * 60 * 60 * 1000,
  }).status, "pass");
  const unhealthy = evaluateOperationalHealth({
    generatedAt: "2026-08-24T20:00:00.000Z",
    now: "2026-08-25T21:00:00.000Z",
    freeBytes: 100,
    minFreeBytes: 1_000,
    maxAgeMs: 2 * 60 * 60 * 1000,
  });
  assert.equal(unhealthy.status, "alert");
  assert.deepEqual(unhealthy.alerts.map((alert) => alert.code), ["source_stale", "disk_low"]);
});

test("correction candidates preserve supersession and exact changed subjects", () => {
  const previous = artifact(acceptanceFixture({ receivingYards: 50, manifestDigit: "1" }));
  const current = artifact(acceptanceFixture({ receivingYards: 60, manifestDigit: "4" }));
  const correction = buildCorrectionCandidate({
    currentAcceptance: current.acceptance,
    currentHash: current.acceptanceHash,
    previousAcceptance: previous.acceptance,
    previousHash: previous.acceptanceHash,
  });
  assert.equal(correction.status, "correction_candidate");
  assert.equal(correction.supersedes, previous.acceptanceHash);
  assert.equal(correction.changed_subjects.length, 4);
  assert.equal(correction.publication_authorized, false);
});

test("source loss stays pending and schema drift quarantines without fallback", () => {
  const sourceLoss = classifyPipelineFailure({ code: "SOURCE_UNAVAILABLE" });
  assert.equal(sourceLoss.status, "pending");
  assert.equal(sourceLoss.fallback_attempted, false);
  assert.equal(sourceLoss.publication_authorized, false);
  const schemaDrift = classifyPipelineFailure({ code: "SCHEMA_DRIFT" });
  assert.equal(schemaDrift.status, "quarantined");
  assert.equal(schemaDrift.fallback_attempted, false);
});

test("a matching witness stages immutable evidence in separate roles", async (t) => {
  const selected = await roots(t);
  const input = artifact();
  const result = await stageShadowAcceptance({
    ...input,
    ...selected,
    now: () => new Date("2026-08-25T21:00:00.000Z"),
    statfsImpl: HIGH_CAPACITY,
  });

  assert.equal(result.receipt.status, "staged");
  assert.equal(result.receipt.publication.authorized, false);
  assert.equal(result.receipt.publication.promoted, false);
  assert.notEqual(result.primaryEvidencePath, result.backupEvidencePath);
  assert.equal(JSON.parse(await readFile(result.witnessObservationPath, "utf8")).status, "match");
  assert.deepEqual(await readFile(result.primaryEvidencePath), input.acceptanceBytes);
});

test("witness mismatch and outage both prevent staging", async (t) => {
  const mismatchRoots = await roots(t);
  const input = artifact();
  const mismatch = await stageShadowAcceptance({
    ...input,
    ...mismatchRoots,
    now: () => new Date("2026-08-25T21:00:00.000Z"),
    statfsImpl: HIGH_CAPACITY,
    witnessObservedHash: "f".repeat(64),
  });
  assert.equal(mismatch.receipt.status, "quarantined");

  const outageRoots = await roots(t);
  const outage = await stageShadowAcceptance({
    ...input,
    ...outageRoots,
    now: () => new Date("2026-08-25T21:00:00.000Z"),
    statfsImpl: HIGH_CAPACITY,
    witnessAvailable: false,
  });
  assert.equal(outage.receipt.status, "held");
});

test("staging refuses overlapping role roots", async (t) => {
  const selected = await roots(t);
  const input = artifact();
  await assert.rejects(
    stageShadowAcceptance({
      ...input,
      primaryRoot: selected.primaryRoot,
      witnessRoot: path.join(selected.primaryRoot, "witness"),
      backupRoot: selected.backupRoot,
      now: () => new Date("2026-08-25T21:00:00.000Z"),
      statfsImpl: HIGH_CAPACITY,
    }),
    (error) => error instanceof StagingShadowError && error.code === "ROLE_ROOT_OVERLAP",
  );
});

test("primary recovery restores exact backup bytes only after witness verification", async (t) => {
  const selected = await roots(t);
  const input = artifact();
  const staged = await stageShadowAcceptance({
    ...input,
    ...selected,
    now: () => new Date("2026-08-25T21:00:00.000Z"),
    statfsImpl: HIGH_CAPACITY,
  });
  const recovery = await recoverPrimaryEvidence({
    acceptanceHash: input.acceptanceHash,
    backupRoot: selected.backupRoot,
    recoveryRoot: selected.recoveryRoot,
    witnessObservationPath: staged.witnessObservationPath,
  });
  assert.equal(recovery.status, "recovered");
  assert.deepEqual(await readFile(recovery.acceptancePath), input.acceptanceBytes);

  const witness = JSON.parse(await readFile(staged.witnessObservationPath, "utf8"));
  witness.observed_hash = "f".repeat(64);
  await assert.rejects(
    recoverPrimaryEvidence({
      acceptanceHash: input.acceptanceHash,
      backupRoot: selected.backupRoot,
      recoveryRoot: path.join(selected.recoveryRoot, "refused"),
      witnessObservation: witness,
    }),
    (error) => error instanceof StagingShadowError && error.code === "WITNESS_MISMATCH",
  );
});

test("the failure-injection matrix proves every Phase 3 behavior without publication", () => {
  const matrix = runFailureInjectionMatrix({ acceptance: acceptanceFixture() });
  assert.equal(matrix.status, "pass");
  assert.deepEqual(matrix.scenarios.map((scenario) => scenario.name), [
    "source_loss",
    "schema_drift",
    "witness_mismatch",
    "witness_unavailable",
    "source_stale",
    "disk_low",
    "correction_candidate",
  ]);
  assert.equal(matrix.publication_authorized, false);
});
