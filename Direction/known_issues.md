# Omen Known Issues

Last updated: 2026-08-19

## ✅ Reconciled against GitHub — 2026-08-19

Founder-requested pass, run after `O7` closed. Every entry was checked against `main`, merged PRs, and open issues rather than re-read. **Entries now carry a GitHub issue number where one exists, so this file and GitHub say the same thing.**

**What the pass found.**

- **One contradiction, in the wrong direction.** `facts-of-record.md` #11 claimed Yahoo API access *"was re-approved… the developer application is live again"* while this file had recorded the opposite since 2026-08-13 — a live-verified 403 on all four probe calls, entitlement refused, issue [#308](https://github.com/justinduverge-design/omen/issues/308) open. The optimistic version was sitting in the **higher-authority** file that agents read first. Corrected in `facts-of-record.md`, with the provenance kept rather than overwritten.
- **One entry describing code that no longer exists.** `src/omen_gdpr.js` was listed as "remains present"; it was deleted by PR [#119](https://github.com/justinduverge-design/omen/pull/119) ("retire orphan gdpr") — it was an orphan, never mounted, so no capability was lost. Corrected below.
- **Four real issues that lived only in this file** are now GitHub issues: [#338](https://github.com/justinduverge-design/omen/issues/338) fonts, [#339](https://github.com/justinduverge-design/omen/issues/339) backend Sentry breadcrumbs, [#340](https://github.com/justinduverge-design/omen/issues/340) contrast, [#341](https://github.com/justinduverge-design/omen/issues/341) Android status bar.
- **This file was more honest than the sprint queue.** Every entry marked FIXED or RESOLVED here was verified genuinely fixed against `main`. The stale record was `S8` in `current_sprint.md`, which advertised "six open Dependabot PRs" when there were **zero** — all six resolved on 2026-08-11 exactly as S8's own verdicts prescribed, and the status never advanced.

**The gap that allowed it, stated plainly.** `scripts/check-sprint-staleness.js` compares the sprint queue against merged PRs. **Nothing compares this file against `facts-of-record.md`, and nothing compares either against GitHub issues.** Yahoo had an open issue, a facts-of-record entry, and an entry here, and no mechanism ever looked at all three together. The contradiction was not missed through carelessness — nothing was watching. Until a checker exists, this reconciliation must be re-run by hand: **treat it as recurring, not one-off.**

**Rule going forward:** an entry here that is real and unresolved gets a GitHub issue, and the issue number goes in the heading. If it is not worth an issue, it is not worth an entry.

## Security — Backend Sentry breadcrumbs do not scrub URLs (found 2026-08-17, OPEN — [#339](https://github.com/justinduverge-design/omen/issues/339))

**Severity: low–moderate. Open.** The frontend equivalent is fixed (see below); this one is not.

- `src/middleware/sentry.js`'s `scrubSentryBreadcrumb` passes `crumb.data` through `scrubValue`, which matches on **key names**. Breadcrumb URLs live under `url` / `from` / `to`, none of which are sensitive key names, so the URL **value** is never examined and any query string inside it survives — including OAuth `code` / `state`.
- The frontend fix added `scrubBreadcrumbUrls` for exactly this. The backend has no equivalent.
- **Lower severity than the frontend case** because Node breadcrumbs are less likely to carry an OAuth return URL than a browser navigation breadcrumb on the callback page. Not zero: HTTP breadcrumbs can carry outbound provider URLs.
- **Fix:** mirror `scrubBreadcrumbUrls` from `frontend/src/lib/sentry.js` into `src/middleware/sentry.js`, with a test alongside the existing `test/sentryBoot.test.js`. The backend has a real test runner, so this one can be covered directly.

## Security — Frontend Sentry did not scrub OAuth `code` / `state` (found 2026-08-17) — ✅ FIXED

**Severity was moderate. Fixed 2026-08-17**, verified live same day. Found during `O1b` verification against the new Sentry account — invisible until a real event was exercised through the client.

**Original defect:** `frontend/src/lib/sentry.js:61` scrubbed query parameters using `SENSITIVE_KEY_PATTERN` (`/password|cookie|token|secret|swid|espn_s2|vault/i`), which contains **no `code` and no `state`**, while the backend had a dedicated `SENSITIVE_QUERY_PARAMETER_PATTERN` including `^(code|state)$`. Reachable via Yahoo and Discord OAuth returns, which land on frontend routes carrying `?code=&state=`. `Direction/decision_log.md` (OAuth-artifacts entry) and `Direction/sprints_completed.md:134` both asserted the covered behavior without distinguishing the two halves — **the documentation was as much the risk as the code**, since it would let a reviewer conclude the path was covered.

**Fix:** `frontend/src/lib/sentry.js` gained its own `SENSITIVE_QUERY_PARAMETER_PATTERN` mirroring `src/middleware/sentry.js:8`, plus `scrubBreadcrumbUrls` covering the `url` / `from` / `to` breadcrumb fields — a second gap found while fixing the first, on the *same* reachable page, so fixing only `request.url` would have left the leak open.

**Verification** (live client `beforeSend` / `beforeBreadcrumb`, the same method that found it): `?code=AUTHCODE123&state=ST8&espn_s2=LEAK&team=Ravens` → all three sensitive params `[scrubbed]`, benign `team=Ravens` preserved; all three breadcrumb URL fields scrubbed; **zero leaks** across the whole probe set. Regressions held: ESPN-credential URLs still drop the event entirely, console breadcrumbs still drop, relative URLs still scrub correctly, query-less URLs pass through untouched. Backend `npm test` **563/563**, frontend build clean, `npm audit` 0.

**Standing lesson:** both the 2026-07-24 code review and the Phase 1.2 handoff called this scrubbing complete, and both were written by *reading* the code. One synthetic payload through the shipping function surfaced the gap in minutes. For any claim of the form "sensitive data never reaches X", **execute it**.

## Current Context Risks

- Some historical docs may still reference retired pre-DBS paths.
- Some archive/checkpoint files describe older launch states and should not be treated as current truth.
- Justin may still rewrite `AGENT.md` and `CLAUDE.md`; until then, follow `AGENTS.md`, `AGENT.md`, `Direction/`, and `Blueprints/handoffs/`.

## Native Accessibility Risks — found 2026-08-15 during M6-ContextualHelp (contrast: [#340](https://github.com/justinduverge-design/omen/issues/340); fonts: [#338](https://github.com/justinduverge-design/omen/issues/338))

These surfaced when the first `XCUIApplication.performAccessibilityAudit()` run in this repo was
added under `OmenIOSUITests`. All three are **outside M6's scope**; none is a regression from it.

- **`text-secondary` on `surface-2` is 4.43:1 in light mode — under AA (4.5:1).** Caught by the audit
  as "Contrast nearly passed" on the new contextual-help surface, and fixed *there* by following the
  registry §3.1 Tooltip/Help row, which specifies `surface-2` + **`text-primary`**. **The token pair
  itself is still available to every other component**, and any existing screen that puts secondary
  text on a surface-2 background has the same defect. Worth a design-system sweep and possibly a
  darker `text-secondary` in light mode.
- **The Command Center screen fails the audit's `contrast` check outright** — a stronger verdict than
  the "nearly passed" above, so it is a separate, larger gap. `ContextualHelpAccessibilityUITests.testCommandCenterScreenAuditRecordsTwoPreExistingFailures`
  pins it under `XCTExpectFailure`, so the day it is fixed that test fails loudly and can be retired.
- **`OmenTypography` is invisible to the audit's Dynamic Type check, app-wide.** Every role is built
  as `Font(UIFontMetrics.scaledFont(for:))`, which resolves a point size at construction rather than
  vending a text-style-relative font, so the audit reports "Dynamic Type font sizes are unsupported"
  on every screen. **This is a mechanism finding, not a functional one:** the same surface was
  rendered at `UICTContentSizeCategoryM` and `UICTContentSizeCategoryAccessibilityXXXL` and the text
  scales and reflows correctly, because SwiftUI recomputes the metric-scaled font when the category
  changes. The `.dynamicType` category is therefore excluded from the M6 audit with that reasoning
  recorded at the exclusion site. Revisit if the locked font families ever land.

- **The locked font families were never acquired, so the app ships in system fallbacks (found 2026-08-19, OPEN — [#338](https://github.com/justinduverge-design/omen/issues/338)).** `Alegreya Sans` / `Alegreya` / `DM Mono` are the locked families, and **there are no font files in this repo** — no `.ttf`, `.otf`, or `.woff*` anywhere. Both platforms resolve to system stand-ins: iOS `.default`/`.serif`/`.monospaced` (SF Pro / **New York** / SF Mono), Android `SansSerif`/`Serif`/`Monospace`. The sans-heading, serif-body contrast visible in the product is the intended *shape* of the three-role system rendered in the wrong typefaces. **Not a regression and not an overridden decision** — the build brief §7 explicitly excludes acquisition (*"M2 and a separately approved asset/source decision own those actions"*), so it was correctly deferred to a founder decision and then never re-raised. The swap seam held: `OmenFontDesign` (iOS) / `OmenFontFamilies` (Android) are the only places a family is named. Alegreya and DM Mono are both SIL Open Font License, so this is likely download-and-commit rather than a purchase. **Landing this is also the stated trigger for revisiting the Dynamic Type finding above.**

## Native Accessibility / Appearance — Android light-mode status bar is washed out (found 2026-08-19, OPEN — [#341](https://github.com/justinduverge-design/omen/issues/341))

Found while rendering O7's forced-update screen on the `medium_phone` emulator. In **light mode**
the system status bar draws its clock and icons in **white on `#FAFAF9`**, which is very close to
illegible. The app never sets the light-appearance status-bar flag for its edge-to-edge surface, so
the icons stay in their dark-mode treatment regardless of theme.

**This is app-wide and not specific to any one screen** — confirmed by rendering the already-shipped
`command-center.disconnected` scenario in the same light mode and observing the identical washed-out
bar. It was deliberately not fixed inside O7 (out of that item's scope), and it predates O7.

Evidence: `Direction/reviews/evidence/2026-08-19-o7/android-forced-update-light.png` shows the gate
screen; the Command Center comparison capture was taken in the same session. Worth its own item —
it affects every light-mode screen on Android.

## Native Copy Risks

- **[CORRECTED 2026-08-15 — this is not a defect.]** During M6 verification the Command Center
  matchup hero was read off the live TalkBack tree as `"No matchup yet — connect Sleeper or ESPN to
  see your team's week."` and was **wrongly** filed here as a false capability claim. **ESPN is
  connectable and we want people to connect it** — the connection is made once on the Omen website
  and then shows up in the app. What native lacks is only the in-app credential handoff, and the
  in-app path already handles that honestly: choosing ESPN in Connect reaches
  `ConnectProvider.espn` → `.useWeb`, which routes the person to the website rather than dead-ending.
  So the hero's advice is actionable as written. The only available improvement is naming *where*
  ESPN connects, which is a copy nicety, not a correctness bug — **do not "fix" this by removing
  ESPN from the copy.**

## Product Risks

- Unified Omen recommendation contract is now decided: `POST /api/omen/mvp-move` is canonical, `POST /api/optimizer/mvp-move` stays retired, and recovery analytics waits until after B2/B4 stabilize final state names and real-account QA.
- Load testing for Omen, Trade Analyzer, and dashboard summary is still pending; local script exists.

## Backend / Data Risks

- **Yahoo connections are paused in-product as of 2026-08-14 — this is intended, not a regression.** Starting a new Yahoo connection is disabled behind `YAHOO_ENABLED` (default false) because the OAuth handshake still succeeds while every Fantasy call 403s, producing a connection that reads `connected` and serves nothing. Yahoo remains visible labelled "On hold"; existing rows stay disconnectable; `/api/yahoo/callback` and `/api/yahoo/access-probe` are deliberately left un-gated. Full rationale and the one-flag re-enable procedure are in `Direction/decision_log.md` (2026-08-14), `P1-YahooReauth`, and issue [#308](https://github.com/justinduverge-design/omen/issues/308). **Do not "fix" this by re-enabling the button** — the entitlement below is still the blocker.
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
- **The nflverse release path was retired upstream and Omen was still pointed at it (found and fixed 2026-08-15, `A5-NflversePath`).** The cron fetched `.../releases/download/player_stats/player_stats_<season>.csv`. nflverse reorganized: the `player_stats` tag stopped receiving new seasons after **2024**, and weekly stats now ship under the `stats_player` tag as `stats_player_week_<season>.csv`. The old path 404s for **2025 as well as 2026** — so this was never only a "current season not published yet" condition, which is how #263 and `A5` both described it. **The dangerous interaction:** the #302 fix below (correctly) turned a 404 into a silent deferral, so a permanently-404ing URL would have deferred every move all season and reported healthy — `failed=0`, no error, no alert. Corrected path verified live (`stats_player_week_2025.csv`, 8.6 MB, required columns present); suite **537/537**. `season_type` is now required and filtered to `REG`, because nflverse ships `REG` 1–18 and `POST` 19–22 in one file and never ships `PRE`, while a preseason-carrying source would collide preseason week N with regular week N.
- **`matchupService.js` (DvP matchup context) had the identical retired-URL bug, missed by the `A5-NflversePath` fix above because that fix only touched the cron (found and fixed 2026-08-18, prompted by a founder question asking how the earlier fix could be trusted for 2026).** A repo-wide sweep for every nflverse URL-construction site (not just the two already known) found exactly one more: `matchupService.js` was still building `player_stats_<season>.csv` under the dead `player_stats` tag — confirmed 404 directly, not assumed. Fixed to the same `stats_player_week_<season>.csv` path the cron already proved, and `season_type` filtering added (was previously absent entirely, so a fix that stopped there would have started silently mixing playoff games into a "regular-season defense tendency" average). **A second, more serious bug surfaced only by testing the fix against the real live file rather than hand-written fixtures:** `matchupService.js`'s CSV parser used naive `line.split(",")`, but nflverse's real rows carry a quoted `headshot_url` field containing an unescaped comma (Cloudinary transform params, e.g. `"...f_auto,q_auto/..."`), which silently shifts every later column — `season`, `week`, `season_type`, `opponent_team`, `fantasy_points` — off by one for every row. This was not hypothetical: a real query (`SF`, `WR`, week 10, 2025) returned `null` against the live file even after the URL fix, which is what surfaced it. The cron's own `parseCsvLine` already handles this correctly (proven, already in production) and was ported in rather than reinvented. Re-verified against live data post-fix: `SF` allows `WR`s an average of 7.3 points across 41 real samples ("tough"), no longer `null`. Full backend suite **566/566**. **Carry forward: whichever of these two files is touched next when nflverse changes something again, check the other one too** — this is the second time a real fix shipped to one nflverse consumer while an identical-shaped consumer sat unfixed a few files away.
- **Every scored move is graded as PPR regardless of league settings (found 2026-08-15, tracked as `A6-MovesScoringFormat`).** `fetchPendingMoves` selects without `scoring` — the deployed `moves` schema has no such column — and `scoreMove` defaults an absent format to PPR. `nflverseScoresFromCsv` computes `rec_std`, `rec_half`, and `rec_ppr`; two are discarded. A standard or half-PPR league's recommendation is graded against points its league does not award. Founder-gated: fixing it adds a column to a deployed schema.
- **Pre-season nflverse absence no longer fails a move (fixed 2026-08-14, PR [#302](https://github.com/justinduverge-design/omen/pull/302), closes #263).** nflverse publishes `player_stats_<season>.csv` only once a season is under way; before that the 404 was counted as a *failed* pending move, which is what produced `archived=0 scored=0 failed=1` in the 2026-08-02 dry run. A 404 now returns an explicit deferred marker: no Redis write, no Supabase write, the move stays pending and retries on a later run, and `runScoring` reports a `deferredCount`. Every non-404 status, malformed CSV, and empty score map for a published season still fails closed.
- **[CORRECTED 2026-08-19 — the entry was stale.]** This previously read "Legacy `src/omen_gdpr.js` remains present". That file was deleted by PR [#119](https://github.com/justinduverge-design/omen/pull/119) ("retire orphan gdpr") and **was never mounted**, so removing it cost no capability. The live privacy surface is `src/routes/userPrivacy.js`, mounted at `src/server.js:216` under `/api/user`, exposing `export`, `delete` (confirmation phrase `"DELETE MY OMEN DATA"`), `consent`, and `legal-acceptance` — all behind `requireAuth`, covered by `test/userPrivacyRoute.test.js` and `test/userPrivacyIsolation.test.js`. **These are technical mechanisms only; this is not a statement of legal compliance**, which depends on policy wording and retention terms and is not an engineering determination.

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
