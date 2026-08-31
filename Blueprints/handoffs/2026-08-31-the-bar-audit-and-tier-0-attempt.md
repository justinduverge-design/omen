# 2026-08-31 — The bar audit: device testing, map, strategy, and a failed Tier 0 attempt

Branch `fix/tier-0-trade-and-search`. **Documentation and design only — no code changed.**
Every code change made this session was reverted; the working tree is clean.

## What the founder asked for, in order

1. Audit against `Direction/product/2026-08-30-the-bar-omen-has-not-met.md`, four lenses.
2. *"You have to actually test native with these four mentality"* — so both apps were built,
   installed and hand-driven, not read.
3. *"Create the map and the strategy… cheap wins and the expensive ones we need for production."*
4. Questions to apply the founder's taste — seventeen rulings taken.
5. *"Let's start fixing some stuff."*

## Deliverables

- **`Direction/reviews/2026-08-30-omen-bar-audit-and-strategy.md`** — 34 findings, four-lens
  grading, a web/iOS/Android parity table, R1–R7 status, the tiered map, all seventeen founder
  rulings (§12–§19), and two sections correcting the document's own earlier claims (§20, §21).
- **`design/command-center/`** — a published design canvas: three Command Center layouts, the
  chosen direction built into `Main.dc.html`, tokens lifted from `OmenColor.swift` /
  `OmenTypography.swift` / `OmenSpacing.swift`.
- **`Blueprints/prompts/kickoff-2026-09-01-tier-0.md`** — the next session's prompt.

## What device testing found that source review had not

Both apps built from source and driven by hand — iPhone 16 / iOS 26.5, medium_phone AVD / API 36.
The built iOS `Info.plist` was checked to confirm `OMEN_API_BASE_URL = https://slopssaloon.com`
rather than the `example.invalid` fallback.

| Finding | |
|---|---|
| `F-BAR-12` | iOS: the first text field focuses; **every focusable after it is dead**. Trade cannot be completed. |
| `F-BAR-14` | Android: a suggestion row is visually identical to a committed player. |
| `F-BAR-15` | Demo mode claims *"Sleeper · Connected · 4m ago"* with no mock label — contradicting the screen's own doc comment and facts-of-record #7. |
| `F-BAR-16` | iOS: content runs under the Dynamic Island and behind the floating tab bar. |
| `F-BAR-17` | The Welcome screen is a different design on each platform, with the **primary action order inverted**. |
| `F-BAR-18` | Android light mode is undesigned — brand gold renders brown on near-white. |
| `F-BAR-20` | League and Command Center disagree about whether the demo league exists. |
| `F-BAR-21` | Android shows position/team on the committed row; iOS drops it. |

Also confirmed on device: provider colours are correct where used, and the **Omen tab is the
quality bar the rest of the app should be measured against**.

## The two external reports, investigated

Rody reported that Tetairoa McMillan and Jaxson Dart were missing. **The index has both.** The
report was right about the experience and wrong about the cause. Three real defects underneath:

- **`F-BAR-28`** — the web Trade form has **no player search at all**;
  `frontend/src/components/trade/` contains one file, a README.
- **`F-BAR-30`** — the matcher has no fuzzy step. `"Ted McMillan"` → `[]`.
- **`F-BAR-34`** — **verified live: 30 requests then `429`**, on a bucket shared across
  `/api/players`, `/api/trade`, `/api/demo` and `/api/draft-assistant`, **per IP**. The client
  swallows every failure into an empty suggestion list, so a throttled search is pixel-identical
  to "this player does not exist". Two people reached that conclusion independently.

`F-BAR-29` is the twin at the other end of the same screen: an invented player name
(`"Zzzqx Notaplayer"`) came back with a VORP of −6.5, a scarcity tier, and an LLM paragraph
reasoning about "both players".

## The Tier 0 attempt — and why nothing landed

Six hypotheses for `F-BAR-12`, each its own build, install and hand-driven run:

| # | Hypothesis | Result |
|---|---|---|
| 1 | container-wide `.onTapGesture` | still broken |
| 2 | doubly-bound `@FocusState` | still broken |
| 3 | shared view identity (`.id(side)`) | still broken |
| 4 | `OmenTextField` itself | **exonerated** — a raw `TextField` in third position is equally dead |
| 5 | keyboard toolbar | still broken |
| 6 | `.scrollDismissesKeyboard` | still broken |

**All changes reverted.** Two are defensible on their own merits — removing the redundant tap
gesture, and a `focus:` parameter that eliminates an undefined double binding — but neither fixes
anything observable, and shipping unverified changes is the failure mode this session exists to
end. They are recorded as proposals in §21, not landed.

**The method was wrong, and that is the transferable lesson.** Six guesses inside a large view,
when a minimal reproduction — a `TabView` containing a `ScrollView` containing two `TextField`s —
would have bisected it in one. The next session's prompt starts there.

## Corrections this session made to its own record

Recorded because a correction written only where it was discovered is how the Yahoo failure
happened, twice.

- **§21 corrects §2.** `F-BAR-12` was stated as "breaks after adding one player". False — the
  second field never worked. The cause was inferred from test order and never controlled for.
- **§20 corrects §14.** The missing-player reports were attributed to the matcher and the missing
  web search. Incomplete — `F-BAR-34` renders identically and fits the founder's account better.
- **§16 withdrew a finding.** "IDP leagues are not supported" was recorded as a gap; ruling R-16
  makes it the product definition. The current `VALID_POSITIONS` filter is correct.
- **§19 corrected §12's cost estimate.** R-03's "weeks not days" framing applied to a reading of
  the thesis the founder did not choose.

## Verified true, needing no work

- **`R-17` — every active player, every draft class.** Measured: Aaron Rodgers (`sleeper:96`),
  Matthew Stafford (`421`), Travis Kelce (`1466`), Cam Ward (`12522`), Travis Hunter (`12530`),
  Tetairoa McMillan (`12526`); sampling reaches id `14039`. 24-hour cache TTL. Coverage was never
  the problem.
- **Two of the three deck widgets are genuinely fed** — the Ledger from `GET /api/moves`, League
  Pulse from `league-overview.v1`. Waiver Watch is the shrug.

## What this session did NOT verify

- **Never signed in.** Every device run was demo mode; every API probe unauthenticated.
- **`GET /api/yahoo/access-probe` returned `401`** — so the Yahoo entitlement was **not**
  independently reconfirmed. After a two-day stale-Yahoo incident, this is the most important
  unverified claim in the record.
- **`F-BAR-03` was never photographed** — demo short-circuits Trade before the verdict card.
- **The switcher's platform-grouped list was never rendered** — demo has one mock league, so
  `F-BAR-06` remains source-verified only.
- **No test suite was run** on either platform or the backend. Every test count quoted anywhere
  in the audit doc is from existing records and is **not** re-verified.
- **Four of ten screens never opened**: Account, Help + Support, Connect, and sign-up beyond the
  first field. **iOS light mode never tested at all.**
- **`F-BAR-31`** — whether `projected_points: null` is correct off-season suppression or an empty
  pipeline **cannot be determined from outside**. Check deliberately on **2026-09-05**.

## Next

`Blueprints/prompts/kickoff-2026-09-01-tier-0.md`. Tier 0, in order, starting with a minimal
reproduction rather than a seventh guess.
