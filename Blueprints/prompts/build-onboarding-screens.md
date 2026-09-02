# Kickoff prompt — build the onboarding screens

Paste everything below the line into a fresh session.

---

Build the native onboarding screens for Omen, iOS and Android together.

## Read first, in this order

1. `AGENTS.md`, then `slops-saloon/omen/CLAUDE.md` — including the **native mobile read gate**
2. `Blueprints/specs/mobile/omen-app-pages-workshop-v1.md` — nine parts, the product decisions
3. `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` — the binding contract
4. `Direction/facts-of-record.md` — especially **#19** (demo mode), **#20** (canvas as screen
   artifact), **#21** (two-family type system, no mono)
5. `design/app-rework-canvas/README.md`, then the artboards named below

## The approved screens

The screen artifact of record is `design/app-rework-canvas/` (facts-of-record #20). Each `.dc.html`
is one 390×844 phone screen of plain HTML with inline styles — open it in a browser and it renders,
no build step. Published canvas:
https://claude.ai/code/artifact/7cab7309-b9f3-40cf-b570-1878d41450f7

Build these three, in order:

| Artboard | Screen |
|---|---|
| `SignInB.dc.html` | 1 · Sign in — the new first screen |
| `EmailCode.dc.html` | 2 · Email six-digit code |
| `ConnectLeague.dc.html` | 3 · Connect your league |

## What changes, and why

**Sign in replaces Welcome.** `WelcomeView.swift` and its Android twin are deleted; the app opens on
sign-in. It carries the animated Omen lockup (`logos/svg/omen-lockup-stacked.svg` — the "O" is a
football), the approved brand line **"See the move before the league does."**, and Demo Mode lives
on this screen rather than a separate one.

- **Apple is the filled primary on iOS.** App Store guideline 4.8 requires Sign in with Apple to be
  at least as prominent as any other social sign-in. **On Android the primary swaps to Google** —
  Apple has no prominence claim there.
- **Add Google to iOS.** Supabase already has Email, Google, Apple, Discord and Passkeys enabled;
  Google is simply not surfaced natively today.
- Google, Discord and email are icon-only buttons and **must** carry accessibility labels. An
  icon-only sign-in control is invisible to VoiceOver / TalkBack without one.
- Any lockup animation must hold still under Reduce Motion, and must never delay the sign-in
  controls becoming usable.

**Email code** is the only sign-in path needing a screen — the OAuth providers hand off to a system
sheet. Continue stays disabled until all six digits land. Both escapes are named: resend, and change
the email.

**Connect your league** orders providers **by market share** (ESPN, Yahoo, Sleeper) and each row
states what it will cost the user *before* they tap it:

- **Sleeper — `.available`.** Username only, no password, no OAuth. Existing flow works.
- **Yahoo — `.available`.** Full native `ASWebAuthenticationSession` OAuth. Existing flow works.
- **ESPN — `.useWeb`, and it stays that way.** The row reads "Needs a computer for now · we'll show
  you". **Do not build an in-app ESPN sheet in this session** — that is `W1-A` and it is blocked by
  two separate gates (see below).

Keep the ESPN consent line already shipped in `ConnectView` and `ConnectLeague.jsx`.

## Hard constraints

- **Demo Mode stays.** It is the reviewer's only path into the app and its removal is deferred until
  after the first App Store approval (facts-of-record #19). Do not remove "Try Demo".
- **No mono typeface anywhere** (facts-of-record #21). Alegreya Sans and Alegreya only. Numerals use
  tabular figures, not a mono face.
- **iOS and Android move together, screen by screen.** Neither platform drifts.
- **No ESPN branding that implies association or endorsement.** A factual "ESPN" label on the brand
  color is fine; the logo is not, pending consent. Sleeper's real mark may be used once the asset is
  in the repo. Yahoo's logo is blocked pending a brand-use request
  (`Legal/2026-09-01-yahoo-brand-use-request.md`).
- **Do not build `W1-A`** (the in-app ESPN sheet). Two gates: the Disney Terms of Use finding
  (`Direction/decision_log.md`, 2026-08-31) and onboarding contract §5/§10, which bars a store build
  from asking for a password or raw cookie entry and blocks "ESPN connected" UI until a feasibility
  memo resolves.

## Check this before you start

Another session recently worked in `ConnectView.swift`, `ConnectViewModel.swift`,
`OmenHelpSupportView.swift` and `OmenIOSApp.swift`. **Run `git status` first.** If those files are
still dirty, that work is mid-flight — land or coordinate it before editing the same files.
**`main` is the proof; a handoff is a pointer, never evidence.**

## Known gap worth fixing while you are here

After a successful connection, `ConnectView` shows "[League] is connected" and exactly one button,
"Go to Command Center". A user with leagues across several platforms has to go hunting in the
switcher to add the next one. Add a second action — **"Connect another league"** — beside it. The
multi-league switcher itself already exists (`OmenLeagueSwitcherSheet`) and needs no work.

## Done when

- The three screens match their artboards on both platforms, in light **and** dark mode
- Text scales with the system font size (Dynamic Type / font scale) without clipping — issue #338
- Every icon-only control has an accessibility label, verified with VoiceOver and TalkBack
- Touch targets ≥44pt
- "Try Demo" still reaches a populated Command Center
- iOS tests green **signed** — an unsigned run fails 4 `KeychainSessionStore` tests with
  `errSecMissingEntitlement` (-34018), which is the `CODE_SIGNING_ALLOWED=NO` flag, not a regression
- Android unit tests green
- Screenshot evidence per screen, per platform, per mode
- A dated handoff in `Blueprints/handoffs/` and a row in
  `Blueprints/playbooks/skill-usage-ledger.md`

## After this ships

The next step is `W1-REVIEW` — the first Beta App Review submission. Runbook:
`Blueprints/playbooks/first-app-review-submission-runbook.md`. `W1-DEMO-NAMES`, `W1-CONSENT` and
`W1-TABBAR` are already VERIFIED; the Release archive is proven to build.
