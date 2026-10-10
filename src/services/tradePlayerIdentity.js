"use strict";

const { normalizePosition } = require("./playerSearch");

const PROVIDER_KEY = /^(espn|yahoo|sleeper):([A-Za-z0-9_.-]{1,64})$/;

function toKey(input) {
  const raw = String(input?.player_key ?? input?.id ?? "").trim();
  const match = PROVIDER_KEY.exec(raw);
  return match ? { raw, provider: match[1], providerId: match[2] } : null;
}

/**
 * Wrap the legacy (Sleeper dump) trade player resolver with a warehouse identity fallback.
 *
 * It only fills gaps: anything the legacy resolver answered is returned untouched, and only
 * `unresolved` inputs carrying an espn:/yahoo:/sleeper: key are looked up in football.football_player_ids.
 * FOOTBALL_DATA_MODE=supabase never reaches the warehouse. Any warehouse failure degrades to the legacy
 * answer with one structured log line (no raw error text).
 *
 * A warehouse-resolved player has no projection (projections are not warehouse data), so
 * projected_points stays null and the route's evaluability gate keeps reporting insufficient_data
 * unless the caller supplied a projection itself.
 */
function withWarehouseIdentityFallback(baseResolver, { getRuntime, logger } = {}) {
  if (typeof baseResolver !== "function") throw new TypeError("baseResolver must be a function");
  const log = (event) => { try { logger?.info?.("Trade warehouse identity", event); } catch { /* logging never throws */ } };

  return async function resolveWithFallback(players, ...rest) {
    const resolutions = await baseResolver(players, ...rest);
    let runtime;
    try { runtime = typeof getRuntime === "function" ? getRuntime() : null; } catch { runtime = null; }
    if (!runtime?.enabled || !runtime.identityRepository || runtime.mode === "supabase") return resolutions;

    const gaps = [];
    resolutions.forEach((resolution, index) => {
      if (resolution?.status !== "unresolved") return;
      const key = toKey(players[index]);
      if (key) gaps.push({ index, key });
    });
    if (!gaps.length) return resolutions;

    let found;
    try {
      found = await runtime.identityRepository.readPlayersByProviderIds({
        keys: gaps.map(({ key }) => ({ provider: key.provider, providerId: key.providerId })),
      });
    } catch (error) {
      log({
        event: "trade_identity_fallback", outcome: "unavailable", mode: runtime.mode,
        requested: gaps.length, code: typeof error?.code === "string" ? error.code.slice(0, 32) : null,
      });
      return resolutions;
    }

    const out = resolutions.slice();
    let filled = 0;
    for (const { index, key } of gaps) {
      const hit = found?.get?.(`${key.provider}:${key.providerId}`);
      const position = normalizePosition(hit?.position) || normalizePosition(players[index]?.position);
      if (!hit?.name || !position) continue;
      out[index] = {
        status: "resolved",
        player: {
          id: key.raw,
          name: hit.name,
          position,
          team: String(hit.team || players[index]?.team || "FA").toUpperCase(),
          projected_points: null,
          gsis_id: hit.gsis_id || null,
        },
      };
      filled += 1;
    }
    log({ event: "trade_identity_fallback", outcome: "ok", mode: runtime.mode, requested: gaps.length, resolved: filled });
    return out;
  };
}

module.exports = { withWarehouseIdentityFallback };
