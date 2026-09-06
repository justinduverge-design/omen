"use strict";

/**
 * Canonical waiver-system model (league-aware-waiver-system-v1 Phase 1).
 *
 * §6.2 forbids exposing FAAB amount, waiver priority, or claim probability
 * "unless Omen has verified the league's waiver system". This module is that
 * verification. It normalizes each provider's waiver vocabulary into one shape
 * so the engine never learns three dialects, and it is the only place allowed
 * to decide which values a league may show.
 *
 * THE RULE THIS EXISTS TO ENFORCE, from the Phase 0 Sleeper probe (2026-09-05):
 * every waiver field is populated regardless of the system in force.
 * `waiver_budget: 100` appears on priority leagues. `waiver_position` (a real
 * 1..N order) appears on every roster of a FAAB league. `waiver_budget_used`
 * likewise. Nothing is absent when it does not apply.
 *
 * So reading whichever field is present yields a FAAB budget AND a priority
 * position for every league in the product — wrong for one branch in every
 * case — and it passes a naive test suite, because the data is always there and
 * always well-formed. `waiver_type` is the only discriminator. Everything else
 * is a decoy and must be gated on it first.
 *
 * `not_determined` is a first-class value, never an error and never a fallback
 * to FAAB. A league whose system was not positively identified stays under the
 * §6.2 restriction and keeps today's system-blind advice.
 *
 * Claim probability is NOT produced here and remains under §6.2. It requires
 * modeling other managers' budgets and intent; nothing in this model makes it
 * knowable.
 */

const MODEL_VERSION = "waiver-system.v1";

const SYSTEMS = Object.freeze({
  FAAB: "faab",
  PRIORITY: "priority",
  NOT_DETERMINED: "not_determined",
});

const SOURCES = Object.freeze({
  PROVIDER: "provider_settings",
  NONE: "not_determined",
});

/**
 * Sleeper `league.settings.waiver_type`.
 *
 * Evidenced against completed 2025 seasons by reading actual waiver
 * transactions rather than settings fields — 298 waivers across two leagues,
 * every one carrying `priority`/`seq` and none carrying a bid:
 *
 *   0 — priority   (D465 2025, 57 waiver txns, 0 bids)
 *   1 — priority   (EB FOOTBALL 2025, 241 waiver txns, 0 bids)
 *   2 — FAAB       (EB FOOTBALL 2026, founder-confirmed 2026-09-05)
 *
 * The value set is NOT proven exhaustive. Anything unlisted is
 * `not_determined` — never the nearest guess.
 */
const SLEEPER_WAIVER_TYPE = Object.freeze({
  0: SYSTEMS.PRIORITY,
  1: SYSTEMS.PRIORITY,
  2: SYSTEMS.FAAB,
});

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/** Undetermined model. Every caller-facing field is null; nothing is inferable. */
function undetermined(reason) {
  return Object.freeze({
    version: MODEL_VERSION,
    system: SYSTEMS.NOT_DETERMINED,
    determined_from: SOURCES.NONE,
    reason: reason || "waiver system not recognized",
    budget_total: null,
    budget_remaining: null,
    bid_min: null,
    priority_position: null,
  });
}

/**
 * Normalize a Sleeper league into the canonical model.
 *
 * `league` is the raw `GET /v1/league/{id}` payload; `roster` the current
 * user's row from `GET /v1/league/{id}/rosters`. Both may be partial.
 *
 * `waiver_type` is read per-call and MUST NOT be cached across seasons: EB
 * FOOTBALL ran `1` in 2025 and `2` in 2026 — the same league, a different
 * system. A season rollover re-verifies rather than carrying the prior value.
 */
