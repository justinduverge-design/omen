"use strict";

// Credential health: is each stored ESPN cookie pair and Yahoo token still accepted by its provider?
//
//   accepted   -> connection_record_health(ok): credential_state valid, last_verified_at now
//   refused    -> connection_invalidate: the secrets are deleted from Vault, the pointers cleared, the row marked
//                 needs_reauth with a failure code; the league stays, so reconnecting restores everything
//   anything else (timeout, network, provider 5xx, rate limit) -> no change: an outage never deletes a credential
//
// Logs carry platform, outcome and code only; never a user id, league id, cookie or token.

/** "refused" only on a definite provider verdict; null for anything that could be transient. */
function classify(platform, error) {
  if (!error) return null;
  const status = Number(error.status);
  if (platform === "espn") return status === 401 ? "espn_unauthorized" : null;
  const oauth = String(error?.yahoo_error?.error || "");
  if (oauth === "invalid_grant" || oauth === "invalid_client") return "yahoo_refresh_refused";
  if (/refresh token missing/i.test(String(error.message || ""))) return "yahoo_refresh_missing";
  if (status === 401 && /yahoo_token_expired/.test(String(error.message || ""))) return null; // refreshable, not refused
  return null;
}

function createCredentialHealthChecker({ supabase, checks, log = null }) {
  if (!supabase || typeof supabase.rpc !== "function") throw new TypeError("supabase is required");
  return {
    /** Probe every active ESPN/Yahoo connection once. Returns counts by outcome. */
    async run() {
      const { data, error } = await supabase.from("platform_connections")
        .select("user_id, platform, league_id, espn_secret_id, swid_secret_id, token_secret_id, refresh_secret_id")
        .in("platform", ["espn", "yahoo"]).eq("is_active", true);
      if (error) throw new Error(`connection lookup failed (${error.code || "unknown"})`);
      const tally = { checked: 0, valid: 0, invalidated: 0, transient: 0, skipped: 0 };
      for (const row of data || []) {
        const hasSecrets = row.platform === "espn" ? row.espn_secret_id && row.swid_secret_id : row.token_secret_id || row.refresh_secret_id;
        if (!hasSecrets || !row.league_id) { tally.skipped += 1; continue; }
        tally.checked += 1;
        try {
          await checks[row.platform](row);
          await supabase.rpc("connection_record_health", { p_user_id: row.user_id, p_platform: row.platform, p_ok: true, p_failure_code: null });
          tally.valid += 1;
        } catch (err) {
          const code = classify(row.platform, err);
          if (!code) { tally.transient += 1; continue; }
          const { error: rpcError } = await supabase.rpc("connection_invalidate", { p_user_id: row.user_id, p_platform: row.platform, p_failure_code: code });
          if (rpcError) { tally.transient += 1; try { log?.warn?.("Credential invalidation failed", { platform: row.platform, code: rpcError.code || "unknown" }); } catch { /* ignore */ } continue; }
          tally.invalidated += 1;
          try { log?.info?.("Credential refused and removed", { platform: row.platform, code }); } catch { /* ignore */ }
        }
      }
      return tally;
    },
  };
}

module.exports = { classify, createCredentialHealthChecker };
