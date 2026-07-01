"use strict";

const YAHOO_DRAFT_LIST_VERSION = "yahoo-draft-list.v1";
const YAHOO_DRAFT_META_VERSION = "yahoo-draft-meta.v1";
const YAHOO_DRAFT_STATE_VERSION = "yahoo-draft-state.v1";

const POLL_AFTER_SECONDS = {
  pre_draft: 30,
  drafting: 2,
  paused: 30,
  complete: 30,
  unknown: 30,
};

const DEFAULT_DEBOUNCE_MS = 2000;
const YAHOO_DRAFT_ID_PREFIX = "yahoo:";

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

function buildYahooDraftId(leagueKey) {
  return `${YAHOO_DRAFT_ID_PREFIX}${String(leagueKey || "")}`;
}

function parseYahooDraftId(draftId) {
  const raw = String(draftId || "");
  if (!raw.startsWith(YAHOO_DRAFT_ID_PREFIX)) return null;
  const leagueKey = raw.slice(YAHOO_DRAFT_ID_PREFIX.length).trim();
  return leagueKey || null;
}

function safeSettings(settings = {}) {
  return {
    teams: intOr(settings.teams, 0),
    rounds: intOr(settings.rounds, 0),
    pick_timer: intOr(settings.pick_timer, 0),
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

function normalizeDraftListEntry(draft = {}) {
  return {
    draft_id: draft.draft_id ? String(draft.draft_id) : null,
    league_key: draft.league_key ? String(draft.league_key) : null,
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

function normalizeDraftMeta(draft = {}) {
  const userDraftSlot = draft.user_draft_slot;
  return {
    ...normalizeDraftListEntry(draft),
    user_draft_slot: userDraftSlot != null && Number.isInteger(Number(userDraftSlot))
      ? Number(userDraftSlot)
      : null,
    slot_to_roster_id: draft.slot_to_roster_id && typeof draft.slot_to_roster_id === "object"
      ? { ...draft.slot_to_roster_id }
      : null,
  };
}

function normalizePick(pick = {}) {
  return {
    pick_no: intOr(pick.pick_no, 0),
    round: intOr(pick.round, 0),
    draft_slot: intOr(pick.draft_slot, 0),
    roster_id: pick.roster_id == null ? null : String(pick.roster_id),
    player_id: pick.player_id == null ? null : String(pick.player_id),
    is_user_pick: pick.is_user_pick === true,
    is_keeper: pick.is_keeper === true,
    metadata: safeMetadata(pick.metadata),
  };
}

function isSnakeDraft(type) {
  const normalized = String(type || "").toLowerCase();
  return normalized === "snake" || normalized === "snake_draft" || normalized === "";
}

function computeOnTheClock(draft, totalPicksTaken) {
  const settings = safeSettings(draft?.settings);
  const teams = settings.teams;
  const rounds = settings.rounds;
  if (!teams || !rounds) return null;

  if (String(draft?.type || "").toLowerCase() === "auction") return null;

  const status = normalizeStatus(draft?.status);
  if (status === "complete") return null;
  if (totalPicksTaken >= teams * rounds) return null;

  const nextPickNo = totalPicksTaken + 1;
  const round = Math.floor((nextPickNo - 1) / teams) + 1;
  const indexInRound = ((nextPickNo - 1) % teams) + 1;
  const snake = isSnakeDraft(draft?.type);
  const draftSlot = snake && round % 2 === 0
    ? teams - indexInRound + 1
    : indexInRound;
  const rosterId = draft?.slot_to_roster_id?.[String(draftSlot)] ?? draft?.slot_to_roster_id?.[draftSlot] ?? null;

  return {
    pick_no: nextPickNo,
    round,
    draft_slot: draftSlot,
    roster_id: rosterId == null ? null : String(rosterId),
  };
}

function buildDraftListResponse({ leagueKey, draft, drafts }) {
  const entries = Array.isArray(drafts)
    ? drafts
    : draft
      ? [draft]
      : [];

  return {
    contract_version: YAHOO_DRAFT_LIST_VERSION,
    generated_at: nowIso(),
    league_key: String(leagueKey),
    drafts: entries.map(normalizeDraftListEntry),
  };
}

function buildDraftMetaResponse({ draftId, draft }) {
  return {
    contract_version: YAHOO_DRAFT_META_VERSION,
    generated_at: nowIso(),
    draft_id: String(draftId),
    draft: normalizeDraftMeta(draft || {}),
  };
}

function buildDraftStateResponse({
  draftId,
  draft,
  since = 0,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}) {
  const allPicks = Array.isArray(draft?.picks)
    ? draft.picks.map(normalizePick).sort((a, b) => a.pick_no - b.pick_no)
    : [];
  const sinceCursor = intOr(since, 0);
  const picksSince = allPicks.filter((pick) => pick.pick_no > sinceCursor);
  const status = normalizeStatus(draft?.status);
  const totalPicks = allPicks.length;
  const settings = safeSettings(draft?.settings);
  const totalSlots = settings.teams * settings.rounds || 0;
  const currentPickNo = totalSlots && totalPicks >= totalSlots
    ? totalSlots
    : totalPicks + 1;

  return {
    contract_version: YAHOO_DRAFT_STATE_VERSION,
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
  YAHOO_DRAFT_LIST_VERSION,
  YAHOO_DRAFT_META_VERSION,
  YAHOO_DRAFT_STATE_VERSION,
  DEFAULT_DEBOUNCE_MS,
  POLL_AFTER_SECONDS,
  buildYahooDraftId,
  parseYahooDraftId,
  normalizeStatus,
  normalizePick,
  computeOnTheClock,
  buildDraftListResponse,
  buildDraftMetaResponse,
  buildDraftStateResponse,
};
