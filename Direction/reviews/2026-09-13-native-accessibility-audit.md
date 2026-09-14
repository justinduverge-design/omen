# Accessibility Audit — Omen native artboards

**Standard:** WCAG 2.1 AA · **Date:** 2026-09-13 · **Scope:** the eight locked artboards on the dark-only brass system

**Issues found:** 4 · Critical 0 · Major 3 · Minor 1

Contrast values below are computed, not estimated. Ratios are against `bg #1F1F1D` unless the row says `surface-1 #2A2A27`.

---

## Colour contrast

| Element | Foreground | Background | Ratio | Required | Pass |
|---|---|---|---|---|---|
| Primary text | `#F5F0E8` | bg | **14.55:1** | 4.5 | ✅ |
| Reasoning copy | `#BDB5A9` | bg | **8.13:1** | 4.5 | ✅ |
| Metadata, trailing score | `#A79E90` | bg | **6.24:1** | 4.5 | ✅ |
| Metadata on a card | `#A79E90` | surface-1 | **5.44:1** | 4.5 | ✅ |
| Brass accent text | `#C4933B` | bg | **5.96:1** | 4.5 | ✅ |
| Brass pressed | `#D8A648` | bg | **7.44:1** | 4.5 | ✅ |
| Ink on brass CTA | `#14140F` | `#C4933B` | **6.67:1** | 4.5 | ✅ |
| Control border | `#8A8272` | bg | **4.34:1** | 3.0 | ✅ |
| White on ESPN chip | `#FFFFFF` | `#B21826` | **6.88:1** | 4.5 | ✅ |
| White on Sleeper chip | `#FFFFFF` | `#0F70B0` | **5.30:1** | 4.5 | ✅ |
| White on Yahoo chip | `#FFFFFF` | `#410093` | **12.76:1** | 4.5 | ✅ |
| Platinum star, on | `#C7CBD1` | surface-1 | **8.84:1** | 3.0 | ✅ |
| **Provider ring @ .22** | `#575651` | surface-1 | **1.96:1** | 3.0 | ❌ **A1** |
| **Star, off** | `#4A4A4E` | surface-1 | **1.63:1** | 3.0 | ❌ **A2** |
| `border-subtle` hairline | `#3A3A36` | bg | 1.45:1 | — | n/a — decorative, and the registry already forbids it being a control's only edge |
| `surface-3` step | `#3F3F3B` | bg | 1.56:1 | — | n/a — never the sole carrier; every use pairs it with `border` or a text-colour change |

The removal of colour as a carrier did **not** cost any contrast. Every state that used to lean on a hue now leans on ink that measures better than the hue did.

---

## Findings

### A1 · Provider chip ring is too faint to do its job — 1.4.11, Major. **Fixed.**

Registry Amendment 01 introduced `provider-chip-ring` to restore the chip silhouette that Yahoo loses at 1.29:1. At `rgba(245,240,232,.22)` the ring composites to `#575651` over `surface-1` and measures **1.96:1** — it does not restore anything.

**Fix applied:** `.38`, compositing to `#777570`, **3.13:1**. The amendment is updated. `OmenColorContrastTest` should assert the measured ratio rather than the alpha value, so the value can be tuned later without weakening the guarantee.

*Worth naming: this was a defect in my own amendment, found only because the ratio was computed rather than eyeballed. A ring that looks present at desk-brightness is not present at 3:1.*

### A2 · Unstarred favourite is invisible — 1.4.11, Major. **Open.**

`omen-league-switcher-contract-v1.md` §3 specifies the off-state star as `#4A4A4E`, which measures **1.63:1** on `surface-1`. A user cannot see the control they are meant to tap to create a favourite — the affordance only becomes visible after it has been used.

**Recommendation:** `#7A766E` (3.18:1) or the existing `border` token `#8A8272` (3.78:1). Both stay quiet against the filled Platinum state, which sits at 8.84:1 — the on/off distinction remains obvious. Switcher-contract edit, not a registry one.

### A3 · Switcher `+` and chevron are under 44pt — 2.5.5, Major. **Open.**

At 18px and 11px glyphs with ~6px padding, both land near 30pt. The `+` is the only control that adds a league; the switcher contract already records that burying it was "wrong on its own terms."

**Recommendation:** pad the hit area to 44×44 without changing the glyph size. Same for the sheet's star column, currently a 20px track — the contract calls for two hit targets per row, and the smaller one has to be reachable.

### A4 · Scoreboard numerals break first at 200% — 1.4.4, Minor. **Open.**

The 27/22px scoreboard numerals are the tightest-fitting element on any screen. At 200% Dynamic Type the three-column row (crest · name · score) will collide before anything else does.

**Recommendation:** document the behaviour rather than discover it — either cap the numeral's scale factor with the name and record wrapping beneath, or let the row become two lines. Registry §2.4 already requires all roles to scale, so the answer must be a defined layout, not a fixed size. `OmenMatchupHeroLayoutTest` already asserts non-clipping at 2.0× for the old hero; extend it to the new spine.

---

## Non-colour encoding — verified

This is the part D7 put at risk, and it holds.

| State | Carriers | Distinct without colour? |
|---|---|---|
| Risk low / medium / high | type → outline → fill + border + `▲` + named cause | ✅ three clearly separated levels |
| Live | dot + halo + word | ✅ |
| Confidence | word + a 14×2px rule | ✅ three named bands |
| Position | uppercase label | ✅ |
| Data source | solid / dashed + hatch / struck through | ✅ — and the hatch survives greyscale, which the old colour coding did not |
| Provider | mark + name in words | ✅ |
| Leading vs trailing score | size **and** ink weight | ✅ — improved this session; size alone now tells you who's ahead |

Simulated greyscale: every state above remains distinguishable. That was not true of the shipped build, where `risk-low #34C759` and `data-live #34C759` were the same colour doing two jobs.

---

## Screen reader notes

| Element | Should announce as | Risk if unlabelled |
|---|---|---|
| Switcher row | "Titans of Slopsilonia, ESPN, Slops Saloon. Button. Opens team switcher." | Announcing only the team name hides that it is interactive |
| Favourite star | "Favourite. Toggle. On/Off." | Nested inside the row button — must not be swallowed by the parent |
| Confidence band | "Confidence: Confident" | The 14×2px rule is decorative and must be `aria-hidden` |
| Scoreboard | "You, Titans of Slopsilonia, 64.8. Opponent, Gibbs me some Rice, 51.2." | Reading the numbers without the roles is meaningless |
| `▲` risk glyph | Decorative — the label carries the meaning | Announcing "black up-pointing triangle" is noise |
| Hatch on sample data | The word "Sample data" must be real text | If the hatch is the only signal, a screen-reader user gets mock data with no warning — the same P0 the ship-order clause guards against |

---

## Priority

1. **A2** — a control nobody can see. One token value.
2. **A3** — two hit areas, no visual change.
3. **A4** — define the behaviour before someone finds it at 200%.
4. A1 is done.
