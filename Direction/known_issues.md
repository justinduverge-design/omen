# Omen Known Issues

Last updated: 2026-09-06 (both 2026-09-05 outage entries reconciled — same bug, fixed)

## 🟡 OPEN — leagues that score defence or IDP cannot reach a `supported` scoring contract

**Founder, 2026-09-06:** *"We just won't support leagues or draft defensive players right now.
Plus it's beta. It's okay. We do need to add that as something that needs to be checked if we
want to support every fantasy league."*

### The distinction that matters

**These leagues still score exactly.** ESPN keys a league's rules and each player's stat line by
the same numeric `statId`, so recomputing a score is arithmetic and needs no semantic map —
verified 15/15 players to three decimals on league 13338821. What they cannot reach is a
**`supported` canonical contract**, which is what the Tuesday grading cron requires. Scoring a
league and grading a league are different capabilities, and only the second is blocked.

An `ambiguous` contract **defers** rather than guesses (`omen_tuesday_cron.js`), so the effect is a
recommendation that never receives an outcome — not a wrong one.

### Two separate causes

**1. ESPN — per-position scoring has no canonical representation.** ESPN expresses defensive
scoring as `pointsOverrides` on the same stat id: a stat worth `0` to offence and `2` to position
`16` (D/ST). Every override observed across the founder's three leagues was position 16. The
canonical contract has no position dimension, so such a rule is reported unmapped rather than
flattened to either value — flattening is the A6 defect, which is exactly "score a rule the league
did not award".

**2. Both providers — points-allowed tiers are not in the vocabulary.** Yahoo stat ids 50-56
(`Points Allowed 0`, `1-6`, `7-13`, …) and ESPN's equivalents have no `EVENT_KEYS` entry. Sleeper
reaches the same state for the same reason, so this is a vocabulary gap rather than a provider one.
Yahoo also has `Offensive Fumble Return TD` (57) and `Extra Point Returned` (82) unmapped.

Measured 2026-09-06: both of the founder's Yahoo leagues derive **22 of 33 provider rules mapped**,
`ambiguous`, unmapped `stat_50,51,52,53,55,56,57,82`.

### What closing this needs

1. A **position dimension** on a contract rule, or defence-scoped canonical event keys, so ESPN's
   `pointsOverrides` can be expressed rather than reported.
2. **Points-allowed tier events** added to `EVENT_KEYS` and mapped for all three providers —
   probably banded, like the existing field-goal bands, which already solve the identical shape.
3. **IDP** is a third case again: `SLEEPER_EVENT_MAP` carries `idp_*` keys, but neither ESPN nor
   Yahoo is mapped for them.

### Do not "fix" this by widening the map

The governing rule from `scoringContract.js` holds: **an unknown provider key is never treated as a
zero-point rule.** Naming a stat id without evidence would make these leagues report `supported`
while grading them wrong, which is strictly worse than deferring. ESPN ships ids with no labels;
Yahoo ships `stat_categories` with names and a `position_type` and is therefore the safer provider
to extend first.

## 🟡 OPEN — proxying through Cloudflare costs ~4% of requests as 522s — found and reverted 2026-09-05

**Cloudflare is live as the DNS provider. The proxy (orange cloud) is OFF for the web records,
deliberately.** `slopssaloon.com` and `www` are `dns-only` and resolve straight to `2.25.182.1`.

Nameservers moved to Cloudflare (`jasmine`/`mario.ns.cloudflare.com`) and Universal SSL issued
without incident. With the web records **proxied**, production developed an intermittent
**HTTP 522** (Cloudflare cannot reach the origin) at roughly **4% of requests** — measured
across ~90 requests in several samples, on both the apex and `www`, and still ~3% twenty
minutes after the change, so not settling propagation.

**The origin was eliminated as the cause, with evidence:**

| Test | Result |
|---|---|
| 20 HTTPS requests **direct to origin**, bypassing Cloudflare | **20/20 200** |
| 10 raw TCP connects to `2.25.182.1:443` | 10/10 ok |
| nginx error log during the failures | **nothing** — the requests never arrived |
| `TcpExtListenOverflows` / `ListenDrops` / `TCPBacklogDrop` | all **0** |
| conntrack | 211 of 262144 |
| fail2ban | one `sshd` jail, **0 banned** |
| `ufw` | plain `ALLOW` on 80/443 — no `limit` rule |
| origin certificate | valid, SANs cover **both** `slopssaloon.com` and `www` |

