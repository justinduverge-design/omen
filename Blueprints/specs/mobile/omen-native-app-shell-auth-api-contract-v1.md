# Omen Native App-Shell / Auth / API Contract v1 (M0c)

**Status:** **Approved M0c contract** (Justin, 2026-07-19)
**Date:** 2026-07-19
**Owner:** Native mobile foundation
**Purpose:** Define the native app shell (navigation + environments), the auth/session contract, deep links, the safe provider-state API, idempotency, and demo mode — the concrete engineering contract deferred from the approved M0a onboarding contract.
**Applies to:** SwiftUI iPhone app and Kotlin/Jetpack Compose Android app.
**Companions:** `omen-mobile-onboarding-connection-contract-v1.md` (**Approved**), `omen-native-design-system-registry-v1.md` (**Approved**), `omen-native-mobile-foundation-v1.md` (v1), `omen-native-agent-capabilities-canvas-v1.md` (v1), `omen-native-backend-state-contract-v1.md` (M0-BE shared implementation contract).
**Grounded in backend truth:** `Blueprints/api-routes.md` (platform/connect/dashboard/omen routes), `Direction/context.md` Current Build Truth, `Direction/facts-of-record.md`.

> **Figma reality:** the Design House (`mWjrAKPi4JSIP5lAmGAtB3`) is a stub (`00 — Start Here`). This Markdown is the behavioral source of truth.

---

## 0. Altitude & boundary

M0c is a **contract**. It defines what must be true of navigation, auth, deep links, provider state, and environments. It **does not** write native code (that is M1/M2) and **does not** modify backend auth/routes/schema — where a backend change is required, it is stated as a **requirement** and routed to the backend lane via `Blueprints/handoffs/frontend-to-backend.md` (§11). No secrets, schema, deploy, or provider mechanics are changed by this document.

## 1. App shell

### 1.1 Project shape (from foundation §9)

```
mobile/
  contracts/                 # this + companion contracts
  ios/OmenIOS/   App/ · DesignSystem/ · Features/ · Core/{network,auth,models,session}
  android/       app/ · core:{network,auth,models,session,designsystem} · feature:*
```
Shared: contracts + API models. Not shared: UI. No feature module defines shadow tokens or duplicate primitives.

### 1.2 Navigation (native expression of the M0b/foundation map)

Top-level destinations (limited): **Command Center · Omen · Trade · League**. **Draft is a strong seasonal destination, not a permanent everyday tab:** it is reachable through League and promoted prominently from Command Center when the user’s league is in a draft-relevant period. **Account** (profile, connections, privacy, appearance, support, and account deletion) is reached through a contextual profile/avatar control, not top-level navigation. Everything else (provider connect, player detail, confirmation, filtering, recovery, onboarding) is a nested stack push or a sheet — never a permanent top-level tab.

| Platform | Container | Focused tasks | Back/resume |
|---|---|---|---|
| iOS | Tab bar for top-level + `NavigationStack` per tab; `.sheet` / `.fullScreenCover` for focused tasks | onboarding, connect, recovery, confirm | native swipe-back; state preserved or safely canceled |
| Android | Bottom navigation + Compose Navigation per destination; bottom sheets / dialogs for focused tasks | same | platform back + state restoration |

### 1.3 Route / destination table

| Route key | Screen (M0b map) | Auth required | Notes |
|---|---|---|---|
| `welcome` | Welcome | no | demo + get-started entry |
| `demo` | Demo Mode | no | reviewer path; no credentials |
| `auth` | Omen account | no (is the gate) | native ID-token / OTP (§2) |
| `onboarding.next` | Choose next step | yes | connect vs explore |
| `connect.choose` | Choose provider | yes | Sleeper/Yahoo/ESPN status |
| `connect.<provider>` | Connect / recover | yes | state machine (§4) |
| `command` | Command Center | yes | first useful destination |
| `omen` | Omen | yes | calls `POST /api/omen/mvp-move` |
| `trade` | Trade Room | no (public) | Trade Analyzer is free/public |
| `draft` | Draft Room | yes | Seasonal destination; reached through League and promoted from Command Center during a draft-relevant period, not a permanent tab. |
| `league` | League | yes | Roster, matchup, standings, connected-league context, and seasonal Draft entry. Fourth top-level destination. |
| `account` | Account/Connections | yes | Reached from a contextual profile/avatar control; profile, providers, privacy, appearance, support, and in-app account deletion. |

