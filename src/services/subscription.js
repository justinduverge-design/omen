"use strict";

/**
 * Subscription service - persistence layer for Stripe subscription state.
 *
 * Why a separate service?
 *  - Routes stay thin (pure HTTP I/O).
 *  - Webhook handler and dashboard share the same activate/deactivate logic.
 *  - Easier to mock in tests.
 *
 * The route module imports this and never touches Supabase directly for
 * subscription state. SY0-701 4.5: separation of concerns / least privilege.
 */

const { createClient } = require("@supabase/supabase-js");
const config           = require("../config");
const { logger }       = require("../middleware/logging");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/** Mark a user as subscribed. Called from the checkout.session.completed webhook. */
async function activate({ userId, plan, stripeCustomerId }) {
  if (!userId) throw new Error("subscription.activate(): userId is required");

  const { error: subErr } = await supabase.from("subscriptions").upsert({
    user_id:            userId,
    plan,
    stripe_customer_id: stripeCustomerId,
    status:             "active",
    subscribed_at:      new Date().toISOString(),
    canceled_at:        null,
  });
  if (subErr) throw new Error(`subscriptions.upsert failed: ${subErr.message}`);

  // Denormalized fast-check column on users (read on every request, so we
  // don't want to JOIN every time).
  const { error: userErr } = await supabase
    .from("users")
    .update({ is_subscribed: true })
    .eq("id", userId);
  if (userErr) throw new Error(`users.update failed: ${userErr.message}`);

  logger.info("Subscription activated", { userId, plan });
}

/** Mark a user as no longer subscribed. Called from cancel/payment-failed events. */
async function deactivate({ stripeCustomerId }) {
  if (!stripeCustomerId) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (!sub?.user_id) {
    logger.warn("deactivate: no subscription for stripe customer", { stripeCustomerId });
    return;
  }

  await supabase.from("subscriptions").update({
    status:      "canceled",
    canceled_at: new Date().toISOString(),
  }).eq("user_id", sub.user_id);

  await supabase.from("users").update({ is_subscribed: false }).eq("id", sub.user_id);
  logger.info("Subscription deactivated", { userId: sub.user_id });
}

/** Get a user's current subscription record. Returns null if none. */
async function getByUserId(userId) {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data || null;
}

module.exports = { activate, deactivate, getByUserId };
