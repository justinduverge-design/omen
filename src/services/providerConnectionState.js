"use strict";

/**
 * Provider connection health is a domain state, not a proxy for whether a
 * secret reference exists. Keep the classifier pure so adapters and routes
 * cannot quietly invent different reconnect semantics.
 */

const CONNECTION_STATES = Object.freeze([
  "not_connected",
  "connected",
  "reconnect_required",
  "temporarily_unavailable",
  "disconnected",
]);

const FAILURE_KINDS = Object.freeze([
  "authentication",
  "temporary",
  "operation",
  "unknown",
]);

function statusOf(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}

function isTimeout(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT", "ABORT_ERR"]
    .includes(code)
    || message.includes("timed out")
    || message.includes("timeout");
}

/**
 * 400 is deliberately an operation error. A malformed provider request must
 * never eject a user's otherwise valid credentials.
 */
function classifyProviderError(error = {}) {
  const status = statusOf(error);
  if (status === 401 || status === 403) {
    return { kind: "authentication", status, state: "reconnect_required", retryable: false };
  }
  if (status === 408 || status === 425 || status === 429 || status >= 500 || isTimeout(error)) {
    return { kind: "temporary", status, state: "temporarily_unavailable", retryable: true };
  }
  if (status !== null && status >= 400 && status < 500) {
    return { kind: "operation", status, state: null, retryable: false };
  }
  return { kind: "unknown", status, state: null, retryable: false };
}

function normalizeState(state) {
  return CONNECTION_STATES.includes(state) ? state : "not_connected";
}

/**
 * Apply an observed provider result to a connection snapshot. A generation
 * guard prevents an old request from quarantining a connection re-established
 * by a newer request. The returned object is persistence-ready but this helper
 * intentionally performs no writes.
 */
function transitionConnectionState(current = {}, observation = {}, now = new Date()) {
  const currentGeneration = Number(current.credential_generation ?? 0);
  const observedGeneration = observation.credential_generation == null
    ? currentGeneration
    : Number(observation.credential_generation);
  if (!Number.isFinite(observedGeneration) || observedGeneration < 0) {
    return { applied: false, reason: "invalid_generation", current };
  }
  if (observedGeneration !== currentGeneration) {
    return { applied: false, reason: "stale_generation", current };
  }

  const result = observation.error ? classifyProviderError(observation.error) : {
    kind: "success",
    status: 200,
    state: "connected",
    retryable: false,
  };
  const nextState = result.state || normalizeState(current.connection_state);
  const changed = nextState !== normalizeState(current.connection_state);
  const timestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const next = {
    ...current,
    connection_state: nextState,
    last_checked_at: timestamp,
    last_status: result.status,
    ...(changed ? { state_changed_at: timestamp } : {}),
    ...(result.kind === "temporary"
      ? { consecutive_failures: Number(current.consecutive_failures || 0) + 1 }
      : result.kind === "success"
        ? { consecutive_failures: 0 }
        : {}),
  };
  return { applied: true, result, changed, next };
}

module.exports = {
  CONNECTION_STATES,
  FAILURE_KINDS,
  classifyProviderError,
  statusOf,
  transitionConnectionState,
};
