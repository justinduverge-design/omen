"use strict";

/**
 * Legacy agent compatibility module.
 *
 * The original standalone agent file drifted into non-executable generated
 * text. Current production agent work lives in src/services/agents.js and
 * src/routes/optimizer.js. This module keeps the old math exports available
 * for worker/backfill code while failing closed if someone accidentally mounts
 * the legacy HTTP router again.
 */

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { Redis } = require("@upstash/redis");

const router = express.Router();

const REPLACEMENT_BASELINES = Object.freeze({
  PPR: Object.freeze({ QB: 18.0, RB: 8.5, WR: 9.0, TE: 7.0, K: 7.5, DEF: 7.0, DST: 7.0 }),
  "Half PPR": Object.freeze({ QB: 17.5, RB: 8.0, WR: 8.5, TE: 6.5, K: 7.5, DEF: 7.0, DST: 7.0 }),
  Standard: Object.freeze({ QB: 17.0, RB: 7.5, WR: 8.0, TE: 6.0, K: 7.5, DEF: 7.0, DST: 7.0 }),
  ppr: Object.freeze({ QB: 18.0, RB: 8.5, WR: 9.0, TE: 7.0, K: 7.5, DEF: 7.0, DST: 7.0 }),
  half_ppr: Object.freeze({ QB: 17.5, RB: 8.0, WR: 8.5, TE: 6.5, K: 7.5, DEF: 7.0, DST: 7.0 }),
  standard: Object.freeze({ QB: 17.0, RB: 7.5, WR: 8.0, TE: 6.0, K: 7.5, DEF: 7.0, DST: 7.0 }),
});

const POSITIONS_TO_TRACK = Object.freeze(["QB", "RB", "WR", "TE"]);

const SCARCITY_THRESHOLDS = Object.freeze([
  Object.freeze({ label: "CRITICAL", maxRatio: 0.5, confidenceBonus: 20 }),
  Object.freeze({ label: "HIGH", maxRatio: 1.0, confidenceBonus: 12 }),
  Object.freeze({ label: "MODERATE", maxRatio: 2.0, confidenceBonus: 5 }),
  Object.freeze({ label: "ADEQUATE", maxRatio: Infinity, confidenceBonus: 0 }),
]);

let redisClient;
let supabaseClient;

function normalizePosition(position) {
  const normalized = String(position || "UNK").trim().toUpperCase();
  if (normalized === "D/ST") return "DEF";
  return normalized;
}

function scoringKey(scoring) {
  const raw = String(scoring || "PPR").trim();
  if (REPLACEMENT_BASELINES[raw]) return raw;
  const lower = raw.toLowerCase().replace("-", "_").replace(/\s+/g, "_");
  if (lower === "half_ppr") return "half_ppr";
  if (lower === "standard") return "standard";
  return "PPR";
}

function pointsHistory(player = {}) {
  if (Array.isArray(player.pts_last3)) return player.pts_last3;
  if (Array.isArray(player.points_last3)) return player.points_last3;
  return [];
}

function averagePoints(player = {}) {
  const history = pointsHistory(player).map(Number).filter(Number.isFinite);
  if (history.length) {
    return history.reduce((sum, points) => sum + points, 0) / history.length;
  }

  for (const key of ["pts_season_avg", "projected_points", "projected", "avgPts"]) {
    const value = Number(player[key]);
    if (Number.isFinite(value)) return value;
  }

  return 0;
}

function calcTrendMultiplier(ptsLast3 = []) {
  const points = ptsLast3.map(Number).filter(Number.isFinite);
  if (points.length < 2) return 1.0;
  const diffs = points.slice(1).map((value, index) => value - points[index]);
  const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
  return Math.max(0.85, Math.min(1.2, 1 + avgDiff * 0.01));
}

