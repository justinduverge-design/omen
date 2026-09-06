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
 * ESPN — VERIFIED 2026-09-05 against three real leagues on the founder's account.
 *
 * Probed live through an authenticated browser session (mSettings + mTeam):
 *
 *   Slops Saloon FF Showdown  acquisitionType WAIVERS_CONTINUOUS   isUsingAcquisitionBudget true   budget 100  minBid 0  waiverRank 4
 *   Everything Backwards      acquisitionType WAIVERS_TRADITIONAL  isUsingAcquisitionBudget true   budget 100  minBid 0  waiverRank 12
 *   Las Vegas Pro H2H PPR     acquisitionType WAIVERS_TRADITIONAL  isUsingAcquisitionBudget false  budget 100  minBid 1  waiverRank 5
 *
 * TWO TRAPS, both confirmed in that data:
 *
 * 1. `acquisitionBudget: 100` is present on the NON-FAAB league. Same decoy as
 *    Sleeper's `waiver_budget`. A budget read that is not gated first will show
 *    a FAAB number to a league that does not use FAAB.
 *
 * 2. `acquisitionType` is NOT the discriminator, though it is the field that
 *    looks like one. WAIVERS_TRADITIONAL appears with isUsingAcquisitionBudget
 *    both true and false. Mapping on the type string gets the third league
 *    above exactly wrong. `isUsingAcquisitionBudget` is the only discriminator.
 *
 * `waiverRank` is likewise populated on every team of every league, FAAB
 * included, so it is a decoy too and is dropped for a FAAB league.
 *
 * Still fails closed: an unrecognized shape, or a discriminator that is not a
 * real boolean, yields not_determined rather than a guess.
 *
 * @param {object} args
 * @param {object} args.settings raw `data.settings` from an mSettings view
 * @param {object} args.team the user's team row, for budget spent
 */
function fromEspn({ settings, team } = {}) {
  const acquisition = settings && settings.acquisitionSettings;
  if (!acquisition || typeof acquisition !== "object") {
    return undetermined("espn acquisition settings absent");
  }

  // The single documented discriminator. Anything other than a real boolean is
  // an unrecognized shape, not a "probably false".
  const usesBudget = acquisition.isUsingAcquisitionBudget;
  if (typeof usesBudget !== "boolean") {
    return undetermined("espn waiver discriminator not recognized");
  }

  if (usesBudget) {
    const total = isFiniteNumber(acquisition.acquisitionBudget) ? acquisition.acquisitionBudget : null;
    const spent = isFiniteNumber(team?.transactionCounter?.acquisitionBudgetSpent)
      ? team.transactionCounter.acquisitionBudgetSpent
      : null;
    // Same rule as Sleeper: remaining is derived, and missing input stays
    // unknown rather than becoming zero.
    const remaining = total !== null && spent !== null ? Math.max(0, total - spent) : null;
    if (total === null) return undetermined("espn budget total unreadable");

    return Object.freeze({
      version: MODEL_VERSION,
      system: SYSTEMS.FAAB,
      determined_from: SOURCES.PROVIDER,
      reason: null,
      budget_total: total,
      budget_remaining: remaining,
      // Observed varying across real leagues (0, 0, 1), so it is read rather
      // than assumed. Floors any bid recommendation.
      bid_min: isFiniteNumber(acquisition.minimumBid) ? acquisition.minimumBid : null,
      // waiverRank is populated on FAAB leagues too (4 and 12 on the two FAAB
      // leagues probed). Decoy — dropped.
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
 * Weaker evidence than ESPN, not stronger — but for a different reason than
 * an access block. Yahoo's entitlement is GRANTED and LIVE (facts-of-record
 * #11, verified 2026-08-28) and two founder leagues are bound. What is missing
 * is simply that nobody has read `/league/{key}/settings` yet, so the shape is
 * unknown on two axes at once: which fields carry the waiver system, AND which
 * of Yahoo's two serialisations that endpoint uses.
 *
 * That makes this verifiable TODAY, unlike when it was written:
 * `scripts/probe-yahoo-waiver-settings.js` closes it.
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
 * Confirm against captured traffic by running the probe script.
 *
 * @param {*} settings raw settings entity from YahooClient.getLeagueSettings
 * @param {*} team raw team entity, for the user's FAAB balance
 */
function fromYahoo({ settings, team } = {}) {
  if (!settings || typeof settings !== "object") {
    return undetermined("yahoo settings unavailable — shape unverified");
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
