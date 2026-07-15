# Sandbox Environment Spec v1

**Date:** 2026-07-14
**Status:** v1 — scoping draft. Two architecture questions remain explicitly open (§4) — do not start
building until at least §4.1 is answered.
**Owner:** Justin (scope + access-model decision) / Claude (spec, coordination) / Codex or Claude Code
(implementation once decided)
**Scope:** Slops Saloon L2 (Omen app) — this is app/backend surface, not content doctrine. Cross-referenced
from `slops-saloon/Direction/current_sprint.md` CP4 (content), which has a real dependency on this.
**Triggered by:** Justin, 2026-07-14 — "let's make our sandbox... it should be almost living and
breathing Omen... where we test our features to make sure it's good/competent, we can test new screens
and UX and everything — it's for content and code."

---

## 1. What already exists (don't rebuild this)

Omen already has a working piece of exactly this idea, built for a narrower purpose:

- **`GET /api/demo`** (`omen-demo.v1` contract, `src/services/demoMode.js`) — a frozen, deterministic
  12-player roster fixture run through the real optimizer (`evaluateLineup`), returning a genuine
  start/sit recommendation with confidence/risk/explanation. Player identities are explicitly
  placeholder (`"Sample QB Starter"`, `"Sample RB Two"`, etc.) — never real player names. This matches
  Justin's ask exactly: "the substance of the data is real... but not real players."
- **`/demo`** (`frontend/src/pages/Demo.jsx`) — public, no-login route rendering that fixture with a
  permanent, non-dismissible "Demo Mode" label.
- **`Blueprints/playbooks/app-store-reviewer-access.md`** — documents `/demo` (plus `/trade` and
  `/draft`'s existing preview/mock states) as the App Store reviewer path.
- **`frontend/src/data/tradePulse.js`** — a static Buy-Low fixture on `/trade` (separate mechanism,
  not wired to the demo system).
- **`/draft`'s Preview Mode** — a production-default branch with example recommendations (separate
  mechanism, not wired to the demo system).

**The gap:** these are three separate, narrow, single-purpose fixtures (one roster scenario, one static
trade list, one draft preview state), each built to satisfy one specific need (reviewer access, a UI
section, a page state) rather than one deliberate environment. None cover multi-team trades. None are
designed to be reused for content-capture screenshots or for dev/QA feature testing.

## 2. What Justin is asking for

A single, deliberate, realistic-but-clearly-fake environment — call it **the Sandbox** — that serves
three consumers at once instead of three separate one-off fixtures:

1. **App Store / reviewer access** — existing `/demo` requirement: no real account, no real league,
   clearly labeled, never presented as live.
2. **Content capture** — screenshots and screen recordings for videos (this is what CP4's blocked
   multi-team-trade item needs), across multiple scenarios (trade, draft, waiver, standings), not just
   the one start/sit roster.
3. **Feature / UX testing** — a place to try new screens and flows against realistic-shaped data during
   development, without needing a real connected league every time.

Read literally, this is broader than "add one more fixture" — it's "make the fixture system itself the
one source of realistic sample data for reviewers, content, and dev/QA," so all three stop drifting
independently (which is exactly how the current three-separate-mechanisms gap happened).

## 3. Hard constraints (non-negotiable, carried over from the existing demo system)

- **Never real player identities.** Every fixture uses placeholder names, matching the existing
  `DEMO_ROSTER_FIXTURE` convention.
- **Never presented as live.** Every Sandbox surface keeps the same non-dismissible labeling discipline
  `demo-mode.md` already establishes — `mode: "demo"` (or a new explicit mode value if the Sandbox becomes
  distinct from today's `/demo`), never silently mixed with live/mock states.
- **Never auto-merges with real connected-league data.** Same rule as today's `/demo` — moving to real
  data requires an explicit, separate user action.
- **Analytics/LLM-training ineligible**, same as today's demo fixture (`demo-mode.md` §Analytics and
  model boundary) — extend this rule to whatever new Sandbox surfaces get built, don't silently drop it.
- **No real Supabase/platform-adapter/LLM calls** for the reviewer-facing path specifically — this is
  what makes `/demo` safe for App Store review today; if the Sandbox becomes a real logged-in account
  (see §4.2), this constraint may need to be scoped to *that specific account's data being fake*, not to
  "no real backend calls at all" — flag this distinction explicitly whichever way §4.2 resolves.

## 4. Open questions — resolve before building

### 4.1 Scope: extend existing fixtures, or build a full multi-scenario environment?

Justin's answer (2026-07-14): full multi-scenario — "test new screens and UX and everything... for
content and code." This is the larger of the two options originally posed. Confirmed direction:
**build toward covering trade (incl. multi-team), draft, waiver, and start/sit scenarios**, not just
extend the single roster fixture with one more case.

### 4.2 Access model: extend the public `/demo` route, or a separate authenticated sandbox account?

