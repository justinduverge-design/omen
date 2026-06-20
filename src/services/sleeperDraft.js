"use strict";

/**
 * Sleeper live draft tracking — envelope shaping.
 *
 * Phase 2.8 contract: debounced Lazy Sync. The frontend polls the state
 * endpoint with a numeric `since` cursor (the highest pick_no it already
 * has). The server returns only newer picks plus a `pollAfter` hint and an
 * advisory `debounceMs` floor so callers can back off when nothing is
 * happening (pre-draft, paused, complete).
 *
 * This module is pure shaping — no network, no cache, no auth. Route + adapter
 * own those concerns; this module turns Sleeper-shaped objects into the public
 * v1 envelope and computes the next on-the-clock slot from pick history.
 */

const SLEEPER_DRAFT_LIST_VERSION = "sleeper-draft-list.v1";
const SLEEPER_DRAFT_META_VERSION = "sleeper-draft-meta.v1";
const SLEEPER_DRAFT_STATE_VERSION = "sleeper-draft-state.v1";

const POLL_AFTER_SECONDS = {
  pre_draft: 30,
  drafting: 2,
  paused: 30,
  complete: 30,
  unknown: 30,
};

const DEFAULT_DEBOUNCE_MS = 2000;

function nowIso() {
  return new Date().toISOString();
}

function intOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function normalizeStatus(rawStatus) {
  const status = String(rawStatus || "").toLowerCase();
  if (status === "pre_draft" || status === "drafting" || status === "paused" || status === "complete") {
    return status;
  }
  return "unknown";
}

function pollAfterFor(status) {
  return POLL_AFTER_SECONDS[status] ?? POLL_AFTER_SECONDS.unknown;
}

function safeSettings(settings = {}) {
  return {
    teams: intOr(settings.teams, 0),
    rounds: intOr(settings.rounds, 0),
    pick_timer: intOr(settings.pick_timer, 0),
  };
}

function normalizeDraftListEntry(draft = {}) {
  return {
    draft_id: draft.draft_id ? String(draft.draft_id) : null,
    league_id: draft.league_id ? String(draft.league_id) : null,
    status: normalizeStatus(draft.status),
    type: draft.type || null,
    sport: draft.sport || null,
    season: draft.season || null,
    season_type: draft.season_type || null,
    settings: safeSettings(draft.settings),
    start_time: draft.start_time || null,
    created: draft.created || null,
  };
}

function normalizeDraftMeta(draft = {}, platformUserId = null) {
  const userDraftSlot = platformUserId && draft.draft_order
    ? (draft.draft_order[String(platformUserId)] ?? null)
    : null;
  return {
    ...normalizeDraftListEntry(draft),
    user_draft_slot: userDraftSlot,
    slot_to_roster_id: draft.slot_to_roster_id && typeof draft.slot_to_roster_id === "object"
      ? { ...draft.slot_to_roster_id }
      : null,
    last_picked: draft.last_picked || null,
    last_message_time: draft.last_message_time || null,
  };
}

function safeMetadata(metadata = {}) {
  return {
    first_name: metadata.first_name || null,
    last_name: metadata.last_name || null,
    team: metadata.team || null,
    position: metadata.position || null,
    status: metadata.status || null,
    injury_status: metadata.injury_status || null,
    years_exp: metadata.years_exp || null,
  };
}

function normalizePick(pick = {}, platformUserId = null) {
  return {
    pick_no: intOr(pick.pick_no, 0),
    round: intOr(pick.round, 0),
    draft_slot: intOr(pick.draft_slot, 0),
    roster_id: pick.roster_id ?? null,
    is_user_pick: Boolean(platformUserId)
      && String(pick.picked_by || "") === String(platformUserId),
    player_id: pick.player_id ? String(pick.player_id) : null,
    is_keeper: pick.is_keeper === true,
    metadata: safeMetadata(pick.metadata),
  };
}

function isSnakeDraft(type) {
  const t = String(type || "").toLowerCase();
  return t === "snake" || t === "snake_draft" || t === "";
}

