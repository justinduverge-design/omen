# Registry Amendment 01 — dark-only, brass-only, Wix Madefor

**Amends:** `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` (M0b, approved 2026-07-19)
**Sections touched:** §2.1, §2.2, §2.3, §2.4
**Authority:** founder decisions D1–D8, 2026-09-12. Brand identity and typeface choice are reserved to the founder by the standing design grant.
**Date:** 2026-09-13

> Drafted in an unofficial Cowork session — no active trust assignment, no L0 tree, no repo write, no gate run. Apply by hand or route into a claimed sprint item.

---

## Why this amendment exists

Three founder decisions of 2026-09-12 cannot be implemented under the registry as written:

1. **D1 dark-only** conflicts with §2.2's two-column light/dark token table.
2. **D7 literal brass-only** conflicts with §2.1, which classes data-semantic tokens as an invariant **no theme pack may change**, and with §2.3, which fixes them as specific hues.
3. **D3 Wix Madefor** conflicts with §2.4, which is already two decisions stale — it still specifies the three-family Alegreya Sans / Alegreya / DM Mono split that the founder collapsed on 2026-09-07.

§2.1's invariant clause exists for a good reason and is being narrowed deliberately, not overridden quietly.

---

## §2.1 — Layering model

**Replace the `Data-semantic invariant` row.** Split it in two.

| Layer | Meaning | May a theme pack change it? |
|---|---|---|
| **Provider identity** | ESPN, Sleeper, Yahoo brand marks and chip fills | **never** — D8 |
| **Data-semantic** | risk, data-source, confidence, position | **invariant in meaning, not in colour.** The state must always be unambiguous. Its carrier may be form — fill, weight, border, glyph, wording — rather than hue. A pack may not change what a state *means*, may not remove its carrier, and may not make two states indistinguishable. |

**Add, immediately below the table:**

> **Amendment 01, 2026-09-13 (D7).** The original row read "never" for the whole data-semantic family and is narrowed here. This is not permission to drop the state — §1's rule that *colour is never the only carrier of meaning* now runs in the other direction as well: under D7 the non-colour carrier is frequently the **only** carrier, which raises rather than lowers the bar on it. Every treatment in §2.3 is mandatory, and a state shipped without its carrier is a P0.

---

## §2.2 — Core semantic tokens

**Column header change.** Rename the second value column to:

`Light / system — WITHDRAWN 2026-09-13 (D1)`

**Do not delete the column.** Its values are the starting point when Whiteout or a seasonal pack returns, and §2.1 names both as future work.

**Add, below the smoky-grey note:**

> **Dark-only, 2026-09-13 (D1).** Omen native ships one scheme until team schemes or seasonal packs exist. `OmenLightColors` and `lightDataSemantics` are removed from `OmenColor.kt`; the scheme selector returns `OmenDarkColors` unconditionally; `android:theme` and `UIUserInterfaceStyle` are set to dark so system chrome matches. **`OmenColorScheme` stays a data class** — collapsing it to constants would make the packs in §2.1 expensive to reintroduce, which is the whole reason the indirection exists.

**Add a row to the token table:**

| Token | Role | Dark |
|---|---|---|
| `provider-chip-ring` | hairline on every provider chip | `rgba(245,240,232,.38)` |

> Yahoo `#410093` measures **1.29:1** against `bg #1F1F1D` — the fill is the same value as the surface behind it, so only the white lettering renders and the chip loses its silhouette. ESPN is 2.40:1 and Sleeper 3.12:1; all three are shallow. Lifting Yahoo to `#7C3AED` reaches 2.90:1 but abandons Yahoo's brand purple, which defeats D8. The ring is applied uniformly to all three so the rule has no exceptions. `OmenColorContrastTest` asserts that the **ring**, not the fill, separates the chip from `surface-1`.
>
> **Corrected 2026-09-13 by the accessibility pass.** The first draft of this amendment specified `.22`, which composites to `#575651` over `surface-1` and measures **1.96:1** — too faint to restore the silhouette it was written to restore. `.38` composites to `#777570` and measures **3.13:1**, clearing the 1.4.11 non-text floor. The test asserts the ratio, not the alpha, so the value can be tuned without weakening the guarantee.

---

## §2.3 — Data-semantic tokens

**Retitle:** `### 2.3 Data-semantic tokens — provider identity by colour, all else by form`

**Keep unchanged:** the `Platform brand` row in full, including `platform-sleeper-chip #0F70B0`, `platform-yahoo-chip #410093`, `platform-espn-chip #B21826` and the `on-platform-*` foregrounds. Add the `provider-chip-ring` requirement to its Note column.

**Remove** the `Risk`, `Data source`, `Confidence gradient`, `Position chips` and `Demo accent` rows from the app token set. They remain in `Brand/brand-system.md` for marketing. Deleted from `OmenColor.kt`: `omen`, `omen-chip`, `risk-low/medium/high`, `data-live/stub/mock/unavailable`, `confidence-floor/ceiling`, `pos-*`, `demo-text`, `demo-text-secondary`.

**Replace them with this table.**