function fromSleeper({ league, roster } = {}) {
  const settings = (league && league.settings) || null;
  if (!settings) return undetermined("league settings unavailable");

  const raw = settings.waiver_type;
  if (!isFiniteNumber(raw)) return undetermined("waiver_type absent");

  const system = SLEEPER_WAIVER_TYPE[raw];
  if (!system) return undetermined(`unrecognized waiver_type: ${raw}`);

  const rosterSettings = (roster && roster.settings) || {};

  if (system === SYSTEMS.FAAB) {
    const total = isFiniteNumber(settings.waiver_budget) ? settings.waiver_budget : null;
    const used = isFiniteNumber(rosterSettings.waiver_budget_used)
      ? rosterSettings.waiver_budget_used
      : null;
    // Remaining is derived, never assumed. Missing input stays unknown and
    // never becomes zero — a zero budget reads as "you cannot bid", which is a
    // different and wrong claim.
    const remaining = total !== null && used !== null ? Math.max(0, total - used) : null;

    return Object.freeze({
      version: MODEL_VERSION,
      system: SYSTEMS.FAAB,
      determined_from: SOURCES.PROVIDER,
      reason: null,
      budget_total: total,
      budget_remaining: remaining,
      // League's minimum bid, when it states one. Floors any recommendation.
      bid_min: isFiniteNumber(settings.waiver_bid_min) ? settings.waiver_bid_min : null,
      // Sleeper populates waiver_position on FAAB leagues too. It is a decoy
      // here and is deliberately dropped: §6.2 forbids showing a priority to a
      // league that does not run one.
      priority_position: null,
    });
  }

  const position = isFiniteNumber(rosterSettings.waiver_position)
    ? rosterSettings.waiver_position
    : null;

  return Object.freeze({
    version: MODEL_VERSION,
    system: SYSTEMS.PRIORITY,
    determined_from: SOURCES.PROVIDER,
    reason: null,
    // Sleeper populates waiver_budget on priority leagues too — the decoy that
    // motivated this module. Dropped: a FAAB number shown to a priority league
    // is worse than silence.
    budget_total: null,
    budget_remaining: null,
    bid_min: null,
    priority_position: position,
  });
}


/**
 * ESPN — PROVISIONAL AND UNVERIFIED.
 *
 * Unlike the Sleeper mapping, which was probed live and evidenced against 298
 * real waiver transactions, NOTHING in this repository records ESPN's waiver
 * settings shape. Spec Phase 0 for ESPN is gated on a founder-device session
 * (S2/SWID), and no captured payload exists to read field names from.
 *
 * So this mapper FAILS CLOSED. It positively recognizes one documented shape
 * and returns not_determined for everything else — including a payload that is
 * present but shaped differently. §6.2 therefore stays in force for ESPN until
 * the probe confirms the shape, and no wrong budget or position can reach a
 * user in the meantime. An unrecognized ESPN league behaves exactly as it does
 * today.
 *
 * `scripts/probe-espn-waiver-settings.js` confirms or refutes the mapping
 * below. Until it has been run against a real league, treat every branch here
 * as a hypothesis — do NOT widen it to "whatever field looks right".
 *
 * @param {object} args
 * @param {object} args.settings raw `data.settings` from an mSettings view
 * @param {object} args.team the user's team row, for budget spent
 */
function fromEspn({ settings, team } = {}) {
  const acquisition = settings && settings.acquisitionSettings;
  if (!acquisition || typeof acquisition !== "object") {
    return undetermined("espn acquisition settings absent — probe not yet run");
  }

  // The single documented discriminator. Anything other than a real boolean is
  // an unrecognized shape, not a "probably false".
  const usesBudget = acquisition.isUsingAcquisitionBudget;
  if (typeof usesBudget !== "boolean") {
    return undetermined("espn waiver discriminator not recognized — probe required");
  }

  if (usesBudget) {
    const total = isFiniteNumber(acquisition.acquisitionBudget) ? acquisition.acquisitionBudget : null;
    const spent = isFiniteNumber(team?.transactionCounter?.acquisitionBudgetSpent)
      ? team.transactionCounter.acquisitionBudgetSpent
      : null;
    // Same rule as Sleeper: remaining is derived, and missing input stays
    // unknown rather than becoming zero.
    const remaining = total !== null && spent !== null ? Math.max(0, total - spent) : null;
    if (total === null) return undetermined("espn budget total unreadable — probe required");

    return Object.freeze({
      version: MODEL_VERSION,
      system: SYSTEMS.FAAB,
      determined_from: SOURCES.PROVIDER,
      reason: null,
      budget_total: total,
      budget_remaining: remaining,
      bid_min: null,
      priority_position: null,
    });
  }

  const position = isFiniteNumber(team?.waiverRank) ? team.waiverRank : null;
  return Object.freeze({
    version: MODEL_VERSION,
    system: SYSTEMS.PRIORITY,
    determined_from: SOURCES.PROVIDER,
    reason: null,
    budget_total: null,
    budget_remaining: null,
    bid_min: null,
    priority_position: position,
  });
}


/**
 * Read an attribute off a Yahoo entity in EITHER of its two serialisations —
 * a flat object, or an array of single-key objects. Both are real and the
 * choice is per-endpoint. See the note at the top of src/services/yahoo.js:
 * assuming one shape is exactly how three parsers silently returned empty for
 * every flat-object endpoint while their unit tests passed.
 */
