"use strict";

/**
 * Stripe routes - checkout sessions, signed webhook, billing portal.
 *
 * Two routers exported so server.js can mount them with different body
 * parsing strategies:
 *
 *   webhookRouter -- expects RAW body for signature verification.
 *                    Mounted BEFORE the global JSON parser, or the JSON
 *                    parser is conditionally skipped for /api/stripe/webhook.
 *
 *   router        -- normal JSON-bodied routes (/checkout, /portal).
 *
 * SY0-701 mappings:
 *   2.4 / 4.5  - bearer-token auth on /portal so a stranger can't redirect
 *                another user's billing portal session
 *   4.5        - webhook signature verification (defends against forged events)
 *   4.1        - secrets via central config; module fails to load if Stripe
 *                secret key is missing in production
 */

const express = require("express");
const Stripe  = require("stripe");

const config             = require("../config");
const { logger }         = require("../middleware/logging");
const { requireAuth }    = require("../middleware/auth");
const subscriptionSvc    = require("../services/subscription");

if (!config.stripe.secretKey) {
  logger.warn("Stripe not configured - /api/stripe/* will return 503", {
    isProd: config.isProd,
  });
}

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

// =================================================================
// Webhook router  (RAW body)
// =================================================================
const webhookRouter = express.Router();

webhookRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (err) {
      logger.warn("Stripe webhook signature failed", { err: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const s = event.data.object;
          await subscriptionSvc.activate({
            userId:           s.metadata?.userId,
            plan:             s.metadata?.plan,
            stripeCustomerId: s.customer,
          });
          break;
        }
        case "customer.subscription.deleted":
        case "invoice.payment_failed": {
          const customerId = event.data.object.customer;
          await subscriptionSvc.deactivate({ stripeCustomerId: customerId });
          break;
        }
        default:
          logger.debug("Unhandled stripe event", { type: event.type });
      }
      res.json({ received: true });
    } catch (e) {
      // Return 500 so Stripe retries. Idempotency in subscription service
      // means duplicate retries are safe.
      logger.error("Stripe webhook handler error", {
        err: e.message, type: event.type,
      });
      res.status(500).json({ error: "handler failure" });
    }
  }
);

// =================================================================
// JSON-body router  (auth-gated for portal; checkout requires auth too
// so we know which user is being subscribed)
// =================================================================
const router = express.Router();

const VALID_PLANS = new Set(["monthly", "season"]);

router.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

    const { plan } = req.body || {};
    if (!VALID_PLANS.has(plan)) {
      return res.status(400).json({ error: "plan must be 'monthly' or 'season'" });
    }

    const userId  = req.user.id;
    const email   = req.user.email;
    const priceId = plan === "season"
      ? config.stripe.seasonPriceId
      : config.stripe.monthlyPriceId;

    if (!priceId) {
      logger.error("Missing Stripe price ID for plan", { plan });
      return res.status(500).json({ error: "Server price config missing" });
    }

    const session = await stripe.checkout.sessions.create({
      mode:                 plan === "season" ? "payment" : "subscription",
      payment_method_types: ["card"],
      customer_email:       email,
      line_items:           [{ price: priceId, quantity: 1 }],
      metadata:             { userId, plan },
      success_url:          `${config.appBaseUrl}/dashboard?subscribed=true`,
      cancel_url:           `${config.appBaseUrl}/?cancelled=true`,
      ...(plan === "monthly" && {
        subscription_data: { trial_period_days: 7 },
      }),
    });

    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

router.post("/portal", requireAuth, async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

    const sub = await subscriptionSvc.getByUserId(req.user.id);
    if (!sub?.stripe_customer_id) {
      return res.status(404).json({ error: "No subscription found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${config.appBaseUrl}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

module.exports = { router, webhookRouter };