So the loss is **upstream of the operating system**, where the box cannot see it: Hostinger's
own network firewall (or its DDoS protection) reacting to connections from Cloudflare's many
edge IPs, or the transit path between a Cloudflare PoP and Hostinger. Reverting to `dns-only`
returned production to **40/40 clean**.

**Why reverted rather than left to investigate:** a 4% error rate is strictly worse than the
exposure the proxy was meant to fix, and the product has live beta testers with NFL Week 1 days
away. The revert is one API call to undo.

**To resume, in this order:** ask Hostinger support whether the network firewall or DDoS
protection on `2.25.182.1` throttles or drops connections from Cloudflare's IP ranges — that is
the one layer no test from inside the VPS can reach. Only then re-enable the proxy, and measure
the 522 rate again over at least 100 requests before trusting it.

**Zone settings already applied and correct for when the proxy returns** (they are inert while
`dns-only`): `ssl=strict` (was `full`, which encrypted the Cloudflare→origin hop **without
validating the certificate**), `always_use_https=on` (was off), `min_tls_version=1.2` (was
**1.0**).

**Not yet done — the origin lockdown.** Restricting Hostinger's firewall to Cloudflare IP ranges
is what makes the proxy worth having; without it the origin IP is still reachable directly. It
must not be attempted until the 522 issue is resolved, or the two failures become
indistinguishable.

### The mail records, and a correction

Cloudflare's zone import turned **proxying on for mail records**, which breaks them — a proxied
CNAME resolves to Cloudflare's anycast IPs instead of the mail host. `bounce` and `autoconfig`
were measurably returning `172.67.170.83`. Inbound mail was never affected (`MX` →
`smtp.google.com` was imported `dns-only`), but the bounce/return-path and mail autoconfig were
broken until set back to `dns-only`. **An orange cloud is only ever correct for web traffic.**

**Correction worth keeping:** the DKIM records were first reported as broken too. They were
fine. The check queried `hostingermail-a.slopssaloon.com` when the actual record is
`hostingermail-a._domainkey.slopssaloon.com` — the query was wrong, not the DNS. Same failure
shape as the NXDOMAIN mistake above: **an empty result is only evidence when you are certain you
asked the right question.**

## 🟡 OPEN — the only off-host database backup lives on a VPS scheduled to expire 2026-05-06 — noted 2026-09-05

**Not urgent. Easy to forget. Expensive if forgotten.**

KVM2 (`srv1647690`) holds the encrypted Restic repository at `/srv/restic/omen` — per Layer 3 of
the fleet spec, the **only** off-host copy of Omen's database. Hostinger reports that plan's
**auto-renewal as disabled**, scheduled to expire **2026-05-06** (~8 months of runway). Neither
VPS has Hostinger automatic snapshots enabled either, so there is no provider-side safety net
underneath it.

The founder's reasoning is sound and this is **not** a recommendation to simply renew: VPS
hosting may move to a different provider, and paying to renew a box you intend to leave is
waste. The point is narrower — **the backup repository has to move before or with that
decision, never after it.** A migration that relocates the app and leaves the backups on an
expiring box converts a planned move into an unplanned data-loss window.

Whatever is decided, one of these must be true before 2026-05-06:

1. KVM2 renews, or
2. the Restic repository has an equivalent home elsewhere, with a **restore drill proven on the
   new target** — the fleet spec's existing drill was proven against KVM2 specifically, and a
   backup that has never been restored from its new home is a hope, not a backup.

## 🟡 OPEN — one ESPN connection row has no `espn_team_id`

Surfaced 2026-09-07 by `scripts/espn-projection-live-proof.js` running over every connected ESPN
league. One row (league `2114292181`) resolves to
`status: "unavailable", unavailable_reason: "team_unknown"` and therefore `projected: null`, while
the founder's other ESPN leagues return real projections.

**The code is behaving correctly** — `matchupFromEspnSchedule` refuses to guess which side is
yours without a team id, and says so rather than picking one. But a user with that row sees a
league that never loads a matchup, for a reason no screen explains. Either the row is a stale
duplicate that should be removed, or discovery failed to bind a team id and should be re-run.

