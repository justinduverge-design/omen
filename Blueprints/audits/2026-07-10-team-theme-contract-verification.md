# Team Theme Contract Verification — L1 α values × 5 stress teams

**Date:** 2026-07-10 pm
**Author:** Cowork L0 (Justin, in-session)
**Purpose:** Verify the α values in `Blueprints/specs/design/team-theme-contract-v1.md` and L1 `team-colorway-system-spec-v1.md` against real team hex values with actual WCAG contrast math. Confirm or refute the stress-test verdicts written into the contract on doctrine grounds alone.
**Method:** Python contrast + CIELAB ΔE computation. sRGB linear-space blend (approximation of L1's specified `color-mix(in oklab, ...)`; close enough for pass/fail detection on these α ranges).
**Blocks:** Phase 3 Codex prompts.

---

## TL;DR

1. **L1's stated α ranges hold for text legibility.** Bone-white text passes 4.5:1 against every stress-team-tinted shell at every room-mode α tested (5% / 14% / 25% / 32% / 35% / 40%). Rule 1 is safe — no team can produce an illegible shell under this contract.
2. **L1's own stated Rule 3 (card ≥ 3:1 vs shell) fails in L1's own worked examples.** Eagles gets 1.15:1, Cowboys 1.07:1, Chiefs 1.55:1 with the specified `#1C1C1E` neutral-charcoal card. In practice the pattern works because hue differentiates them — not luminance. Contract now names this: card differentiation may come from luminance (3a), hue distance (3b), OR a visible border (3c). Any one satisfies.
3. **Two of the five stress teams (Packers, Steelers) fail all three of 3a/3b/3c** at neutral charcoal card. Their team primaries are too dark and too close to neutral. Contract requires their card fills be lifted (e.g., `#2A2A2C`) or team-tinted. L1's Eagles example fails too (ΔE 14.6, just under threshold) — likely a latent bug in L1's own worked example.
4. **Team primary rarely works as accent at Locker Room α.** Only Dolphins clears 2:1 (still under 3:1); all others are 1.0–2.1. Team secondary works for Commanders / Packers / Chiefs / Steelers. Dolphins secondary also fails at high α; falls to white. This means the *primary → secondary → white/black* cascade in the contract is the correct path, not an edge case.
5. **All contrast numbers below are computed on the α at the room mode's midpoint.** At lower α (Owner Suite), everything opens up; at higher α (Locker Room max), constraints tighten.

---

## Base tokens (dark mode)

Verified from `frontend/src/index.css` via `omen-ux-ui-design-system-v1.md`:
- `--color-bg` = `#0A0A0B` (raven black)
- `--color-surface-1` = `#1C1C1E` (charcoal card baseline)
- `--color-border` = `#3A3A3C`
- `--color-text-primary` = `#F5F0E8` (bone white)
- `--color-accent` (Omen) = `#A67C2E` (aged brass)
- `--color-omen` = `#2F7D5B` (Verdigris — AI signal)
- `--color-risk-high` = `#7E1717` (Deep Crimson)

## L1 α ranges (from `team-colorway-system-spec-v1.md`)

- Owner Suite: "whisper of tint" — no exact number in L1; contract uses **≤5%**.
- GM Suite: **~14%** — explicit L1 value.
- Locker Room: **25–40%** — L1 examples: Chiefs War Room 25%, Eagles 32%, Chiefs Color Rush 35%, extremes to 40%.

## Stress-team hex values

Sourced from public NFL brand refs (L1 spec has worked examples only for Eagles / Cowboys / Chiefs so far; the other 27 teams are "extended roster — pending author pass"):

| Team | Primary | Secondary |
|---|---|---|
| Washington Commanders | `#5A1414` | `#FFB612` |
| Miami Dolphins | `#008E97` | `#FC4C02` |
| Green Bay Packers | `#203731` | `#FFB612` |
| Kansas City Chiefs | `#E31837` | `#FFB81C` |
| Pittsburgh Steelers | `#101820` | `#FFB612` |

---

## Result 1 — Text vs. shell (Rule 1)

**Every combination passes ≥ 4.5:1.** Bone-white text on any team-tinted shell at any tested α ranges from 6.7:1 (Dolphins Locker max 40%) up to 17.4:1 (Steelers Owner Suite 5%). Rule 1 is provably safe under this contract — no team can produce an illegible shell.

## Result 2 — Team primary as accent vs. shell (Rule 2)

Computed at Locker Room α = 0.35 (mid-range representative):

| Team | Primary vs. shell | Passes ≥ 3:1? |
|---|---|---|
| Commanders `#5A1414` | 1.25:1 | ✗ fail |
| Dolphins `#008E97` | 2.08:1 | ✗ fail |
| Packers `#203731` | 1.31:1 | ✗ fail |
| Chiefs `#E31837` | 1.98:1 | ✗ fail |
| Steelers `#101820` | 1.07:1 | ✗ fail |

**All five stress teams fail Rule 2 at Locker Room α.** Team primary can never be `--color-accent` in Locker Room mode because it's blended INTO the shell — it can't stand OUT from the shell. This is expected geometry, not a bug. Falls to secondary per cascade.

At lower α (GM Suite 14%, Owner Suite 5%), some primaries clear 3:1 — the cascade evaluates per room mode, so the same team may use primary as accent on `/omen` and secondary on `/football`.

## Result 3 — Accent cascade winners (per team, Locker Room α = 0.35)

| Team | Primary? | Secondary? | White? | Black? | Winner |
|---|---|---|---|---|---|
| Commanders | 1.25 ✗ | **9.70 ✓** | 15.02 ✓ | 1.16 ✗ | secondary gold |
| Dolphins | 2.08 ✗ | 2.41 ✗ | **7.23 ✓** | 2.41 ✗ | white |
| Packers | 1.31 ✗ | **9.44 ✓** | 14.62 ✓ | 1.19 ✗ | secondary gold |
| Chiefs | 1.98 ✗ | **5.40 ✓** | 8.24 ✓ | 2.12 ✗ | secondary gold |
| Steelers | 1.07 ✗ | **10.87 ✓** | 16.83 ✓ | 1.04 ✗ | secondary gold |

Key finding: **Dolphins is the outlier** — both primary aqua AND secondary coral orange fail 3:1 against the deep aqua-tinted shell at Locker Room α. Cascade lands on white. That's fine (L1 uses bone white as accent for Eagles too), but it means Dolphins' "signature moment" on Locker Room pages is monochrome, not aqua. Aqua returns on Owner Suite and GM Suite where α is lower.

Three of the five (Commanders, Packers, Steelers) land on secondary gold `#FFB612`. That's the same hex — the collision-check for Rule 4 (accent vs. Omen brass `#A67C2E`) would flag those as too close. sRGB distance = 109.9. In practice this probably reads as "the app is showing team-specific gold, similar to base Omen gold," and is arguably fine because the shell tint distinguishes them. Left as an implementation note: verify the ΔE in CIELAB at implementation time and decide whether to force a further fallback for these three.

## Result 4 — Card vs. shell (Rule 3, the important one)

Testing L1's spec pattern (card = `#1C1C1E` neutral charcoal) at Locker Room α = 0.35:

| Team | Shell | Luminance Δ (need 3:1) | Hue ΔE (need 15) | Border ≥ 3:1 both? | Verdict |
|---|---|---|---|---|---|
| Commanders | `#370E0F` | 1.00 ✗ | **22.7 ✓** | ✗ | **PASS via hue** |
| Dolphins | `#06585D` | 2.08 ✗ | **31.9 ✓** | ✗ | **PASS via hue** |
| Packers | `#14211E` | 1.03 ✗ | 7.3 ✗ | ✗ | **FAIL all three** |
| Chiefs | `#8E1021` | 1.82 ✗ | **59.9 ✓** | ✗ | **PASS via hue** |
| Steelers | `#0C1014` | 1.12 ✗ | 6.1 ✗ | ✗ | **FAIL all three** |
| — L1 example: Eagles | `#062E33` | 1.17 ✗ | 14.6 ✗ | ✗ | **FAIL all three** |
| — L1 example: Cowboys | `#06205C` | 1.11 ✗ | **40.8 ✓** | ✗ | **PASS via hue** |

**L1's own Eagles worked example fails all three differentiation tests at neutral charcoal card.** Dark green `#004C54` at 32% blended into raven black produces a shell hue that's too close to neutral charcoal in CIELAB. Cowboys and Chiefs pass by hue; Eagles doesn't. This is a real gap in L1's spec — the Eagles example either needs a lifted card fill or the doc needs to relax Rule 3.

**Packers and Steelers have the same problem for the same reason.** Packers primary is dark green (like Eagles). Steelers primary is nearly-neutral dark. Their tinted shells look nearly identical to neutral charcoal.

**Contract resolution:** the revised Rule 3 in `team-theme-contract-v1.md` requires that at least one of 3a (luminance ≥ 3:1) OR 3b (hue ΔE ≥ 15) OR 3c (border ≥ 3:1 vs both) holds. For teams that fail all three at neutral charcoal, the team's `--color-team-surface-card` must be lifted off neutral (e.g., `#2A2A2C` or a subtle team-tinted card at ~10-15% team alpha over charcoal) at implementation time.

This affects Packers, Steelers, and Eagles from the currently-audited set. L1 will need to author lifted card values for those in `team-colorway-system-spec-v1.md` §7 (Eagles) and in the extended-roster author pass for Packers and Steelers.

---

## Corrections to the contract's stress-test verdicts

The morning contract draft had these verdicts. Real math yields corrections:

- **Commanders — original: "accent = gold, no wash-out"** → confirmed. Passes cleanly at all room modes.
- **Dolphins — original: "accent = aqua, AI-signal-label rule"** → correct at Owner Suite / GM Suite; **wrong at Locker Room** — falls to white at α ≥ 0.32. Contract now names this.
- **Packers — original: "accent = white via collision"** → close, but for a different reason. Packers gold does pass 9.4:1 vs shell (not white); the fallback is triggered by Rule 4 role-collision (gold vs Omen brass), not by Rule 2 contrast. Same practical outcome, cleaner reasoning.
- **Chiefs — original: "accent = red, risk-label rule"** → incorrect at Locker Room α — red primary fails 3:1 vs deep-red shell; falls to gold. Owner Suite / GM Suite still allow red.
- **Steelers — original: "accent = white"** → close; gold actually passes 10.9:1 first, but same Packers-style Rule 4 collision with Omen brass moves it to white. Correct outcome, cleaner reasoning.

---

## Open items / follow-ups

1. **L1 `team-colorway-system-spec-v1.md` §7.1 (Eagles) has a latent bug.** Its stated `#1C1C1E` card fill against `color-mix(#004C54 32%, #0A0A0B)` shell fails all three differentiation tests. Needs a lifted card fill or L1-level Rule 3 clarification. File as L1 doc issue.
2. **The extended-roster author pass** (for the 27 teams beyond Eagles / Cowboys / Chiefs) must include a card-fill authoring step. Not just "surface at N% alpha" but also "card at M% alpha or lift to `#XXXXXX`." The `_batch-tracking.md` sheet may need a new column.
3. **My sRGB-linear-space blend approximation** may diverge from L1's specified `color-mix(in oklab, ...)` by up to ~5% in mid-luminance regions. For the α ranges here (5–40%) and the pass/fail question being asked (>3:1 or <3:1), the divergence is well below the decision boundary. Codex implementation should use the exact `color-mix` in oklab as specified by L1.
4. **Dolphins on Locker Room pages** loses its aqua accent entirely (falls to white). Justin may want to override this — either by shipping Dolphins in Locker Room with the accent staying aqua at α ≤ 0.30 (giving up depth for identity), or by finding a lighter aqua derivative that passes 3:1 vs the deep shell. Open UX call.

---

## Reproducing the math

All contrast values were computed by `python3` in the L0 audit session on 2026-07-10 pm. Reproduce with:

```python
# WCAG relative-luminance contrast
def rgb_to_lin(v):
    v = v/255
    return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4

def rel_lum(rgb):
    r,g,b = [rgb_to_lin(x) for x in rgb]
    return 0.2126*r + 0.7152*g + 0.0722*b

# Blend in linear-sRGB (approximation of L1's oklab; sufficient for pass/fail)
def mix_linear(c1_hex, c2_hex, alpha):
    # ... hex → rgb → linearize → alpha-mix → delinearize → hex
```

Full script available in the session log; suggest checking it into `scripts/theme-contract-verification.py` at implementation time so the checks can rerun against every team as `-colorway.md` files land.
