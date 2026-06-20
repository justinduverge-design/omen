# Phase 1.5e — 32-Team Identity Audit (Full Scope)

**Date:** 2026-06-20
**Phase:** 1.5e — 32-team visual QA pass (re-scoped from "audit + dark/light per user" to "audit + per-team fan-perceived identity + cultural anchors")
**Author:** Claude
**Tool:** Claude-in-Chrome MCP against production (`https://slopssaloon.com`) + source review
**Methodology:** [Brand/entity-identity-theming.md](../../Brand/entity-identity-theming.md) (new, this session)
**Supersedes:** [2026-06-20-phase1-5e-32-team-visual-qa.md](2026-06-20-phase1-5e-32-team-visual-qa.md) (first-pass scope)
**Predecessor:** [2026-06-16-phase1-5-team-template-assignment.md](2026-06-16-phase1-5-team-template-assignment.md) (template assignment + dark-axis WCAG math)
**Source code:** [teamTemplate.js](../../frontend/src/lib/teamTemplate.js), [nflTeams.js](../../frontend/src/data/nflTeams.js)
**Spec:** [page-system.md](../specs/page-system.md) §"Team Accent Token (Phase 1.5)"

---

## What changed from the first pass

Justin's directive (2026-06-20 chat) re-shaped the audit:

> "i wan to use all of the teams colors and then we can add colors we know will make the page better but we need to use their colors. for teams like atlanta, where they there is popular jordan show that has a similar color scheme we use that. for example arizona cold use 'Toro Bravo' as insparation"

And the meta-directive:

> "we need to add this type of clarification to our template so that when we make the next app we have a head start at desining"

Three corrections this pass makes:

1. **All 32 teams** (first pass did 9 secondary + 2 specials).
2. **Per-team light/dark axis** — some teams' fan-perceived identity is *inherently light* (Dolphins/Miami Vice, Chargers/beach, Cowboys/silver, Cardinals/Toro Bravo). Forcing them dark fights the identity.
3. **Cultural anchors** — when the official primary/secondary palette is generic or doesn't carry the team's fan-perceived identity, anchor to a specific named cultural reference (sneaker colorway, film, music era, region) with a cited hex.

The first pass's three defect findings (LV silver hue-shift, Bred Falcons accent collapse, HOU/NYG/ATL identical lifted accent) remain valid and roll forward.

---

## The 32-team table

Reading order:
- **Fan-perceived identity** — what colors fans actually associate with the team, in 1–2 phrases.
- **Cultural anchor** — a specific named reference (sneaker, film, music, art, region) when the official palette is flat. Cited with hex where the anchor changes the recommendation.
- **Today (Team mode, dark forced)** — production accent + surface as observed 2026-06-20.
- **Recommended axis** — light or dark surface (per-team, based on fan identity).
- **Recommended accent** — color + source (official hex or cultural reference).

