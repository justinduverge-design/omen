# Phase 1.5h/1.5g — Multi-Color Palette + Motif WCAG Sweep

**Date:** 2026-06-23
**Phase:** 1.5h multi-role palettes + 1.5g motif hairline guard
**Generator:** `frontend/scripts/contrast-sweep.mjs`
**Source data:** [nflTeams.js](../../frontend/src/data/nflTeams.js), [teamTemplate.js](../../frontend/src/lib/teamTemplate.js)
**Predecessors:** Phase 1.5f single-axis sweep (2026-06-21), Phase 1.5e identity audit (2026-06-20)

## What this measures

For every (team × variant) — i.e., Official and Special palettes separately:

- **body/surface** — body text on the team surface. AA ≥ 4.5.
- **accent/surface** — the derived CTA color (which falls through from primary to secondary when surface == primary) used as bold text/border on the surface. AA-large ≥ 3.0.
- **CTA text/accent** — text-on-accent foreground on the filled accent CTA. AA ≥ 4.5.
- **motif:<id>/surface** — active motif color on the team surface. Decorative threshold ≥ 3.0.
- **\<role\>/surface** — every other palette role used as text on the surface. Informational; some roles are intentionally chosen as fills not text (mute, neutral) and are scored against AA-normal; others are accent-like and scored AA-large.

## Summary

- Palettes audited: **62** (32 official + 30 special)
- Unexpected failures: **0**
- Accepted known marginals: **5**

## Known marginals (accepted)

- `KC|official|CTA text/accent`: Chiefs red CTA passes AA-large (3.0) — identity-preserving
- `DET|official|CTA text/accent`: Lions blue CTA passes AA-large (3.0) — identity-preserving
- `DET|official|body/surface`: Honolulu blue surface is the Lions identity — 4.34 passes AA-large; CTAs are ≥16px semibold (borderline AA-large eligible)
- `DET|special|body/surface`: Same as official — Lions surface is Honolulu blue regardless of variant
- `BUF|special|CTA text/accent`: Wing Sauce Frank's Red CTA passes AA-large (3.0) at 4.41 — identity-preserving

## Per-palette detail

