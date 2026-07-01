"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ESPN_DRAFT_LIST_VERSION,
  ESPN_DRAFT_META_VERSION,
  ESPN_DRAFT_STATE_VERSION,
  DEFAULT_DEBOUNCE_MS,
  POLL_AFTER_SECONDS,
  buildEspnDraftId,
  parseEspnDraftId,
  buildDraftListResponse,
  buildDraftMetaResponse,
  buildDraftStateResponse,
} = require("../src/services/espnDraft");

function draftSnapshot(overrides = {}) {
  return {
    league_id: "12345",
    draft_id: "espn:12345",
    status: "drafting",
    type: "snake",
    sport: "nfl",
    season: "2026",
    season_type: "regular",
    settings: {
      teams: 3,
      rounds: 5,
      pick_timer: 45,
    },
    start_time: 1724516400000,
    created: null,
    user_draft_slot: 1,
    slot_to_roster_id: { 1: "11", 2: "12", 3: "13" },
    picks: [
      {
        pick_no: 1,
        round: 1,
        draft_slot: 1,
        roster_id: "11",
        player_id: "1001",
        is_user_pick: true,
        is_keeper: false,
        metadata: {
          first_name: "Pat",
          last_name: "Mahomes",
          team: "KC",
          position: "QB",
          status: null,
          injury_status: null,
          years_exp: null,
        },
      },
      {
        pick_no: 2,
        round: 1,
        draft_slot: 2,
        roster_id: "12",
        player_id: "1002",
        is_user_pick: false,
        is_keeper: false,
        metadata: {
          first_name: "Ja'Marr",
          last_name: "Chase",
          team: "CIN",
          position: "WR",
          status: null,
          injury_status: null,
          years_exp: null,
        },
      },
    ],
    ...overrides,
  };
}

test("buildEspnDraftId and parseEspnDraftId round-trip a league id", () => {
  const draftId = buildEspnDraftId("12345");
  assert.equal(draftId, "espn:12345");
  assert.equal(parseEspnDraftId(draftId), "12345");
  assert.equal(parseEspnDraftId("bad-value"), null);
});

test("buildDraftListResponse emits espn-draft-list.v1", () => {
  const res = buildDraftListResponse({
    leagueId: "12345",
    draft: draftSnapshot(),
  });

  assert.equal(res.contract_version, ESPN_DRAFT_LIST_VERSION);
  assert.equal(res.league_id, "12345");
  assert.equal(res.drafts.length, 1);
  assert.equal(res.drafts[0].draft_id, "espn:12345");
  assert.equal(res.drafts[0].status, "drafting");
});

test("buildDraftMetaResponse preserves nullable slot metadata", () => {
  const res = buildDraftMetaResponse({
    draftId: "espn:12345",
    draft: draftSnapshot({
      user_draft_slot: null,
      slot_to_roster_id: null,
    }),
  });

  assert.equal(res.contract_version, ESPN_DRAFT_META_VERSION);
  assert.equal(res.draft_id, "espn:12345");
  assert.equal(res.draft.user_draft_slot, null);
  assert.equal(res.draft.slot_to_roster_id, null);
  assert.equal(res.draft.settings.pick_timer, 45);
});

test("buildDraftStateResponse returns full state with cursor delta", () => {
  const res = buildDraftStateResponse({
    draftId: "espn:12345",
    draft: draftSnapshot(),
    since: 0,
  });

  assert.equal(res.contract_version, ESPN_DRAFT_STATE_VERSION);
  assert.equal(res.total_picks, 2);
  assert.equal(res.total_slots, 15);
  assert.equal(res.current_pick, 3);
  assert.equal(res.has_new_picks, true);
  assert.equal(res.picks_since.length, 2);
  assert.equal(res.poll_after_seconds, POLL_AFTER_SECONDS.drafting);
  assert.equal(res.debounce_ms, DEFAULT_DEBOUNCE_MS);
  assert.equal(res.on_the_clock.draft_slot, 3);
});

test("buildDraftStateResponse respects the since cursor", () => {
  const res = buildDraftStateResponse({
    draftId: "espn:12345",
    draft: draftSnapshot(),
    since: 1,
  });

  assert.equal(res.cursor.since, 1);
  assert.equal(res.cursor.latest, 2);
  assert.equal(res.picks_since.length, 1);
  assert.equal(res.picks_since[0].pick_no, 2);
});

test("buildDraftStateResponse uses a low-frequency hint when complete", () => {
  const res = buildDraftStateResponse({
    draftId: "espn:12345",
    draft: draftSnapshot({
      status: "complete",
      settings: { teams: 1, rounds: 2, pick_timer: 45 },
      picks: [
        {
          pick_no: 1,
          round: 1,
          draft_slot: 1,
          roster_id: "11",
          player_id: "1001",
          is_user_pick: true,
          is_keeper: false,
          metadata: {
            first_name: "Pat",
            last_name: "Mahomes",
            team: "KC",
            position: "QB",
            status: null,
            injury_status: null,
            years_exp: null,
          },
        },
        {
          pick_no: 2,
          round: 2,
          draft_slot: 1,
          roster_id: "11",
          player_id: "1002",
          is_user_pick: true,
          is_keeper: false,
          metadata: {
            first_name: "Ja'Marr",
            last_name: "Chase",
            team: "CIN",
            position: "WR",
            status: null,
            injury_status: null,
            years_exp: null,
          },
        },
      ],
    }),
    since: 2,
  });

  assert.equal(res.status, "complete");
  assert.equal(res.current_pick, null);
  assert.equal(res.on_the_clock, null);
  assert.equal(res.poll_after_seconds, POLL_AFTER_SECONDS.complete);
});
