# Spec: Sign In / Connect Your League Screen

**Date:** 2026-05-24
**Updated:** 2026-05-24 (Justin approval pass)
**Status:** v2 — decisions locked, ready for build
**Priority:** P0 — first screen to get right

---

## Resolved Decisions (v2 patch)

The following questions from v1 are now closed:

| Question | Decision |
|---------|---------|
| Auth providers at v1 | Google, Apple, Email magic link, Discord — all four |
| Generic Omen without league | No. League connection is mandatory for Omen. |
| ESPN UX approach | Full guided in-product walkthrough every time. No hiding the friction. |
| Launch routing | `/` serves Omen at launch. Slops Saloon parent routing is future. |
| Headline copy | Provisional final: **"Your best call, every time."** |

---

## Provisional Final Headline

**"Your best call, every time."**

**Rationale:** Synthesized from three candidates. Captures the trade use case ("every time you get a trade offer") and the Omen weekly cadence ("every time this week's lineup decision matters"). Personal. Confident. Works for both entry paths. Marked provisional — confirm after seeing it rendered in the UI.

**Sub-copy (sign-in screen):**
"Sign in to connect your league and get your Most Valuable Play each week."

---

## Purpose

This spec covers the full Sign In / Connect Your League flow.
This is the most important first impression for any paying Omen customer.
It must feel premium, trustworthy, and guided — not like a generic auth wall.

---

## Core UX Rules for This Screen

1. Trade Analyzer is always accessible without signing in. This screen only appears by choice or when entering a gated feature.
2. Omen requires both sign-in and a connected league. No league = no Omen. No exceptions.
3. Skipping league connection is allowed but Omen will be locked until a league is connected.
4. ESPN friction is not hidden. It is guided, explained, and confidence-building.
5. Auth comes before league connection. Always in that order.

---

## Flow Overview

```
[Anonymous user arrives at Omen]
        │
        ▼
[Uses Trade Analyzer — no auth required, always accessible]
        │
        ▼
[Gets value → sees soft invite → clicks "Sign in" or "Get my Most Valuable Play"]
        │
        ▼
[Sign In screen — Step 1]
        │
        ├── Success → [Connect Your League — Step 2]
        │                │
        │                ├── Connects platform → [Dashboard / Omen unlocked]
        │                └── Skips → [Dashboard — Omen locked until league connected]
        │
        └── Error → [Error state with retry]
```

**Critical rule:** No user should encounter the sign-in screen before they've had a chance to use the Trade Analyzer.

---

## Entry Points

The sign-in screen is reached from:

1. Header "Sign in" button (always visible, low-pressure)
2. "Get my Most Valuable Play" CTA on landing page or dashboard
3. Attempting to access Omen while logged out
4. "Unlock personalized advice" soft prompt on Trade Analyzer result

The flow preserves the entry point via `?next=` query param and returns the user there after sign-in and league connection.

Example: user clicked Omen while logged out → signs in → connects league → lands on Omen.

---

## Step 1: Sign In Screen

### Layout (mobile-first)

```
┌────────────────────────────────────────────────┐
│                                                │
│         [Omen raven mark — centered]         │
│         OMEN                                 │
│                                                │
│  ──────────────────────────────────────────   │
│                                                │
│  Your best call, every time.                   │
│  [H2 — Alegreya Sans 600, 28–32px]            │
│                                                │
│  Sign in to connect your league and get        │
│  your Most Valuable Play each week.            │
│  [Body — Alegreya 16px, secondary color]      │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  [G icon]  Continue with Google          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  [Apple icon]  Continue with Apple       │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  [Discord icon]  Continue with Discord   │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ────────── or ───────────                    │
│                                                │
│  [Email input: your@email.com]                │
│  [Send magic link →]                          │
│                                                │
│  ────────────────────────────────────────── │
│                                                │
│  ✓  Your data stays private.                  │
│  ✓  No spam — ever.                           │
│  ✓  Cancel anytime.                           │
│                                                │
│  Trade Analyzer works without signing in.     │
│  [→ Back to Trade Analyzer]                   │
│                                                │
└────────────────────────────────────────────────┘
```

