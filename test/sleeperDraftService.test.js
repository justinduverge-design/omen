"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SLEEPER_DRAFT_LIST_VERSION,
  SLEEPER_DRAFT_META_VERSION,
  SLEEPER_DRAFT_STATE_VERSION,
  DEFAULT_DEBOUNCE_MS,
  POLL_AFTER_SECONDS,
  normalizeStatus,
  normalizePick,
  computeOnTheClock,
  buildDraftListResponse,
  buildDraftMetaResponse,
  buildDraftStateResponse,
} = require("../src/services/sleeperDraft");

function snakeDraft({ status = "drafting", teams = 12, rounds = 15, type = "snake" } = {}) {
  return {
    draft_id: "draft-1",
    league_id: "league-1",
    status,
    type,
    sport: "nfl",
    season: "2026",
    season_type: "regular",
    settings: { teams, rounds, pick_timer: 60 },
    slot_to_roster_id: {
      1: 11, 2: 12, 3: 13, 4: 14, 5: 15, 6: 16,
      7: 17, 8: 18, 9: 19, 10: 20, 11: 21, 12: 22,
    },
    start_time: 1693516800000,
  };
}

function pick(pickNo, draftSlot, round, playerId, rosterId = draftSlot + 10) {
  return {
    pick_no: pickNo,
    round,
    draft_slot: draftSlot,
    roster_id: rosterId,
    picked_by: `user-${draftSlot}`,
    player_id: playerId,
    is_keeper: false,
    metadata: { first_name: "P", last_name: String(playerId), position: "RB", team: "KC" },
  };
}

test("normalizeStatus folds unknown values to 'unknown'", () => {
  assert.equal(normalizeStatus("drafting"), "drafting");
  assert.equal(normalizeStatus("PRE_DRAFT"), "pre_draft");
  assert.equal(normalizeStatus("paused"), "paused");
  assert.equal(normalizeStatus("complete"), "complete");
  assert.equal(normalizeStatus(undefined), "unknown");
  assert.equal(normalizeStatus("garbage"), "unknown");
});

test("normalizePick coerces malformed numbers and metadata safely", () => {
  const normalized = normalizePick({
    pick_no: "12",
    round: "2",
    draft_slot: "3",
    roster_id: 14,
    picked_by: 99,
    player_id: 12345,
    is_keeper: true,
    metadata: { first_name: "X", last_name: "Y", position: "WR", team: "BUF", junk: "drop" },
  });

  assert.equal(normalized.pick_no, 12);
  assert.equal(normalized.round, 2);
  assert.equal(normalized.draft_slot, 3);
  assert.equal(normalized.roster_id, 14);
  assert.equal(normalized.picked_by, "99");
  assert.equal(normalized.player_id, "12345");
  assert.equal(normalized.is_keeper, true);
  assert.deepEqual(normalized.metadata, {
    first_name: "X",
    last_name: "Y",
    team: "BUF",
    position: "WR",
    status: null,
    injury_status: null,
    years_exp: null,
  });
});

test("computeOnTheClock returns next snake slot in round 1", () => {
  const otc = computeOnTheClock(snakeDraft(), 0);
  assert.deepEqual(otc, { pick_no: 1, round: 1, draft_slot: 1, roster_id: 11 });
});

test("computeOnTheClock reverses on even rounds for snake drafts", () => {
  const draft = snakeDraft();
  const otc = computeOnTheClock(draft, 12);
  assert.equal(otc.pick_no, 13);
  assert.equal(otc.round, 2);
  assert.equal(otc.draft_slot, 12);
  assert.equal(otc.roster_id, 22);
});

test("computeOnTheClock keeps slot order on linear drafts", () => {
  const draft = snakeDraft({ type: "linear" });
  const otc = computeOnTheClock(draft, 12);
  assert.equal(otc.pick_no, 13);
  assert.equal(otc.round, 2);
  assert.equal(otc.draft_slot, 1);
});

test("computeOnTheClock returns null when draft is complete", () => {
  const otc = computeOnTheClock(snakeDraft({ status: "complete" }), 12);
  assert.equal(otc, null);
});

test("computeOnTheClock returns null when total picks reach teams * rounds", () => {
  const otc = computeOnTheClock(snakeDraft(), 12 * 15);
  assert.equal(otc, null);
});

test("computeOnTheClock returns null for auction drafts (no ordered slots)", () => {
  const draft = snakeDraft({ type: "auction" });
  assert.equal(computeOnTheClock(draft, 0), null);
  assert.equal(computeOnTheClock(draft, 5), null);
  assert.equal(computeOnTheClock(draft, 50), null);
});

test("buildDraftStateResponse marks auction drafts with on_the_clock null and preserves raw type", () => {
  const draft = snakeDraft({ type: "auction", status: "drafting" });
  const res = buildDraftStateResponse({
    draftId: "auction-1",
    draft,
    picks: [pick(1, 1, 1, "p100")],
    since: 0,
  });

  assert.equal(res.on_the_clock, null);
  assert.equal(res.type, "auction");
  assert.equal(res.status, "drafting");
  assert.equal(res.has_new_picks, true);
});