| Team | Variant | Surface | Accent | Anchor | body/surf | accent/surf | CTA/acc | motif/surf |
|---|---|---|---|---|---|---|---|---|
| **BUF** Buffalo Bills | official (Bills) | `#00338D` | `#C60C30` | — | 9.96 AAA | 1.88 FAIL | 5.29 AA | — |
| **BUF** Buffalo Bills | special (Wing Sauce) | `#FAF6E8` | `#D62828` | Buffalo wings | 18.29 AAA | 4.63 AAA | 4.41 FAIL | — |
| **MIA** Miami Dolphins | official (Dolphins) | `#FDF8F2` | `#008E97` | — | 18.74 AAA | 3.74 AA | 5.01 AA | mia-aqua-hairline: 3.74 AA |
| **MIA** Miami Dolphins | special (Calle Ocho) | `#FAEFD6` | `#E91E63` | Calle Ocho / Little Havana | 17.32 AAA | 3.81 AA | 4.55 AA | mia-aqua-hairline: 3.81 AA |
| **NE** New England Patriots | official (Patriots) | `#002244` | `#C60C30` | — | 14.11 AAA | 2.66 FAIL | 5.29 AA | — |
| **NE** New England Patriots | special (Bunker Hill) | `#F0E9D6` | `#1A2B4F` | Battle of Bunker Hill | 16.33 AAA | 11.54 AAA | 12.32 AAA | — |
| **NYJ** New York Jets | official (Jets) | `#125740` | `#125740` | — | 7.52 AAA | 1.00 FAIL | 7.52 AAA | — |
| **NYJ** New York Jets | special (Hempstead Green) | `#0F4A35` | `#7A8488` | Hempstead / Long Island | 9.02 AAA | 2.67 FAIL | 5.17 AA | — |
| **BAL** Baltimore Ravens | official (Ravens) | `#241773` | `#9E7C0C` | — | 12.81 AAA | 3.70 AA | 5.03 AA | — |
| **BAL** Baltimore Ravens | special (Poe's Raven) | `#080608` | `#3D2899` | Edgar Allan Poe's 'The Raven' | 17.80 AAA | 1.89 FAIL | 9.44 AAA | — |
| **CIN** Cincinnati Bengals | official (Bengals) | `#0A0A0B` | `#FB4F14` | — | 17.44 AAA | 5.87 AAA | 5.87 AA | — |
| **CIN** Cincinnati Bengals | special (Skyline Chili) | `#FAF6E8` | `#C2410C` | Cincinnati Chili / Skyline | 18.29 AAA | 4.79 AAA | 4.56 AA | — |
| **CLE** Cleveland Browns | official (Browns) | `#311D00` | `#FF3C00` | — | 14.17 AAA | 4.52 AAA | 5.56 AA | — |
| **PIT** Pittsburgh Steelers | official (Steelers) | `#101820` | `#FFB612` | — | 15.77 AAA | 10.18 AAA | 11.26 AAA | pit-gold-hairline: 10.18 AAA |
| **PIT** Pittsburgh Steelers | special (US Steel) | `#0D0F12` | `#FFB612` | US Steel logo origin | 16.92 AAA | 10.92 AAA | 11.26 AAA | pit-gold-hairline: 10.92 AAA |
| **HOU** Houston Texans | official (Texans) | `#03202F` | `#A71930` | — | 14.79 AAA | 2.26 FAIL | 6.55 AA | — |
| **HOU** Houston Texans | special (Mission Control) | `#0A2540` | `#C8102E` | NASA Johnson Space Center | 13.70 AAA | 2.64 FAIL | 5.19 AA | — |
| **IND** Indianapolis Colts | official (Colts) | `#FAFAFA` | `#002C5F` | — | 18.96 AAA | 13.19 AAA | 12.13 AAA | — |
| **IND** Indianapolis Colts | special (Loud House) | `#FAFAFA` | `#002C5F` | Lucas Oil Stadium / "The Loud House" | 18.96 AAA | 13.19 AAA | 12.13 AAA | — |
| **JAX** Jacksonville Jaguars | official (Jaguars) | `#006778` | `#D7A22A` | — | 5.76 AA | 2.83 FAIL | 8.57 AAA | — |
| **JAX** Jacksonville Jaguars | special (Marsh Teal) | `#005D6E` | `#D7A22A` | NE Florida marsh / St. Johns River | 6.63 AA | 3.26 AA | 8.57 AAA | — |
| **TEN** Tennessee Titans | official (Titans) | `#0C2340` | `#4B92DB` | — | 13.92 AAA | 4.84 AAA | 6.06 AA | — |
| **TEN** Tennessee Titans | special (Music Row) | `#0C2340` | `#4B92DB` | Nashville Music Row | 13.92 AAA | 4.84 AAA | 6.06 AA | — |
| **DEN** Denver Broncos | official (Broncos) | `#FB4F14` | `#002244` | — | 5.87 AA | 4.75 AAA | 14.11 AAA | — |
| **DEN** Denver Broncos | special (Mile High Sunset) | `#FB4F14` | `#002244` | Rocky Mountain sunset | 5.87 AA | 4.75 AAA | 14.11 AAA | — |
| **KC** Kansas City Chiefs | official (Chiefs) | `#FFFFFF` | `#E31837` | — | 19.79 AAA | 4.72 AAA | 4.20 FAIL | — |
| **KC** Kansas City Chiefs | special (Arrowhead BBQ) | `#F5E6C8` | `#7A1119` | KC barbecue smokehouse | 16.05 AAA | 8.86 AAA | 9.63 AAA | — |
| **LV** Las Vegas Raiders | official (Raiders) | `#0A0A0B` | `#A5ACAF` | — | 17.44 AAA | 8.59 AAA | 8.59 AAA | — |
| **LV** Las Vegas Raiders | special (Black Hole) | `#0A0A0B` | `#C8CDCF` | The Black Hole (Raiders fan section) | 17.44 AAA | 12.34 AAA | 12.34 AAA | — |
| **LAC** Los Angeles Chargers | official (Chargers) | `#FBF1D4` | `#0080C6` | — | 17.56 AAA | 3.80 AA | 4.62 AA | — |
| **LAC** Los Angeles Chargers | special (Pacific Beach) | `#FBF1D4` | `#0080C6` | 1960s San Diego beach Chargers | 17.56 AAA | 3.80 AA | 4.62 AA | — |
| **DAL** Dallas Cowboys | official (Cowboys) | `#F5F0E8` | `#003594` | — | 17.44 AAA | 9.56 AAA | 9.56 AAA | — |
| **DAL** Dallas Cowboys | special (Tom Landry) | `#F0F0F0` | `#869397` | Tom Landry sideline era | 17.37 AAA | 2.78 FAIL | 6.25 AA | — |
| **NYG** New York Giants | official (Giants) | `#0B2265` | `#A71930` | — | 12.94 AAA | 1.97 FAIL | 6.55 AA | — |
| **NYG** New York Giants | special (Empire State) | `#0B2265` | `#A71930` | Empire State Building floodlights | 12.94 AAA | 1.97 FAIL | 6.55 AA | — |
| **PHI** Philadelphia Eagles | official (Eagles) | `#004C54` | `#A5ACAF` | — | 8.56 AAA | 4.22 AA | 8.59 AAA | — |
| **PHI** Philadelphia Eagles | special (Liberty Bell) | `#004C54` | `#C8A44A` | Liberty Bell / Independence Hall | 8.56 AAA | 4.10 AA | 8.35 AAA | — |
| **WAS** Washington Commanders | official (Commanders) | `#5A1414` | `#FFB612` | — | 11.98 AAA | 7.74 AAA | 11.26 AAA | — |
| **WAS** Washington Commanders | special (Go-Go Burgundy) | `#5A1414` | `#FFB612` | DC Go-Go music | 11.98 AAA | 7.74 AAA | 11.26 AAA | — |
| **CHI** Chicago Bears | official (Bears) | `#0B162A` | `#C83803` | — | 15.93 AAA | 3.46 AA | 4.60 AA | — |
| **CHI** Chicago Bears | special ('85 Bears) | `#0B162A` | `#C83803` | 1985 Bears / Walter Payton | 15.93 AAA | 3.46 AA | 4.60 AA | — |
| **DET** Detroit Lions | official (Lions) | `#0076B6` | `#B0B7BC` | — | 4.34 FAIL | 2.42 FAIL | 9.75 AAA | — |
| **DET** Detroit Lions | special (8 Mile) | `#0076B6` | `#A8AFB4` | Motor City / 8 Mile | 4.34 FAIL | 2.22 FAIL | 8.91 AAA | — |
| **GB** Green Bay Packers | official (Packers) | `#203731` | `#FFB612` | — | 11.20 AAA | 7.23 AAA | 11.26 AAA | gb-gold-tundra-hairline: 7.23 AAA |
| **GB** Green Bay Packers | special (Lambeau Tundra) | `#1A2E27` | `#FFB612` | Lambeau Field tundra | 12.64 AAA | 8.16 AAA | 11.26 AAA | gb-gold-tundra-hairline: 8.16 AAA |
| **MIN** Minnesota Vikings | official (Vikings) | `#4F2683` | `#FFC62F` | — | 9.55 AAA | 6.90 AAA | 12.60 AAA | — |
| **MIN** Minnesota Vikings | special (Paisley Park) | `#4F2683` | `#FFC62F` | Prince's Paisley Park / Minneapolis | 9.55 AAA | 6.90 AAA | 12.60 AAA | — |
| **ATL** Atlanta Falcons | official (Falcons) | `#0A0A0B` | `#A71930` | — | 17.44 AAA | 2.66 FAIL | 6.55 AA | — |
| **ATL** Atlanta Falcons | special (Stankonia) | `#1A1A1A` | `#A71930` | OutKast 'Stankonia' | 15.34 AAA | 2.34 FAIL | 6.55 AA | — |
| **CAR** Carolina Panthers | official (Panthers) | `#FAFAF9` | `#0085CA` | — | 18.95 AAA | 3.86 AA | 4.91 AA | — |
| **CAR** Carolina Panthers | special (Tobacco Road) | `#FAF5E8` | `#0085CA` | Tobacco Road / UNC heritage | 18.18 AAA | 3.70 AA | 4.91 AA | — |
| **NO** New Orleans Saints | official (Saints) | `#101820` | `#D3BC8D` | — | 15.77 AAA | 9.67 AAA | 10.69 AAA | no-cream-hairline: 15.77 AAA |
| **NO** New Orleans Saints | special (Mardi Gras) | `#0F0F12` | `#5D2E8C` | Mardi Gras Krewe traditions | 16.87 AAA | 2.04 FAIL | 8.28 AAA | no-cream-hairline: 16.68 AAA |
| **TB** Tampa Bay Buccaneers | official (Buccaneers) | `#34302B` | `#D50A0A` | — | 11.54 AAA | 2.42 FAIL | 4.77 AA | — |
| **TB** Tampa Bay Buccaneers | special (Gasparilla) | `#34302B` | `#D50A0A` | Gasparilla pirate festival | 11.54 AAA | 2.42 FAIL | 4.77 AA | — |
| **ARI** Arizona Cardinals | official (Cardinals) | `#FAFAF9` | `#97233F` | — | 18.95 AAA | 7.65 AAA | 7.04 AAA | — |
| **ARI** Arizona Cardinals | special (Sonoran Sunset) | `#F0E0CC` | `#97233F` | Sonoran Desert / Toro Bravo tradition | 15.30 AAA | 6.18 AAA | 7.04 AAA | — |
| **LAR** Los Angeles Rams | official (Rams) | `#003594` | `#FFA300` | — | 9.56 AAA | 5.42 AAA | 9.89 AAA | — |
| **SF** San Francisco 49ers | official (49ers) | `#AA0000` | `#B3995D` | — | 6.83 AA | 2.82 FAIL | 7.19 AAA | — |
| **SF** San Francisco 49ers | special (Gold Rush) | `#AA0000` | `#B3995D` | California Gold Rush | 6.83 AA | 2.82 FAIL | 7.19 AAA | — |
| **SEA** Seattle Seahawks | official (Seahawks) | `#002244` | `#69BE28` | — | 14.11 AAA | 6.86 AAA | 8.48 AAA | — |
| **SEA** Seattle Seahawks | special (Pike Place Grunge) | `#001F3F` | `#69BE28` | Pike Place Market / 1990s Seattle grunge | 14.60 AAA | 7.10 AAA | 8.48 AAA | — |

## Methodology

- WCAG 2.1 formula: `(L_lighter + 0.05) / (L_darker + 0.05)` where L is relative luminance.
- Normal text AA = 4.5, AAA = 7.0. UI / large text AA = 3.0, AAA = 4.5.
- The "accent" column is the derived CTA color from `getTeamTemplate().accent` — primary by default, falling through to secondary when surface == primary (GB green-on-green, PIT black-on-black, LV black-on-black, etc.).
- Body text on dark surface = `#F5F0E8`; on light surface = `#1C1C1E`.
- Motif contrast uses raw resolved motif color against the active team surface; opacity affects visual weight but not the threshold calculation.

## Rerun
```bash
node frontend/scripts/contrast-sweep.mjs \
     --out Blueprints/audits/2026-06-23-phase1-5g-motif-contrast-sweep.md
```