### 1.4 Surface ownership — Command Center vs. Omen

These destinations must not duplicate each other. The distinction is behavioral, not merely visual:

| Destination | Core job | Owns | May preview / link to |
|---|---|---|---|
| **Command Center** | **Orient and prioritize.** “What matters for this selected team and league right now?” | League/team switcher; **current matchup and record** directly beneath the context strip; then **Waiver Watch** urgency (deadline, roster need, injury/bye-week openings, trending opportunity); compact league pulse (standing, meaningful stats); the most recent 1–3 Ledger entries | The full waiver analysis, Start/Sit decision workspace, and complete Ledger in Omen |
| **Omen** | **Advise and explain.** “Help me make the move.” | Full **Start/Sit** workspace; full waiver recommendation analysis (add/drop, alternatives, confidence, reasoning); complete Ledger/history and outcomes | Not applicable — this is the decision workspace |
| **Trade** | **Evaluate a proposed trade.** | Public Trade Analyzer and its reasoning | Relevant player/league context only where it clarifies the trade |
| **League** | **Explore league context.** | Roster, matchup, standings, connected-league context, and seasonal Draft entry | Omen analysis when a user asks for a recommendation |

### 1.4.1 League page hierarchy

The League page explains the selected team’s situation; it must not duplicate Command Center’s quick triage or Omen’s recommendation engine.

1. **This Week’s Matchup** — selected team versus opponent, including the current/projection state and key starters.
2. **What to Watch** — two or three concise factors that could swing this matchup.
3. **Relevant football context** — injuries, bye weeks, weather, game-time changes, or football news only when it affects the selected roster or matchup; never a generic news feed.
4. **League Pulse** — standings, points-for, playoff position, streak, waiver deadline, and meaningful league activity, with routes to deeper standings/activity views.

The order is intentional: matchup → potential swing factors → the football information behind those factors → wider league context.

### 1.4.2 Trade page ownership

Trade is a fast, zero-friction analysis tool—distinct from Omen’s proactive recommendation engine.

- **Public-first:** a user can build a “You give / You get” offer and analyze it without an account or connected league.
- **Contextual when chosen:** with a selected team/league, the page clearly offers personalized analysis using applicable league format, scoring, roster context, and dynasty/keeper rules. The user can choose neutral/public analysis instead.
- **Verdict first:** return a plain-English outcome (for example, favors you, close/needs context, or giving up too much), then immediate value, long-term value where supported, risk, and a smallest-adjustment “make it fair” counter path.
- **Sharing follows the verdict:** the existing public share flow remains available after analysis, never before it or in place of the verdict.
- **Post-beta/V2:** Apple Shortcuts integration and social trade-poll creation are deferred. They must not delay beta; any future share/poll design should be cross-platform-aware and preserve the user’s explicit control over public trade content.

### 1.4.3 Account page ownership

Account is a calm native settings space, not a second fantasy dashboard. It is entered through the contextual profile/avatar control and does not need the selected team/league context strip.

1. **Profile** — account identity and sign-in method; concise, not a hero/dashboard treatment.
2. **Connected Leagues** — the first actionable section: platform connection cards grouped by Yahoo, Sleeper, and ESPN; clear connected/reconnect/unavailable states; safe add, reconnect, and disconnect actions.
3. **Preferences** — Omen dark/light/system appearance and relevant accessibility preferences.
4. **Data & Privacy** — safe explanation of data use, export, and applicable consent controls.
5. **Support & Help Improve Omen** — help, provider-connection recovery, report an issue, and a clearly available **Share feedback** entry point.
6. **Danger Zone** — in-app account deletion, visually and structurally separated at the bottom.

Feedback rules:
- Do not use nags, forced surveys, repeated rating prompts, or interruptions during a user’s main task.
- **Recommendation-specific feedback** remains close to This Week’s Omen and its detail workspace, where users can say whether the call helped.
- **General product feedback** lives in Account’s Help Improve Omen section, where a user can voluntarily share an issue, idea, or experience.
- Feedback must use a safe contract: no provider credentials, raw cookies, or sensitive league data are prefilled or transmitted; clearly state any context that will be attached.

### 1.4.4 Cross-page states and off-season mode

All pages use the same intentional state language. A state may alter a page’s contents, but it must not erase the page’s job or leave the user at a dead end.