| # | Team | Fan-perceived identity | Cultural anchor | Today | Axis | Recommended accent | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **BUF Bills** | Royal blue + red, Buffalo wing sauce, Zubaz pants, snow stadium | Bills Mafia table-smashing folk culture | `#2976ff` on `#0d1626` ✓ | **Dark** | Keep royal blue accent; add Buffalo-wing red `#C60C30` as secondary pop on hover/active states | Strong as-is |
| 2 | **MIA Dolphins** | Miami Vice aqua + coral + sun-bleached pastel | *Miami Vice* (1984–89 TV) + South Beach Art Deco | `#29f2ff` on `#0a1d1f` | **LIGHT** | Aqua `#008E97` accent + coral `#FC4C02` secondary on cream `#FDF8F2` surface | **FLIP TO LIGHT** — Dolphins identity is sun-on-water, not navy-night |
| 3 | **NE Patriots** | Navy + silver + red, minuteman, blue-collar Boston | American Revolution (1775) + Boston Tea Party | `#f3355a` on `#0d1926` | Dark | Navy `#002244` primary CTA + Patriot red `#C60C30` secondary | Keep dark; surface OK |
| 4 | **NYJ Jets** | Pine green + white, "J-E-T-S" chant | **Jordan 1 "Pine Green"** (literally matches NYJ primary #125740) | `#29ff9c` on `#11221c` ✓ | Dark | Keep pine green; cite Jordan 1 "Pine Green" as the canonical reference for the green hue choice | Strong as-is |
| 5 | **BAL Ravens** | Purple + black + gothic literary | **Edgar Allan Poe** "The Raven" (1845, written in Baltimore); Jordan 11 "Concord" violet | `#614ddb` on `#131122` (AA-large) | Dark | Lift Ravens purple toward Concord-violet for stronger AA + Poe-gothic resonance; black hairline borders | Keep dark; deepen the gothic mood |
| 6 | **CIN Bengals** | Tiger-stripe black + orange | Bengal tiger fur pattern + 1970s funk | `#fb612c` on `#220e07` ✓ | Dark | Keep orange accent; system should support tiger-stripe motif (alternating black + orange hairlines) as a CIN-only flourish | Strong as-is |
| 7 | **CLE Browns** | Working-class brown + orange (Dawg Pound) | 1950s NFL leather + Otto Graham era | `#ff5b29` on `#231706` | Dark | Keep brown surface; deepen accent toward classic Browns orange `#FB4F14` (rawer, less coral) | Keep dark; minor accent calibration |
| 8 | **PIT Steelers** | Steelers gold + black + steel-mill industrial | US Steel logo (the three Steelers diamonds = literal US Steel mark) | `#ffbd29` on `#15191e` ✓ | Dark | Keep gold + black; cite US Steel industrial heritage as the source of the diamond logo's three steel mills (yellow=coal, orange=ore, blue=steel) | Strong as-is |
| 9 | **HOU Texans** | Battle Red + Deep Steel Blue + Lone Star | Texas state flag + NASA Mission Control (blue panel + red text) | `#e3455e` on `#0e1d25` | Dark | **Fix textSafe lift on `#A71930`** — preserve deeper Battle Red, don't coral it. Differentiates from NYG, ATL | Keep dark; **defect 1.5e-defect-2 carries** |
| 10 | **IND Colts** | White horseshoe on speed blue, but the **white helmet is iconic** | Colts horseshoe-on-white helmet (since 1957) | `#298cff` on `#0d1926` | **LIGHT** | Royal blue `#002C5F` accent on white/cream surface; horseshoe is a white-canvas mark | **FLIP TO LIGHT** — Colts identity reads horseshoe-on-white, not blue-on-dark |
| 11 | **JAX Jaguars** | Tropical teal + gold + black, Florida wetlands | **Nike SB Dunk "Tiffany"** teal (2005) + Florida tropical | `#29e1ff` on `#0a1c1f` ✓ | Dark | Keep teal accent; cite Tiffany Dunk for the teal-on-dark precedent | Strong as-is |
| 12 | **TEN Titans** | Titan flame + light blue + navy, Greek myth | Greek Titan / Prometheus fire + Houston Oilers Columbia blue heritage | `#4d93db` on `#111822` ✓ | Dark | Keep light blue accent; add Titans flame red `#C8102E` as activation/danger color | Strong as-is |
| 13 | **DEN Broncos** | Orange sunset on navy, Rocky Mountain altitude | Rocky Mountain orange-to-navy sunset gradient | `#fb612c` on `#1e100b` | Dark | Keep orange; surface could mood-shift to deep navy `#002244` (currently rust-tinted) for the mountain-sky effect | Keep dark; consider surface re-derivation from secondary |
| 14 | **KC Chiefs** | Chiefs red + gold, Arrowhead Stadium, KC BBQ smoke | KC BBQ smokehouse + Buck O'Neil Negro Leagues legacy | `#eb3d58` on `#1d0c0f` | Dark | Keep red; add gold `#FFB81C` as secondary highlight (Arrowhead + Lombardi trophies); BBQ smoke metaphor for surface texture | Keep dark; gold deserves more presence |
| 15 | **LV Raiders** | Pure black + silver, outlaw "Black Hole" aesthetic | **Air Max 97 "Silver Bullet"** (1997) or **Jordan 4 "Cool Grey"** — clean metallic silver, no blue cast | `#8ab7ca` on `#1a1a1a` **DEFECT** | Dark | Pure silver `#A5ACAF` accent — **clamp textSafe hue-shift for low-saturation accents (defect 1.5e-defect-1)**. Cite Silver Bullet AM97 for the metallic intent | Keep dark; **fix silver defect** |
| 16 | **LAC Chargers** | Powder blue + yellow lightning, San Diego beach | 1960s San Diego beach Chargers (powder blue jerseys + lightning bolt) | `#6db3e5` on `#0a171f` | **LIGHT** | Powder blue `#0080C6` accent + lightning yellow `#FFC20E` on white/cream surface. Beach Chargers is THE identity | **FLIP TO LIGHT** — Chargers are a beach team, not a dark-night team |
| 17 | **DAL Cowboys** | Silver + white + navy, Lone Star, Tom Landry fedora | Western Lone Star + **Air Max 97 "Silver Bullet"** silver | `#2976ff` on `#0d1626` | **LIGHT** | Navy `#003594` accent + silver `#869397` secondary on silver-white `#F5F5F7` surface. The Star is on white | **FLIP TO LIGHT** — Cowboys identity is silver helmet + white pants. Dark navy fights it |
| 18 | **NYG Giants** | Royal blue + red, "Big Blue", NY blue-collar | NY boroughs + Yankee Stadium navy heritage | `#e3455e` on `#0f1424` | Dark | Royal blue `#0B2265` primary accent instead of secondary red. Red as secondary pop only. **Resolves HOU/NYG/ATL hue-collision (defect 1.5e-defect-3)** | Keep dark; **flip to primary**, contra first pass |
| 19 | **PHI Eagles** | Midnight green + silver + black, Dawkins-era grit | Philadelphia Liberty Bell silver + Rocky Balboa underdog | `#29ebff` on `#0d2426` | Dark | Midnight green `#004C54` accent (current rendering reads too teal/cyan — close to JAX). Tighten the green | Keep dark; **shift accent away from cyan to true midnight green** |
| 20 | **WAS Commanders** | Burgundy + gold + military | **Jordan 7 "Bordeaux"** (1992) + US Military commander gold braid | `#ffbd29` on `#221111` ✓ | Dark | Keep burgundy + gold; cite Jordan 7 Bordeaux as the canonical bordeaux+gold reference | Strong as-is |
| 21 | **CHI Bears** | Bears navy + orange, Walter Payton "Sweetness", Soldier Field | 1985 Bears + Walter Payton highlight reels + Chicago blues | `#fc642c` on `#121721` ✓ | Dark | Keep orange-on-navy; cite '85 Bears as the canonical Chicago color memory | Strong as-is |
| 22 | **DET Lions** | Honolulu blue + silver + Lions roar | Detroit Motown + Barry Sanders highlight era | `#29b4ff` on `#0d1d26` ✓ | Dark | Keep Honolulu blue accent; add silver `#B0B7BC` secondary for trim/borders | Strong as-is |
| 23 | **GB Packers** | Packers green + gold, Lambeau Field, cheesehead | Lambeau Field tundra (frozen field gold sunset on green) + Vince Lombardi era | `#ffbd29` on `#161d1b` ✓ | Dark | Keep gold + green; cite Lambeau tundra sunset for the gold-on-green pairing | Strong as-is |
| 24 | **MIN Vikings** | Vikings purple + gold + Norse longship | **Jordan 5 "Grape"** (1990) + Norse mythology + Skol chant | `#8d59cf` on `#191221` (AA-large) | Dark | Lift purple slightly for AA; cite Jordan 5 Grape as the purple+gold reference; runic mark motif | Keep dark; minor lift for AA |
| 25 | **ATL Falcons** | Falcons red + black, Bred | **Jordan 1 "Bred"** (1985) + Atlanta hip-hop (OutKast *Aquemini* 1998) | `#e3455e` on `#080608` **DEFECT** | Dark | **Preserve `#A71930` deep varsity red (defect 1.5e-defect-2)** — Bred template should bypass textSafe lift. Cite Bred 1's deep red against pure black as the design source | Keep dark; **fix Bred accent defect** |
| 26 | **CAR Panthers** | Carolina blue + black, Panther crouch | Carolina tobacco-road sky blue + UNC heritage | `#29b6ff` on `#0d1e26` | **LIGHT** (or hybrid) | Carolina blue `#0085CA` accent on cream surface; black secondary for borders. **OR** keep dark if Justin prefers the Panther's nocturnal-predator read | **JUSTIN'S CALL** — Carolina blue says "light", Panther says "dark" |
| 27 | **NO Saints** | Black + gold + Mardi Gras Krewe | New Orleans Mardi Gras (gold/purple/green) + Bourbon Street brass | `#d3bc8d` on `#15191e` ✓ | Dark | Keep Saints flip (gold-on-black ✓); cite Mardi Gras heritage; could optionally add Mardi-purple `#5D2E8C` accent for one festive surface (Saints' celebration mode) | Strong as-is |
| 28 | **TB Buccaneers** | Pewter + red + pirate skull, Gasparilla | Gasparilla pirate festival (Tampa Bay tradition) + skull-and-crossbones pewter | `#f53232` on `#1e0b0b` | Dark | Keep red; **surface should shift to pewter `#34302B`** (currently bloody-red — pirate identity is pewter helmet, not blood) | Keep dark; **swap surface from blood-red to pewter** |
| 29 | **ARI Cardinals** | Cardinal red + white, Southwest desert | **Jordan 6 "Toro Bravo"** (2014) — red leather + white sole + black contrast (Justin's example) | `#bf2c4c` on `#221111` | **LIGHT** | Cardinal `#97233F` accent on white `#FAFAF9` surface; black accents for hairlines. Mirrors Toro Bravo upper/sole structure | **FLIP TO LIGHT** — Toro Bravo is red-on-white, not red-on-dark |
| 30 | **LAR Rams** | Royal blue + sol gold, Hollywood glamour | Hollywood Walk of Fame gold stars on Rams blue | `#ffb229` on `#0d1626` ✓ | Dark | Keep gold + royal blue; cite Hollywood Walk of Fame gold as the source of the metallic gold accent | Strong as-is |
| 31 | **SF 49ers** | 49ers red + gold, 1849 Gold Rush | California Gold Rush (1849) + Joe Montana / Bill Walsh dynasty | `#f3355a` on `#280505` | Dark | Deepen red accent toward true `#AA0000` (currently coral-lifted); add gold `#B3995D` secondary for Gold Rush nod | Keep dark; **deepen red away from coral** |
| 32 | **SEA Seahawks** | College navy + action green + wolf grey, Pacific Northwest forest | 1990s Seattle grunge (Nirvana/Pearl Jam) + Pike Place market + PNW forest | `#8bda4e` on `#0d1926` ✓ | Dark | Keep action green + navy; CTA needs `--color-text-on-accent` token fix (light-green accent + black text = marginal contrast — known Phase 1.5b P1) | Strong as-is; **escalate text-on-accent token fix** |

---

## Light-mode flip recommendations (6 teams)

These six teams should swap their Team-mode axis from dark to light:

| # | Team | Reason (fan identity) | Source surface | Source accent |
|---|---|---|---|---|
| 2 | **MIA Dolphins** | Miami Vice + South Beach + sun-on-water | Cream `#FDF8F2` | Aqua `#008E97` + coral `#FC4C02` |
| 10 | **IND Colts** | White helmet horseshoe is iconic — Colts read white-canvas | Cream/white `#F5F5F7` | Speed blue `#002C5F` |
| 16 | **LAC Chargers** | Beach Chargers (1960s SD) — powder blue + sun | Cream `#F5F5F7` | Powder blue `#0080C6` + lightning yellow `#FFC20E` |
| 17 | **DAL Cowboys** | Silver helmet + white pants + Star — the canonical Cowboys look | Silver-white `#F5F5F7` | Navy `#003594` |
| 26 | **CAR Panthers** | Carolina blue + UNC heritage — Carolina blue belongs on white | Cream `#FAFAF9` | Carolina blue `#0085CA` |
| 29 | **ARI Cardinals** | Jordan 6 "Toro Bravo" — red leather + white sole | White `#FAFAF9` | Cardinal `#97233F` |

The other 26 teams stay dark; their fan-perceived identity is night-stadium, gothic, industrial, forest, or pirate.

---

## Cultural anchors — quick-reference index

Where I'm citing an external cultural reference as the basis for a color choice, here's the source-of-truth index:

| Anchor | Year | Team | Used for |
|---|---|---|---|
| **Jordan 1 "Bred"** | 1985 | ATL | Pure black canvas + deep varsity red. The audit's existing template-6 spec already names this. |
| **Jordan 1 "Pine Green"** | 2020 | NYJ | Pine-green on white outsole — matches NYJ primary directly. |
| **Jordan 4 "Cool Grey"** | 2004 | LV | Clean metallic silver, no hue cast. Alternative anchor for the textSafe silver fix. |
| **Jordan 5 "Grape"** | 1990 | MIN | Purple + emerald grape. Vikings purple identity. |
| **Jordan 6 "Toro Bravo"** | 2014 | ARI | Red leather + white sole + black contrast. Cardinals = red-on-white, not red-on-dark. |
| **Jordan 7 "Bordeaux"** | 1992 | WAS | Bordeaux + gold + black. Mirrors Commanders burgundy + gold directly. |
| **Jordan 11 "Concord"** | 1995 | BAL | Concord-violet — deeper, more legible Ravens purple. |
| **Air Max 97 "Silver Bullet"** | 1997 | LV, DAL | Clean chrome silver with red Swoosh. Anchor for "silver should stay silver." |
| **Nike SB Dunk "Tiffany"** | 2005 | JAX | Teal + black + gold. Tropical-teal precedent. |
| **Miami Vice (TV)** | 1984–89 | MIA | Aqua + coral + cream pastel. The Dolphins palette. |
| **The Raven (Poe)** | 1845 | BAL | Gothic violet + jet black + parchment. Baltimore literary anchor. |
| **OutKast "Aquemini"** | 1998 | ATL | Atlanta hip-hop era. Black + red + gold celebration. |
| **Lambeau Field tundra** | place | GB | Frozen-field gold sunset on dark green. |
| **California Gold Rush** | 1849 | SF | The actual source of the 49ers name. |
| **Hollywood Walk of Fame** | 1958 | LAR | Metallic gold stars on navy = Rams gold-on-blue. |
| **Pike Place Market / Grunge** | 1990s | SEA | Pacific Northwest navy + green + wolf-grey forest. |
| **US Steel (logo origin)** | 1962 | PIT | The Steelers diamond logo *is* the US Steel mark (yellow=coal, orange=ore, blue=steel). |
| **Gasparilla pirate festival** | annual | TB | Tampa Bay's pirate identity. Pewter helmet over bloody red. |
| **Mardi Gras Krewes** | annual | NO | Gold + purple + green festival palette. |
| **1985 Bears / Walter Payton** | era | CHI | The canonical Chicago color memory. |
| **Tom Landry / Cowboys '70s** | era | DAL | Silver helmet + white pants + fedora coach. |
| **NASA Mission Control** | 1965+ | HOU | Houston space heritage — Mission Control blue panels + red text. |

---

## Defects carried forward from first pass

| ID | Severity | Status | Notes |
|---|---|---|---|
| **1.5e-defect-1** | P1 | Open | LV silver hue-shifts to washed cool-blue via `textSafe`. Fix: clamp hue-shift for accents with HSL saturation < 10%. Cite Air Max 97 "Silver Bullet" as the visual target. |
| **1.5e-defect-2** | P2 | Open | Bred template applies `textSafe` to Falcons varsity-red, collapsing it to the same coral as HOU/NYG. Fix: Bred template bypasses `textSafe`. Cite Jordan 1 "Bred" as the visual target. |
| **1.5e-defect-3** | P3 → resolved-by-design | Open | HOU/NYG/ATL share identical lifted accent `#e3455e`. This audit resolves NYG by flipping NYG accent to royal-blue primary; ATL by bypassing `textSafe` for Bred; HOU by deepening the textSafe lift on Battle Red. After Phase 1.5f ships these three are distinguishable. |

New defects this pass:

| ID | Severity | Location | Fix |
|---|---|---|---|
| **1.5e-defect-4** | P2 | [nflTeams.js](../../frontend/src/data/nflTeams.js) PHI | PHI accent renders too cyan (close to JAX); shift to true midnight green `#004C54`. |
| **1.5e-defect-5** | P2 | [teamTemplate.js](../../frontend/src/lib/teamTemplate.js) TB | TB surface is bloody red — fan identity is pewter helmet. Re-derive TB surface from secondary `#34302B` (pewter) instead of primary `#D50A0A`. |
| **1.5e-defect-6** | P2 | [nflTeams.js](../../frontend/src/data/nflTeams.js) SF | SF accent textSafe-lifts `#AA0000` to coral; deepen to true `#AA0000` for 49ers-red identity. |
| **1.5e-defect-7** | P1 (escalated from 1.5b) | [index.css](../../frontend/src/index.css) | Add `--color-text-on-accent` token. Required for any team with light accent (SEA action green, gold accents). Already flagged in Phase 1.5b LEDGER row — escalating to P1 because per-team light mode (Phase 1.5f) hits this for every light-axis team. |

---

## Phase 1.5f — re-scoped from the first pass

The first pass scoped Phase 1.5f as "add light recipes so user can flip light/dark." This pass replaces that with a richer scope:

### Phase 1.5f goals (this is what the spike must deliver)

1. **Per-team axis decision baked into the team record.** Add `surfaceAxis: 'light' | 'dark'` to each team in `nflTeams.js`. The 6 flip teams (MIA, IND, LAC, DAL, CAR if Justin says yes, ARI) get `'light'`; the other 26 keep `'dark'`. This is **not** a user preference — it's a per-entity fact.
2. **Two-axis `SURFACE_RECIPES` map.** Add light recipes (L≈92–96, sat × 0.15) parallel to the existing dark recipes (L≈8–10, sat × 0.5).
3. **`getTeamTemplate()` reads `team.surfaceAxis`** instead of forcing dark.
4. **`textSafe()` saturation-aware:**
   - For accents with HSL saturation < 10%, **clamp hue-shift** (fixes LV silver — defect 1.5e-defect-1).
   - For light-axis surfaces, **lower lightness instead of raising it** so accents stay readable on cream.
5. **Bred template (template 6) bypasses `textSafe` entirely** (defect 1.5e-defect-2). Preserves Falcons varsity red.
6. **Per-team accent overrides** for the 4 teams whose accent needs tuning (HOU, NYG, PHI, SF — defects 4, 6 + first-pass observations). These are `nflTeams.js` data edits, not template changes.
7. **TB surface re-derivation** from secondary instead of primary (defect 1.5e-defect-5). One-line `needsSurfaceFlip()`-style heuristic addition.
8. **Add `--color-text-on-accent` token** in `index.css` and propagate to all CTAs (defect 1.5e-defect-7). This unblocks every light-accent team and every light-axis surface.
9. **Re-run 32-team WCAG sweep** against both axes. Append both columns to the 2026-06-16 contrast table.
10. **Mode picker copy update**: "Team — Your team takes over. Light or dark to match your team's true colors." (was "Always dark.")
11. **`page-system.md` spec update**: clarify that Team mode is per-entity light/dark, not per-user.

Rough complexity: **medium-large.** Most lift is in steps 1, 2, 9 (data axis + recipe duplication + WCAG sweep). Steps 4, 5, 7, 8 are surgical. The cultural-anchor citations live in the audit doc (this file) — they don't need to enter the runtime; they're documentation for future designer understanding.

---

## Out-of-scope for Phase 1.5f

These ideas appeared during the audit but are **not** in the Phase 1.5f spike scope:

- **Per-team motif flourishes** (CIN tiger-stripe hairlines, Saints Mardi-purple celebration mode, NE Patriot-day mode, etc.). These are nice-to-haves but require a richer template grammar. Phase 1.5g or later.
- **Mood-shift surfaces** (DEN sunset gradient, BAL gothic surface texture). Same — visual flourishes that go beyond a single-color surface token.
- **Per-team typography tweaks** (e.g., a Bears team-mode bold-italic for 1985-Bears throwback). Out of scope.
- **Animated cultural moments** (NO Mardi Gras week, BUF playoff snow). Out of scope.

These are flagged here so future Phase 1.5g/h can pick them up with the audit's reasoning still attached.

---

## Evidence inventory

The 18 production captures from the first-pass audit (`ss_24969icaj` … `ss_48947xjtt`) remain the visual evidence base. They cover the 9 secondary-scheme priority teams, ATL Bred, NO Saints flip, baselines, naive-light-flip reference, and cross-page propagation on `/football`. The 23 standard-scheme teams not individually captured are visible in the all-32 tile grid (`ss_6826sbhof`).

Where this audit recommends a change beyond the captured teams (e.g., MIA flip to light, CAR Carolina-blue-on-white, ARI Toro Bravo), the recommendation is reasoned from `nflTeams.js` data + cultural anchor, not from a fresh production capture. Verification of the proposed look happens in Phase 1.5f against the new light recipes.

---

## Decisions Justin owns (open in this audit)

1. **CAR Panthers axis call.** Carolina blue says "light + UNC blue on white." Panther says "dark + nocturnal predator." Either is defensible. Audit defaults to **light** but flags for Justin's call.
2. **Per-team motif flourishes** (CIN tiger-stripe, Saints Mardi-purple, NE minuteman). In or out of Phase 1.5g scope?
3. **WAS Mardi-style alternate surface for Saints celebration mode.** Easter-egg nice-to-have? Or distraction?
4. **Cultural anchor citations** — keep in audit doc only, or surface them in product (e.g., a one-line attribution under each team's tile in `/account/appearance`: "Pine Green — Jordan 1 colorway")? Could be a fan-engagement signal.
