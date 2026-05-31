"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

function normalizeFavoriteTeam(value) {
  if (value == null) return { value: null };
  if (typeof value !== "string") {
    return { error: "favorite_team must be a string or null" };
  }

  const normalized = value.trim().toUpperCase();
  return { value: normalized || null };
}

router.patch("/preferences", requireAuth, async (req, res, next) => {
  try {
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, "favorite_team")) {
      return res.status(422).json({ error: "favorite_team is required" });
    }

    const parsed = normalizeFavoriteTeam(req.body.favorite_team);
    if (parsed.error) {
      return res.status(422).json({ error: parsed.error });
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        user_id: req.user.id,
        favorite_team: parsed.value,
      }, { onConflict: "user_id" })
      .select("favorite_team")
      .maybeSingle();

    if (error) throw new Error(`profile preference upsert failed: ${error.message}`);

    return res.json({
      updated: true,
      favorite_team: data?.favorite_team ?? parsed.value,
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
module.exports.normalizeFavoriteTeam = normalizeFavoriteTeam;
