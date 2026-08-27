# B2-D3-S2 — founder deploy note

**Date:** 2026-08-26
**Written by:** Claude, unattended backend session
**Status of this note:** preparation only. **Nothing was deployed. Nothing was merged.**

---

## The short version

The thing `B2-D3-S2` was created to deploy is **already deployed**. Its
`Done when:` asks for `Direction/release_readiness.md` §"Not Deployed / Not
Merged" to be empty, and every item in that section has been on `main` since
early June — one of them is answering from production right now. That section is
now empty, with the per-item evidence recorded in it.

So the original deploy step for `B2-D3-S2` **has nothing to carry.** What is
waiting for you instead is this session's *new* backend work.

## What actually deploys

One PR from `feat/m9-backend-gap-closure`. It is **backend-only** and adds five
endpoints plus the A6 scoring work:

| Route | What it serves |
|---|---|
| `GET /api/leagues` | team/league switcher directory |
| `POST /api/leagues/active` | set the active league |
| `GET /api/waivers/analysis` | Waiver Analysis, all three providers |
| `GET /api/start-sit/detail` | Start/Sit detail, all three providers |
| `GET /api/moves/:id` | Ledger detail |

Plus: one shared active-league resolver, the A6 scoring-contract derivation and
reconciliation, and documentation.

## What the risk actually is

**Low, and here is why, specifically — not as reassurance.**

1. **Everything new is additive.** Five new paths and one new service. No
   existing route's response shape changed.
2. **Two existing files did change behavior**, and these are where to look if
   something goes wrong:
   - `src/services/omen.js` — `pickLiveMvpConnections()` now orders by the user's
     selection first. With no selection persisted (which is the case today, see
     below) the order is **byte-for-byte the previous one**.
   - `src/routes/league.js` — same change, same "unchanged until a selection
     exists" property.
   - `src/omen_tuesday_cron.js` — `scoreMove` no longer *throws* on a
     contract-required row; it defers it and records the state. **The Tuesday
     scoring flag is `false` and this session did not touch it.** This code does
     not run in production today.
3. **No migration is applied and none is needed to deploy.** Two review-only SQL
   files exist (`sql/2026-08-26_league_selection_review.sql` and the A6 files).
   The routes detect the absent columns at runtime and degrade honestly —
   `selection_persistence: "provider_binding_only"` rather than a failure. If you
   deploy without ever applying the SQL, everything still works; the switcher
   just binds within a provider instead of across them.
4. **No dependency, package.json, secret, flag, or infrastructure change.**
5. **A7B was not touched at all.**

**The honest residual risk:** the three provider read paths are proven against
each provider's adapter with fixtures, not against a live league. Sleeper and
ESPN have real credentials behind them and could return a shape the fixtures do
not model. That is the same exposure every provider route here carries, and it is
what `M11-M1ContractProviderProof` exists for.

## What to check after deploying

In this order. Each is a single call.

1. `GET https://slopssaloon.com/api/version` still returns 200 — proves the boot
   did not regress. This is the fastest kill signal.
2. `GET /api/health` and `/api/ready` — unchanged expectations.
3. `POST /api/omen/mvp-move` with your own connected league. **This is the one
   that matters**, because it is the only *existing* recommendation path whose
   internals changed. You should get exactly what you got before.
4. `GET /api/leagues` with your bearer token. Expect your Sleeper leagues listed,
   ESPN showing `discovery: "bound_only"`, and
   `selection_persistence: "provider_binding_only"`.
5. `GET /api/waivers/analysis` and `GET /api/start-sit/detail`. **Updated
   2026-08-27:** the season floor is now cleared — production
   `GET /api/system/current-week` reports season 2026, week 1, `regular`
   (facts-of-record #10, amended by the other session). So these should return
   **real analysis**, not `off_season`. If either returns `off_season`, that is
   now a defect rather than the expected August answer.

**Rollback:** the change is additive, so reverting the merge commit is sufficient
and loses nothing but the new routes. No data is written by any of them except
`POST /api/leagues/active`, which only sets `league_id` on a connection row you
can set again from the existing connect flow.

## What is NOT in this and still needs you

- Applying any SQL. Still the gated sequence: approval → staging → verification →
  production.
- Merging the PR. It is left open deliberately.
- The A6 external blocker: ESPN needs an affirmative rights path before Omen may
  capture its complete private rule snapshot, and Yahoo needs its entitlement
  back. Both are recorded as `provider_restricted` / `pending` in code rather
  than worked around.
