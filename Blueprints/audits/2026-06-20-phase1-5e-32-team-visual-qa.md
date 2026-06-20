# Phase 1.5e — 32-Team Visual QA + "Team mode = always dark" Policy Evidence

> **SUPERSEDED 2026-06-20 by [2026-06-20-phase1-5e-32-team-identity-audit.md](2026-06-20-phase1-5e-32-team-identity-audit.md).**
>
> This first-pass audit answered the wrong question. Justin's "maybe teams shouldn't always be in dark mode" comment was about *per-team fan-perceived identity* (some teams have inherently light visual identity — Dolphins/Vice, Chargers/beach, Cowboys/silver), not "user toggles light/dark." This audit also covered only 9 secondary-scheme teams + 2 specials, not all 32 as Justin originally asked.
>
> The three defects filed here (LV silver hue-shift, Bred Falcons accent collapse, HOU/NYG/ATL hue-collision) and the WAS cross-page propagation evidence remain valid and are referenced by the superseding audit. The "Phase 1.5f scope" recommendation here is also superseded — the corrected scope is much larger (per-team light/dark axis decisions + cultural-reference accent overrides + a methodology spike).
>
> Kept on disk as the audit-trail of how the scope was corrected mid-session.
>
> ---

**Date:** 2026-06-20
**Phase:** 1.5e — 32-team visual QA pass
**Author:** Claude
**Tool:** Claude-in-Chrome MCP against production (`https://slopssaloon.com`)
**Predecessor:** [2026-06-16-phase1-5-team-template-assignment.md](2026-06-16-phase1-5-team-template-assignment.md) (template assignment + WCAG contrast math)
**Source code:** [teamTemplate.js](../../frontend/src/lib/teamTemplate.js), [nflTeams.js](../../frontend/src/data/nflTeams.js)
**Spec:** [page-system.md](../specs/page-system.md) §"Team Accent Token (Phase 1.5)"

---

## Purpose

Two questions:

1. **Visual QA.** Cycle production through Team mode for all 32 NFL palettes and spot-check accent legibility, surface tint, and template assignment in the browser — not just on paper. Secondary-scheme teams (PIT, HOU, LV, NYG, WAS, CHI, GB, LAR, SEA) are the priority focus.
2. **Policy evidence.** Justin called for revisiting the "Team mode is always dark" rule mid-sweep (2026-06-20 chat: "B both, maybe teams shouldnt always be in dark mode. it should be in a per use basis"). Capture evidence to decide whether the rule survives, gets revised, or triggers a Phase 1.5f spike.

Both questions answered from the same evidence base.

---

## Scope clarification (mid-sweep finding)

The original task brief asked for **light + dark per team**. Source inspection on [teamTemplate.js](../../frontend/src/lib/teamTemplate.js) lines 35–41 confirmed the system has **no light-variant surface logic** — `SURFACE_RECIPES` hardcodes L=8–10 (dark-only by design):

```js
const SURFACE_RECIPES = {
  1: { sMul: 0.5, l: 10 },
  2: { sMul: 0.5, l: 10 },
  3: { sMul: 0.5, l:  8 },
  4: { sMul: 0.5, l:  8 },
  5: { sMul: 0.7, l:  8 },
};
```

A faithful "Team + Light" rendering requires a code change (add light recipes at L≈92–95 and a theme-aware branch in `getTeamTemplate()`). This QA pass therefore produced:

- **9 faithful Team-dark captures** (secondary-scheme priority list — what users currently see)
- **2 special-case template captures** (ATL Bred, NO Saints flip)
- **3 baseline captures** (System+light, Corvus+dark, Appearance default state)
- **1 naive-light-flip reference** (proof of why the spike is required)
- **1 cross-page propagation check** (Football route with WAS selected)

Total: **16 unique production captures.** Image IDs listed inline below — all viewable in this conversation's screenshot history. The all-32-tile grid screenshot (`ss_6826sbhof`) shows every team's accent + surface tile simultaneously and substitutes for individual captures of the 23 standard-scheme teams whose visuals had no anomalies in tile preview.

---

## Spec vs implementation divergence (load-bearing for the policy call)

[page-system.md](../specs/page-system.md) line 103 (Phase 1.3 spec, landed 2026-06-15):

> "32-team contrast sweep: each team's accent vs `--color-bg` (dark) **and `--color-bg` (light)** must clear WCAG AA."