test("buildDraftListResponse normalizes draft entries and applies version", () => {
  const res = buildDraftListResponse({
    leagueId: "league-1",
    drafts: [{ draft_id: "d1", status: "pre_draft", settings: { teams: 10, rounds: 14 } }],
  });

  assert.equal(res.contract_version, SLEEPER_DRAFT_LIST_VERSION);
  assert.equal(res.league_id, "league-1");
  assert.equal(res.drafts.length, 1);
  assert.equal(res.drafts[0].draft_id, "d1");
  assert.equal(res.drafts[0].status, "pre_draft");
  assert.equal(res.drafts[0].settings.teams, 10);
});

test("buildDraftMetaResponse keeps slot_to_roster_id and draft_order", () => {
  const draft = snakeDraft();
  const res = buildDraftMetaResponse({ draftId: "draft-1", draft });

  assert.equal(res.contract_version, SLEEPER_DRAFT_META_VERSION);
  assert.equal(res.draft_id, "draft-1");
  assert.equal(res.draft.settings.teams, 12);
  assert.equal(res.draft.slot_to_roster_id["1"], 11);
});

test("buildDraftStateResponse returns full envelope with no picks (pre-draft)", () => {
  const res = buildDraftStateResponse({
    draftId: "draft-1",
    draft: snakeDraft({ status: "pre_draft" }),
    picks: [],
    since: 0,
  });

  assert.equal(res.contract_version, SLEEPER_DRAFT_STATE_VERSION);
  assert.equal(res.status, "pre_draft");
  assert.equal(res.total_picks, 0);
  assert.equal(res.current_pick, 1);
  assert.equal(res.has_new_picks, false);
  assert.deepEqual(res.picks_since, []);
  assert.equal(res.poll_after_seconds, POLL_AFTER_SECONDS.pre_draft);
  assert.equal(res.debounce_ms, DEFAULT_DEBOUNCE_MS);
  assert.equal(res.cursor.since, 0);
  assert.equal(res.cursor.latest, 0);
});

test("buildDraftStateResponse returns only picks after since cursor", () => {
  const picks = [
    pick(1, 1, 1, "p100"),
    pick(2, 2, 1, "p200"),
    pick(3, 3, 1, "p300"),
    pick(4, 4, 1, "p400"),
  ];
  const res = buildDraftStateResponse({
    draftId: "draft-1",
    draft: snakeDraft(),
    picks,
    since: 2,
  });

  assert.equal(res.total_picks, 4);
  assert.equal(res.cursor.since, 2);
  assert.equal(res.cursor.latest, 4);
  assert.equal(res.has_new_picks, true);
  assert.equal(res.picks_since.length, 2);
  assert.deepEqual(res.picks_since.map((p) => p.pick_no), [3, 4]);
  assert.equal(res.current_pick, 5);
  assert.equal(res.poll_after_seconds, POLL_AFTER_SECONDS.drafting);
});

test("buildDraftStateResponse returns empty delta and short poll when caller is current", () => {
  const picks = [pick(1, 1, 1, "p100"), pick(2, 2, 1, "p200")];
  const res = buildDraftStateResponse({
    draftId: "draft-1",
    draft: snakeDraft(),
    picks,
    since: 2,
  });

  assert.equal(res.has_new_picks, false);
  assert.deepEqual(res.picks_since, []);
  assert.equal(res.cursor.latest, 2);
});

test("buildDraftStateResponse marks complete drafts with null current_pick and long poll", () => {
  const draft = snakeDraft({ status: "complete", teams: 2, rounds: 2 });
  const picks = [
    pick(1, 1, 1, "p100", 11),
    pick(2, 2, 1, "p200", 12),
    pick(3, 2, 2, "p300", 12),
    pick(4, 1, 2, "p400", 11),
  ];
  const res = buildDraftStateResponse({
    draftId: "draft-1",
    draft,
    picks,
    since: 0,
  });

  assert.equal(res.status, "complete");
  assert.equal(res.total_picks, 4);
  assert.equal(res.current_pick, null);
  assert.equal(res.on_the_clock, null);
  assert.equal(res.poll_after_seconds, POLL_AFTER_SECONDS.complete);
});

test("buildDraftStateResponse tolerates unsorted picks input", () => {
  const picks = [
    pick(3, 3, 1, "p300"),
    pick(1, 1, 1, "p100"),
    pick(2, 2, 1, "p200"),
  ];
  const res = buildDraftStateResponse({
    draftId: "draft-1",
    draft: snakeDraft(),
    picks,
    since: 1,
  });

  assert.deepEqual(res.picks_since.map((p) => p.pick_no), [2, 3]);
  assert.equal(res.cursor.latest, 3);
});