| State | Carrier | Treatment |
|---|---|---|
| Risk · low | type | `text-tertiary`, uppercase label, no container |
| Risk · medium | outline | `border` outlined chip, `text-secondary` ink |
| Risk · high | fill + glyph + wording | `surface-3` fill, `border` outline, `text-primary` ink, leading `▲`, and the label **names the risk** ("Hamstring — game-time call"), never the word "high" alone |
| Live | mark | `accent` dot in a `rgba(196,147,59,.2)` halo, beside a `text-primary` label |
| Position | type | uppercase `text-tertiary` label beside the player name |
| Confidence | band | `Confident / Leaning / Coin flip`, a 14×2px `accent` rule preceding the word. **No numeral, no bar, no gradient** — see the omen-decision-brief amendment |
| Data source · live | fill | solid `surface-3`, `text-primary` |
| Data source · stub / mock / sample | outline + hatch | dashed `border` plus a 45° `rgba(245,240,232,.06)` hatch |
| Data source · unavailable | strike | `text-tertiary`, struck through, hairline outline |

**Add, below the table:**

> **Ship order is not optional.** The data-source treatments are safety-bearing: `AGENT.md` requires mock data to be clearly labelled and never presented as live advice, and colour was doing that job. **`data-stub` and `data-mock` may not be deleted from `OmenColor.kt` in any commit that does not also land the hatch and dashed treatments as locked components.** A commit that removes the colour first leaves mock data visually identical to live data — a P0, not a cosmetic regression.

**Replace the closing rule with:**

> **Rule:** team theming, moment overlays and theme packs run in surfaces, accents, chip fills and chant frames. They may not touch provider identity at all, and may not weaken any carrier in the table above.

---

## §2.4 — Typography tokens

This section is two decisions behind. It still specifies the three-family split the founder collapsed on 2026-09-07, and `OmenTypography.kt` already disagrees with it.

**Replace the font-stack paragraph with:**

> **Wix Madefor, founder decision 2026-09-12 (D3).** One superfamily, two optical cuts: **Wix Madefor Display** (400/500/600/700/800) for headings, scores and tab labels; **Wix Madefor Text** (400/500/600/700) for body, reasoning, labels and metadata. SIL Open Font License 1.1, committed with `OFL.txt` intact under `core/designsystem/src/main/res/font/` and `mobile/ios/OmenIOS/OmenIOS/Fonts`.
>
> This supersedes the Alegreya Sans / Alegreya / DM Mono split of 2026-07-19 **and** the single-family Alegreya Sans decision of 2026-09-07. Two cuts of one superfamily under one licence is not a return to the three-family split, and must not be read as permission to reintroduce one.

**Replace the Font column in the role table:**

| Role | Font | Size / Line | Weight |
|---|---|---|---|
| `display` | Wix Madefor **Display** | 48/56 | 800 |
| `h1` | Wix Madefor **Display** | 32/40 | 800 |
| `h2` | Wix Madefor **Display** | 20/28 | 700 |
| `h3` | Wix Madefor **Display** | 16/24 | 600 |
| `body` | Wix Madefor **Text** | 15/24 | 400 |
| `body-sm` | Wix Madefor **Text** | 13/20 | 400 |
| `label` | Wix Madefor **Text** | 12/16 | 500 (+0.05em) |
| `eyebrow` | Wix Madefor **Text** | 12/16 | 700 (+0.16em, upper) |
| `chip` | Wix Madefor **Text** | 11/14 | 700 (+0.12em, upper) |
| `numeric` | Wix Madefor **Display** | contextual | 800, `tnum` |

**Replace the role-split paragraph with:**

> **Role split (Amendment 01):** Display = headings, scores, tab labels, the Omen call. Text = body, reasoning, labels, metadata. Preserve the hierarchy through platform font-fallback; all roles scale with Dynamic Type and Android font scale.
>
> **Wix Madefor has a real 600.** The SemiBold-declared-against-Bold workaround in `OmenTypography.kt`, written because Alegreya Sans ships no 600, is deleted rather than ported. Verify against a rendered screen that 600 resolves as 600 before assuming parity with the approved artboards.
>
> iOS: PostScript names differ from file names. Verify with a build, not by inspection.

---

## Files this amendment obliges

| File | Change |
|---|---|
| `omen-native-design-system-registry-v1.md` | §2.1, §2.2, §2.3, §2.4 as above |
| `mobile/android/core/designsystem/.../OmenColor.kt` | delete light scheme + removed families; add `provider-chip-ring` |
| `mobile/android/core/designsystem/.../OmenTypography.kt` | Wix Madefor two-cut seam; delete the 600 workaround |
| `OmenColorTest.kt`, `OmenColorContrastTest.kt` | delete light assertions; add the ring case |
| `component-lock-v1.md` | lock the §2.3 form treatments as components |
| `Direction/decision_log.md` | record D1, D6, D7, D8 with the Yahoo measurement as evidence |
| `Brand/brand-system.md` | no change — Raven Black stays the logo ground, retired hues stay for marketing |

---

## Two things this amendment does not decide

1. **Platinum `#C7CBD1` for the favourite star.** Founder-approved 2026-09-05 so a starred team reads as *marked* rather than as a second call-to-action. Under literal brass-only it is a second colour, but its chroma is nearly nil and it does exactly the job D7 needs. **Recommend adding it to §2.1 as a named exception beside provider identity**, scoped to favourite and selection marks only — never text, never borders. Not written into the amendment above because it is a founder call.
2. **`Add league` was specified Verdigris** in `omen-league-switcher-contract-v1.md`. Verdigris is removed here, so that control becomes brass. That is a switcher-contract edit, not a registry one, and is listed in the contract audit.
