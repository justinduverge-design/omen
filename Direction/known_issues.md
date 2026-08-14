# Omen Known Issues

Last updated: 2026-08-14

## Current Context Risks

- Some historical docs may still reference retired pre-DBS paths.
- Some archive/checkpoint files describe older launch states and should not be treated as current truth.
- Justin may still rewrite `AGENT.md` and `CLAUDE.md`; until then, follow `AGENTS.md`, `AGENT.md`, `Direction/`, and `Blueprints/handoffs/`.

## Product Risks

- Unified Omen recommendation contract is now decided: `POST /api/omen/mvp-move` is canonical, `POST /api/optimizer/mvp-move` stays retired, and recovery analytics waits until after B2/B4 stabilize final state names and real-account QA.
- Load testing for Omen, Trade Analyzer, and dashboard summary is still pending; local script exists.

## Backend / Data Risks

- **Yahoo's API access is refused at the app-entitlement level (verified live 2026-08-13).** This supersedes the token-level diagnosis below as the *active* blocker. After the P1-Yahoo fixes shipped (PRs #291–#293, #295), a temporary access probe (`GET /api/yahoo/access-probe`, PR #296) ran four Yahoo calls of increasing specificity against a **freshly issued** token on **updated** production credentials. **All four returned 403 — including `/game/nfl`, which is public game metadata requiring no user scope at all.** That rules out, with evidence: stale/expired tokens (fresh reconnect), a dead user grant (public data needs none), the query shape (simplest call fails identically), and wrong client credentials (those fail earlier at authorize with `invalid_client`; the OAuth handshake succeeds). **The remaining explanation is that the Yahoo app whose credentials are deployed does not hold Fantasy Sports API entitlement.** Yahoo requires a separate reviewed application (`https://sports.yahoo.com/developer/access/`) beyond checking the Fantasy Sports permission box on the app — so either that approval is pending, or it belongs to a different app than the one deployed. **No code fix is possible;** this is founder-side on the Yahoo developer account. Re-run the probe endpoint to re-verify once resolved.
  - **Narrowed 2026-08-13 (same session).** The "different app" branch is **eliminated**: the deployed `YAHOO_CLIENT_ID` was decoded (Yahoo embeds the App ID inside the client id as base64 `ai=<AppID>`) and resolves to **`ZcZJXm8V` — "SlopsSaloon Fanatasy Football MVP"**, which the founder confirmed by screenshot *does* have `Fantasy Sports - Read` checked, `Confidential Client` selected, and redirect URI `https://slopssaloon.com/api/yahoo/callback` matching Omen exactly. A second Yahoo app exists (`3GnEYhVE`, "Omen") whose permissions are OpenID + **TW Auction** with no fantasy scope, but it is **not** the deployed one. So: right app, right checkbox, right redirect, right requested scope (`openid fspt-r`), successful handshake — and still a blanket 403. **The checkbox is a request, not a grant.** Yahoo grants Fantasy Sports API access through a separately reviewed application (`https://sports.yahoo.com/developer/access/`); their docs state a checked-but-unapproved app returns exactly this 403. The founder's earlier Fantasy API approval most likely attached to the **previous app, which was deleted** — deleting it destroyed the grant, and the replacement app needs its own approval. **Action: re-apply for Fantasy Sports API access for app `ZcZJXm8V`.**