### Desktop layout

Centered card on a dark background. Card is `max-w-md`, `rounded-xl`, subtle border and shadow.
Omen brand mark at top. Background: raven black. Card: charcoal.
Optional: faint constellation or raven silhouette pattern in the background (dark-on-dark, very subtle). Not required for v1.

### Auth Options (all four required at launch)

| Method | Provider | Notes |
|--------|---------|-------|
| Google OAuth | Supabase Google provider | Most common; fastest for most users |
| Apple Sign In | Supabase Apple provider | Required for trust on iOS; Apple HIG button standards apply |
| Discord OAuth | Supabase Discord provider | Fantasy football community overlap; natural fit |
| Email magic link | Supabase magic link | No password; lowest friction for non-social users |

**Button order:** Google → Apple → Discord → divider → Email input.

**Apple button:** Must comply with Apple's Human Interface Guidelines — white pill on dark background, or black pill on light background. Do not customize the Apple logo or button text beyond what Apple allows.

**Discord button:** Use Discord's Blurple (`#5865F2`) or a neutral outline style. Match the visual weight of Google and Apple buttons.

### States

**Default:** Three OAuth buttons visible. Email input empty. Email CTA button inactive.

**Email entered:** "Send magic link" button activates (gold accent). Becomes primary CTA.

**Sending:** Button shows spinner + "Sending…" All inputs disabled.

**Magic link sent:**
```
Check your email.
We sent a sign-in link to [email].
Didn't get it? [Resend] after 60 seconds.
```

**OAuth in progress:** Brief loading state on button tap. "Redirecting to Google…" etc.

**Error (auth failed):**
```
Something went wrong. Try again.
[Retry button]
```

**Rate limited:**
```
Too many attempts. Try again in a moment.
```

---

## Step 2: Connect Your League

Shown immediately after successful sign-in, if no league is already connected.
If a league is already connected, skip this step and route to dashboard or the `?next=` destination.

### Core rule

**Omen is locked without a connected league.** Skipping this step means the user lands on a dashboard where Omen shows a `DisconnectedState` with a clear CTA to connect. This is not a punishment — it is an honest state.

### Layout

```
┌────────────────────────────────────────────────┐
│                                                │
│         [Omen mark]                          │
│                                                │
│  Connect your league.                          │
│  [H2 — Alegreya Sans 600, 28px]               │
│                                                │
│  Omen needs your roster to find your         │
│  Most Valuable Play. Choose your platform.     │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ [Sleeper logo]  Sleeper                   │ │
│  │ Easiest. Just enter your username.        │ │
│  │                               [Connect →] │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ [Yahoo logo]  Yahoo Fantasy               │ │
│  │ Sign in with Yahoo to import your team.  │ │
│  │                               [Connect →] │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ [ESPN logo]  ESPN Fantasy                 │ │
│  │ Requires two browser cookies. ~2 minutes. │ │
│  │ We walk you through every step.           │ │
│  │                               [Connect →] │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ [⌨ icon]  Enter Manually                 │ │
│  │ For leagues on other platforms.           │ │
│  │ You'll enter your roster yourself.        │ │
│  │                               [Connect →] │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ────────────────────────────────────────── │
│                                                │
│  → Skip — I'll connect my league later        │
│    Omen won't be available until you do.      │
│                                                │
└────────────────────────────────────────────────┘
```

### Platform Card Order and Character

**1. Sleeper — lowest friction**

Copy: "Easiest. Just enter your username."
Connection: username lookup via Sleeper public API. No OAuth required.
If the user has multiple leagues, show a league picker after username resolves.

**2. Yahoo — OAuth, familiar**

Copy: "Sign in with Yahoo to import your team."
Connection: Yahoo OAuth redirect. Well-understood pattern.

**3. ESPN — guided high-friction setup**