| State | Required experience |
|---|---|
| **Loading** | Page-shaped skeleton plus a named operation (for example, “Reading your league”), never an unexplained blank screen or indefinite spinner. |
| **Needs connection** | Explain the benefit in context and offer Connect / Reconnect / Try Demo; never show a dead dashboard. |
| **Limited data** | Show what is known, what cannot yet be confirmed, and the safest next step. Do not fill missing live data with mock advice. |
| **Recovery** | State the problem in plain English, preserve safe in-progress work where possible, and offer Retry / Reconnect / choose another league. |
| **Demo** | Offer a useful, clearly labeled experience with safely isolated fixtures; never mix demo and live data. |
| **Off-season** | Keep Omen strategically useful rather than blank: draft preparation when relevant, dynasty/keeper long-horizon context when supported, league/off-season context, and an honest note that live weekly Omen returns in season. |

**Off-season guardrail:** the live weekly recommendation route must still honor the existing `off_season` state and must not generate or imply live weekly Start/Sit advice. Strategic/off-season content appears only when its data and scope are genuinely available; otherwise explain the season state and offer the next useful destination.

### 1.4.5 Motion and transition rules

Motion clarifies a change of context, hierarchy, or outcome. It is never decoration, a loading disguise, or an “AI thinking” performance.

| Situation | Required behavior |
|---|---|
| **Navigation / sheets** | Use platform-native transitions: iOS navigation stack, tab, and sheet behavior on iPhone; Android Compose/Material navigation and sheet behavior on Android. Do not force one platform’s motion onto the other. |
| **This Week’s Omen arrives or changes** | One restrained content entrance/settle is allowed to establish the new recommendation. The move is immediately readable; no reveal sequence, looping glow, particle effect, or delayed answer. |
| **Promoted matching workspace** | A subtle surface/position emphasis may guide attention to the matching Start/Sit, Waiver, or Trade path. It must not pulse repeatedly, flash, or hijack focus. |
| **Waiver urgency / status changes** | Use static hierarchy, copy, color-plus-icon, and spacing first. A single transition on a real state change is acceptable; urgency must never depend on flashing or continuous motion. |
| **Loading / refresh** | Use page-shaped skeletons and named status copy. Never use motion to imply progress that Omen cannot verify. |
| **Errors, recovery, and danger actions** | Prioritize clear copy and stable controls. No shake animation, alarm effect, or celebratory motion. |
| **Success / completed action** | A brief, restrained confirmation is allowed, then settle into the resulting state. |

**Accessibility non-negotiables:**
- Honor iOS Reduce Motion and Android animator-duration-scale. In reduced-motion mode, state changes are immediate/static; spinners, scale/slide effects, shimmer, parallax, looping emphasis, and decorative transitions have static equivalents.
- Motion must never be the only indication of state, focus, urgency, or completion.
- Honor iOS Reduce Transparency: Liquid Glass surfaces fall back to opaque material as already required by the native design registry.

### 1.5 Global team/league context

Omen maintains **one persistent selected team/league context** for all personalized areas. Changing it updates the context for **Command Center, Omen, League, Waiver Watch, and the Ledger** together. A user must never wonder which roster a recommendation belongs to.

- Each personalized destination shows a **persistent, visually prominent context strip directly below the page title**. It contains the selected team name (primary), league name (secondary), platform identifier, and an obvious disclosure affordance.
- The strip must be easy to find at a glance—more assertive than a utility icon—but not obnoxious: use Omen-owned contrast, spacing, border/surface treatment, and a clear tap affordance. Do **not** rely on NFL/team-color theming, flashing, or disruptive animation to create salience.
- Tapping it opens a native platform sheet organized by **platform first** (for example: Sleeper, Yahoo, ESPN). Within each platform section, connected leagues are sorted **alphabetically by league name**. The active team/league is clearly marked; each row retains enough team context to distinguish multiple teams in a league.
- The sheet also offers **Connect another league** without making it compete with the active selections.
- The selected context persists across tab changes and app relaunches when the stored session permits.
- Command Center, Omen, and League never silently use different selected teams.
- Trade remains usable without a connected league; when a league is selected, it may offer to use that context for personalized analysis, but must state this clearly and let the user change it.

### 1.6 Waiver Watch cadence

Waiver Watch follows a weekly rhythm for a typical weekly-waiver league:

| Window | Command Center expression | Purpose |
|---|---|---|
| **Tuesday–Wednesday** | **Urgent alert / briefing** | Make the user aware of material waiver opportunities and the approaching deadline without pretending every item is equally urgent. |
| **Thursday–Monday** | **Calm ranked opportunity list** | Let the user browse worthwhile adds and emerging opportunities without alarm-state language. |

When Omen has the selected league’s actual `waiver_deadline_at` metadata, that deadline takes precedence over the calendar default: shift the urgent briefing window to the relevant pre-deadline period. This preserves the intended Tuesday/Wednesday rhythm for common leagues while remaining honest for leagues with a different waiver schedule.

#### Urgent briefing composition

For a dynasty/keeper team, the urgent briefing contains exactly three ranked ideas:

1. **Best Move** — the single highest-priority immediate waiver action for the selected roster and league.
2. **Long-Horizon Move 1**
3. **Long-Horizon Move 2**

The Long-Horizon Moves may be developmental adds, future-value stashes, or other recommendations whose value extends beyond the current scoring period. They make Omen accountable to both the user’s present matchup and their long-term roster health.

For redraft leagues, do not fabricate dynasty framing. Show a long-horizon item only when it is a genuinely relevant forward-looking stash; otherwise keep the briefing focused on the best immediate move and honest current-season opportunities.

**Command Center hierarchy:** directly below the persistent team/league context strip, show the selected team’s **current matchup and record**. Waiver Watch follows it. This establishes the current league situation before asking the user to act.

**Command Center rule:** It may say “Waiver wire is moving — review this opportunity,” but it must not reproduce the full add/drop recommendation, reasoning, or Ledger. Tapping a Command Center priority opens the relevant Omen workspace in the already-selected team/league context.

**Omen rule:** Start/Sit belongs to Omen. The Ledger’s complete, accountable record—recommendation, timestamp, reasoning, confidence, and later outcome—belongs to Omen; Command Center shows only a short recent preview.

### 1.6.1 Omen page lead — This Week’s Omen

The lead of the Omen page is **This Week’s Omen**: one clearly stated, highest-value move for the selected team and league. It is the product’s central promise—not a generic alert and not a tool menu.

Its intent is to help the user improve the team **today and across the season**, while remaining evidence-honest:

- It shows the **answer immediately**: decision type, actual move in plain English, short “why this matters,” confidence, and risk. It must not use a “reveal,” delayed-answer, or game-like interaction.
- The full explanation and evidence are available on tap: the user can inspect the deeper reasoning, data used, alternatives, and relevant action workspace without being forced through it.
- It identifies the decision type (for example, Start/Sit or waiver pickup) and opens its full analysis when tapped.
- It may explain longer-horizon or dynasty impact only when the league format and available evidence genuinely support that claim.
- It must never frame a weekly Start/Sit call as a proven long-term roster improvement when the evidence supports only the current matchup.
- Below the lead sit clear paths to **Start/Sit**, **Waiver Analysis**, and the **Ledger**. They are deep workspaces, not competitors for the headline.
- The path that matches This Week’s Omen decision type is **visually promoted as the natural next step**. For example, a waiver recommendation promotes Waiver Analysis; the other two paths remain available but quieter. This behavior follows the returned recommendation type and must not be hardcoded to one tool.

Current implementation reality: the canonical `POST /api/omen/mvp-move` route supplies this one-move concept, but live v1 currently produces only Start/Sit. Completing live Waiver and personalized Trade intelligence under this same canonical route is a founder P0 backend priority: GitHub issue #162. Waiver and other recommendation types remain unavailable/stubbed until their data paths are truly implemented; the native UI must label that honestly.

### 1.7 Rivalry History — post-beta direction

**Rivalry History is explicitly out of beta scope.** After beta, Omen intends to offer a matchup-detail view with confirmed continuing-league head-to-head history, such as all-time record versus the current opponent and recent meetings.

Public positioning may describe it as **“Coming after beta for compatible connected leagues.”** Do not promise equal historical coverage across providers until each provider adapter has proven access, season-to-season continuity, and manager identity matching. This is a planned capability, not a beta launch commitment.

## 2. Auth & session contract

### 2.1 Three mechanisms (from the approved M0a sign-in audit)

| Mechanism | Providers | Flow | Deep link? |
|---|---|---|---|
| Native ID-token | Apple, Google | Native sheet → provider ID token → Supabase `signInWithIdToken` | No |
| System-browser OAuth + PKCE | Yahoo | `ASWebAuthenticationSession` (iOS) / Chrome Custom Tabs (Android) + PKCE per RFC 8252 → deep-link return | Yes |
| Email OTP | Email | 6-digit code entry (not magic link) | No |

