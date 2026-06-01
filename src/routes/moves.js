"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { getCurrentNflWeekContext } = require("../services/nflSchedule");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

function nowIso() {
  return new Date().toISOString();
}

function defaultSeason() {
  return getCurrentNflWeekContext().season;
}

function parsePositiveInteger(value, fallback, { max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) return null;
  return parsed;
}

function recommendationFrom(row = {}) {
  return row.headline || row.reasoning || null;
}

function normalizeMove(row = {}) {
  return {
    id: row.id,
    season: row.season,
    week: row.week_num,
    move_type: row.move_type || null,
    recommendation: recommendationFrom(row),
    followed: row.followed ?? null,
    stars: row.user_stars ?? null,
    outcome: row.outcome || "pending",
    effectiveness_pct: Number.isFinite(Number(row.eff)) ? Number(row.eff) : null,
    created_at: row.created_at || null,
  };
}

function buildSummary(moves = []) {
  let wins = 0;
  let losses = 0;
  let pending = 0;
  let followedCount = 0;
  const scoredEff = [];

  for (const move of moves) {
    if (move.outcome === "pending") pending += 1;
    if (move.followed !== true) continue;

    followedCount += 1;
    if (move.outcome === "win") wins += 1;
    if (move.outcome === "loss") losses += 1;
    if (
      (move.outcome === "win" || move.outcome === "loss")
      && Number.isFinite(Number(move.effectiveness_pct))
    ) {
      scoredEff.push(Number(move.effectiveness_pct));
    }
  }

  const avg = scoredEff.length
    ? Math.round(scoredEff.reduce((sum, value) => sum + value, 0) / scoredEff.length)
    : null;

  return {
    wins,
    losses,
    pending,
    avg_effectiveness_pct: avg,
    followed_count: followedCount,
    total_count: moves.length,
  };
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const season = parsePositiveInteger(req.query.season, defaultSeason(), { max: 9999 });
    const limit = parsePositiveInteger(req.query.limit, 20, { max: 100 });

    if (!season) return res.status(400).json({ error: "season must be a positive integer" });
    if (!limit) return res.status(400).json({ error: "limit must be an integer between 1 and 100" });

    const { data, error } = await supabase
      .from("moves")
      .select("id,week_num,season,move_type,headline,reasoning,followed,user_stars,outcome,eff,created_at")
      .eq("user_id", req.user.id)
      .eq("season", season)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`moves lookup failed: ${error.message}`);

    const moves = (Array.isArray(data) ? data : []).map(normalizeMove);
    return res.json({
      contract_version: "moves-history.v1",
      generated_at: nowIso(),
      season,
      summary: buildSummary(moves),
      moves,
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.buildSummary = buildSummary;
module.exports.normalizeMove = normalizeMove;
