"use strict";

const crypto = require("node:crypto");

// Sleeper's public weekly projections, fetched for storage in football.player_weekly_projections.
// Deliberately standalone (no Redis, no request scope, no config): the warehouse worker image carries no
// provider secrets and this endpoint needs none. The records are rotowire-tagged and commercial permission
// from the provider is pending, so the module keeps the payload as delivered and attaches provenance.

const SOURCE = "sleeper";
const RIGHTS_BASIS = "provider_projection_permission_pending";
const PROJECTIONS_BASE = "https://api.sleeper.app/projections/nfl";
const POSITIONS = Object.freeze(["QB", "RB", "WR", "TE", "K", "DEF"]);
const MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 20_000;

class ProjectionSourceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProjectionSourceError";
    this.code = code;
  }
}

function projectionUrl(season, week) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season is invalid");
  if (!Number.isInteger(week) || week < 1 || week > 23) throw new TypeError("week is invalid");
  const url = new URL(`${PROJECTIONS_BASE}/${season}/${week}`);
  url.searchParams.set("season_type", "regular");
  for (const position of POSITIONS) url.searchParams.append("position[]", position);
  return url.toString();
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
}

/** Hash of what the provider said about the player (company + stat line), independent of key order. */
function contentHash({ company, statLine }) {
  const canonical = JSON.stringify({ company: company ?? null, stat_line: sortKeys(statLine) });
  return `sha256:${crypto.createHash("sha256").update(canonical).digest("hex")}`;
}

/**
 * Keep records for the requested week, one per player (a later duplicate replaces an earlier one), with
 * the stat line exactly as delivered. A record without a player id or a stats object is skipped.
 */
function normalizeRecords(payload, { season, week }) {
  if (!Array.isArray(payload)) throw new ProjectionSourceError("source_shape", "projection payload is not an array");
  const byPlayer = new Map();
  let skipped = 0;
  for (const record of payload) {
    const id = record && record.player_id != null ? String(record.player_id) : "";
    const stats = record?.stats;
    const recordWeek = record?.week == null ? week : Number(record.week);
    const recordSeason = record?.season == null ? season : Number(record.season);
    if (
      !id ||
      id.length > 128 ||
      !stats ||
      typeof stats !== "object" ||
      Array.isArray(stats) ||
      recordWeek !== week ||
      recordSeason !== season
    ) {
      skipped += 1;
      continue;
    }
    const company = typeof record.company === "string" && record.company ? record.company.slice(0, 64) : null;
    byPlayer.set(id, {
      sourcePlayerId: id,
      company,
      statLine: stats,
      contentHash: contentHash({ company, statLine: stats }),
    });
  }
  return { records: [...byPlayer.values()], skipped, duplicates: payload.length - skipped - byPlayer.size };
}

async function readBounded(response, maxBytes) {
  const declared = response.headers?.get?.("content-length");
  if (declared != null && Number(declared) > maxBytes)
    throw new ProjectionSourceError("source_too_large", "response too large");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw new ProjectionSourceError("source_too_large", "response too large");
  return buffer;
}

function createSleeperProjectionSource({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = MAX_BYTES,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetch is required");
  return {
    source: SOURCE,
    rightsBasis: RIGHTS_BASIS,
    async fetchWeek({ season, week, signal } = {}) {
      const sourceUrl = projectionUrl(season, week);
      const timeout = AbortSignal.timeout(timeoutMs);
      let response;
      try {
        response = await fetchImpl(sourceUrl, {
          headers: { accept: "application/json" },
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
      } catch (error) {
        throw new ProjectionSourceError(
          error?.name === "TimeoutError" ? "source_timeout" : "source_unreachable",
          "projection request failed",
        );
      }
      if (!response.ok)
        throw new ProjectionSourceError(
          `source_http_${Number(response.status) || 0}`.slice(0, 64),
          "projection request was refused",
        );
      const body = await readBounded(response, maxBytes);
      let payload;
      try {
        payload = JSON.parse(body.toString("utf8"));
      } catch {
        throw new ProjectionSourceError("source_shape", "projection payload is not JSON");
      }
      const normalized = normalizeRecords(payload, { season, week });
      return {
        source: SOURCE,
        season,
        week,
        rightsBasis: RIGHTS_BASIS,
        sourceUrl,
        sourceRef: `sha256:${crypto.createHash("sha256").update(body).digest("hex")}`,
        sourceBytes: body.length,
        sourceRows: payload.length,
        ...normalized,
      };
    },
  };
}

module.exports = {
  ProjectionSourceError,
  RIGHTS_BASIS,
  SOURCE,
  contentHash,
  createSleeperProjectionSource,
  normalizeRecords,
  projectionUrl,
};
