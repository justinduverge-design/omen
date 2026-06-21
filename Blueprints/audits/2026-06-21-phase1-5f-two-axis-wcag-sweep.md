# Phase 1.5f — Two-Axis WCAG Contrast Sweep

**Date:** 2026-06-21
**Phase:** 1.5f — Theme-aware team palettes
**Generator:** `frontend/scripts/contrast-sweep.mjs` (run from repo root)
**Source data:** [nflTeams.js](../../frontend/src/data/nflTeams.js), [teamTemplate.js](../../frontend/src/lib/teamTemplate.js)
**Predecessor:** [2026-06-16-phase1-5-team-template-assignment.md](2026-06-16-phase1-5-team-template-assignment.md) (single-axis dark-only sweep)
**Identity audit:** [2026-06-20-phase1-5e-32-team-identity-audit.md](2026-06-20-phase1-5e-32-team-identity-audit.md)

## What this measures

For each team, against its assigned `surfaceAxis`:

- **body / surface** — `--color-text-primary` body text on `--color-team-surface`. AA ≥ 4.5.
- **body / card** — same body text on `--color-team-surface-card` (elevated card bg). AA ≥ 4.5.
- **CTA text / CTA bg** — `--color-text-on-accent` on the raw team-accent fill. AA ≥ 4.5 (treated as UI/large since CTAs use semibold ≥16px → AA-large 3.0 also reported).
- **accent text / surface** — lifted accent (`--color-team-accent`, used as text/border) on `--color-team-surface`. AA-large ≥ 3.0 (this token paints small headings, focus rings, and accent labels — UI/large category).

Verdict columns use normal-text AA (4.5) for body/CTA rows and large-text AA (3.0) for accent-on-surface rows.

## Summary

- Teams audited: **32**
- Light-axis teams: **6** (MIA, IND, LAC, DAL, CAR, ARI)
- Dark-axis teams: **26**
- Unexpected failures: **0** (any cell below threshold not pre-accepted as a known marginal)
- Accepted known marginals: **3** — see "Known marginals" section below

## Known marginals (accepted)

These are identity-preserving trade-offs reviewed against the 2026-06-20 identity audit. Each is acceptable for shipping Phase 1.5f and is documented here so re-runs of the sweep don't re-surface them as blockers.

- **KC** (CTA): Chiefs red #E31837 — passes AA-large (3.0); falls short of AA-normal (4.5) by a small margin (~4.2). CTAs use semibold 16-18px (borderline AA-large eligible). Accepted as identity-preserving; future polish PR can swap to a slightly darker brand-red CTA fill if WCAG-strict required.
- **DET** (CTA): Lions Honolulu blue #0076B6 — passes AA-large (3.0); ~4.34 vs 4.5 AA-normal threshold. Same rationale as KC.
- **ATL** (accent/surface): Bred (template 6) uses accent as the call-to-action FILL on a pure-black surface; accent is not used as text/border ON the surface. The accent-on-surface metric is informational; Bred-template ignores it by design. CTA text-on-accent (6.55) passes AA.

## Dark-axis teams (26)

