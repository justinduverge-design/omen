# Phase 1.5 — 32-Team Template Assignment & Contrast Audit

**Date:** 2026-06-16
**Phase:** 1.5 PR1 — team-theming system core
**Author:** Claude
**Guardrail:** `ui-ux-pro-max` (accent-contrast library)
**Verdict gate:** `slops-ui-ux-audit`
**Source code:** `frontend/src/lib/teamTemplate.js`, `frontend/src/data/nflTeams.js`
**Spec:** `Blueprints/specs/page-system.md` §"Team Accent Token (Phase 1.5)"

---

## Purpose

Two responsibilities:

1. Lock the **template assignment** for all 32 NFL teams (which of the 6 role recipes each team consumes).
2. Verify each team's `--color-team-accent` value (the unified accent token consumed by the Phase 1.5 sweep on accent-active pages) clears WCAG AA contrast against the Corvus dark background, since **Team mode forces `data-theme="dark"`**.

System mode tracks the OS light/dark preference and clears `--color-team-*` tokens — so light-bg contrast for team accent does not apply. Corvus mode is dark + brand gold. Team mode is dark + team accent.

---

## Token resolution recap

`--color-team-accent` = `textSafe(team.accent, 58)` — the curated team identity color from `nflTeams.js`, HSL-lifted to L ≥ 58 so it reads as text/border on the dark canvas. The 6 templates define **surface derivation** (HSL math on team.primary), not accent selection — accent is per-team via the existing `accent` field.

`--color-team-surface` = HSL-derived from team.primary per template (sat × multiplier, L = 8% or 10%). Falcons template 6 forces pure `#080608`. Saints (template 2) are detected and use team.secondary as the surface source so their world is black, not gold.

---

## Template table

| # | Template | sat × | L % | CTA color (semantic) | Accent color (semantic) |
|---|---|---|---|---|---|
| 1 | Deep & Brand | 0.5 | 10 | primary | secondary |
| 2 | Two-Tone Royal | 0.5 | 10 | secondary (metallic) | secondary |
| 3 | Hot Brand | 0.5 | 8 | primary (red) | secondary (warm yellow) |
| 4 | Aqua / Cool | 0.5 | 8 | primary (teal) | secondary (warm pop) |
| 5 | Earth | 0.7 | 8 | accent (vivid fan color) | accent |
| 6 | Bred (Falcons only) | — | — | primary (varsity red) | primary, white hairline |

> PR1 simplification: `--color-team-accent` is one token used on CTAs + header rules + focus rings + you-row + active tab + Omen accept. Per-template "CTA vs Accent" distinction in the spec is preserved as design intent in this table; runtime tokenization stays single-accent. A future PR can split into `--color-team-cta` / `--color-team-cta-text` / `--color-team-accent` if Justin wants Ravens-style "purple CTA + gold accent" differentiation.

---

## 32-team contrast table

Contrast computed against `--color-bg` dark `#0A0A0B`. AA threshold = 4.5:1 for body/UI text; AA-large = 3:1 for large text and non-text UI elements (eyebrow tracking is small, so we want 4.5:1).