function yahooAttr(raw, key) {
  if (!raw || typeof raw !== "object") return undefined;
  if (Array.isArray(raw)) {
    const hit = raw.find((x) => x && typeof x === "object" && key in x);
    return hit ? hit[key] : undefined;
  }
  return raw[key];
}

/**
 * Yahoo — PROVISIONAL AND UNVERIFIABLE TODAY.
 *
 * Weaker evidence than ESPN, not stronger. Yahoo is entitlement-refused
 * (facts-of-record #11), so the settings call has never run for real, no
 * captured traffic exists, and the shape is unknown on two axes at once: which
 * fields carry the waiver system, AND which of Yahoo's two serialisations the
 * settings endpoint uses.
 *
 * It therefore FAILS CLOSED, hard. It requires an explicitly recognized value
 * and returns not_determined for anything else, so §6.2 stays in force for
 * every Yahoo league and their output is unchanged.
 *
 * DO NOT "verify" this with a hand-built fixture. That is precisely the
 * 2026-08-28 failure recorded in src/services/yahoo.js: the fixtures matched
 * the parser's assumption rather than reality, so the tests proved nothing and
 * every affected endpoint was broken in production. The tests for this function
 * assert only that it fails closed — never that a mapping is correct.
 *
 * Confirm against captured traffic when the entitlement is restored.
 *
 * @param {*} settings raw settings entity from YahooClient.getLeagueSettings
 * @param {*} team raw team entity, for the user's FAAB balance
 */
function fromYahoo({ settings, team } = {}) {
  if (!settings || typeof settings !== "object") {
    return undetermined("yahoo settings unavailable — entitlement refused, shape unverified");
  }

  // Yahoo nests settings one level deeper on some endpoints. Try both without
  // assuming either is the real one.
  const direct = yahooAttr(settings, "settings");
  const container = direct !== undefined
    ? (Array.isArray(direct) ? direct[0] : direct)
    : settings;

  const usesFaab = yahooAttr(container, "uses_faab");
  const waiverType = yahooAttr(container, "waiver_type");

  // Yahoo serialises booleans as "1"/"0" strings on some endpoints and as
  // booleans on others. Accept only values that are unambiguous.
  const faabTrue = usesFaab === 1 || usesFaab === "1" || usesFaab === true;
  const faabFalse = usesFaab === 0 || usesFaab === "0" || usesFaab === false;

  if (faabTrue) {
    const balance = yahooAttr(team, "faab_balance");
    const remaining = isFiniteNumber(Number(balance)) && balance !== null && balance !== ""
      ? Number(balance)
      : null;
    return Object.freeze({
      version: MODEL_VERSION,
      system: SYSTEMS.FAAB,
      determined_from: SOURCES.PROVIDER,
      reason: null,
      // Yahoo exposes the remaining balance, not the season total. Reporting
      // the balance as a total would overstate what is left after spending.
      budget_total: null,
      budget_remaining: remaining,
      bid_min: null,
      priority_position: null,
    });
  }

  if (faabFalse && (waiverType === "R" || waiverType === "C" || waiverType === "S")) {
    const rank = Number(yahooAttr(team, "waiver_priority"));
    return Object.freeze({
      version: MODEL_VERSION,
      system: SYSTEMS.PRIORITY,
      determined_from: SOURCES.PROVIDER,
      reason: null,
      budget_total: null,
      budget_remaining: null,
      bid_min: null,
      priority_position: Number.isFinite(rank) && rank > 0 ? rank : null,
    });
  }

  return undetermined("yahoo waiver system not recognized — no captured traffic to verify against");
}

/** §6.2 gates. A value may be shown only when its system was positively determined. */
function mayShowFaab(model) {
  return Boolean(model) && model.system === SYSTEMS.FAAB && model.determined_from === SOURCES.PROVIDER;
}

function mayShowPriority(model) {
  return Boolean(model) && model.system === SYSTEMS.PRIORITY && model.determined_from === SOURCES.PROVIDER;
}

/** Claim probability stays forbidden in v1 for every league, determined or not. */
function mayShowClaimProbability() {
  return false;
}

module.exports = {
  MODEL_VERSION,
  SYSTEMS,
  SOURCES,
  fromSleeper,
  fromEspn,
  fromYahoo,
  undetermined,
  mayShowFaab,
  mayShowPriority,
  mayShowClaimProbability,
};
