"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

function loadStripeRouter({
  subscription = { stripe_customer_id: "cus_test" },
  webhookEvent = { type: "noop", data: { object: {} } },
  stripeConfig = {
    secretKey: "sk_test",
    webhookSecret: "whsec_test",
    monthlyPriceId: "price_monthly",
    seasonPriceId: "price_season",
  },
  priceLookupFailures = [],
} = {}) {
  const routePath = require.resolve("../src/routes/stripe");
  delete require.cache[routePath];

  const state = {
    checkoutPayload: null,
    portalPayload: null,
    activations: [],
    deactivations: [],
    appUsers: [],
  };

  class FakeStripe {
    constructor() {
      this.checkout = {
        sessions: {
          create: async (payload) => {
            state.checkoutPayload = payload;
            return { url: "https://stripe.example/checkout" };
          },
        },
      };
      this.billingPortal = {
        sessions: {
          create: async (payload) => {
            state.portalPayload = payload;
            return { url: "https://stripe.example/portal" };
          },
        },
      };
      this.webhooks = {
        constructEvent: () => webhookEvent,
      };
      this.subscriptions = {
        retrieve: async () => ({
          customer: "cus_test",
          status: "trialing",
          trial_end: 1780272000,
          current_period_end: 1782864000,
          metadata: { userId: "user-1", plan: "monthly" },
        }),
      };
      this.prices = {
        retrieve: async (priceId) => {
          if (priceLookupFailures.includes(priceId)) {
            throw new Error("price lookup failed");
          }
          if (priceId === "price_monthly") {
            return {
              id: "price_monthly",
              unit_amount: 900,
              currency: "usd",
              recurring: { interval: "month", interval_count: 1 },
            };
          }
          if (priceId === "price_season") {
            return {
              id: "price_season",
              unit_amount: 4900,
              currency: "usd",
              recurring: null,
            };
          }
          throw new Error("missing price");
        },
      };
    }
  }

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "stripe" && parent?.filename === routePath) {
      return FakeStripe;
    }
    if (request === "../config" && parent?.filename === routePath) {
      return {
        appBaseUrl: "https://corvus.example",
        isProd: false,
        stripe: stripeConfig,
      };
    }
    if (request === "../middleware/logging" && parent?.filename === routePath) {
      return { logger: { warn() {}, error() {}, debug() {} } };
    }
    if (request === "../middleware/auth" && parent?.filename === routePath) {
      return {
        requireAuth: (req, _res, next) => {
          req.user = { id: "user-1", email: "user@example.com" };
          next();
        },
      };
    }
    if (request === "../services/appUser" && parent?.filename === routePath) {
      return {
        ensureAppUser: async (authUser) => {
          state.appUsers.push(authUser);
        },
      };
    }
    if (request === "../services/subscription" && parent?.filename === routePath) {
      return {
        activate: async (payload) => {
          state.activations.push(payload);
        },
        deactivate: async (payload) => {
          state.deactivations.push(payload);
        },
        getByUserId: async () => subscription,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const { router, webhookRouter } = require("../src/routes/stripe");
    return { router, webhookRouter, state };
  } finally {
    Module._load = originalLoad;
  }
}

function buildWebhookApp(options = {}) {
  const app = express();
  const { webhookRouter, state } = loadStripeRouter(options);
  app.use("/api/stripe", webhookRouter);
  return { app, state };
}

function buildApp(options = {}) {
  const app = express();
  app.use(express.json());
  const { router, state } = loadStripeRouter(options);
  app.use("/api/stripe", router);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, state };
}

async function post(app, path, body) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function get(app, path) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postRaw(app, path, body = "{}") {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "test-signature",
      },
      body,
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /api/stripe/prices returns public plan pricing from configured Stripe prices", async () => {
  const { app } = buildApp();

  const res = await get(app, "/api/stripe/prices");

  assert.equal(res.status, 200);
  assert.equal(res.body.contract_version, "stripe-prices.v1");
  assert.equal(res.body.source, "stripe");
  assert.deepEqual(res.body.plans.map((plan) => plan.id), ["monthly", "season"]);
  assert.deepEqual(res.body.plans[0], {
    id: "monthly",
    label: "Monthly",
    checkout_plan: "monthly",
    checkout_mode: "subscription",
    trial_period_days: 7,
    stripe_price_id_configured: true,
    price: {
      unit_amount: 900,
      currency: "usd",
      recurring: { interval: "month", interval_count: 1 },
      display: "$9/mo",
    },
    unavailable_reason: null,
  });
  assert.equal(res.body.plans[1].price.display, "$49");
});

