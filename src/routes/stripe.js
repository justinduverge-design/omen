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
const { ensureAppUser }  = require("../services/appUser");
const subscriptionSvc    = require("../services/subscription");

if (!config.stripe.secretKey) {
  logger.warn("Stripe not configured - /api/stripe/* will return 503", {
    isProd: config.isProd,
  });
}

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

function subscriptionSnapshot(subscription, fallback = {}) {
  const metadata = subscription?.metadata || fallback.metadata || {};
  return {
    userId: metadata.userId || fallback.userId,
    plan: metadata.plan || fallback.plan,
    stripeCustomerId: subscription?.customer || fallback.stripeCustomerId,
    status: subscription?.status || fallback.status || "active",
    trialEndsAt: subscription?.trial_end || null,
    currentPeriodEnd: subscription?.current_period_end || null,
    expiresAt: subscription?.current_period_end || fallback.expiresAt || null,
    canceledAt: subscription?.canceled_at || subscription?.ended_at || null,
  };
}

function safeStripeObjectId(object) {
  return typeof object?.id === "string" ? object.id : null;
}

function safeStripeCustomerId(object) {
  return typeof object?.customer === "string" ? object.customer : null;
}

function logWebhookSkip(event, reason, object = {}) {
  logger.warn("Stripe webhook event acknowledged without subscription mutation", {
    reason,
    type: event.type,
    eventId: safeStripeObjectId(event),
    objectId: safeStripeObjectId(object),
    stripeCustomerId: safeStripeCustomerId(object),
  });
}

async function subscriptionForCheckoutSession(session) {
  if (session.subscription && stripe?.subscriptions?.retrieve) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      return subscriptionSnapshot(subscription, {
        userId: session.metadata?.userId,
        plan: session.metadata?.plan,
        stripeCustomerId: session.customer,
      });
    } catch (err) {
      logger.warn("Stripe subscription lookup failed for checkout session", {
        err: err.message,
        checkoutSessionId: session.id,
        subscriptionId: session.subscription,
      });
    }
  }

  return subscriptionSnapshot(null, {
    userId: session.metadata?.userId,
    plan: session.metadata?.plan,
    stripeCustomerId: session.customer,
    status: "active",
  });
}