**Root cause identified 2026-09-07:** this is the same account whose ESPN credentials ESPN is
rejecting. Discovery cannot run, so nothing ever binds a team id. It should stop being a mystery
row the moment that connection is re-established — the directory now tells the user to do exactly
that. Re-check after a reconnect before treating it as a separate defect.

## 🟡 OPEN — an undrafted Sleeper league says the wrong true thing

Founder on a real device, 2026-09-07: "Sleeper doesn't display the matchup on every league, which
is funky... Oh, I think that's because that was not drafted."

That is correct behaviour reported through unhelpful copy. A league with no draft has no matchup,
so `matchupFromMatchups` returns `no_matchup` and the card reads **"No matchup scheduled for this
league this week."** True, and it made the founder work out the actual reason himself.

Sleeper's league object already carries a `status` field (`pre_draft`, `drafting`, `in_season`,
`complete`) and `sleeperOverview` **already fetches that object** for `settings.playoff_teams`, so
the information is in hand and thrown away. Saying "This league hasn't drafted yet" costs no extra
request.

Not done because it is a `league-overview.v1` contract addition, not a copy tweak: the reason has
to reach the client as data, and the other two providers need a defined answer for the same field.
Scoped, not skipped.

## 🟡 OPEN — iOS `CanvasChevronLeft` has the Android chevron's bug, and `OmenIconButton` cannot fix it

Found 2026-09-07 while fixing the Android twin; **not** fixed, to keep that session's change inside
the founder's stated Android + ESPN scope.

`Assets.xcassets/CanvasChevronLeft.imageset` strokes `#AEAEB2` — the same dark-only literal, the
same 2.12:1 in light mode, on the same back-navigation control (`SignInView` ×2, `ConnectView`).

**The interesting part is that `OmenIconButton` already tries to fix it and cannot.** It applies
`.foregroundStyle(isInteractable ? tint : OmenColor.textTertiary)` to the glyph and exposes a
`tone` enum — but the icon is rendered without `.renderingMode(.template)`, so an asset image
keeps its baked stroke and the primitive's whole tone machinery silently does nothing for it. The
tone works today only because the other call sites pass SF Symbols, which are template by default.

The fix is small and was scoped out rather than skipped: render the glyph
`.renderingMode(.template)`, add a `.secondary` tone mapping to `textSecondary`, and pass it at the
three chevron call sites. `textSecondary` dark is `#AEAEB2`, so dark stays pixel-identical.
Checked before proposing: `CanvasChevronLeft` is the **only** asset image passed to
`OmenIconButton` — the other eleven call sites use SF Symbols — so template rendering cannot
recolour a multicolour mark.

## 🟡 OPEN — the stacked Omen lockup is a dark-only asset on both platforms

Deliberately **not** fixed on 2026-09-07, because it is a brand decision and not a bug fix.

`omen_lockup_stacked.png` (Android, `drawable-nodpi`) is **100% opaque** with a corner pixel of
`#0A0A0B`; `OmenLockupStacked.imageset/omen-lockup-stacked.svg` (iOS) opens with a literal
`<rect width="700" height="430" fill="#0A0A0B"/>`. Both bake the dark background into the mark.

On a light background that renders as a **black rectangle floating on cream**. It is visible in
`android-signin-light-after.png` and `ios-signin-light-after.png` in the evidence folder above.

This was latent until 2026-09-07: both sign-in screens hardcoded a dark background, so the plate
matched the page and nobody could see it. Tokenising the background is correct and exposed it.

**The obvious fix is wrong.** Deleting the plate does not work: the wordmark is cream `#F5F0E8`,
so a transparent lockup renders cream-on-cream and the word OMEN disappears in light mode. The
plate is load-bearing. The two real options are a founder call:

- **(a)** Keep a dark plate deliberately — give it a corner radius and padding so it reads as a
  badge rather than as a clipping bug.
- **(b)** Make the wordmark theme-aware — cream in dark, near-black in light — and drop the plate.
  This is the design-system-correct answer and it costs a second brand asset.

