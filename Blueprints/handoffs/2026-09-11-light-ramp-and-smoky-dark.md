# 2026-09-11 — Warm light ramp, smoky dark ground, readable platform chips

Branch `design/warm-light-ramp`, two commits: `c52f5fd` (light ramp + gates) and `bdc9882`
(smoky dark + chips). Not merged, not pushed, not deployed.

## What the founder asked for

Two asks, a day apart, and the second arrived mid-session:

- 2026-09-10: "it's lacking colour in light mode, maybe we use more of the approved colours."
- 2026-09-11, on seeing the result: "what if instead of, like, full dark mode, like, black, what
  if we go, like, almost gray, like a smoky gray? I know that's changing stuff that's, like,
  fundamental to [Omen], but I am the founder."

The second is a brand-identity move, reserved to the founder by the standing design grant. He
made it explicitly. Recorded in `Direction/decision_log.md` and registry §2.2.

## What shipped

**Light neutrals now derive from the brand.** The ramp was Tailwind's cold grey —
`#FAFAF9 / #FFFFFF / #F5F5F4` split by `#E5E5E3`, with blue-grey `#6B7280` / `#9CA3AF` text on
a brass-and-umber brand. Now parchment `#F1EDE4`, warm white `#FFFDF9`, umber-tinted borders,
warm muted text, derived from Bone White and Weathered Umber. No brand hex was replaced.

**Dark ground is smoky grey `#1F1F1D`**, surfaces `#2A2A27 / #343431 / #3F3F3B`. Shallow end,
chosen against the brand colours rather than by eye — see the depth table in registry §2.2.
Brass lifted to `#C4933B`, verdigris to `#4FAE81` to hold AA on the lighter ground.

**Platform chips fill with the brand and reverse to white.** Treatment changed; no brand hex
moved.

## Two real defects found, neither of them the thing I was asked to do

**`border` was a control boundary at 1.08:1.** It is the entire visible edge of
`OmenTextField`, `OmenPicker`, `OmenOtpCodeField`, the outlined `OmenButton` variants and
Material's `outline` — 1.08:1 light, 2.25:1 dark, against WCAG 1.4.11's 3:1. Now clears 3:1 in
both themes on every surface a control sits on. `border-subtle` keeps the decorative job and
is explicitly not held to that floor.

**Yahoo's filter chip was 1.33:1 and had shipped.** The chips drew the raw brand hex as a label
over a 15% wash of itself. Yahoo `#410093` is a deep purple; it landed within 1.33:1 of
`surface-1`. ESPN was 3.47:1. An unreadable filter control, in production, for months.

## Why no existing test could see either

`OmenColorTest` asserts a token equals a hex. It was green throughout the entire life of both
bugs, because in both cases **the token held exactly the hex it was supposed to hold.** A
pinned hex is a pinned hex whether or not anyone can read it.

Two gates added, both proven red before being trusted:

- `OmenColorContrastTest` computes WCAG ratios from the token values, so it fails on the
  *consequence* of a value rather than the value. Injected the shipped `#E5E5E3` border,
  `#9CA3AF` tertiary and `#16A34A` risk-low; watched it fail on exactly those three; restored;
  watched it pass.
- `scripts/check-token-parity.js` diffs the two hand-maintained token files, which nothing
  compiles together. Proven red against an injected one-digit drift and a deleted token.

`.github/workflows/native-tokens.yml` runs both. **That workflow is the one piece of this
outside the visual-design grant** — it is delivery infrastructure. Flagged to the founder at
the time; he did not object, but he also did not explicitly bless it. Drop it if you would
rather gate elsewhere; the script and the test stand on their own.

## The iOS screenshot fixture had been lying since 2026-09-01

`CommandCenterView` got `.tint(OmenColor.accent)` on 2026-09-01, for exactly the bug of the
selected tab rendering in iOS system blue. **The screenshot host never got the same fix.** So
every iOS capture from that date until this session showed a blue tab bar the shipped app has
never rendered — evidence of the fixture rather than of the product. Android's host was correct
throughout.

It was found only because the warm light ground made the blue impossible to ignore. This is the
exact failure the "know which branch your fixture exercises" rule exists for, and it survived a
month of captures. **If the real shell's chrome changes, change the screenshot host in the same
edit** — there is no test that couples them.

## Verified / not verified

Verified: Android unit suites green (full `testDebugUnitTest`); iOS `OmenIOSTests` 463 green
(1 skipped); token contrast and parity gates green; both platforms built, installed and
captured — 24 screens at `output/screens/2026-09-11-180100/` (both platforms, both themes, six
scenarios) plus dark recaptures at `output/screens/2026-09-11-smoke/`.

**Not verified:** no real device. Light mode was not recaptured after the smoky-dark commit
(light tokens are untouched by it, but that is an argument, not evidence). Android instrumented
tests were not run. Dynamic Type reflow was not re-run — this pass changed colour, not metrics.
Only the six registered scenarios have evidence; anything outside them has none.

## Known residuals, recorded not fixed

- `border` is 2.78:1 on dark `surface-3` and 3.13:1 on light `surface-3`. No control is drawn
  on `surface-3` (progress/confidence track, disabled container, neutral badge fill).
- Crimson and verdigris are **fills, not ink** — see the standing rule in registry §2.2. The
  founder wants more of both on screen and that work is not done; it is composition across
  screens, not tokens.

## Carried forward

`Direction/current_sprint.md` now holds `X2-PulseToLeague` (founder: move League Pulse onto the
League page, later — cross-screen structure, gated), the founder's stated order of work after
this beta, and the **tabled colourway question** including his own half-idea: "maybe we only use
the green and the red for the score."

**The founder has a matchup-carousel screenshot he intends to mark up. He mentioned it; he did
not send it. Do not start that work from a guess — ask for the screenshot.**
