# Omen Native Visual Lock v1 — dark-only, brass-led

**Status:** Proposed. Founder decisions recorded below are final; the two open items need a call before build.
**Date:** 2026-09-12
**Applies to:** SwiftUI iPhone app, Kotlin/Compose Android app.
**Amends:** `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` §2.2–2.3, `Blueprints/specs/design/component-lock-v1.md`.
**Reads:** `Brand/brand-system.md`, `mobile/android/core/designsystem/.../OmenColor.kt`, `.../OmenTypography.kt`.

> Authored in an unofficial Cowork session with no active trust assignment and no L0 tree present. No repo files were changed and no close-out gate was run. This is a proposal for the founder to route into a claimed sprint item.

---

## 1. Founder decisions (final)

| # | Decision | Date |
|---|---|---|
| D1 | **Dark only.** Ship no light theme until team schemes or seasonal schemes exist. | 2026-09-12 |
| D2 | **Brass-led.** Aged Brass is the sole brand-expression accent in app chrome. | 2026-09-12 |
| D3 | **Typeface is Wix Madefor** (Display + Text), replacing Alegreya Sans. | 2026-09-12 |
| D4 | **League tab mark is a crest/shield**, replacing the people glyph. | 2026-09-12 |
| D5 | Waiver rows state **the reason, the drop, and the net gain**, in the second person. | 2026-09-12 |
| D6 | **Smoky grey `#1F1F1D` ground confirmed.** Raven Black stays logo/marketing only. | 2026-09-12 |
| D7 | **Literal brass-only.** Verdigris, crimson, position and data-source hues are removed from the app. | 2026-09-12 |
| D8 | **Provider colours are the sole exception** — ESPN, Sleeper and Yahoo keep their committed brand hexes. | 2026-09-12 |

---

## 2. What D1 actually costs — smaller than it looks

`OmenDarkColors` already exists, is fully specified in registry §2.2, and is covered by `OmenColorTest` and `OmenColorContrastTest`. The screenshots that prompted this work were rendering `OmenLightColors` (`bg #F1EDE4`, warm parchment).

D1 is therefore mostly deletion:

1. Delete `OmenLightColors` and `lightDataSemantics` from `OmenColor.kt`.
2. Remove the system-scheme branch wherever the scheme is selected; return `OmenDarkColors` unconditionally.
3. Set `android:theme` / `UIUserInterfaceStyle` to dark so system chrome (status bar, keyboard, share sheets) matches.
4. Update `OmenColorTest` / `OmenColorContrastTest`: delete light assertions rather than let them assert a scheme that no longer ships.
5. Registry §2.2: mark the "Light / system" column **Withdrawn 2026-09-12 (D1)**. Do not delete the column — the values are the starting point when Whiteout or a seasonal pack returns.

**Do not** delete the `OmenColorScheme` data class or collapse it to constants. Team schemes and seasonal packs are named in registry §2.1 as future work, and that indirection is what makes them cheap later.

---

## 3. Ground: smoky grey stands

No change. `bg #1F1F1D`, surfaces `#2A2A27 / #343431 / #3F3F3B`, per the 2026-09-11 founder call.

Raven Black is **not** the app ground. The registry's measurements are the reason and they still hold: on `#0A0A0B`, Deep Crimson is 1.91:1 and Yahoo purple 1.55:1 against the background — both effectively invisible. `Brand/brand-system.md` keeps Raven Black as the logo and marketing ground; the two are different surfaces and should stay different.

---

## 4. Accent policy under D2 / D7 / D8

### 4.1 Brass owns all chrome

`accent #C4933B` (lifted from `#A67C2E` for the smoky ground) is the only brand-expression colour in the interface:

| Element | Token |
|---|---|
| Selected tab label + icon | `accent` |
| Active league chip fill | `accent` on `text-on-accent #14140F` |
| Add-league affordance | `accent`, dashed border |
| Your own team's crest well | `accent-muted #3A2A0A` with `accent` lettering |
| Confidence bar fill | `accent` |
| Carousel active dot | `accent` |
| Primary CTA | `accent`, `accent-hover #D8A648` pressed |
| Net-gain block | `accent-muted` fill, `accent` ink |
| Focus ring | `focus-ring` (accent @ 40%) |