The spec assumed Team accent would work in **both** light and dark. The "Team always dark" rule appeared during Phase 1.5 PR1 implementation as a simplification (visible in production today: Mode picker reads "Your team takes over. Always dark."). The 2026-06-16 contrast audit also notes this divergence ("**Team mode forces `data-theme="dark"`** ... light-bg contrast for team accent does not apply").

**Reframing for Justin's policy call:** removing the "Always dark" rule is not a new direction — it's a return to the original Phase 1.3 spec intent. The Phase 1.5 PR1 simplification was correct for shipping speed, but the contrast sweep math the spec asked for has only been done for the dark axis. Phase 1.5f closes the spec gap.

---

## Secondary-scheme team verdicts (priority focus)

All nine secondary-scheme teams render in Team-dark with no contrast failure against the dark canvas (matches the 2026-06-16 WCAG audit). Visual findings on top of the math:

| Team | Accent (lifted) | Surface | Capture | Visual verdict | Flip to primary? |
|---|---|---|---|---|---|
| **PIT** Steelers | `#ffbd29` (Steelers gold) | `#15191e` (near-black, Pittsburgh slate) | `ss_7595es5nx` | **Strong.** Gold on slate-black is iconic Steelers. Mode picker, CTA, header rule all unmistakably Steelers. | **No.** Keep secondary. Primary `#101820` is near-achromatic — would lose all team identity if flipped. |
| **HOU** Texans | `#e3455e` (lifted Battle Red) | `#0e1d25` (deep Houston navy) | `ss_6496lar6k` | **Acceptable.** Recognizable as Texans, but the lifted accent reads more coral than Battle Red. | **No.** Primary `#03202F` (Deep Steel Blue) is also recognizable, but accent collapses to nearly the same hue family — switching wouldn't gain much. Tradeoff is preserving the Battle Red identity. |
| **LV** Raiders | `#8ab7ca` (washed cool-blue) | `#1a1a1a` (pure black) | `ss_3242e0mwv` | **Defect.** `textSafe(#A5ACAF)` shifts the near-neutral silver toward powder-blue; CTA reads as muted lavender, not "Raiders silver." Black surface ✓. | **No** to flip — primary `#0B0B0B` is pure black, can't be the accent. **Yes** to a `textSafe` correction: clamp hue-shift for low-saturation accents (S<10%) so silver stays silver. **Recommend filing as Phase 1.5e-defect-1.** |
| **NYG** Giants | `#e3455e` (lifted Battle Red, same as HOU) | `#0f1424` (Giants royal blue) | `ss_1912jd4s9` | **Acceptable.** Red on royal blue is the Giants palette, but the same lifted coral as HOU/ATL means three teams share an identical accent token at runtime. | **No.** Primary `#0B2265` (Giants Blue) is recognizable but loses the red identity. Hue-collision with HOU/ATL is the bigger concern — flag for the diversification follow-up below. |
| **WAS** Commanders | `#ffbd29` (lifted gold) | `#221111` (burgundy) | `ss_7525bh5lg` | **Strong.** Gold on burgundy is unmistakably Commanders. | **No.** Primary `#5A1414` is recognizable as burgundy but reads heavy and loses the gold pop on CTAs. |
| **CHI** Bears | `#fc642c` (lifted Bears orange) | `#121721` (Bears navy) | `ss_1023xgbg1` | **Strong.** Orange on navy is iconic Bears. | **No.** Primary `#0B162A` is near-achromatic dark navy — would gut the identity. |
| **GB** Packers | `#ffbd29` (lifted gold) | `#161d1b` (green-tinted near-black) | `ss_5749dzukb` | **Strong.** Gold on dark green is iconic Packers. | **No.** Primary `#203731` is recognizable but the gold/green pairing is the Packers identity — flipping would feel like neutralizing the brand. |
| **LAR** Rams | `#ffb229` (lifted Rams gold) | `#0d1626` (Rams royal blue) | `ss_9725ujk86` | **Strong.** Gold on royal blue. On-brand. | **No.** Primary `#003594` is a recognizable royal blue but loses the gold call-to-action pop. Same logic as GB. |
| **SEA** Seahawks | `#8bda4e` (lifted action green) | `#0d1926` (Seattle navy) | `ss_20935bpid` | **Strong** for hue match, **marginal** for CTA text legibility. CTA black text on light-green accent has weak contrast — the `--color-text-on-accent` token gap already flagged in [LEDGER.md row Phase 1.5b](../done/LEDGER.md) bites here too. | **No** to flip — primary `#002244` is recognizable navy but loses the action-green that *is* the Seahawks identity. **Yes** to adding `--color-text-on-accent` token (separate Phase 1.5b follow-up). |