test("GET /api/stripe/prices reports unconfigured Stripe without side effects", async () => {
  const { app, state } = buildApp({
    stripeConfig: {
      secretKey: "",
      webhookSecret: "",
      monthlyPriceId: "",
      seasonPriceId: "",
    },
  });

  const res = await get(app, "/api/stripe/prices");

  assert.equal(res.status, 200);
  assert.equal(res.body.source, "unconfigured");
  assert.equal(res.body.plans[0].price, null);
  assert.equal(res.body.plans[0].unavailable_reason, "stripe_not_configured");
  assert.equal(res.body.plans[1].unavailable_reason, "stripe_not_configured");
  assert.equal(state.checkoutPayload, null);
  assert.equal(state.portalPayload, null);
});

test("GET /api/stripe/prices reports missing price ids per plan", async () => {
  const { app } = buildApp({
    stripeConfig: {
      secretKey: "sk_test",
      webhookSecret: "whsec_test",
      monthlyPriceId: "",
      seasonPriceId: "price_season",
    },
  });

  const res = await get(app, "/api/stripe/prices");

  assert.equal(res.status, 200);
  assert.equal(res.body.source, "stripe");
  assert.equal(res.body.plans[0].stripe_price_id_configured, false);
  assert.equal(res.body.plans[0].price, null);
  assert.equal(res.body.plans[0].unavailable_reason, "stripe_price_id_missing");
  assert.equal(res.body.plans[1].price.display, "$49");
});

test("GET /api/stripe/prices degrades per plan when Stripe lookup fails", async () => {
  const { app } = buildApp({
    priceLookupFailures: ["price_monthly"],
  });

  const res = await get(app, "/api/stripe/prices");

  assert.equal(res.status, 200);
  assert.equal(res.body.plans[0].price, null);
  assert.equal(res.body.plans[0].unavailable_reason, "stripe_price_lookup_failed");
  assert.equal(res.body.plans[1].price.display, "$49");
});

test("POST /api/stripe/checkout returns users to Account after successful checkout", async () => {
  const { app, state } = buildApp();

  const res = await post(app, "/api/stripe/checkout", { plan: "monthly" });

  assert.equal(res.status, 200);
  assert.equal(res.body.url, "https://stripe.example/checkout");
  assert.deepEqual(state.appUsers, [{ id: "user-1", email: "user@example.com" }]);
  assert.equal(state.checkoutPayload.success_url, "https://corvus.example/account?subscribed=true");
  assert.equal(state.checkoutPayload.cancel_url, "https://corvus.example/account?cancelled=true");
});

test("POST /api/stripe/portal returns users to Account after billing management", async () => {
  const { app, state } = buildApp();

  const res = await post(app, "/api/stripe/portal");

  assert.equal(res.status, 200);
  assert.equal(res.body.url, "https://stripe.example/portal");
  assert.equal(state.portalPayload.return_url, "https://corvus.example/account");
});

test("POST /api/stripe/webhook persists checkout subscription trial metadata", async () => {
  const { app, state } = buildWebhookApp({
    webhookEvent: {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_test",
          subscription: "sub_test",
          metadata: { userId: "user-1", plan: "monthly" },
        },
      },
    },
  });

  const res = await postRaw(app, "/api/stripe/webhook");

  assert.equal(res.status, 200);
  assert.deepEqual(state.activations[0], {
    userId: "user-1",
    plan: "monthly",
    stripeCustomerId: "cus_test",
    status: "trialing",
    trialEndsAt: 1780272000,
    currentPeriodEnd: 1782864000,
    expiresAt: 1782864000,
    canceledAt: null,
  });
});

test("POST /api/stripe/webhook maps payment failure to a non-subscribed state", async () => {
  const { app, state } = buildWebhookApp({
    webhookEvent: {
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_test" } },
    },
  });

  const res = await postRaw(app, "/api/stripe/webhook");

  assert.equal(res.status, 200);
  assert.deepEqual(state.deactivations[0], {
    stripeCustomerId: "cus_test",
    status: "payment_failed",
  });
});