Copy: "Requires two browser cookies. About 2 minutes. We walk you through every step."

ESPN UX philosophy: Do not hide or minimize the friction. The guided walkthrough is part of the product. Users who connect ESPN are committed and valuable — treat the setup as a moment of onboarding confidence, not a warning to get past.

The ESPN connection flow (when "Connect →" is tapped) should open a step-by-step guide inside the app:
- Step 1: Open ESPN Fantasy in your browser
- Step 2: Open DevTools (keyboard shortcut shown for their browser)
- Step 3: Find the two specific cookies (ESPN_S2 and SWID) with screenshots
- Step 4: Paste each into Omen
- Step 5: Omen validates and imports your league

Progress indicator visible throughout. Each step has confirmation before moving to the next. If a step fails, show exactly what went wrong in plain English and offer retry or go-back.

**4. Manual entry — for unsupported platforms**

Copy: "For leagues on other platforms. You'll enter your roster yourself."
Connection: form-based roster entry. The user completes a data checklist — scoring format, lineup rules, roster, optional matchup context.

Omen access for manual users is conditional on completing the required checklist. Incomplete manual entry does not unlock Omen. Trade Analyzer remains available regardless.

The card copy should not promise full Omen access. It should be honest: "You'll need to complete a setup checklist. Omen unlocks once we have enough to work with."

**Status:** Backend audit required before this option is built. Codex must evaluate what data manual entry can collect and whether it is sufficient for honest recommendations. Do not build the manual entry form until Codex reports and Justin decides. See Codex handoff section 2.4.

### Skip option (revised)

Copy: "Skip — I'll connect my league later. Omen won't be available until you do."

Do not hide what skip means. The user should know upfront that Omen is locked.
Skip routes to the dashboard. Omen shows `DisconnectedState` with "Connect a league" CTA.
Trade Analyzer and Draft Assistant remain fully accessible.
A persistent low-pressure banner in the dashboard invites the user to connect when ready.

### Post-connection behavior

After any successful platform connection:
- Brief inline confirmation: "[Platform] connected. Reading your roster…"
- Spinner for the roster import (typically fast)
- Transition directly to Omen (if `?next=omen`) or Dashboard — no separate success page
- Keep momentum moving

### Error states

**Username not found (Sleeper):**
```
We couldn't find that Sleeper username.
Double-check the spelling and try again.
[Try again]
```

**Platform connection failed (generic):**
```
Couldn't connect [Platform]. [plain-English reason]
[Try again]  [Connect a different platform]
```

**ESPN — cookies not accepted:**
```
ESPN didn't accept those cookies.
They may have expired or been copied incorrectly.
[Back to step 3]  [Start over]
```

**ESPN — league not found after auth:**
```
We connected to ESPN but couldn't find your league.
Make sure you're a member of a fantasy football league this season.
[Try again]  [Contact support]
```

---

## Routing and Redirect Logic

| User state at sign-in | Destination after auth + league connect |
|----------------------|----------------------------------------|
| Came from Trade Analyzer | Trade Analyzer (with connected context if league linked) |
| Came from Omen (logged out) | Omen (after league connect step) |
| Came from "Sign in" button | Connect Your League step → Dashboard |
| Came from "Get my Most Valuable Play" | Connect Your League step → Omen |
| Already has league connected | Skip step 2, go to `?next=` or Dashboard |
| Skips league connection | Dashboard — Omen shows DisconnectedState |

Preserve `?next=` through all redirect hops. See Codex handoff for implementation requirement.

---

## URL Structure

| Step | Route |
|------|-------|
| Sign in | `/login` |
| Sign in with redirect | `/login?next=/omen` |
| Magic link confirmation | `/login?sent=true` |
| Connect league | `/account/connect` |
| Connect league with redirect | `/account/connect?next=/omen` |
| Dashboard (no league) | `/` or `/dashboard` |
| Dashboard (league connected) | `/` or `/dashboard` (Omen unlocked) |

---

