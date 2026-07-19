"use strict";

function hasUsableLeagueId(connection) {
  const leagueId = String(connection?.league_id || "").trim();
  return Boolean(leagueId) && leagueId !== connection?.platform;
}

function isExpiredYahooToken(connection, now = new Date()) {
  if (connection?.platform !== "yahoo" || !connection?.is_active || !connection?.token_secret_id) {
    return false;
  }
  const expiresAt = connection.token_expires_at ? Date.parse(connection.token_expires_at) : NaN;
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime();
}

function isOmenReadyConnection(connection, now = new Date()) {
  if (!connection?.is_active || !hasUsableLeagueId(connection)) return false;

  if (connection.platform === "yahoo") {
    return Boolean(connection.token_secret_id) && !isExpiredYahooToken(connection, now);
  }
  if (connection.platform === "sleeper") return Boolean(connection.platform_username);
  if (connection.platform === "espn") {
    return Boolean(connection.espn_secret_id && connection.swid_secret_id);
  }
  return false;
}

function getOmenReadiness({ rows = [], offSeason = false, now = new Date() } = {}) {
  const activeRows = rows.filter((row) => row?.is_active);
  if (!activeRows.length) return { available: false, mode: "free", status: "needs_platform" };
  if (!activeRows.some((row) => isOmenReadyConnection(row, now))) {
    return { available: false, mode: "free", status: "pending_live_engine" };
  }
  if (offSeason) return { available: false, mode: "free", status: "off_season" };
  return { available: true, mode: "free", status: "ready" };
}

module.exports = {
  getOmenReadiness,
  hasUsableLeagueId,
  isExpiredYahooToken,
  isOmenReadyConnection,
};