- **iOS:** Sign in with Apple is required whenever any third-party login is offered (App Store 4.8).
- **Android:** Credential Manager (Sign in with Google); legacy Google Sign-In SDK banned.
- No embedded WebView for any OAuth. No manual browser copy/paste.

### 2.2 Session

- Session/auth tokens stored only in **iOS Keychain** / **Android Keystore-backed** storage — never plain files, logs, or unencrypted preferences.
- **Session restore runs independently from provider sync**: the app renders locally and restores the Omen session before any league work begins. A provider-sync failure must never block sign-in/session restore.
- Supabase session refresh handled by the client SDK; refresh failures surface as a `needs_reauth` state, not a crash or infinite spinner.

### 2.3 Account lifecycle

- **In-app account deletion** (App Store 5.1.1) tied to the existing authenticated flow and confirmation phrase `DELETE MY OMEN DATA`. Copy/phrase changes require fresh approval (guardrail).

## 3. Deep-link contract

- **Custom URL scheme:** `com.slopssaloon.omen://` (reverse-DNS — approved 2026-07-19; collision-resistant and not user-facing). Add verified iOS Universal Links / Android App Links (https) later. A custom scheme is the appropriate first auth-callback pattern and is supported by both Apple and Supabase. [Apple: custom URL scheme](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app) · [Supabase native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- **Registered return paths:** `com.slopssaloon.omen://auth/callback` (Yahoo OAuth return), `com.slopssaloon.omen://auth/verify` (email confirm if used). Registered as Supabase redirect URLs and in the native app manifests/entitlements.
- **Backend change required:** `GET /api/yahoo/callback` currently redirects to the **web** Account page. For native, the callback must return to `com.slopssaloon.omen://auth/callback` (or a mobile-aware return that hands control back to the app). This is a backend requirement (§11), not yet implemented.
- **Robustness (from M0a §6/§7):** app backgrounding/termination during return must recover; a killed app relaunched via deep link resumes the correct connection stage; double-invocation is idempotent (§5).

## 4. Safe provider-state API

### 4.1 Existing backend routes (source: `api-routes.md`)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/platforms` | account/connection status |
| `POST` | `/api/platforms/sleeper/resolve` | username-first league discovery |
| `POST` | `/api/platforms/sleeper/connect` | connect selected `league_id` |
| `GET` | `/api/yahoo/auth` → `/api/yahoo/callback` | Yahoo OAuth start/return |
| `POST` | `/api/platforms/espn/connect` | cookie-backed ESPN connect (web) |
| `DELETE` | `/api/platforms/:platform` | disconnect yahoo/sleeper/espn |
| `GET` | `/api/dashboard/summary` | app-shell gates, platforms, `off_season` |
| `POST` | `/api/omen/mvp-move` | canonical Omen; live UI sends `{}` after dashboard `ready` |

### 4.2 State mapping (M0a §6 user-facing → backend)

The M0a state machine (`not_started → authorizing → awaiting_return → resolving_account → choosing_league → validating_connection → syncing_initial_context → connected`, plus `canceled / retryable_error / needs_reauth / unsupported_on_mobile`) is the **client** contract. Today the backend exposes coarse status via `/api/platforms` and gates via `/api/dashboard/summary`; it does **not** emit the granular machine.

**Backend requirement:** a safe, machine-readable provider-state response that maps to these states with **opaque error codes only** (no raw provider text, no cookie/token values). The native client derives its state screens from that response; it must not infer state from HTTP errors alone. Until this exists, native connect uses the current coarse status and treats missing granularity as `validating_connection` / `retryable_error` conservatively.

### 4.3 Dashboard status truth (F2 dependency)

The `connected → Omen ready` transition uses the single dashboard status truth being resolved in Verify item **F2** (`ready` vs `pending_live_engine`). Native must adopt whichever one truth F2 settles — do not hardcode a second meaning. **Recommend pinning F2 with M0c.**

### 4.4 ESPN

ESPN stays feasibility-gated (M0a §5, item 7). No direct cookie-entry UI in a store build until a separately approved, safe mobile method exists. ESPN must not block first-run success for demo/Sleeper/Yahoo users.

## 5. Idempotency & request IDs

- Native connect/validate operations send a client-generated **request ID** and must be **idempotent**: double-taps, retries, and app resumes do not create duplicate connections.
- The B2 envelope work already carries `request_id`; **backend verification required** that the existing connect/validate endpoints are idempotent, and implementation if they are not. Stated as a requirement (§11), not assumed.
- Every network call has a **bounded timeout** that becomes a visible `retryable_error`, never a permanent spinner.

## 6. Demo mode contract

- Demo Mode is reachable **before any sign-in** and works with **no auth and no connected league** — it is the App Store / Google Play reviewer path.
- Demo data is served from safe fixtures, **visibly labeled mock**, and never mixed with live data (facts-of-record #7, `demo-mode-pre-empty-state`).
- Demo state is isolated from real user/session data.

## 7. Environment boundaries

- Separate **development / staging / production** configurations with distinct API base URLs, injected at build/config time — never hardcoded secrets in the client.
- Production base is the KVM1 deployment; staging/dev are separate and protected (capability canvas §7). The client ships no service keys, OAuth client secrets, or provider credentials — only public config (API base URL, Supabase anon key, OAuth client IDs).
- Build variants keep store-safe config separate from dev tooling; reviewer/demo mode available in the store build.

## 8. Security & privacy (native)

- No secret, OAuth token, ESPN cookie, or provider value ever enters client view state, logs, crash reports, screenshots, analytics, or share payloads (facts-of-record #6).
- Errors surfaced to the client are opaque, safe codes; raw provider errors stay server-side.
- Telemetry (M0a §7) records only safe operational categories (durations, outcome, provider/state/error-code category, app version) — never league names, roster data, or identifiers.

## 9. Definition of done (M0c)

Approved when: navigation/route table, the three-mechanism auth + session-storage contract, the deep-link contract (incl. the Yahoo-callback backend requirement), the safe provider-state API mapping (incl. F2 dependency), idempotency/request-ID rule, demo-mode contract, and environment boundaries are approved. No native code is written under M0c.

## 10. What M0c does NOT cover

- Native code / project scaffolding → M2 (app shells) and M1 (design-system foundation).
- Per-screen implementation → M3 (vertical slice) / M4 (features).
- The actual backend implementation of §11 requirements → backend lane.

## 11. Backend requirements surfaced (→ `frontend-to-backend.md`)

1. **Mobile-aware Yahoo OAuth return** to the registered `omen://auth/callback` deep link (today returns to web Account).
2. **Safe provider-state response** mapping to the M0a state machine with opaque error codes (no raw provider text / no cookie values).
3. **Idempotency verification** (and implementation if needed) of connect/validate, keyed by client request ID.
4. **F2 resolution** — one status truth for `ready` vs `pending_live_engine` for connected Sleeper/ESPN users.

**Delivery shape (Justin, 2026-07-19):** one owner, **one shared API/state contract**, and **one acceptance-test matrix** across all four — but delivered as **four small PRs**, not one large risky PR. The shared contract and test matrix are authored once before the first PR; each PR lands one requirement against them.

## 12. Decisions — RESOLVED (Justin, 2026-07-19)

1. **URL scheme:** ✅ **`com.slopssaloon.omen://`** (reverse-DNS custom scheme; collision-resistant, not user-facing). Verified https Universal/App Links added later. Callback: `com.slopssaloon.omen://auth/callback` (§3).
2. **Pin F2:** ✅ yes — pinned alongside M0c; a screen cannot honestly show "connected/ready/syncing" while the backend definition is ambiguous. Must resolve before M3.
3. **Backend requirements §11:** ✅ routed to the backend lane as **one owner + one shared API/state contract + one acceptance-test matrix, delivered as four small PRs** (not one giant PR).
4. **Draft navigation:** ✅ Draft is a strong **seasonal** destination inside League and promoted from Command Center during draft-relevant periods; it is **not** a permanent everyday top-level tab (Justin, 2026-07-20).
5. **League vs. Account:** ✅ League is the fourth top-level destination (roster, matchup, standings, connected-league context, and Draft entry). Account is contextual profile/avatar navigation for personal and administrative controls; it is not combined with League or shown as a permanent tab (Justin, 2026-07-20).
6. **Command Center vs. Omen:** ✅ Command Center orients and prioritizes the selected league/team, led by Waiver Watch urgency and a short Ledger preview. Omen is the full decision workspace: Start/Sit, full waiver analysis, reasoning/confidence, and the complete Ledger. A Command Center priority deep-links into the relevant Omen workspace; it does not duplicate it (Justin, 2026-07-20).
7. **Waiver Watch cadence:** ✅ Tuesday–Wednesday is an urgent alert/briefing; Thursday–Monday is a calm ranked opportunity list. When live league waiver-deadline metadata is available, it takes precedence so urgency matches that league’s actual schedule (Justin, 2026-07-20).
8. **Urgent briefing composition:** ✅ For dynasty/keeper teams, show one immediate Best Move plus two Long-Horizon Moves, so Omen serves both this week and long-term roster health. Redraft users receive long-horizon content only when a genuinely relevant forward-looking stash exists; Omen must not invent dynasty framing (Justin, 2026-07-20).
9. **Command Center hierarchy:** ✅ Directly below the persistent team/league context strip, show the selected team’s current matchup and record; Waiver Watch follows it. Current state precedes recommendations (Justin, 2026-07-20).
10. **Global team/league context:** ✅ One persistent selected team/league follows the user across Command Center, Omen, League, Waiver Watch, and the Ledger. A persistent, visually prominent Omen-owned context strip below each personalized page title makes the active roster explicit and lets the user switch or connect another league; its native sheet is organized by platform, then alphabetically by league name within each platform, with the active selection marked. Trade may optionally use the selection for personalized analysis but remains usable without it. It must be high-salience without team-color theming, flashing, or disruptive animation (Justin, 2026-07-20).
11. **Omen page lead:** ✅ This Week’s Omen is the page’s central, one highest-value move for the selected team and league. It aims to help the team today and across the season, but claims long-horizon/dynasty impact only when format and evidence support it; current live v1 availability must remain honestly labeled. The answer—decision type, move, why, confidence, and risk—appears immediately; full explanation/evidence/alternatives are available on tap, with no reveal or game-like delay. Start/Sit, Waiver Analysis, and Ledger sit beneath as deep workspaces; the one matching the returned decision type is visually promoted as the natural next step (Justin, 2026-07-20).
12. **League page hierarchy:** ✅ This Week’s Matchup → What to Watch → relevant football context → League Pulse. Football context appears only when it affects the selected roster/matchup; it is not a generic news feed. League explains the situation, while Command Center triages it and Omen recommends the move (Justin, 2026-07-20).
13. **Trade page ownership:** ✅ Trade is public-first and zero-friction: build/submit a trade without account or league context, then opt into a selected-team/league personalized analysis when available. Verdict precedes share; the existing public share flow is post-verdict. Apple Shortcuts and social trade-poll creation are deferred to post-beta/V2 (Justin, 2026-07-20).
14. **Account + feedback:** ✅ Account is a calm native settings space: Profile → Connected Leagues → Preferences → Data & Privacy → Support & Help Improve Omen → separated Danger Zone. Feedback is always easy but never nagging: contextual feedback stays with Omen calls; voluntary general product feedback lives in Account, with safe no-credential/no-sensitive-data handling (Justin, 2026-07-20).
15. **Cross-page states + off-season:** ✅ Every page uses intentional Loading, Needs connection, Limited data, Recovery, Demo, and Off-season states—named operations, useful next steps, no silent mock/fake advice. Off-season is a calm strategic mode for supported draft/dynasty/league context, never fabricated live weekly Omen advice (Justin, 2026-07-20).
16. **Motion:** ✅ Motion clarifies genuine context, hierarchy, or outcome changes. Navigation/sheets use platform-native motion; Omen content motion is restrained and one-time. No reveal theatrics, flashing, looping emphasis, fake-progress motion, or cross-platform imitation. Reduced-motion and reduce-transparency static fallbacks are required (Justin, 2026-07-20).
17. **Rivalry History:** ✅ Post-beta feature direction, not beta scope. Omen may publicly signal it as coming for compatible connected leagues, but must not promise provider parity until historical adapter access, continuing-league continuity, and manager identity matching are proven (Justin, 2026-07-20).

## 13. Evidence

- Grounded in approved M0a (state machine, three-mechanism sign-in, secure storage, deletion), approved M0b (navigation map, tokens), and live `api-routes.md`.
- No conflicting prior iOS/deep-link contract found (ADR-008 is a web hash-route note; no `ios-espn-relay` spec exists at the referenced path — flag if E3 still expects one).
- No app code, deploy, secret, schema, Figma permission, or provider behavior touched.
