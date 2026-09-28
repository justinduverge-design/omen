"use strict";

// Provider health columns are additive and nullable during rollout. Keep the
// compatibility boundary in one place so callers do not each invent their own
// PGRST204 fallback (or accidentally discard a real database error).
const STATE_COLUMNS = [
  "connection_state",
  "connection_reason_code",
  "credential_generation",
  "consecutive_failures",
  "last_status",
  "last_checked_at",
  "state_changed_at",
];

const BASE_COLUMNS = "platform,is_active,platform_username,token_secret_id,espn_secret_id,swid_secret_id,league_id,espn_team_id";
const EXTENDED_COLUMNS = `${BASE_COLUMNS},${STATE_COLUMNS.join(",")}`;

function isMissingColumnError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  return code === "PGRST204" || code === "42703" || message.includes("could not find the") && message.includes("column");
}

function statePayload(payload, now = new Date()) {
  return {
    ...payload,
    connection_state: "connected",
    connection_reason_code: null,
    consecutive_failures: 0,
    last_status: 200,
    last_checked_at: now.toISOString(),
    state_changed_at: now.toISOString(),
  };
}

async function selectConnections(supabase, userId) {
  const extended = await supabase.from("platform_connections").select(EXTENDED_COLUMNS).eq("user_id", userId);
  if (!extended.error || !isMissingColumnError(extended.error)) return { ...extended, stateColumnsAvailable: !extended.error };
  const base = await supabase.from("platform_connections").select(BASE_COLUMNS).eq("user_id", userId);
  if (base.error) return { ...base, stateColumnsAvailable: false };
  return { ...base, stateColumnsAvailable: false };
}

async function upsertConnection(supabase, payload, options, now = new Date()) {
  const extended = await supabase.from("platform_connections").upsert(statePayload(payload, now), options);
  if (!extended.error || !isMissingColumnError(extended.error)) return { ...extended, stateColumnsAvailable: !extended.error };
  const base = await supabase.from("platform_connections").upsert(payload, options);
  return { ...base, stateColumnsAvailable: false };
}

module.exports = {
  BASE_COLUMNS,
  EXTENDED_COLUMNS,
  STATE_COLUMNS,
  isMissingColumnError,
  selectConnections,
  statePayload,
  upsertConnection,
};