**Net verdict on the open secondary-scheme flip question:** all nine stay on secondary. Visual evidence confirms the curated accents carry team identity better than the primary would in every case. The two real action items are:

1. **`textSafe` silver-clamp fix** (LV defect — Phase 1.5e-defect-1)
2. **`--color-text-on-accent` token** (SEA + any other light-accent team — already flagged in Phase 1.5b LEDGER row, escalate)

---

## Special-case template captures

| Team | Template | Capture | Verdict |
|---|---|---|---|
| **ATL** Falcons | 6 — Bred (Jordan 1 homage) | `ss_11924glim` | Surface ✓ (pure `#080608` per spec). Accent `#e3455e` reads coral, **not "varsity red."** Bred template's intent ("black canvas + varsity-red CTA") is partly defeated by the standard `textSafe` lift. **Phase 1.5e-defect-2:** Bred template should arguably bypass `textSafe` and use the raw `#A71930` (already AA-large against `#080608`: 3.0:1 — at the edge, may need a different shade). Currently Falcons accent is indistinguishable from HOU and NYG accents. |
| **NO** Saints | 2 — Two-Tone Royal (with primary↔secondary surface flip) | `ss_35208lveq` | Surface ✓ (derived from `#101820` secondary → near-black `#15191e`, not gold). Accent `#d3bc8d` (Saints gold) ✓. The Saints flip from [teamTemplate.js:121](../../frontend/src/lib/teamTemplate.js) works exactly as documented. |

---

## Baseline & cross-page captures

| Capture | Mode | Verdict |
|---|---|---|
| `ss_24969icaj` | Default landing (System mode, light, OS-driven) | Corvus gold `#92740F` on off-white `#FAFAF9`. Clean. |
| `ss_6826sbhof` | All 32 teams expanded (System mode, light) | All tile previews render with correct template-derived surface and curated accent. Use as the single-frame "33-up" reference for the 23 standard-scheme teams not captured individually. |
| `ss_24880hanr` | System mode, light, after team selected | Team palette is **saved but inactive** in System mode — accent reverts to Corvus gold `#92740F`. Correct per spec ("System mode tracks the OS light/dark preference and clears `--color-team-*` tokens"). |
| `ss_0213bh4xx` | Corvus mode, dark | Brand gold `#B8952A` on graphite `#0A0A0B`. Default dark baseline. |
| `ss_48947xjtt` | `/football` route, Team mode, WAS team | Confirms cross-page propagation: page surface `#221111` ✓, "DISTRICT" pill in WAS gold ✓, "DarthSlops · you" row tinted with WAS burgundy and gold username ✓. App-shell accent threading works as designed. |

---

## "Team always dark" — naive-flip reference

`ss_0264qnlsz`: mode=team + team=WAS + `data-theme="light"` forced via JS.

**Result:** every surface-derived element stays at its dark CSS value (burgundy `#221111` body, burgundy card surfaces) while every text/foreground element flips to light-mode colors. Net effect: the page **breaks** — "Your look." headline disappears, "Less guessing. Better moves." disappears, Mode picker labels for System/Corvus disappear (white-on-dark text rendered as black-on-dark).

This is the evidence base for the Phase 1.5f scoping below — flipping `data-theme` alone is not enough; the team palette must be theme-aware at the recipe level.

---

## Recommendation: Phase 1.5f scope

**Goal:** make Team mode honor user's light/dark preference instead of forcing dark.

**Concrete code lift** (Justin sizing call):

1. **[teamTemplate.js:35](../../frontend/src/lib/teamTemplate.js)** — extend `SURFACE_RECIPES` to a 2-axis map:
   ```js
   const SURFACE_RECIPES = {
     dark:  { 1: {sMul:0.5,l:10}, 2: {sMul:0.5,l:10}, 3: {sMul:0.5,l:8}, 4: {sMul:0.5,l:8}, 5: {sMul:0.7,l:8} },
     light: { 1: {sMul:0.15,l:96}, 2: {sMul:0.15,l:96}, 3: {sMul:0.15,l:97}, 4: {sMul:0.15,l:97}, 5: {sMul:0.20,l:97} },
   };
   ```
   (Light L values are first-cut; tune via a fresh 32-team WCAG sweep against `#FAFAF9`.)
