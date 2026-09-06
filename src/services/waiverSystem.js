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
  undetermined,
  mayShowFaab,
  mayShowPriority,
  mayShowClaimProbability,
};