## Security — Backend Sentry breadcrumbs do not scrub URLs (found 2026-08-17, OPEN — [#339](https://github.com/justinduverge-design/omen/issues/339))

**Severity: low–moderate. Open.** The frontend equivalent is fixed (see below); this one is not.

- `src/middleware/sentry.js`'s `scrubSentryBreadcrumb` passes `crumb.data` through `scrubValue`, which matches on **key names**. Breadcrumb URLs live under `url` / `from` / `to`, none of which are sensitive key names, so the URL **value** is never examined and any query string inside it survives — including OAuth `code` / `state`.
- The frontend fix added `scrubBreadcrumbUrls` for exactly this. The backend has no equivalent.
- **Lower severity than the frontend case** because Node breadcrumbs are less likely to carry an OAuth return URL than a browser navigation breadcrumb on the callback page. Not zero: HTTP breadcrumbs can carry outbound provider URLs.
- **Fix:** mirror `scrubBreadcrumbUrls` from `frontend/src/lib/sentry.js` into `src/middleware/sentry.js`, with a test alongside the existing `test/sentryBoot.test.js`. The backend has a real test runner, so this one can be covered directly.

## Current Context Risks

- Some historical docs may still reference retired pre-DBS paths.
- Some archive/checkpoint files describe older launch states and should not be treated as current truth.
- Justin may still rewrite `AGENT.md` and `CLAUDE.md`; until then, follow `AGENTS.md`, `AGENT.md`, `Direction/`, and `Blueprints/handoffs/`.

## Native Accessibility Risks — found 2026-08-15 during M6-ContextualHelp (contrast: [#340](https://github.com/justinduverge-design/omen/issues/340); fonts: [#338](https://github.com/justinduverge-design/omen/issues/338))

These surfaced when the first `XCUIApplication.performAccessibilityAudit()` run in this repo was
added under `OmenIOSUITests`. All three are **outside M6's scope**; none is a regression from it.

- **✅ PARTLY RESOLVED 2026-08-22 — the contextual-help tip label was the half still failing, and it was worse than "nearly".** The `accent` brass on `surface-2` in **dark mode** measured **3.68:1** (`#A67C2E` on `#2C2C2E`), well under AA's 4.5:1 — not marginal. Light mode passed at 5.70:1, so this was dark-only. It surfaced as two red `ContextualHelpAccessibilityUITests` audits on `main` that nothing in this repo recorded as red. **The element was identified from the audit's own attachment** (`Element Screenshot`, a brass "Sleeper" tip label), not guessed. **Fixed by following the same registry row the earlier fix followed** — §3.1 Tooltip/Help allows exactly `surface-2` + `text-primary`, so brass on that label was an implementation deviation rather than an approved variant, and no new token or design ratification was needed. The body had already been moved to `text-primary`; the label was the half of that fix left behind. Applied to both platforms. `ContextualHelpAccessibilityUITests` now **4 passed / 0 failed**. **The token pair below is still the open, larger issue.**
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