async function subscriptionForSubscriptionEvent(subscription) {
  const snapshot = subscriptionSnapshot(subscription);
  if (snapshot.userId) return snapshot;

  try {
    const existing = await subscriptionSvc.getByStripeCustomerId?.(subscription.customer);
    if (existing?.user_id) {
      return {
        ...snapshot,
        userId: existing.user_id,
        plan: snapshot.plan || existing.plan,
      };
    }
  } catch (err) {
    logger.warn("Stripe customer subscription lookup failed", {
      err: err.message,
      subscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
    });
  }

  if (subscription.id && stripe?.checkout?.sessions?.list) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        subscription: subscription.id,
        limit: 1,
      });
      const session = sessions?.data?.[0];
      if (session?.metadata?.userId) {
        return {
          ...snapshot,
          userId: session.metadata.userId,
          plan: snapshot.plan || session.metadata.plan,
          stripeCustomerId: snapshot.stripeCustomerId || session.customer,
        };
      }
    } catch (err) {
      logger.warn("Stripe checkout session lookup failed for subscription event", {
        err: err.message,
        subscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
      });
    }
  }

  return snapshot;
}

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
          const snapshot = await subscriptionForCheckoutSession(s);
          if (!snapshot.userId) {
            logWebhookSkip(event, "checkout_session_missing_user_mapping", s);
            break;
          }
          await subscriptionSvc.activate(snapshot);
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const snapshot = await subscriptionForSubscriptionEvent(subscription);
          if (!snapshot.userId) {
            logWebhookSkip(event, "subscription_event_missing_user_mapping", subscription);
            break;
          }
          await subscriptionSvc.activate(snapshot);
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          await subscriptionSvc.deactivate({
            stripeCustomerId: subscription.customer,
            status: subscription.status || "canceled",
            canceledAt: subscription.canceled_at || subscription.ended_at,
          });
          break;
        }
        case "invoice.payment_failed": {
          const customerId = event.data.object.customer;
          await subscriptionSvc.deactivate({
            stripeCustomerId: customerId,
            status: "payment_failed",
          });
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
        err: e.message,
        type: event.type,
        eventId: safeStripeObjectId(event),
        objectId: safeStripeObjectId(event.data?.object),
        stripeCustomerId: safeStripeCustomerId(event.data?.object),
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
const PLAN_METADATA = {
  monthly: {
    id: "monthly",
    label: "Monthly",
    checkout_plan: "monthly",
    checkout_mode: "subscription",
    trial_period_days: 7,
  },
  season: {
    id: "season",
    label: "Season Pass",
    checkout_plan: "season",
    checkout_mode: "payment",
    trial_period_days: 0,
  },
};

function priceIdForPlan(plan) {
  return plan === "season"
    ? config.stripe.seasonPriceId
    : config.stripe.monthlyPriceId;
}

function formatStripeAmount({ unitAmount, currency, recurring }) {
  if (!Number.isFinite(unitAmount) || !currency) return null;

  const amount = unitAmount / 100;
  let formatted;
  try {
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency).toUpperCase(),
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch (_err) {
    formatted = `${amount.toFixed(Number.isInteger(amount) ? 0 : 2)} ${String(currency).toUpperCase()}`;
  }

  if (!recurring?.interval) return formatted;
  const interval = recurring.interval === "month" ? "mo" : recurring.interval;
  return `${formatted}/${interval}`;
}

function publicPriceShape(plan, stripePrice = null, error = null) {
  const metadata = PLAN_METADATA[plan];
  const unitAmount = Number.isFinite(stripePrice?.unit_amount)
    ? stripePrice.unit_amount
    : null;
  const currency = stripePrice?.currency || null;
  const recurring = stripePrice?.recurring
    ? {
        interval: stripePrice.recurring.interval || null,
        interval_count: stripePrice.recurring.interval_count || null,
      }
    : null;

  return {
    ...metadata,
    stripe_price_id_configured: Boolean(priceIdForPlan(plan)),
    price: stripePrice
      ? {
          unit_amount: unitAmount,
          currency,
          recurring,
          display: formatStripeAmount({ unitAmount, currency, recurring }),
        }
      : null,
    unavailable_reason: error || null,
  };
}

router.get("/prices", async (_req, res) => {
  if (!config.billing.enabled) {
    return res.status(403).json({ error: "Billing is disabled", code: "billing_disabled" });
  }

  const plans = [];

  for (const plan of VALID_PLANS) {
    const priceId = priceIdForPlan(plan);
    if (!stripe) {
      plans.push(publicPriceShape(plan, null, "stripe_not_configured"));
      continue;
    }
    if (!priceId) {
      plans.push(publicPriceShape(plan, null, "stripe_price_id_missing"));
      continue;
    }

    try {
      const stripePrice = await stripe.prices.retrieve(priceId);
      plans.push(publicPriceShape(plan, stripePrice));
    } catch (err) {
      logger.warn("Stripe price lookup failed", { plan, err: err.message });
      plans.push(publicPriceShape(plan, null, "stripe_price_lookup_failed"));
    }
  }

  res.json({
    contract_version: "stripe-prices.v1",
    generated_at: new Date().toISOString(),
    source: stripe ? "stripe" : "unconfigured",
    plans,
  });
});

router.post("/checkout", requireAuth, async (req, res, next) => {
  if (!config.billing.enabled) {
    return res.status(403).json({ error: "Billing is disabled", code: "billing_disabled" });
  }

  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

    const { plan } = req.body || {};
    if (!VALID_PLANS.has(plan)) {
      return res.status(400).json({ error: "plan must be 'monthly' or 'season'" });
    }

    const userId  = req.user.id;
    const email   = req.user.email;
    const priceId = priceIdForPlan(plan);

    if (!priceId) {
      logger.error("Missing Stripe price ID for plan", { plan });
      return res.status(500).json({ error: "Server price config missing" });
    }

    await ensureAppUser(req.user);

    const session = await stripe.checkout.sessions.create({
      mode:                 plan === "season" ? "payment" : "subscription",
      payment_method_types: ["card"],
      customer_email:       email,
      line_items:           [{ price: priceId, quantity: 1 }],
      metadata:             { userId, plan },
      success_url:          `${config.appBaseUrl}/account?subscribed=true`,
      cancel_url:           `${config.appBaseUrl}/account?cancelled=true`,
      ...(plan === "monthly" && {
        subscription_data: {
          trial_period_days: 7,
          metadata: { userId, plan },
        },
      }),
    });

    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

router.post("/portal", requireAuth, async (req, res, next) => {
  if (!config.billing.enabled) {
    return res.status(403).json({ error: "Billing is disabled", code: "billing_disabled" });
  }

  try {
    if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

    const sub = await subscriptionSvc.getByUserId(req.user.id);
    if (!sub?.stripe_customer_id) {
      return res.status(404).json({ error: "No subscription found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${config.appBaseUrl}/account`,
    });
    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

module.exports = { router, webhookRouter };
