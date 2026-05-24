# Codex Prompt — Stripe Live Key Validation
## Prompt for: Codex
## Operation type: Read-only validation — no transactions, no mutations
## Date: 2026-05-24
## Repo: ssffmvp on Oracle VPS (not local machine)
## Run on: Oracle VPS — production env must be active

---

## Prerequisites

**This prompt must run on the Oracle VPS** where the production environment
variables are set. Running locally will fail at Step 1 because `SUPABASE_URL`
and `SUPABASE_SERVICE_KEY` are required at boot and not present in the
local dev environment.

Before running any steps, load the production env:

```bash
cd /path/to/ssffmvp       # your Oracle repo path
set -a
source .env
set +a
```

Do NOT print any values. The `set -a` / `set +a` exports all vars into the
shell environment so `require('./src/config')` picks them up. After this,
proceed with the steps below.

---

## Context

Corvus uses Stripe for Pro subscriptions. Before deploy we need to confirm:
1. The production env has live Stripe keys set (not test keys)
2. The live secret key authenticates successfully against Stripe's API
3. Both price IDs exist in the live Stripe account
4. `APP_BASE_URL` points to the production domain, not localhost

This is **read-only**. No charges, no checkout sessions, no customers, no
mutations of any kind.

---

## Scope Constraints

- Do NOT print any env var values — report presence and format prefix only
- Do NOT create Stripe resources (products, prices, customers, sessions)
- Do NOT push, deploy, or commit
- Do NOT modify any source files or `.env` files
- Do NOT run `npm start` or `node src/server.js` — use isolated validation scripts only

---

## Step 1: Confirm config loads

```bash
cd C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp
node -e "require('./src/config'); console.log('Config loaded OK')"
```

If this fails with `FATAL: missing required environment variables`, note which
vars are missing and stop — the server will not boot.

---

## Step 2: Check Stripe env var presence and format

```bash
node -e "
const c = require('./src/config');
const checks = {
  STRIPE_SECRET_KEY:       { val: c.stripe.secretKey,      prefix: 'sk_live_'  },
  STRIPE_WEBHOOK_SECRET:   { val: c.stripe.webhookSecret,  prefix: 'whsec_'    },
  STRIPE_MONTHLY_PRICE_ID: { val: c.stripe.monthlyPriceId, prefix: 'price_'    },
  STRIPE_SEASON_PRICE_ID:  { val: c.stripe.seasonPriceId,  prefix: 'price_'    },
  APP_BASE_URL:            { val: require('./src/config').appBaseUrl, prefix: 'https://' },
};
let allOk = true;
for (const [name, {val, prefix}] of Object.entries(checks)) {
  if (!val) {
    console.error('MISSING:', name);
    allOk = false;
  } else if (!val.startsWith(prefix)) {
    console.error('WRONG FORMAT:', name, '— expected prefix:', prefix, '— got prefix:', val.slice(0, prefix.length + 4) + '...');
    allOk = false;
  } else {
    console.log('OK:', name, '— prefix:', val.slice(0, prefix.length) + '...');
  }
}
if (!allOk) process.exit(1);
"
```

Stop and report if any variable is missing or has the wrong prefix (e.g.
`sk_test_` instead of `sk_live_`).

---

## Step 3: Confirm live key authenticates

```bash
node -e "
const Stripe = require('stripe');
const c = require('./src/config');
const s = new Stripe(c.stripe.secretKey, { apiVersion: '2023-10-16' });
s.balance.retrieve()
  .then(b => console.log('Stripe live key OK — available:', JSON.stringify(b.available)))
  .catch(e => { console.error('Stripe key FAILED:', e.message); process.exit(1); });
"
```

`balance.retrieve()` is a lightweight read-only call with no side effects.
A successful response confirms the key is valid and live.

---

## Step 4: Confirm price IDs exist in live account

```bash
node -e "
const Stripe = require('stripe');
const c = require('./src/config');
const s = new Stripe(c.stripe.secretKey, { apiVersion: '2023-10-16' });
Promise.all([
  s.prices.retrieve(c.stripe.monthlyPriceId)
    .then(p => console.log('MONTHLY PRICE OK —', p.id, p.currency, p.unit_amount, p.recurring?.interval || 'one-time')),
  s.prices.retrieve(c.stripe.seasonPriceId)
    .then(p => console.log('SEASON PRICE OK  —', p.id, p.currency, p.unit_amount, p.recurring?.interval || 'one-time')),
]).catch(e => { console.error('Price ID FAILED:', e.message); process.exit(1); });
"
```

This confirms both prices exist in the live account and shows their currency
and amount (safe to log — no secrets).

---

## Step 5: Verify webhook secret format

The webhook secret cannot be validated without a real Stripe event, but format
validation catches misconfigurations. This was already covered in Step 2.

Confirm: `STRIPE_WEBHOOK_SECRET` starts with `whsec_`. If yes, it is the
correct format for `stripe.webhooks.constructEvent()`.

---

## Completion Checklist

- [ ] Config loads without fatal errors
- [ ] All 4 Stripe env vars present and correct format prefix
- [ ] `APP_BASE_URL` is the production domain (not localhost)
- [ ] Live key authenticates via `balance.retrieve()`
- [ ] Both price IDs resolve in the live account
- [ ] Report the price amounts and currencies for Justin to confirm they match expected pricing

---

## Do NOT

- Do not print full env var values — prefix + `...` only
- Do not create sessions, customers, products, or charges
- Do not modify `.env` or any source files
- Do not push, deploy, or commit
- Do not run the server (`npm start`)