function computeOnTheClock(draft, totalPicksTaken) {
  const settings = safeSettings(draft.settings);
  const teams = settings.teams;
  const rounds = settings.rounds;

  if (!teams || !rounds) return null;

  // Auction drafts have no ordered slots — the math below would
  // produce a plausible-looking but meaningless draft_slot for them.
  // Frontends should detect auction via the `type` field instead.
  if (String(draft.type || "").toLowerCase() === "auction") return null;

  const status = normalizeStatus(draft.status);
  if (status === "complete") return null;
  if (totalPicksTaken >= teams * rounds) return null;

  const nextPickNo = totalPicksTaken + 1;
  const round = Math.floor((nextPickNo - 1) / teams) + 1;
  const indexInRound = ((nextPickNo - 1) % teams) + 1;
  const snake = isSnakeDraft(draft.type);
  const draftSlot = snake && round % 2 === 0
    ? teams - indexInRound + 1
    : indexInRound;

  const slotToRoster = draft.slot_to_roster_id && typeof draft.slot_to_roster_id === "object"
    ? draft.slot_to_roster_id
    : null;
  const rosterId = slotToRoster ? (slotToRoster[String(draftSlot)] ?? null) : null;

  return {
    pick_no: nextPickNo,
    round,
    draft_slot: draftSlot,
    roster_id: rosterId,
  };
}

function buildDraftListResponse({ leagueId, drafts }) {
  return {
    contract_version: SLEEPER_DRAFT_LIST_VERSION,
    generated_at: nowIso(),
    league_id: String(leagueId),
    drafts: (Array.isArray(drafts) ? drafts : []).map(normalizeDraftListEntry),
  };
}

function buildDraftMetaResponse({ draftId, draft, platformUserId = null }) {
  return {
    contract_version: SLEEPER_DRAFT_META_VERSION,
    generated_at: nowIso(),
    draft_id: String(draftId),
    draft: normalizeDraftMeta(draft || {}, platformUserId),
  };
}

function buildDraftStateResponse({
  draftId,
  draft,
  picks,
  since = 0,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  platformUserId = null,
}) {
  const allPicks = Array.isArray(picks)
    ? picks.map((pick) => normalizePick(pick, platformUserId))
    : [];
  allPicks.sort((a, b) => a.pick_no - b.pick_no);

  const sinceCursor = intOr(since, 0);
  const picksSince = allPicks.filter((p) => p.pick_no > sinceCursor);
  const status = normalizeStatus(draft?.status);
  const totalPicks = allPicks.length;
  const settings = safeSettings(draft?.settings);
  const totalSlots = settings.teams * settings.rounds || 0;
  const currentPickNo = totalSlots && totalPicks >= totalSlots
    ? totalSlots
    : totalPicks + 1;

  return {
    contract_version: SLEEPER_DRAFT_STATE_VERSION,
    generated_at: nowIso(),
    draft_id: String(draftId),
    status,
    type: draft?.type || null,
    season: draft?.season || null,
    settings,
    cursor: {
      since: sinceCursor,
      latest: totalPicks ? allPicks[allPicks.length - 1].pick_no : 0,
    },
    total_picks: totalPicks,
    total_slots: totalSlots,
    current_pick: status === "complete" ? null : currentPickNo,
    on_the_clock: computeOnTheClock(draft || {}, totalPicks),
    picks_since: picksSince,
    has_new_picks: picksSince.length > 0,
    poll_after_seconds: pollAfterFor(status),
    debounce_ms: debounceMs,
  };
}

module.exports = {
  SLEEPER_DRAFT_LIST_VERSION,
  SLEEPER_DRAFT_META_VERSION,
  SLEEPER_DRAFT_STATE_VERSION,
  DEFAULT_DEBOUNCE_MS,
  POLL_AFTER_SECONDS,
  normalizeStatus,
  normalizePick,
  normalizeDraftListEntry,
  normalizeDraftMeta,
  computeOnTheClock,
  buildDraftListResponse,
  buildDraftMetaResponse,
  buildDraftStateResponse,
};