function gradeForVorp(vorp) {
  if (vorp >= 8) return "A+";
  if (vorp >= 5) return "A";
  if (vorp >= 3) return "B+";
  if (vorp >= 1) return "B";
  if (vorp >= -1) return "C";
  if (vorp >= -3) return "D";
  return "F";
}

function calcVORP(player = {}, scoring = "PPR") {
  const position = normalizePosition(player.pos || player.position);
  const baselines = REPLACEMENT_BASELINES[scoringKey(scoring)] || REPLACEMENT_BASELINES.PPR;
  const baseline = Number(baselines[position]) || 8.0;
  const avgPts = averagePoints(player);
  const trend = calcTrendMultiplier(pointsHistory(player));
  const trendedAvg = avgPts * trend;
  const vorp = Number((trendedAvg - baseline).toFixed(2));

  return {
    vorp,
    avgPts: Number(avgPts.toFixed(2)),
    baseline,
    trend: Number(trend.toFixed(3)),
    grade: gradeForVorp(vorp),
  };
}

function buildVORPTable(players = [], scoring = "PPR") {
  return (Array.isArray(players) ? players : [])
    .map((player) => ({
      ...player,
      pos: normalizePosition(player.pos || player.position),
      ...calcVORP(player, scoring),
    }))
    .sort((a, b) => b.vorp - a.vorp);
}

function buildScarcityReport(waivers = [], leagueSize = 10, scoring = "PPR") {
  const pool = buildVORPTable(waivers, scoring);
  const size = Number.isInteger(Number(leagueSize)) && Number(leagueSize) > 0
    ? Number(leagueSize)
    : 10;
  const report = {};

  for (const position of POSITIONS_TO_TRACK) {
    const viable = pool.filter((player) => player.pos === position && player.vorp > 0);
    const total = pool.filter((player) => player.pos === position);
    const ratio = viable.length / size;
    const tier = SCARCITY_THRESHOLDS.find((item) => ratio < item.maxRatio)
      || SCARCITY_THRESHOLDS[SCARCITY_THRESHOLDS.length - 1];

    report[position] = {
      position,
      viableCount: viable.length,
      totalAvailable: total.length,
      leagueSize: size,
      ratio: Number(ratio.toFixed(2)),
      scarcityLabel: tier.label,
      confidenceBonus: tier.confidenceBonus,
      topAvailable: viable.slice(0, 3).map((player) => ({
        name: player.name,
        vorp: player.vorp,
        grade: player.grade,
      })),
    };
  }

  return report;
}

function formatVORPBlock(vorpTable = [], label = "ROSTER") {
  const rows = (Array.isArray(vorpTable) ? vorpTable : []).slice(0, 15).map((player) => {
    const signed = player.vorp >= 0 ? `+${player.vorp}` : String(player.vorp);
    return `${player.grade || "?"} ${signed} ${player.name || "Unknown"} ${player.pos || player.position || "UNK"}`;
  });
  return [`MATH-FACTS: ${label} VORP TABLE`, ...rows].join("\n");
}

function formatScarcityBlock(report = {}) {
  const lines = Object.values(report).map((row) =>
    `${row.position}: ${row.scarcityLabel} viable:${row.viableCount}/${row.leagueSize} bonus:+${row.confidenceBonus}`
  );
  return ["MATH-FACTS: POSITIONAL SCARCITY ANALYSIS", ...lines].join("\n");
}

function getRedis() {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) return null;
  if (!redisClient) {
    redisClient = new Redis({ url: process.env.REDIS_URL, token: process.env.REDIS_TOKEN });
  }
  return redisClient;
}

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabaseClient;
}

