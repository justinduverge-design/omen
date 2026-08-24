"use strict";

const { storedScoringFormat } = require("./scoringFormat");

function recommendationMoveRow(userId, response = {}) {
  if (response.state !== "success" || !response.recommendation) return null;
  const recommendation = response.recommendation;
  const scoring = storedScoringFormat(response.league?.scoring_format);
  if (!scoring) throw new Error("move recommendation persistence requires a supported league scoring format");

  const week = Number(response.league?.week);
  const season = Number(response.league?.season);
  if (!Number.isInteger(week) || week < 1 || !Number.isInteger(season) || season < 1) {
    throw new Error("move recommendation persistence requires league week and season");
  }

  return {
    user_id: userId,
    week_num: week,
    season,
    move_type: recommendation.type || null,
    headline: recommendation.title || null,
    reasoning: recommendation.explanation?.summary || recommendation.move || null,
    confidence: Number.isFinite(Number(recommendation.confidence?.score))
      ? Math.round(Number(recommendation.confidence.score))
      : null,
    target_player: recommendation.primary_player?.name || null,
    scoring,
    platform: response.platform?.name || null,
    league_id: response.league?.id || null,
  };
}

async function persistLiveRecommendation(supabase, userId, response) {
  const row = recommendationMoveRow(userId, response);
  if (!row) return null;
  const { data, error } = await supabase
    .from("moves")
    .upsert(row, { onConflict: "user_id,week_num,season" })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`move recommendation upsert failed: ${error.message}`);
  if (!data?.id) throw new Error("move recommendation upsert failed: missing move id");
  return data.id;
}

module.exports = { persistLiveRecommendation, recommendationMoveRow };
