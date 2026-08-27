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

test("the rule body is withheld for every provider while retention rights are pending", async () => {
  assert.deepEqual(RETAIN_RULE_BODY, { sleeper: false, espn: false, yahoo: false });

  const meta = await resolveScoringPersistenceMetadata({
    platform: "sleeper", leagueId: "L1", deps: sleeperDeps({ scoring_settings: HALF_PPR }),
  });

  assert.equal(meta.contract, null, "the rule body must not be retained");
  assert.equal(meta.retention_withheld, true, "and withholding it must be visible, not silent");
  // The hash still pins exactly which rules produced the row.
  assert.equal(
    meta.provider_rule_snapshot_hash,
    deriveScoringSnapshot({ platform: "sleeper", leagueSettings: HALF_PPR }).provider_rule_snapshot_hash
  );
});

// --- ESPN and Yahoo: rights and entitlement facts, not data facts -----------

test("ESPN is provider_restricted and makes no provider call at all", async () => {
  let called = false;
  const meta = await resolveScoringPersistenceMetadata({
    platform: "espn", leagueId: "12345",
    deps: { fetchSleeperLeague: async () => { called = true; return {}; } },
  });

  assert.equal(meta.coverage_state, "provider_restricted");
  assert.equal(meta.contract, null);
  assert.equal(meta.format, null);
  assert.equal(called, false, "a rights fact needs no network call");
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