async function fetchWithLocalFallback(leagueId, dataType, cloudFetcher) {
  const cacheKey = `ssff:${dataType}:${leagueId}`;
  const redis = getRedis();

  if (redis) {
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      return {
        data: typeof cached === "string" ? JSON.parse(cached) : cached,
        source: "redis",
      };
    }
  }

  if (typeof cloudFetcher === "function") {
    try {
      const data = await cloudFetcher();
      if (redis) await redis.set(cacheKey, JSON.stringify(data), { ex: 300 }).catch(() => null);
      return { data, source: "cloud" };
    } catch {
      // Local snapshot fallback below.
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(`All data sources failed for ${dataType}; Supabase fallback is not configured.`);
  }

  const { data: row, error } = await supabase
    .from("local_snapshots")
    .select("snapshot, ingested_at, source")
    .eq("league_id", leagueId)
    .maybeSingle();

  if (error) throw new Error(`Local snapshot lookup failed: ${error.message}`);
  if (!row?.snapshot) {
    throw new Error(`All data sources failed for ${dataType}; no local snapshot is available.`);
  }

  const snapshotData = row.snapshot[dataType];
  if (!snapshotData) {
    throw new Error(`dataType "${dataType}" not found in local snapshot`);
  }

  return {
    data: snapshotData,
    source: `local:${row.source || "snapshot"}`,
    snapshotAge: row.ingested_at || null,
  };
}

function buildMathFallbackMove(vorpTable = [], scarcityReport = {}, scoring = "PPR", dataSource = "unavailable") {
  const scarcePosition = Object.values(scarcityReport)
    .sort((a, b) => b.confidenceBonus - a.confidenceBonus)[0];
  const targetPosition = scarcePosition?.position || "RB";
  const bestPlayer = vorpTable.find((player) => player.pos === targetPosition && player.vorp > 0)
    || vorpTable.find((player) => player.vorp > 0)
    || vorpTable[0];

  if (!bestPlayer) {
    return {
      moveType: "Lineup Tweak",
      headline: "Review Your Starting Lineup",
      targetPlayer: "N/A",
      targetPosition: "N/A",
      confidence: 50,
      vorpGrade: "N/A",
      scarcityBonus: 0,
      reasoning: "Insufficient data for a math-backed recommendation.",
      shortVerdict: "Check back once roster and waiver data refresh.",
      dataSource,
    };
  }

  const scarcityBonus = scarcePosition?.confidenceBonus || 0;
  const baseConfidence = Math.min(95, Math.max(40, 50 + bestPlayer.vorp * 3));

  return {
    moveType: "Waiver Pickup",
    headline: `Add ${bestPlayer.name || "top option"}`,
    targetPlayer: bestPlayer.name || "Unknown",
    targetPosition: bestPlayer.pos || "UNK",
    confidence: Math.min(99, Math.round(baseConfidence + scarcityBonus)),
    vorpGrade: bestPlayer.grade,
    scarcityBonus,
    reasoning: `VORP grade ${bestPlayer.grade} (${bestPlayer.vorp}) in ${scoring} scoring with ${scarcePosition?.scarcityLabel || "notable"} scarcity.`,
    shortVerdict: "Best available math-backed move.",
    dataSource,
  };
}

async function runAgentPipeline(context = {}) {
  const scoring = context.scoring || "PPR";
  const leagueSize = context.leagueSize || 10;
  const waivers = Array.isArray(context.waivers) ? context.waivers : [];
  const vorpTable = buildVORPTable(waivers, scoring);
  const scarcityReport = buildScarcityReport(waivers, leagueSize, scoring);

  return {
    move: buildMathFallbackMove(vorpTable, scarcityReport, scoring, "legacy-compat"),
    vorpTable: vorpTable.slice(0, 10),
    scarcityReport,
    dataSource: "legacy-compat",
  };
}

router.all("/agents/*", (_req, res) => {
  res.status(410).json({
    error: "legacy_agent_routes_retired",
    message: "Use /api/optimizer/mvp-move or /api/omen/mvp-move instead.",
  });
});

module.exports = {
  router,
  REPLACEMENT_BASELINES,
  calcTrendMultiplier,
  calcVORP,
  buildVORPTable,
  buildScarcityReport,
  formatVORPBlock,
  formatScarcityBlock,
  fetchWithLocalFallback,
  runAgentPipeline,
};