2. **[teamTemplate.js:129](../../frontend/src/lib/teamTemplate.js)** — `getTeamTemplate(abbr)` becomes `getTeamTemplate(abbr, theme)`. Surface derivation reads from the correct axis.
3. **Bred template light-mode:** decide whether Falcons in light mode keeps the Jordan 1 metaphor (cream canvas + varsity red?) or breaks character. Probably the latter — pure-white "Bred" stops being Bred. Could fall back to Template 1 light when `theme === 'light'`.
4. **`textSafe()` adjustment** — current implementation lifts accents to L ≥ 58 for dark-canvas legibility. For light canvas, accents may need to be *lowered* to L ≤ 42 to clear AA on `#FAFAF9`. Add a `textSafe(hex, mode)` overload or split into `textSafeOnDark`/`textSafeOnLight`.
5. **[Appearance.jsx Mode picker copy](../../frontend/src/components/theme/AppearancePicker.jsx)** — change "Team — Your team takes over. Always dark." to "Team — Your team takes over. Tracks your light/dark preference."
6. **[page-system.md spec](../specs/page-system.md)** — update the Phase 1.3 spec line to clarify Team mode is theme-aware (one line edit; the spec already assumed this).
7. **New 32-team WCAG sweep** — re-run the 2026-06-16 contrast audit against light bg, add a second column to the contrast table.
8. **`--color-text-on-accent` token** — fix in this same PR since light-mode CTAs hit the same problem as SEA does today. Closes the Phase 1.5b LEDGER P1.

**Rough complexity:** medium. Most of the lift is the second WCAG sweep + handling edge cases (Bred, Saints flip, LV silver). All other changes are mechanical. The 6 templates × 2 themes × 32 teams contrast table is the longest single artifact.

**Skill suggestion for the spike:** `ui-ux-pro-max` accent-contrast pattern library (same as 2026-06-16 audit). Verdict gate: `slops-ui-ux-audit`.

---

## Defects filed (Phase 1.5e)

| ID | Severity | Location | Fix |
|---|---|---|---|
| **1.5e-defect-1** | P1 | [teamTemplate.js](../../frontend/src/lib/teamTemplate.js) `textSafe` (in `nflTeams.js`) | For accents with HSL saturation < 10%, clamp hue-shift so silvers stay silver. Affects: **LV** (today), and any future low-saturation accent. |
| **1.5e-defect-2** | P2 | [teamTemplate.js:101–108](../../frontend/src/lib/teamTemplate.js) | Bred template 6 should use a non-`textSafe`-lifted accent so Falcons retain varsity-red identity instead of collapsing to the same coral as HOU/NYG. |
| **1.5e-defect-3** | P3 (note) | [teamTemplate.js](../../frontend/src/lib/teamTemplate.js) | Three teams (HOU, NYG, ATL) currently share the identical lifted accent `#e3455e`. Not a contrast failure, but a hue-distinguishability concern when a user switches between these palettes mid-session. Lower priority — only matters if the LV and Bred fixes don't already differentiate the palettes enough. |

---

## Out of scope for this audit

- **No code changes shipped.** This is a verdict-only pass per the Phase 1.5e task brief ("No code changes expected unless a visual defect is found.")
- **Phase 1.5f spike build.** Sized above; awaiting Justin's go/no-go.
- **Secondary-scheme flip decisions.** Verdict above is "all nine stay on secondary"; Justin can still override per-team.

---

## Evidence inventory

All 16 production captures are inline screenshot IDs from this conversation's Chrome MCP session (2026-06-20). Reference by ID; the file IDs are recoverable from the conversation history.

```
ss_24969icaj  default landing (System+light)
ss_6826sbhof  all-32 tile grid (System+light, expanded)
ss_7595es5nx  PIT in Team-dark
ss_6496lar6k  HOU in Team-dark
ss_3242e0mwv  LV in Team-dark   [defect 1.5e-defect-1]
ss_1912jd4s9  NYG in Team-dark
ss_7525bh5lg  WAS in Team-dark
ss_1023xgbg1  CHI in Team-dark
ss_5749dzukb  GB in Team-dark
ss_9725ujk86  LAR in Team-dark
ss_20935bpid  SEA in Team-dark   [text-on-accent P1 from 1.5b]
ss_11924glim  ATL in Team-dark (Bred 6) [defect 1.5e-defect-2]
ss_35208lveq  NO in Team-dark (Saints flip)
ss_24880hanr  System mode, light
ss_0213bh4xx  Corvus mode, dark
ss_0264qnlsz  Naive light-flip reference (WAS + data-theme=light forced)
ss_48947xjtt  /football route, WAS team selected (cross-page propagation)
```