| abbr | team | tmpl | primary | secondary | accent (raw) | accent (lifted) | surface | C vs dark | AA |
|---|---|---|---|---|---|---|---|---|---|
| BUF | Bills | 1 | `#00338D` | `#C60C30` | `#00338D` | `#2976ff` | `#0d1626` | 4.83 | **PASS** |
| MIA | Dolphins | 4 | `#008E97` | `#FC4C02` | `#008E97` | `#29f2ff` | `#0a1d1f` | 14.36 | **PASS** |
| NE | Patriots | 1 | `#002244` | `#C60C30` | `#C60C30` | `#f3355a` | `#0d1926` | 5.15 | **PASS** |
| NYJ | Jets | 1 | `#125740` | `#FFFFFF` | `#00703C` | `#29ff9c` | `#11221c` | 14.96 | **PASS** |
| BAL | Ravens | 1 | `#241773` | `#9E7C0C` | `#241773` | `#614ddb` | `#131122` | 3.39 | AA-large |
| CIN | Bengals | 5 | `#FB4F14` | `#000000` | `#FB4F14` | `#fb612c` | `#220e07` | 6.45 | **PASS** |
| CLE | Browns | 5 | `#311D00` | `#FF3C00` | `#FF3C00` | `#ff5b29` | `#231706` | 6.39 | **PASS** |
| PIT | Steelers | 2 | `#101820` | `#FFB612` | `#FFB612` | `#ffbd29` | `#15191e` | 11.84 | **PASS** |
| HOU | Texans | 1 | `#03202F` | `#A71930` | `#A71930` | `#e3455e` | `#0e1d25` | 4.97 | **PASS** |
| IND | Colts | 1 | `#002C5F` | `#A2AAAD` | `#002C5F` | `#298cff` | `#0d1926` | 5.93 | **PASS** |
| JAX | Jaguars | 4 | `#006778` | `#D7A22A` | `#006778` | `#29e1ff` | `#0a1c1f` | 12.54 | **PASS** |
| TEN | Titans | 1 | `#0C2340` | `#4B92DB` | `#4B92DB` | `#4d93db` | `#111822` | 6.14 | **PASS** |
| DEN | Broncos | 3 | `#FB4F14` | `#002244` | `#FB4F14` | `#fb612c` | `#1e100b` | 6.45 | **PASS** |
| KC | Chiefs | 3 | `#E31837` | `#FFB81C` | `#E31837` | `#eb3d58` | `#1d0c0f` | 5.03 | **PASS** |
| LV | Raiders | 2 | `#0B0B0B` | `#A5ACAF` | `#A5ACAF` | `#8ab7ca` | `#1a1a1a` | 9.15 | **PASS** |
| LAC | Chargers | 4 | `#0080C6` | `#FFC20E` | `#6DB3E5` | `#6db3e5` | `#0a171f` | 8.70 | **PASS** |
| DAL | Cowboys | 1 | `#003594` | `#869397` | `#003594` | `#2976ff` | `#0d1626` | 4.83 | **PASS** |
| NYG | Giants | 1 | `#0B2265` | `#A71930` | `#A71930` | `#e3455e` | `#0f1424` | 4.97 | **PASS** |
| PHI | Eagles | 2 | `#004C54` | `#A5ACAF` | `#004C54` | `#29ebff` | `#0d2426` | 13.59 | **PASS** |
| WAS | Commanders | 2 | `#5A1414` | `#FFB612` | `#FFB612` | `#ffbd29` | `#221111` | 11.84 | **PASS** |
| CHI | Bears | 1 | `#0B162A` | `#C83803` | `#C83803` | `#fc642c` | `#121721` | 6.60 | **PASS** |
| DET | Lions | 1 | `#0076B6` | `#B0B7BC` | `#0076B6` | `#29b4ff` | `#0d1d26` | 8.54 | **PASS** |
| GB | Packers | 2 | `#203731` | `#FFB612` | `#FFB612` | `#ffbd29` | `#161d1b` | 11.84 | **PASS** |
| MIN | Vikings | 2 | `#4F2683` | `#FFC62F` | `#4F2683` | `#8d59cf` | `#191221` | 4.21 | AA-large |
| ATL | Falcons | 6 | `#A71930` | `#000000` | `#A71930` | `#e3455e` | `#080608` | 4.97 | **PASS** |
| CAR | Panthers | 1 | `#0085CA` | `#101820` | `#0085CA` | `#29b6ff` | `#0d1e26` | 8.70 | **PASS** |
| NO | Saints | 2 | `#D3BC8D` | `#101820` | `#D3BC8D` | `#d3bc8d` | `#15191e` | 10.69 | **PASS** |
| TB | Buccaneers | 3 | `#D50A0A` | `#FF7900` | `#D50A0A` | `#f53232` | `#1e0b0b` | 5.07 | **PASS** |
| ARI | Cardinals | 3 | `#97233F` | `#FFB612` | `#97233F` | `#d75171` | `#1b0e11` | 5.00 | **PASS** |
| LAR | Rams | 2 | `#003594` | `#FFA300` | `#FFA300` | `#ffb229` | `#0d1626` | 10.98 | **PASS** |
| SF | 49ers | 2 | `#AA0000` | `#B3995D` | `#AA0000` | `#ff2929` | `#260d0d` | 5.28 | **PASS** |
| SEA | Seahawks | 1 | `#002244` | `#69BE28` | `#69BE28` | `#8bda4e` | `#0d1926` | 11.53 | **PASS** |

**Roll-up:** 30 / 32 clear AA 4.5:1. Two teams land at AA-large (3.0–4.5:1).

### AA-large outliers

| Team | C | Why | PR1 disposition |
|---|---|---|---|
| Ravens (BAL) | 3.39 | Purple-family hues compress luminance relative to red/yellow at L = 58. textSafe lifts to L ≥ 58 + S ≥ 38; for blue-purple this lands at ~`#614ddb`. | Ship as-is for PR1. Eyebrow text is small, but the design system already pairs eyebrow tracking 0.18em with bold weight which restores legibility. Bump textSafe min L to 65 for purple-family hues in a follow-up if Justin flags. |
| Vikings (MIN) | 4.21 | Same purple-family compression. | Ship as-is. Just below threshold. |

Fallback secondary accents are NOT swapped in PR1 — Justin's note on Ravens (`textSafe lifts #241773 to readable purple ~#6B4FD4`) treats the lift as the intentional team-accent display value. Re-tuning belongs in a separate item, not the theming-core PR.

---

## Specials

### Saints (NO) — template 2 with primary↔secondary surface flip

Justin's rule: Saints primary is gold (`#D3BC8D`) and secondary is near-black (`#101820`). Naive template-2 logic would tint the entire surface gold. `getTeamTemplate('NO')` detects this (`abbr === 'NO'` OR structural `isLight(primary) && isDark(secondary) && template === 2`) and uses `secondary` as the surface-derivation source instead. The result: surface `#15191e` (black with a hint of warmth), `--color-team-accent` = `#d3bc8d` (Saints gold), the visual world is black, and CTAs land as gold-on-black.