- **[SUPERSEDED — historical, retained for provenance]** **Yahoo's stored OAuth token is currently unusable (verified live 2026-08-11).** *This token-level diagnosis was correct at the time but is no longer the active fault; the entitlement finding above replaced it on 2026-08-13, and a fresh token has since been issued. Do not act on this entry.* `GET /api/platforms` reports `yahoo: connected, 1 league`, so the `platform_connections` row is active with a valid league id — but `/api/dashboard/summary` returns `waiver_wire: "needs_platform"`, a branch reachable only when `hasUsableYahooToken()` fails. Per `src/services/omenReadiness.js:8-14` that means `token_secret_id` is absent or `token_expires_at` has passed. **"Connected" in the platforms payload does not mean "usable"** — the two answer different questions, and reading the first as the second is what let this sit unnoticed. Tracked as `P1-YahooReauth`. Yahoo API access was separately re-approved in early 2026-08.
- ~~**Waiver readiness is hardcoded to Yahoo (verified live 2026-08-11).**~~ **RESOLVED — verified against `main` 2026-08-14.** `buildWaiverTool()` in `src/routes/dashboard.js` now computes readiness from `activeRows.some(isOmenReadyConnection)`, the same shared predicate `omen_of_the_week` uses; no Yahoo-specific branch remains in the gate. `test/dashboardSummary.test.js` proves `waiver_wire: "ready"` for a Sleeper-only user and for an ESPN-only user, and the full suite passes 530/530. The ESPN (#266) and Sleeper (#259) waiver work is reachable. **This entry was stale for an unknown stretch** — the fix landed and nothing updated the ledger, which is exactly the failure mode that makes a known-issues file untrustworthy. Kept struck-through rather than deleted so the correction is traceable.
- Yahoo live features depend on valid OAuth tokens and usable Yahoo league ids.
- ESPN remains high-value and fragile because it depends on user-provided cookies.
- ESPN connect input normalization is prepared locally but not production behavior until deployed.
- Sleeper/ESPN live Omen code paths are wired but still need real-account staging QA before public claims.
- Docs now treat dashboard `ready` as the call gate for usable Yahoo, Sleeper, or ESPN context; real-account QA remains required before public provider-depth claims.
- ADP and provider-backed data should be verified before launch claims.
- Legacy API files remain mounted and should be handled carefully.
- Tuesday scoring is executable but intentionally gated behind `OMEN_CRON_SCORING_ENABLED=true` until production scoring/provider validation is complete.
- **Pre-season nflverse absence no longer fails a move (fixed 2026-08-14, PR [#302](https://github.com/justinduverge-design/omen/pull/302), closes #263).** nflverse publishes `player_stats_<season>.csv` only once a season is under way; before that the 404 was counted as a *failed* pending move, which is what produced `archived=0 scored=0 failed=1` in the 2026-08-02 dry run. A 404 now returns an explicit deferred marker: no Redis write, no Supabase write, the move stays pending and retries on a later run, and `runScoring` reports a `deferredCount`. Every non-404 status, malformed CSV, and empty score map for a published season still fails closed.
- Legacy `src/omen_gdpr.js` remains present with historical account-deletion copy; the mounted `/api/user` route is `src/routes/userPrivacy.js` and uses `"DELETE MY OMEN DATA"`.

## Figma / Design-House Notes

- **Enumerate Figma pages with `use_figma`, not `get_metadata` alone (found 2026-07-20).** A no-`nodeId` `get_metadata` call on `mWjrAKPi4JSIP5lAmGAtB3` returned only the first page (`00 — Start Here`), which briefly read as "foundation boards missing." A `use_figma` read of `figma.root.children` confirmed all seven pages and the M1-F/M2-F boards (`13:2`, `14:2`, `17:12`, `17:13`) are present as the registry claims. Confirm page inventory via `figma.root.children` before concluding anything is missing.

## Documentation Risks

- Current context should come from `Direction/` and `Blueprints/handoffs/`.
- Archive and historical handoffs are reference-only unless Justin reactivates them.
- Root SLOPS agent files may still need route cleanup after Justin's rewrite.
- Older handoff sections may preserve historical contract examples; the current backend truth is the 2026-05-26 contract section in `Blueprints/handoffs/backend-to-frontend.md`.
- `.agents/skills/run-slops-saloon/driver.cjs`'s H1 assertion (`Know the move`) is stale against `Landing.jsx`'s Phase 1.10B copy (`See the result before it happens.`, shipped 2026-06-25); found 2026-07-05, not fixed (out of scope for the tooling task that found it).
- `.agents/skills/run-slops-saloon/driver_espn_recovery.cjs` currently times out — it never seeds `omen.onboarding.done`, so `ProtectedRoute.jsx`'s onboarding gate (added after this driver was written) redirects it to `/onboarding` instead of `/account`; found 2026-07-05, not fixed on that file (the generalized replacement below closes the root cause for new work).

## Resolved Gaps

- **"No authenticated screenshot — Supabase sandbox limitation" is resolved**, not an unfixable constraint. Five past phases (1.5d, 1.7, 1.8, 1.12, 2.18) each independently hit and documented this gap because the fix existed but was undocumented and hardcoded to one page. `.agents/skills/run-slops-saloon/driver_protected_route.cjs` (+ `lib/authBypass.cjs`) now generalizes it to any `ProtectedRoute`-gated route with zero real Supabase credentials, zero backend, and zero network call. See `.agents/skills/run-slops-saloon/SKILL.md` ("Authenticated protected-route screenshots") before writing "known gap" for this again — add a `routes/<id>.cjs` config instead.

## Do Not Touch Without Approval

- `.env` or secrets.
- DNS, SSL, Nginx, or Oracle service config.
- Supabase migrations or production data.
- Stripe production behavior.
- Package files or dependency upgrades.
- Deployment workflow changes, except already-approved local hardening gates.

## Operating Loop (added 2026-06-04)

- Build loop is set up: `Direction/agent_inbox.md` (single active task) + `Blueprints/prompts/kickoff-l2.md` + `Blueprints/definition-of-done.md`. Operator steps in `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.
- `agent_inbox.md` was stale (old AGENT.md/CLAUDE.md rewrite request) and is now the single active-task pointer.
- `Direction/agent_inbox.md` is the active task slot and `Direction/current_sprint.md` is queue/history. `Blueprints/handoffs/*` is the active contract bus; `Blueprints/agent_handoff.md` should be treated as historical session-log material if encountered.