Brass means **action and outcome** — a CTA, a claim, a net gain. It is never used for danger. That separation is what keeps a single accent legible.

A trailing score is `text-tertiary`; a leading score is `text-primary`. State is fill, weight and word.

### 4.2 Removed under D7

Deleted from the app (retained in `Brand/brand-system.md` for marketing):

- `omen #2F7D5B` / `omen-chip #4FAE81`
- `risk-high #7E1717`, `risk-low`, `risk-medium`
- `data-live / stub / mock / unavailable`
- `confidence-floor` / `confidence-ceiling`
- `pos-rb / wr / qb / te / def / k`

### 4.3 Retained under D8 — provider identity

`platform-espn-chip #B21826`, `platform-sleeper-chip #0F70B0`, `platform-yahoo-chip #410093`, with their `on-platform-*` white foregrounds. Values unchanged from what is committed.

**Required fix.** Provider colour is now the only hue in the app, so each chip must hold its own silhouette. Measured against `bg #1F1F1D`:

| Chip | vs ground | White on chip |
|---|---|---|
| ESPN `#B21826` | 2.40:1 | 6.88:1 |
| Sleeper `#0F70B0` | 3.12:1 | 5.30:1 |
| Yahoo `#410093` | **1.29:1** | 12.76:1 |

Yahoo is the same value as the card behind it — the fill vanishes and only the lettering renders. Lifting it to `#7C3AED` reaches 2.90:1 but abandons Yahoo's brand purple, which defeats the purpose of D8.

**Resolution:** keep all three declared hexes exactly as committed and add a `rgba(245,240,232,.22)` hairline to every provider chip. Uniform rule, brand hexes untouched, silhouette survives. Add a contrast case to `OmenColorContrastTest` asserting the hairline, not the fill, is what separates the chip from `surface-1`.

### 4.4 Non-hue encoding — required before the hues are deleted

Registry §1 already forbids colour being the only carrier of meaning, so every removed hue had a redundant carrier by contract. D7 makes that carrier the *sole* carrier, which raises the bar on each one.

| State | Treatment |
|---|---|
| Risk low | `text-tertiary` label, no container |
| Risk medium | outlined chip, `border`, `text-secondary` ink |
| Risk high | filled `surface-3`, `border` outline, `text-primary` ink, `▲` glyph, and the label names the injury ("Hamstring — game-time call") |
| Live | `text-primary` dot + label |
| Position | uppercase `text-tertiary` label beside the name |
| Confidence | brass bar + integer |

**Data-source labels are safety-critical, not cosmetic.** `AGENT.md` requires mock data to be clearly labelled and never presented as live advice. With colour gone the container does the work:

| Source | Treatment |
|---|---|
| Live | solid `surface-3`, `text-primary` |
| Stub / mock / sample | dashed `border` plus a 45° hatch fill — reads as provisional at any size |
| Unavailable | `text-tertiary`, struck through, hairline outline |

Do not ship D7 before these land. Deleting `data-stub` colour while the hatch treatment is still a mockup would leave mock data visually identical to live data, which is a safety-rule violation and a P0 in its own right.

## 5. Typography under D3

Replace Alegreya Sans at the existing seam in `OmenTypography.kt`. Do not add a second seam; registry §2.6 already forbids call sites referencing a family directly.

```
OmenFontFamilies.display  → Wix Madefor Display  (400 / 500 / 600 / 700 / 800)
OmenFontFamilies.text     → Wix Madefor Text     (400 / 500 / 600 / 700)
```

Role assignment across the ten locked roles in registry §2.4:

| Roles | Family |
|---|---|
| `display`, `h1`, `h2`, `h3`, `numeric` | Wix Madefor **Display** |
| `body`, `bodySmall`, `label`, `eyebrow`, `chip` | Wix Madefor **Text** |

Notes for the implementer:

- Wix Madefor **has a real 600**, so the SemiBold-declared-against-Bold workaround in the current file is deleted, not ported. Check the design canvas renders 600 as 600 before assuming parity with the approved artboards.
- Keep `tabularNumbers` on `numeric`. Scores and projections are columnar.
- Commit both families under `core/designsystem/src/main/res/font/` with `OFL.txt` intact, matching how Alegreya Sans was handled.
- iOS: add both to `mobile/ios/OmenIOS/OmenIOS/Fonts` and `UIAppFonts`; the PostScript names differ from the file names, so verify with a rendered screen rather than by inspection.
- Two families is a change from the one-family decision of 2026-09-07. It is justified only because they are optical cuts of one superfamily under one licence. Do not read it as permission to reintroduce a three-family split.

---

## 6. League mark under D4

Replace the people glyph with a shield/crest at 19dp / 19pt. Rationale: it reads as league instantly, and it rhymes with the crest tiles already used for teams in the matchup card — an internal echo the people glyph gave nothing back for.

Icon set consistency is a separate finding worth folding into the same ticket: the four tab glyphs currently mix outline and solid at different stroke weights. Pick one set, one weight.

---

## 7. Waiver row under D5

Structure, in order:

1. **Add** — player, position, team, projected points
2. **Drop** — player, position, team, projected points. Rendered at `text-tertiary` and one weight lighter.
3. **Reason** — one or two sentences, second person, at `text-secondary`
4. **Meta** — net-gain block, risk block when present, confidence number and bar

Copy rules:

- Second person. "Your WR3 spot has been costing you about six points a week."
- Name the cost of doing nothing, not only the benefit of acting.
- When there is no good drop, say so in the drop slot and say why in the reason. A row that says *hold off, nothing to do today, I'll flag it Friday* is what makes the other rows credible.
- Never three rows all reading "Claim."
- The confidence gradient meter currently shipping is removed. A gradient encodes nothing the number does not already say.

---

## 8. Also found — not part of this spec, worth tickets

| Finding | Where |
|---|---|
| Raw UUID shown as "Signed in" in the Account sheet | Account sheet |
| Raw enum `START_SIT` in user-facing Ledger copy | Ledger row |
| Content scrolls under the floating tab bar; missing bottom safe-area inset | Omen destination |
| `AGENTS.md` / brand drift: the shipping app uses a pastel set that appears nowhere in `Brand/brand-system.md` | truth-gate candidate |

The last one is a documentation-truth issue as much as a design one, and is the kind of thing `truth-gate.mjs` exists to catch.

---

## 9. Registry amendment required before any code changes

D7 contradicts registry §2.1, which classes data-semantic tokens — risk, data-source, confidence, position, platform — as an invariant **no theme pack may change**. That clause exists for a good reason and it should be amended deliberately rather than quietly overridden by a build.

The amendment to write:

1. §2.1 — split the data-semantic row. `platform` stays invariant (D8). `risk`, `data-source`, `confidence` and `position` move to **"invariant in meaning, not in colour"**: the state must always be unambiguous, but its carrier may be form rather than hue.
2. §2.3 — replace the colour table for those families with the form table in §4.4 above.
3. §2.2 — mark the "Light / system" column **Withdrawn 2026-09-12 (D1)**, values retained for future packs.
4. Record D1 and D6–D8 in `Direction/decision_log.md`, with the Yahoo measurement as the evidence for §4.3.

Without this, the next agent reading the registry will correctly put crimson back.

**Remaining founder call:** §5 — confirm the two-cut Wix Madefor superfamily is an acceptable amendment to the 2026-09-07 one-family decision.

---

## 10. Close-out gates — NOT RUN

This session had no L0 tree and no write authority. All four gates are **NOT RUN**, not passing:

```
node scripts/check-sprint-staleness.js                        NOT RUN
node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet  NOT RUN (no L0)
node ../../Blueprints/tools/valor-brain/validate.mjs           NOT RUN (no L0)
node scripts/check-kickoff-drift.js                            PASS (13 entries, run in a standalone clone)
```
