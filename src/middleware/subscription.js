"use strict";

/**
 * =================================================================
 * Subscription gate middleware
 * -----------------------------------------------------------------
 * Use AFTER requireAuth. Verifies the authenticated user has an
 * active Pro subscription. Cheap path: reads the denormalized
 * `users.is_subscribed` flag (kept in sync by the Stripe webhook).
 *
 * Returns 402 Payment Required if not subscribed - the most
 * accurate HTTP status for "feature requires payment".
 *
 * SY0-701 5.4: separation of duties / privilege isolation.
 * =================================================================
 */

const { createClient } = require("@supabase/supabase-js");
const config           = require("../config");
const { logger }       = require("./logging");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

async function requireSubscription(req, res, next) {
  if (!req.user?.id) {
    // requireAuth should have run first - belt-and-suspenders
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("is_subscribed")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      logger.warn("subscription check: supabase error", { err: error.message });
      return res.status(500).json({ error: "Subscription check failed" });
    }

    if (!data?.is_subscribed) {
      return res.status(402).json({
        error:    "Pro subscription required",
        upgrade:  `${config.appBaseUrl}/?upgrade=true`,
      });
    }
    return next();
  } catch (e) {
    logger.error("subscription middleware error", { err: e.message });
    return res.status(500).json({ error: "Subscription check failed" });
  }
}

module.exports = { requireSubscription };
