"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RETAIN_RULE_BODY,
  legacyFormatFromSnapshot,
  resolveScoringPersistenceMetadata,
} = require("../src/services/scoringSnapshotResolver");
const { deriveScoringSnapshot } = require("../src/services/scoringRuleSnapshot");

const HALF_PPR = {
  pass_yd: 0.04, pass_td: 4, pass_int: -2,
  rush_yd: 0.1, rush_td: 6,
  rec: 0.5, rec_yd: 0.1, rec_td: 6,
  fum_lost: -2,
};

function sleeperDeps(league) {
  return { fetchSleeperLeague: async () => league };
}

// --- Sleeper: the one provider whose rules Omen can actually read ------------

test("a Sleeper league derives a real contract version, hashes, and format", async () => {
  const meta = await resolveScoringPersistenceMetadata({
    platform: "sleeper", leagueId: "L1", deps: sleeperDeps({ scoring_settings: HALF_PPR }),
  });

  assert.equal(meta.coverage_state, "supported");
  assert.equal(meta.contract_version, "omen-scoring-contract-v1");
  assert.match(meta.contract_hash, /^[0-9a-f]{64}$/);
  assert.match(meta.provider_rule_snapshot_hash, /^[0-9a-f]{64}$/);
  assert.equal(meta.format, "half_ppr");
  assert.equal(meta.legacy_label, "Half PPR");
  assert.equal(meta.contract_required, true);
});

test("standard, half-PPR, and PPR leagues persist different formats and different hashes", async () => {
  const read = async (rec) => resolveScoringPersistenceMetadata({
    platform: "sleeper", leagueId: "L1",
    deps: sleeperDeps({ scoring_settings: { ...HALF_PPR, rec } }),
  });

  const [std, half, ppr] = await Promise.all([read(0), read(0.5), read(1)]);

  assert.deepEqual([std.format, half.format, ppr.format], ["standard", "half_ppr", "ppr"]);
  assert.deepEqual([std.legacy_label, half.legacy_label, ppr.legacy_label], ["Standard", "Half PPR", "PPR"]);
  assert.equal(new Set([std.contract_hash, half.contract_hash, ppr.contract_hash]).size, 3);
});

test("a league Omen cannot fully reproduce is ambiguous and gets no format label", async () => {
  const meta = await resolveScoringPersistenceMetadata({
    platform: "sleeper", leagueId: "L1",
    deps: sleeperDeps({ scoring_settings: { ...HALF_PPR, some_future_sleeper_key: 3 } }),
  });

  assert.equal(meta.coverage_state, "ambiguous");
  // Half-PPR-plus-something-unknown is not half PPR. Refusing the label is the
  // whole point: a familiar name on an unreproduced rule set is the A6 defect.
  assert.equal(meta.format, null);
  assert.equal(meta.legacy_label, null);
});

// --- Rights gate ------------------------------------------------------------

test("Sleeper and ESPN retain the rule body; Yahoo does not", async () => {
  // Sleeper's own docs do not restrict storage — they instruct it. The single gate they
  // publish is commercial vs non-commercial, which does not distinguish reading from
  // retaining, so storing a league's rules adds no exposure beyond the call that already
  // fetched them. See Direction/reviews/2026-08-27-sleeper-retention-rights.md.
  // ESPN flipped to `true` on 2026-09-06 by founder authorization, recorded in the decision
  // log. Yahoo is still withheld only because its scoring mapping is separate work — its
  // entitlement was restored 2026-08-28 and its settings endpoint is readable.
  assert.deepEqual(RETAIN_RULE_BODY, { sleeper: true, espn: true, yahoo: false });

  const sleeper = await resolveScoringPersistenceMetadata({
    platform: "sleeper", leagueId: "L1", deps: sleeperDeps({ scoring_settings: HALF_PPR }),
  });

  assert.ok(sleeper.contract, "the derived rule body is retained");
  assert.equal(sleeper.retention_withheld, false);
  // The hash still pins exactly which rules produced the row, body or no body.
  assert.equal(
    sleeper.provider_rule_snapshot_hash,
    deriveScoringSnapshot({ platform: "sleeper", leagueSettings: HALF_PPR }).provider_rule_snapshot_hash
  );
});

test("a restricted provider retains nothing, and its attestation carries no rules", async () => {
  for (const platform of ["espn", "yahoo"]) {
    const meta = await resolveScoringPersistenceMetadata({ platform, leagueId: "1" });
    assert.equal(meta.contract, null, `${platform} must not retain a rule body`);
    assert.equal(meta.format, null);
  }
});

// --- ESPN and Yahoo: rights and entitlement facts, not data facts -----------