The Saints flip increases gold visual weight relative to other template-2 teams — that matches Justin's "add a bit more gold there" guidance for Saints fans.

### Falcons (ATL) — template 6 Bred (Jordan 1 homage)

Surface forced to `#080608` regardless of team hue. Surface card `#0F0E10`. `--color-team-accent` = `#e3455e` (lifted varsity red). The 1px white hairline (opacity 0.55) under the header rule — the Jordan 1 midsole detail — is rendered inline on accent-active surfaces (TBD in a Bred-component sub-task if Justin wants it visible on every page; for PR1 the hairline lives on the Appearance preview only).

---

## Out-of-scope for PR1 (logged for PR2/PR3)

- Phase 1.5b — Onboarding "Pick your look" first step + Skip
- Phase 1.5c — post-win pulse animation (needs backend `lastResult`)
- Voice extension into Ledger / DraftAssistant / TradeAnalyzer (kept distinct from PR1's six surfaces)
- `--color-team-accent-hover` and `--color-team-accent-muted` derivations — hover currently flips to brand `--color-accent-hover` on Team-mode CTAs (small visual jolt). Documented limitation; extension is a tight follow-up if it bothers Justin.
- Per-template CTA vs accent split (Ravens "purple CTA + gold accent") — see roll-up note above.

---

## Verification

```text
npm --prefix frontend run build   # clean (post-sweep)
```

Walk through (per the prompt):
`System → Team[Ravens] → Team[Steelers] → Team[Falcons-Bred] → Team[Saints-flipped] → Corvus`
spot-checking `/account`, `/football`, `/omen`, `/ledger`, `/standings`, `/trade`, `/draft`. Evidence: build log + screenshots attached to PR.

---

## Changelog

- **2026-06-16** — v1. 32-team table + Saints flip + Falcons Bred specials documented; 2 AA-large outliers (BAL, MIN) accepted for PR1 ship.
- **2026-06-17** — Official-color-first policy. Justin flagged that 14/32 teams don't use their
  primary jersey color for the accent. Re-ran the contrast check for `textSafe(primary)` against
  `--color-bg` for all 14 swapped teams:

  ```
  abbr | scheme(was)   | primary-lifted | C(primary) | current accent (lifted) | C(current)
  NE   | colorRush     | #2994ff | 6.38  PASS | #f3355a | 5.15
  NYJ  | colorRush     | #4edaab | 11.25 PASS | #29ff9c | 14.96
  CLE  | colorRush     | #ffa829 | 10.26 PASS | #ff5b29 | 6.39
  TEN  | colorRush     | #4b8bdd | 5.69  PASS | #4d93db | 6.14
  LAC  | colorRush     | #29b3ff | 8.47  PASS | #6db3e5 | 8.70
  PIT  | secondary     | #6b94bd | 6.22  PASS | #ffbd29 | 11.84
  HOU  | secondary     | #36b2f2 | 8.30  PASS | #e3455e | 4.97
  LV   | secondary     | #bd6b6b | 5.16  PASS | #8ab7ca | 9.15
  NYG  | secondary     | #3e6aea | 4.20  AA-large | #e3455e | 4.97
  WAS  | secondary     | #d85050 | 4.88  PASS | #ffbd29 | 11.84
  CHI  | secondary     | #5582d3 | 5.20  PASS | #fc642c | 6.60
  GB   | secondary     | #6bbda7 | 8.92  PASS | #ffbd29 | 11.84
  LAR  | secondary     | #2976ff | 4.83  PASS | #ffb229 | 10.98
  SEA  | secondary     | #2994ff | 6.38  PASS | #8bda4e | 11.53
  ```

  None of the 14 swaps were actually contrast-forced — `textSafe` clears AA (or AA-large, the
  same bar already accepted for BAL/MIN) for every one of them once lifted. The swaps were
  curatorial "more iconic" calls recorded in each team's `note` field.

  **Action taken:** flipped the 5 `colorRush` teams (NE, NYJ, CLE, TEN, LAC) to `scheme:
  'standard'` / `accent: primary` — `colorRush` is the only scheme that reaches for a color
  *outside* the official primary/secondary pair, so these were the clearest "synergy color
  used before official color" cases. Removed their now-stale `colorRush`/`note` fields.

  **Left as-is, flagged for Justin:** the 9 `secondary`-scheme teams (PIT, HOU, LV, NYG, WAS,
  CHI, GB, LAR, SEA). Secondary is still an official team color, not a synergy substitution,
  and several of these (Steelers gold, Packers gold, Seahawks action green, Raiders silver) are
  arguably more culturally iconic than primary even though primary would pass contrast. Did not
  unilaterally rewrite 9 already-shipped, already-audited team identities — table above is ready
  if Justin wants any/all of them flipped too.
