"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { ensureAppUser } = require("../services/appUser");

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

function isFavoriteTeamMigrationPending(error) {
  const code = String(error?.code || "");
  const text = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (code === "42703" || code === "PGRST204" || text.includes("favorite_team"))
    && (text.includes("column") || text.includes("schema cache") || text.includes("does not exist"));
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

    await ensureAppUser(req.user);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        user_id: req.user.id,
        favorite_team: parsed.value,
      }, { onConflict: "user_id" })
      .select("favorite_team")
      .maybeSingle();

    if (error) {
      if (isFavoriteTeamMigrationPending(error)) return res.json({ updated: false, reason: "migration_pending" });
      throw new Error(`profile preference upsert failed: ${error.message}`);
    }

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
module.exports.isFavoriteTeamMigrationPending = isFavoriteTeamMigrationPending;