## Backend Dependencies

| Capability | Status | Notes |
|-----------|--------|-------|
| Supabase Google OAuth | Existing | Via Supabase Auth |
| Supabase Apple OAuth | Existing | Via Supabase Auth |
| Supabase Discord OAuth | Existing | Via Supabase Auth — confirm Discord app config |
| Supabase magic link | Existing | Via Supabase Auth |
| `?next=` preservation through OAuth | Unknown | Codex must specify — see handoff |
| Sleeper username → leagues endpoint | Missing | Must be built — see handoff |
| Yahoo OAuth connect flow | Existing (legacy) | Confirm end-to-end wiring |
| ESPN cookie connect flow | Existing (complex) | Expand to step-by-step guided contract |
| Manual entry endpoint | Missing | Must be designed — see handoff |
| Platform status endpoint | Unconfirmed | Must confirm route and shape — see handoff |

---

## Mobile Behavior

- Single column layout at all times — no horizontal scroll
- Card takes full viewport width minus 32px padding on small screens (`px-4`)
- All tap targets minimum 44px tall
- Email input: `type="email"`, `inputmode="email"`, `autocomplete="email"`
- Apple sign-in button follows Apple HIG exactly (white on dark, black on light)
- Discord button: neutral outline or Discord Blurple — match visual weight of other OAuth buttons
- "Skip" link is below platform cards — visible without scrolling on a 375px phone

---

## Theme Behavior

- Screen respects OS system theme on first visit (no Omen preference set yet)
- No theme toggle shown on this screen
- Dark mode: raven `#0A0A0B` background, charcoal `#1C1C1E` card, gold CTA
- Light mode: `#FAFAF9` background, `#FFFFFF` card, standard shadows

---

## Acceptance Criteria

- [ ] Trade Analyzer is reachable without encountering this screen
- [ ] Sign-in screen is reachable from the header "Sign in" button
- [ ] Sign-in screen gates Omen — logged-out Omen click routes here
- [ ] All four auth options are shown: Google, Apple, Discord, Email magic link
- [ ] Apple button complies with Apple HIG
- [ ] Discord button matches visual weight of other OAuth buttons
- [ ] Magic link sent state shows correct copy with resend option
- [ ] Step 2 shows all four connection options: Sleeper, Yahoo, ESPN, Manual
- [ ] Sleeper is first and shows username input flow after tapping Connect
- [ ] ESPN shows guided multi-step in-product walkthrough (not just a warning)
- [ ] ESPN error states handle invalid cookies and league-not-found separately
- [ ] Manual entry routes to a form (backend contract pending)
- [ ] Skip option is present with honest copy about Omen being locked
- [ ] Skipping routes to dashboard where Omen shows DisconnectedState
- [ ] `?next=` is preserved through OAuth redirect and league connect step
- [ ] Post-connection routes to correct destination without a dedicated success page
- [ ] All states implemented: default, sending, sent, error, rate-limited, OAuth-in-progress
- [ ] Mobile layout clean at 375px viewport
- [ ] Dark and light modes both look intentional
- [ ] Trust signals visible without scrolling on mobile

---

## Open Questions (backend — not yet resolved)

The following are backend implementation questions for Codex, not product decisions:

1. **Discord OAuth app config:** Is the Supabase Discord provider already configured, or does it need a new Discord developer app credential?
2. **Yahoo OAuth state:** Is the Yahoo OAuth connect flow fully wired end-to-end in the current frontend, or is there a gap?
3. **`?next=` through OAuth:** How is the redirect destination preserved through the Supabase OAuth cycle? See Codex handoff.
4. **Sleeper endpoint:** No backend contract exists. Must be built before this screen goes live.
5. **Manual entry feasibility:** Pending Codex audit. Codex must report what data the form can collect, which Omen decision types are feasible, and propose the required checklist. Justin decides after seeing the report. Do not build the manual entry form until this is resolved.
6. **Session duration:** How long do Supabase sessions last for Omen users by default?