- **[RESOLVED 2026-08-28 — Yahoo connections are ENABLED. Do not act on this bullet; kept for provenance.]** `YAHOO_ENABLED=true` on both containers and `YAHOO_CONNECTIONS_ENABLED = true` in the frontend. The entitlement is live (see the 2026-08-28 entry at the top of this file). Original text follows. ~~Yahoo connections are paused in-product as of 2026-08-14 — this is intended, not a regression.~~ Starting a new Yahoo connection is disabled behind `YAHOO_ENABLED` (default false) because the OAuth handshake still succeeds while every Fantasy call 403s, producing a connection that reads `connected` and serves nothing. Yahoo remains visible labelled "On hold"; existing rows stay disconnectable; `/api/yahoo/callback` and `/api/yahoo/access-probe` are deliberately left un-gated. Full rationale and the one-flag re-enable procedure are in `Direction/decision_log.md` (2026-08-14), `P1-YahooReauth`, and issue [#308](https://github.com/justinduverge-design/omen/issues/308). **Do not "fix" this by re-enabling the button** — the entitlement below is still the blocker.
- **[RESOLVED 2026-08-28 — access GRANTED, verified live: 200 on `/game/nfl` and `/users;use_login=1/games` from inside `omen_api`. Issue #308 closed. Do not act on this bullet; kept for provenance.]** Original text follows. ~~Yahoo's API access is refused at the app-entitlement level (verified live 2026-08-13).~~ This supersedes the token-level diagnosis below as the *active* blocker. After the P1-Yahoo fixes shipped (PRs #291–#293, #295), a temporary access probe (`GET /api/yahoo/access-probe`, PR #296) ran four Yahoo calls of increasing specificity against a **freshly issued** token on **updated** production credentials. **All four returned 403 — including `/game/nfl`, which is public game metadata requiring no user scope at all.** That rules out, with evidence: stale/expired tokens (fresh reconnect), a dead user grant (public data needs none), the query shape (simplest call fails identically), and wrong client credentials (those fail earlier at authorize with `invalid_client`; the OAuth handshake succeeds). **The remaining explanation is that the Yahoo app whose credentials are deployed does not hold Fantasy Sports API entitlement.** Yahoo requires a separate reviewed application (`https://sports.yahoo.com/developer/access/`) beyond checking the Fantasy Sports permission box on the app — so either that approval is pending, or it belongs to a different app than the one deployed. **No code fix is possible;** this is founder-side on the Yahoo developer account. Re-run the probe endpoint to re-verify once resolved.
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
- **Tuesday scoring is held after A4 outran O2 and A6 persistence proved unsafe.** On 2026-08-26 the founder authorized a cron-only safety hold. Production now has both `OMEN_CRON_SCORING_ENABLED=false` and `CORVUS_CRON_SCORING_ENABLED=false`; `omen_cron` was recreated healthy and the API/database were untouched by the hold. Keep A4 open until the A6 repair is deployed and proven on new rows and O2 is evidenced.
- **The nflverse release path was retired upstream and Omen was still pointed at it (found and fixed 2026-08-15, `A5-NflversePath`).** The cron fetched `.../releases/download/player_stats/player_stats_<season>.csv`. nflverse reorganized: the `player_stats` tag stopped receiving new seasons after **2024**, and weekly stats now ship under the `stats_player` tag as `stats_player_week_<season>.csv`. The old path 404s for **2025 as well as 2026** — so this was never only a "current season not published yet" condition, which is how #263 and `A5` both described it. **The dangerous interaction:** the #302 fix below (correctly) turned a 404 into a silent deferral, so a permanently-404ing URL would have deferred every move all season and reported healthy — `failed=0`, no error, no alert. Corrected path verified live (`stats_player_week_2025.csv`, 8.6 MB, required columns present); suite **537/537**. `season_type` is now required and filtered to `REG`, because nflverse ships `REG` 1–18 and `POST` 19–22 in one file and never ships `PRE`, while a preseason-carrying source would collide preseason week N with regular week N.
- **`matchupService.js` (DvP matchup context) had the identical retired-URL bug, missed by the `A5-NflversePath` fix above because that fix only touched the cron (found and fixed 2026-08-18, prompted by a founder question asking how the earlier fix could be trusted for 2026).** A repo-wide sweep for every nflverse URL-construction site (not just the two already known) found exactly one more: `matchupService.js` was still building `player_stats_<season>.csv` under the dead `player_stats` tag — confirmed 404 directly, not assumed. Fixed to the same `stats_player_week_<season>.csv` path the cron already proved, and `season_type` filtering added (was previously absent entirely, so a fix that stopped there would have started silently mixing playoff games into a "regular-season defense tendency" average). **A second, more serious bug surfaced only by testing the fix against the real live file rather than hand-written fixtures:** `matchupService.js`'s CSV parser used naive `line.split(",")`, but nflverse's real rows carry a quoted `headshot_url` field containing an unescaped comma (Cloudinary transform params, e.g. `"...f_auto,q_auto/..."`), which silently shifts every later column — `season`, `week`, `season_type`, `opponent_team`, `fantasy_points` — off by one for every row. This was not hypothetical: a real query (`SF`, `WR`, week 10, 2025) returned `null` against the live file even after the URL fix, which is what surfaced it. The cron's own `parseCsvLine` already handles this correctly (proven, already in production) and was ported in rather than reinvented. Re-verified against live data post-fix: `SF` allows `WR`s an average of 7.3 points across 41 real samples ("tough"), no longer `null`. Full backend suite **566/566**. **Carry forward: whichever of these two files is touched next when nflverse changes something again, check the other one too** — this is the second time a real fix shipped to one nflverse consumer while an identical-shaped consumer sat unfixed a few files away.
- **Scoring-format population remains a live-season verification gate (original defect found 2026-08-15, tracked as `A6-MovesScoringFormat`).** The production read found one pending historical row with every A6 field null and no rows created after the migration. Source inspection proved the live route never persisted recommendations and feedback upserts omitted every scoring field, so Standard and Half-PPR rows could fall through to PPR. The branch repair now persists issued recommendations, marks direct feedback rows fail-closed, and leaves unknown provider formats null; it is not production behavior until merged/deployed. A6 remains blocked by lawful provider-rule capture/reconciliation and new-row production proof.
- **Pre-season nflverse absence no longer fails a move (fixed 2026-08-14, PR [#302](https://github.com/justinduverge-design/omen/pull/302), closes #263).** nflverse publishes `player_stats_<season>.csv` only once a season is under way; before that the 404 was counted as a *failed* pending move, which is what produced `archived=0 scored=0 failed=1` in the 2026-08-02 dry run. A 404 now returns an explicit deferred marker: no Redis write, no Supabase write, the move stays pending and retries on a later run, and `runScoring` reports a `deferredCount`. Every non-404 status, malformed CSV, and empty score map for a published season still fails closed.
- **[CORRECTED 2026-08-19 — the entry was stale.]** This previously read "Legacy src/omen_gdpr.js (retired 2026-07-13) remains present". That file was deleted by PR [#119](https://github.com/justinduverge-design/omen/pull/119) ("retire orphan gdpr") and **was never mounted**, so removing it cost no capability. The live privacy surface is `src/routes/userPrivacy.js`, mounted at `src/server.js:216` under `/api/user`, exposing `export`, `delete` (confirmation phrase `"DELETE MY OMEN DATA"`), `consent`, and `legal-acceptance` — all behind `requireAuth`, covered by `test/userPrivacyRoute.test.js` and `test/userPrivacyIsolation.test.js`. **These are technical mechanisms only; this is not a statement of legal compliance**, which depends on policy wording and retention terms and is not an engineering determination.

## Figma / Design-House Notes

- **Enumerate Figma pages with `use_figma`, not `get_metadata` alone (found 2026-07-20).** A no-`nodeId` `get_metadata` call on `mWjrAKPi4JSIP5lAmGAtB3` returned only the first page (`00 — Start Here`), which briefly read as "foundation boards missing." A `use_figma` read of `figma.root.children` confirmed all seven pages and the M1-F/M2-F boards (`13:2`, `14:2`, `17:12`, `17:13`) are present as the registry claims. Confirm page inventory via `figma.root.children` before concluding anything is missing.

## Documentation Risks

- Current context should come from `Direction/` and `Blueprints/handoffs/`.
- Archive and historical handoffs are reference-only unless Justin reactivates them.
- Root SLOPS agent files may still need route cleanup after Justin's rewrite.
- Older handoff sections may preserve historical contract examples; the current backend truth is the 2026-05-26 contract section in `Blueprints/handoffs/backend-to-frontend.md`.
- `.agents/skills/run-slops-saloon/driver.cjs`'s H1 assertion (`Know the move`) is stale against `Landing.jsx`'s Phase 1.10B copy (`See the result before it happens.`, shipped 2026-06-25); found 2026-07-05, not fixed (out of scope for the tooling task that found it).
- `.agents/skills/run-slops-saloon/driver_espn_recovery.cjs` currently times out — it never seeds `omen.onboarding.done`, so `ProtectedRoute.jsx`'s onboarding gate (added after this driver was written) redirects it to `/onboarding` instead of `/account`; found 2026-07-05, not fixed on that file (the generalized replacement below closes the root cause for new work).

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


## Resolved issues

Every fixed, resolved, and closed entry moved to `Direction/known_issues-resolved.md` on
2026-09-12 — roughly 13,000 tokens that every session was reading before it could pick a task.
They are kept, not deleted: a resolved issue is the best record of how a class of defect behaves,
and more than one here has been re-opened. Read it when a symptom looks familiar.