| # | Team | T | Surface | Card | Accent (raw) | Accent (lifted) | body/surface | body/card | CTA text/bg | accent/surface |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **BUF** Buffalo Bills | 1 | `#0d1626` | `#101a2e` | `#00338D` | `#497fde` | 15.96 AAA | 15.31 AAA | 9.96 AAA | 4.63 AAA |
| 2 | **NE** New England Patriots | 1 | `#0d1926` | `#101e2e` | `#002244` | `#5994cf` | 15.63 AAA | 14.84 AAA | 14.11 AAA | 5.54 AAA |
| 3 | **NYJ** New York Jets | 1 | `#11221c` | `#142922` | `#125740` | `#68c0a3` | 14.58 AAA | 13.51 AAA | 7.52 AAA | 7.61 AAA |
| 4 | **BAL** Baltimore Ravens | 1 | `#131122` | `#171429` | `#241773` | `#7163c5` | 16.37 AAA | 15.84 AAA | 12.81 AAA | 3.80 AA |
| 5 | **CIN** Cincinnati Bengals | 5 | `#220e07` | `#2a1109` | `#FB4F14` | `#f66431` | 16.33 AAA | 15.65 AAA | 5.87 AA | 5.98 AAA |
| 6 | **CLE** Cleveland Browns | 5 | `#231706` | `#2c1d07` | `#311D00` | `#cb9e5d` | 15.47 AAA | 14.40 AAA | 14.17 AAA | 7.18 AAA |
| 7 | **PIT** Pittsburgh Steelers | 2 | `#15191e` | `#191e24` | `#FFB612` | `#fabb2e` | 15.56 AAA | 14.78 AAA | 11.26 AAA | 10.27 AAA |
| 8 | **HOU** Houston Texans | 1 | `#0e1d25` | `#11232c` | `#A71930` | `#D04250` | 15.16 AAA | 14.23 AAA | 6.55 AA | 3.75 AA |
| 9 | **JAX** Jacksonville Jaguars | 4 | `#0a1c1f` | `#0c2327` | `#006778` | `#4ec6da` | 15.44 AAA | 14.40 AAA | 5.76 AA | 8.69 AAA |
| 10 | **TEN** Tennessee Titans | 1 | `#111822` | `#141d29` | `#0C2340` | `#6a8fbe` | 15.72 AAA | 14.96 AAA | 13.92 AAA | 5.34 AAA |
| 11 | **DEN** Denver Broncos | 3 | `#1e100b` | `#25140e` | `#FB4F14` | `#f66431` | 16.32 AAA | 15.62 AAA | 5.87 AA | 5.98 AAA |
| 12 | **KC** Kansas City Chiefs | 3 | `#1d0c0f` | `#240f13` | `#E31837` | `#e3455d` | 16.65 AAA | 16.06 AAA | 4.20 FAIL | 4.75 AAA |
| 13 | **LV** Las Vegas Raiders | 2 | `#1a1a1a` | `#1f1f1f` | `#A5ACAF` | `#a5acaf` | 15.34 AAA | 14.53 AAA | 8.59 AAA | 7.56 AAA |
| 14 | **NYG** New York Giants | 1 | `#0f1424` | `#12182b` | `#0B2265` | `#5d79cb` | 16.16 AAA | 15.54 AAA | 12.94 AAA | 4.42 AA |
| 15 | **PHI** Philadelphia Eagles | 2 | `#0d2426` | `#102b2e` | `#004C54` | `#5DAB9F` | 14.27 AAA | 13.16 AAA | 8.56 AAA | 6.01 AAA |
| 16 | **WAS** Washington Commanders | 2 | `#221111` | `#291414` | `#FFB612` | `#fabb2e` | 16.01 AAA | 15.37 AAA | 11.26 AAA | 10.56 AAA |
| 17 | **CHI** Chicago Bears | 1 | `#121721` | `#161c28` | `#C83803` | `#e96d3f` | 15.82 AAA | 15.04 AAA | 4.60 AA | 5.75 AAA |
| 18 | **DET** Detroit Lions | 1 | `#0d1d26` | `#10232e` | `#0076B6` | `#41ade7` | 15.16 AAA | 14.22 AAA | 4.34 FAIL | 6.84 AAA |
| 19 | **GB** Green Bay Packers | 2 | `#161d1b` | `#1a2320` | `#FFB612` | `#fabb2e` | 15.10 AAA | 14.18 AAA | 11.26 AAA | 9.96 AAA |
| 20 | **MIN** Minnesota Vikings | 2 | `#191221` | `#1e1628` | `#4F2683` | `#8f68c0` | 16.10 AAA | 15.42 AAA | 9.55 AAA | 4.27 AA |
| 21 | **ATL** Atlanta Falcons | 6 | `#080608` | `#0F0E10` | `#A71930` | `#A71930` | 17.80 AAA | 16.97 AAA | 6.55 AA | 2.72 FAIL |
| 22 | **NO** New Orleans Saints | 2 | `#15191e` | `#191e24` | `#D3BC8D` | `#d3bc8d` | 15.56 AAA | 14.78 AAA | 10.69 AAA | 9.54 AAA |
| 23 | **TB** Tampa Bay Buccaneers | 3 | `#1f140a` | `#27190c` | `#D50A0A` | `#e74040` | 15.92 AAA | 15.04 AAA | 4.77 AA | 4.48 AA |
| 24 | **LAR** Los Angeles Rams | 2 | `#0d1626` | `#101a2e` | `#FFA300` | `#f6af31` | 15.96 AAA | 15.31 AAA | 9.89 AAA | 9.57 AAA |
| 25 | **SF** San Francisco 49ers | 2 | `#260d0d` | `#2e1010` | `#AA0000` | `#D72020` | 16.16 AAA | 15.46 AAA | 6.83 AA | 3.59 AA |
| 26 | **SEA** Seattle Seahawks | 1 | `#0d1926` | `#101e2e` | `#69BE28` | `#8cd157` | 15.63 AAA | 14.84 AAA | 8.48 AAA | 9.60 AAA |

## Light-axis teams (6)

| # | Team | T | Surface | Card | Accent (raw) | Accent (lifted) | body/surface | body/card | CTA text/bg | accent/surface |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **MIA** Miami Dolphins | 4 | `#f0f4f4` | `#f9fafa` | `#008E97` | `#008e97` | 15.36 AAA | 16.27 AAA | 5.01 AA | 3.56 AA |
| 2 | **IND** Indianapolis Colts | 1 | `#edf0f2` | `#f6f7f8` | `#002C5F` | `#002c5f` | 14.87 AAA | 15.86 AAA | 12.13 AAA | 12.03 AAA |
| 3 | **LAC** Los Angeles Chargers | 4 | `#f0f3f4` | `#f9fafa` | `#0080C6` | `#0080c6` | 15.26 AAA | 16.27 AAA | 4.62 AA | 3.84 AA |
| 4 | **DAL** Dallas Cowboys | 1 | `#edeff2` | `#f6f7f8` | `#003594` | `#003594` | 14.77 AAA | 15.86 AAA | 9.56 AAA | 9.41 AAA |
| 5 | **CAR** Carolina Panthers | 1 | `#edf0f2` | `#f6f7f8` | `#0085CA` | `#0085ca` | 14.87 AAA | 15.86 AAA | 4.91 AA | 3.52 AA |
| 6 | **ARI** Arizona Cardinals | 3 | `#f3f1f2` | `#faf9fa` | `#97233F` | `#97233f` | 15.13 AAA | 16.20 AAA | 7.04 AAA | 7.11 AAA |

## Methodology

- WCAG 2.1 contrast formula: `(L_lighter + 0.05) / (L_darker + 0.05)` where L is relative luminance.
- Thresholds: normal text 4.5:1 AA; UI / large text (≥18pt or ≥14pt bold) 3.0:1 AA.
- The "lifted accent" column is the value `getTeamTemplate()` returns for `accent` — i.e., after textSafe() (sat-clamp + S-decay) and after any per-team `accentLifted` override.
- Body text hex: `#F5F0E8` (Corvus dark mode) for dark-axis teams; `#1C1C1E` for light-axis teams (matches the per-axis text-color overrides applied in `themeMode.js`).

## Rerun

```bash
node frontend/scripts/contrast-sweep.mjs \
     --out Blueprints/audits/2026-06-21-phase1-5f-two-axis-wcag-sweep.md
```