// ESPN used to short-circuit here as a rights fact, with no provider call. The founder
// authorized capturing and retaining ESPN rules on 2026-09-06, so it now reads the league's
// real settings with that user's own credentials.
test("ESPN reads the league's real settings and retains the derived contract", async () => {
  const meta = await resolveScoringPersistenceMetadata({
    platform: "espn",
    leagueId: "12345",
    userId: "user-1",
    deps: {
      fetchEspnScoringSettings: async (leagueId, userId) => {
        assert.equal(leagueId, "12345");
        assert.equal(userId, "user-1", "ESPN settings are a credentialed read");
        return { scoringSettings: { scoringItems: [{ statId: 53, points: 1, pointsOverrides: {} }] } };
      },
    },
  });

  assert.equal(meta.coverage_state, "supported");
  assert.equal(meta.format, "ppr");
  assert.ok(meta.contract, "retention is now permitted for ESPN");
});

// Without a user there are no credentials, so there is nothing to read. `pending` is the
// honest answer — never a fabricated contract, and never the old blanket restriction.
test("ESPN without a user is pending rather than restricted or invented", async () => {
  const meta = await resolveScoringPersistenceMetadata({ platform: "espn", leagueId: "12345" });

  assert.equal(meta.coverage_state, "pending");
  assert.equal(meta.contract, null);
});

// This path must never cost the user their recommendation.
test("an ESPN settings read that throws degrades to pending instead of rejecting", async () => {
  const meta = await resolveScoringPersistenceMetadata({
    platform: "espn",
    leagueId: "12345",
    userId: "user-1",
    deps: { fetchEspnScoringSettings: async () => { throw new Error("ESPN 401"); } },
  });

  assert.equal(meta.coverage_state, "pending");
  assert.match(meta.reason, /could not be read/);
});

test("Yahoo is pending and makes no provider call at all", async () => {
  const meta = await resolveScoringPersistenceMetadata({ platform: "yahoo", leagueId: "414.l.1" });

  assert.equal(meta.coverage_state, "pending");
  assert.equal(meta.format, null);
  assert.equal(meta.legacy_label, null);
});

// --- The property that protects the user's recommendation -------------------

test("a Sleeper outage degrades to pending and NEVER throws", async () => {
  const meta = await resolveScoringPersistenceMetadata({
    platform: "sleeper", leagueId: "L1",
    deps: { fetchSleeperLeague: async () => { throw new Error("sleeper 503"); } },
  });

  assert.equal(meta.coverage_state, "pending");
  assert.equal(meta.contract, null);
  assert.match(meta.reason, /could not be read/);
});

test("no input shape rejects, because a rejection here costs the user their recommendation", async () => {
  const cases = [
    {},
    { platform: null },
    { platform: "sleeper" },
    { platform: "sleeper", leagueId: "" },
    { platform: "draftkings", leagueId: "x" },
    { platform: "sleeper", leagueId: "L1", deps: { fetchSleeperLeague: async () => null } },
    { platform: "sleeper", leagueId: "L1", deps: { fetchSleeperLeague: async () => ({ scoring_settings: null }) } },
  ];

  for (const input of cases) {
    const meta = await resolveScoringPersistenceMetadata(input);
    assert.ok(meta, `no result for ${JSON.stringify(input)}`);
    assert.equal(meta.contract_required, true);
    assert.equal(typeof meta.coverage_state, "string");
  }
});

test("a provider outage never leaks the provider's message", async () => {
  const meta = await resolveScoringPersistenceMetadata({
    platform: "sleeper", leagueId: "L1",
    deps: { fetchSleeperLeague: async () => { throw new Error("token=SECRETVALUE rejected"); } },
  });

  assert.equal(JSON.stringify(meta).includes("SECRETVALUE"), false);
});

// --- Format mapping ---------------------------------------------------------

test("a format label is only ever derived from a fully supported contract", () => {
  const supported = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: { rec: 1, rec_yd: 0.1 } });
  const restricted = deriveScoringSnapshot({ platform: "espn" });

  assert.equal(legacyFormatFromSnapshot(supported), "ppr");
  assert.equal(legacyFormatFromSnapshot(restricted), null);
  assert.equal(legacyFormatFromSnapshot(null), null);
});

test("an unusual reception value gets no familiar label rather than the nearest one", () => {
  const odd = deriveScoringSnapshot({ platform: "sleeper", leagueSettings: { rec: 0.75, rec_yd: 0.1 } });

  assert.equal(odd.coverage_state, "supported", "0.75 PPR is a real, reproducible rule");
  assert.equal(legacyFormatFromSnapshot(odd), null, "but it is not standard, half, or full PPR");
});