**Decided 2026-07-14: separate authenticated sandbox account.** Justin approved Claude's recommendation.
`/demo` stays exactly as-is for App Store reviewers — nothing about the existing reviewer path changes.
The Sandbox is a new, real (but fake-data) logged-in account that behaves like a genuine user session:
real login, real authenticated UI shell, real navigation between screens — the "someone actually using
the app" feel that CP4's opener feedback and content-capture needs both want. Tradeoffs recorded below
for reference.

| | Extend public `/demo` | Separate authenticated sandbox account |
|---|---|---|
| Reviewer/App-Store fit | Already proven safe and sufficient (per the reviewer playbook) | Would need re-verifying against App Store review requirements from scratch |
| Content-capture realism | Slightly less "someone using the app" feel (no login flow, no real session) | More realistic — actually logs in, sees the real authenticated UI shell, matches item 1 in CP4's polish list (device-framing/"someone using an app" feedback) |
| Dev/QA feature testing | Limited — public route can't easily carry session state across screens | Better — behaves like a real account for testing multi-screen flows |
| Build cost | Smaller — extend existing fixture/contract shape | Larger — needs a seeded fake account, decisions on whether it lives in real Supabase (isolated fake user) or a separate mechanism entirely |
| Risk of drift from real data model | Lower | Higher if not kept in lockstep with real schema changes |

**Recommendation (Claude, not yet approved by Justin):** given the content-capture use case explicitly
wants the "someone using a real app" feel (this is literally CP4 feedback item 1), a separate
authenticated sandbox account is probably the better fit long-term — but it's more to build, and the
existing `/demo` route already solves the reviewer requirement today with zero risk. A reasonable
phased path: keep `/demo` exactly as-is for reviewers (don't touch a working App-Store-safe surface),
and build the richer multi-scenario sandbox as a separate authenticated fake account for content/QA use.
**This still needs Justin's explicit go before any build starts.**

## 5. Implementation shape (for the account, per §4.2's decision)

- **A real Supabase auth user**, flagged as sandbox — not a bypass of auth, a real login. Candidate
  mechanism: a `profiles.is_sandbox` (or similar) boolean, checked wherever the backend decides whether
  to call a real platform adapter (Yahoo/Sleeper/ESPN) or return fixture data instead.
- **Reuse opportunity, verify before building:** `platform_connections.connection_mode` already has a
  schema addition drafted (branch `claude/platform-connections-relay-mode`, not yet applied — built for
  the iOS ESPN relay-sync work, Phase 5.3) that may be a generic-enough enum to extend with a `sandbox`
  value instead of inventing a second column. Check that branch's actual diff before assuming this is
  usable — don't guess from the name alone.
- **Platform adapters short-circuit for the sandbox user**: instead of calling real Yahoo/Sleeper/ESPN
  APIs, `platforms.js` (or wherever adapter dispatch lives) returns the Phase A fixture set for a flagged
  sandbox account — same shape contract as real adapter responses, so every downstream screen (Trade
  Analyzer, Draft Assistant, Standings, Dashboard) renders exactly as it would for a real connected user.
- **Analytics/LLM-training exclusion carries over** from the existing demo rule (`demo-mode.md`) — the
  sandbox account's interactions must be flagged ineligible the same way, not just its fixture data.
- **Labeling:** even though this is a "real" logged-in experience, it still needs a persistent,
  non-dismissible label distinguishing it from a real user's real data — same discipline as `/demo`'s
  banner, adapted for an authenticated shell instead of a public page.
- **This is a schema-adjacent, cross-layer change** (touches auth/profiles, platform adapters, possibly
  `platform_connections`) — per `action-posture.md`, database migrations and schema changes need Justin's
  explicit approval before any migration is written or applied, not just before it's run.

## 6. Proposed phasing

1. **Phase A — Expand fixture data.** Add a multi-team trade fixture and a draft-board fixture alongside
   the existing roster fixture, using the same placeholder-identity convention. Buildable now,
   independent of Phase B — unblocks CP4's multi-team capture item on its own even before the account
   exists (the fixtures can be captured directly from the `/demo`-style rendering before Phase B lands).
2. **Phase B — Build the sandbox account** per §5's implementation shape. Needs Justin's explicit
   approval on the schema-adjacent pieces before building, per the gate above.
3. **Phase C — Wire into all three consumers**: keep `app-store-reviewer-access.md` and `/demo` untouched
   (confirmed unaffected by this decision); update `content-production-pipeline.md`/
   `short-video-workflow.md` to point content-capture work at the Sandbox account instead of requiring a
   real connected account; document the Sandbox as the default place to test new screens/UX during
   development.

## 6. Next artifacts

- [ ] Justin decides §4.2 (access model).
- [ ] Phase A build prompt (fixture expansion) — can be written once this spec is approved, independent
  of §4.2.
- [ ] Update `Direction/current_sprint.md` (Omen) with Phase A/B/C as real P-items once phasing is
  approved.
- [ ] Update `slops-saloon/Direction/current_sprint.md` CP4 to reference this spec as the path to
  unblocking the multi-team trade capture.

## Change log

- 2026-07-14: Created from Justin's live scoping conversation. Scope question (§4.1) resolved same
  session — full multi-scenario sandbox. Access model (§4.2) explicitly left open with a recommendation,
  not a decision.
