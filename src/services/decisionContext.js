"use strict";

/**
 * Shared request-scoped decision context. It has no provider, credential,
 * cache, or candidate-score knowledge. Feature engines inject source loaders
 * and explicitly mark an input used only after it affects a decision.
 */

const DECISION_CONTEXT_VERSION = "shared-decision-context.v1";
const INPUT_STATES = Object.freeze(["live", "unavailable", "pending", "not_requested"]);
const PROFILES = Object.freeze({
  omen_mvp: ["selected_context", "roster", "projections"],
  start_sit: ["selected_context", "roster", "projections"],
  waiver: ["selected_context", "roster", "waivers", "projections"],
  trade: ["selected_context", "roster", "trade_rosters", "projections"],
  // League deliberately exposes independently-readable sections rather than one
  // coarse "league" source. A dead matchup must not make live standings look
  // unavailable (and an unread transaction feed must not look empty).
  league: [
    "selected_context",
    "league_standings",
    "league_matchup",
    "league_playoff_settings",
    "league_activity",
    "league_transactions",
  ],
  ledger: ["decision_receipt", "scoring_outcome"],
});

function safeText(value, max = 160) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function safeIso(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function normalizeState(value) {
  const state = String(value || "").toLowerCase();
  return INPUT_STATES.includes(state) ? state : "unavailable";
}

function unavailableInput(name, reasonCode = "input_unavailable") {
  return { name, state: "unavailable", used: false, source: "unknown", reason_code: reasonCode, observed_at: null, fresh_until: null };
}

/** Value is private/context-local and is intentionally excluded by receipt(). */
function normalizeInput(name, result = {}) {
  const state = normalizeState(result.state);
  return {
    name,
    state,
    used: false,
    source: safeText(result.source, 80) || "unknown",
    ...(safeText(result.reason_code, 80) ? { reason_code: safeText(result.reason_code, 80) } : {}),
    observed_at: safeIso(result.observed_at),
    fresh_until: safeIso(result.fresh_until),
    value: Object.prototype.hasOwnProperty.call(result, "value") ? result.value : null,
  };
}

function publicInput(input) {
  return {
    state: input.state,
    used: input.used === true,
    source: input.source,
    ...(input.reason_code ? { reason_code: input.reason_code } : {}),
    ...(input.observed_at ? { observed_at: input.observed_at } : {}),
    ...(input.fresh_until ? { fresh_until: input.fresh_until } : {}),
  };
}

function createDecisionContext({ profile, loaders = {}, now = () => new Date().toISOString() } = {}) {
  if (!Object.hasOwn(PROFILES, profile)) throw new TypeError("decision context requires a known profile");
  const records = new Map();
  const inflight = new Map();

  async function resolve(name) {
    if (records.has(name)) return records.get(name);
    if (inflight.has(name)) return inflight.get(name);
    const task = Promise.resolve().then(async () => {
      const loader = loaders[name];
      if (typeof loader !== "function") return unavailableInput(name, "not_requested");
      try {
        const record = normalizeInput(name, await loader() || {});
        if (record.state === "live" && !record.observed_at) record.observed_at = safeIso(now());
        records.set(name, record);
        return record;
      } catch {
        const record = unavailableInput(name, "source_failed");
        records.set(name, record);
        return record;
      } finally {
        inflight.delete(name);
      }
    });
    inflight.set(name, task);
    return task;
  }

  async function resolveMany(names = []) {
    const unique = [...new Set((Array.isArray(names) ? names : []).filter((name) => typeof name === "string"))];
    return Promise.all(unique.map(resolve));
  }

  // Candidate builders sometimes learn an input's final state while doing
  // their provider-specific work (for example, an ESPN waiver pool). They can
  // record that result without exposing its private value or inventing a
  // second provider fetch.
  function record(name, result = {}) {
    const input = normalizeInput(name, result);
    if (input.state === "live" && !input.observed_at) input.observed_at = safeIso(now());
    records.set(name, input);
    return input;
  }

  function use(name) {
    const record = records.get(name);
    if (!record || record.state !== "live") return false;
    record.used = true;
    return true;
  }

  function value(name) { return records.get(name)?.value ?? null; }

  function receipt() {
    const names = [...new Set([...PROFILES[profile], ...records.keys()])].sort();
    const inputs = {};
    const limitations = [];
    const inputsUsed = [];
    for (const name of names) {
      const record = records.get(name) || unavailableInput(name, "not_requested");
      inputs[name] = publicInput(record);
      if (record.used) inputsUsed.push(name);
      if (record.state !== "live") limitations.push({ name, state: record.state, reason_code: record.reason_code || "input_unavailable" });
    }
    return { contract_version: DECISION_CONTEXT_VERSION, profile, inputs, inputs_used: inputsUsed.sort(), limitations };
  }

  return { profile, record, resolve, resolveMany, use, value, receipt };
}

function attachDecisionReceipt(response, context) {
  if (response && typeof response === "object" && context && typeof context.receipt === "function") response.decision_context = context.receipt();
  return response;
}

module.exports = { DECISION_CONTEXT_VERSION, INPUT_STATES, PROFILES, attachDecisionReceipt, createDecisionContext, normalizeInput, unavailableInput };
