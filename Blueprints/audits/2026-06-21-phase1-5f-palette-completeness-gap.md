# Phase 1.5f — 32-Team Palette Completeness Gap + Phase 1.5h Proposal

**Date:** 2026-06-21 (post-Phase-1.5f ship audit)
**Author:** Claude
**Source evidence:** 32 authenticated MCP screenshots on `localhost:5173/account/appearance` (Phase 1.5f branch `claude/phase1-5f-theme-aware-axis`)
**Driver of this doc:** Justin doctrine call 2026-06-21:
> "No team page should be in 'dark mode' that decision is final. Teams may have black and be dark because the colors of the teams are dark. We only will alter color to make our webpage and app look beautiful. A minimum requirement is that all teams must have their official colors on all pages."

---

## TL;DR

Phase 1.5f shipped a **single-accent-per-team** model: each team has one accent color (with surface derived from it) rendered across all themed UI. **This fails Justin's new minimum bar.** Of 32 teams, only **3** (PIT, WAS, LAR, SEA — secondary-swap teams that happen to show 2 swatches) come close, and even those only show 2 of 3-4 official colors. The other 28 show **one color**.

Root cause is structural — the `nflTeams.js` data model stores `primary + secondary + accent` but the render pipeline (`teamTemplate.js`, `themeMode.js`, `Appearance.jsx`) consumes only `accent` for text/CTA and a derived `surface`. `secondary` exists in data for ~10 secondary-swap teams; for the other 22 it's never painted. Neutrals (white, black) are completely outside the model.

**Phase 1.5h** is the fix: replace single-accent with multi-color palette per team, define UI role mapping, refactor the page-system to consume the full palette, and roll back the Phase 1.5e `surfaceAxis` stylistic decision (axis becomes a consequence of the team's dominant color, not a per-team policy).

---

## 32-team gap table

For each team: official palette (canonical 2-4 brand colors per NFL Properties brand kits / Wikipedia infoboxes), what's currently in `nflTeams.js`, what actually renders on `/account/appearance` in Team mode.

Legend:
- ✅ = color is rendered visibly somewhere on the page
- 🟡 = color is in data (as `secondary`) but only appears in swatch chips (small bottom-right), not in any text/CTA/border
- ❌ = color not in data, not rendered

| # | Team | Official palette | In nflTeams.js | Rendered visibly (CTA/text/border) | Gap |
|---|---|---|---|---|---|
| 1 | **BUF** Bills | Royal Blue `#00338D`, Red `#C60C30`, White | primary=blue, secondary=red, accent=blue | blue only | ❌ red, ❌ white |
| 2 | **MIA** Dolphins | Aqua `#008E97`, Orange `#FC4C02`, Blue `#005778`, White | primary=aqua, secondary=orange, accent=aqua | aqua only | ❌ orange, ❌ blue, ❌ white |
| 3 | **NE** Patriots | Navy `#002244`, Red `#C60C30`, Silver `#B0B7BC`, White | primary=navy, secondary=red, accent=navy | navy only | ❌ red, ❌ silver, ❌ white |
| 4 | **NYJ** Jets | Pine Green `#125740`, White, Black | primary=green, secondary=white, accent=green | green only | ❌ white, ❌ black |
| 5 | **BAL** Ravens | Purple `#241773`, Gold `#9E7C0C`, Black | primary=purple, secondary=gold, accent=purple | purple only | ❌ gold, ❌ black |
| 6 | **CIN** Bengals | Orange `#FB4F14`, Black `#000000`, White | primary=orange, secondary=black, accent=orange | orange only | ❌ black, ❌ white |
| 7 | **CLE** Browns | Brown `#311D00`, Orange `#FF3C00`, White | primary=brown, secondary=orange, accent=brown | brown only | ❌ orange, ❌ white |
| 8 | **PIT** Steelers | Black `#101820`, Gold `#FFB612`, Red, Blue, Yellow (logo) | primary=black, secondary=gold, accent=gold (swap) | black + gold ✅✅ | ❌ logo red/blue/yellow accents |
| 9 | **HOU** Texans | Deep Steel Blue `#03202F`, Battle Red `#A71930`, White | primary=blue, secondary=red, accent=red (swap) | blue (surface) + red 🟡 swatch only | partial; ❌ white |
| 10 | **IND** Colts | Speed Blue `#002C5F`, Silver `#A2AAAD`, White | primary=blue, secondary=silver, accent=blue | blue only (light axis cream surface) | ❌ silver, ❌ explicit white (cream ≠ white) |
| 11 | **JAX** Jaguars | Teal `#006778`, Gold `#D7A22A`, Black, White | primary=teal, secondary=gold, accent=teal | teal only | ❌ gold, ❌ black, ❌ white |
| 12 | **TEN** Titans | Navy `#0C2340`, Columbia `#4B92DB`, Red `#C8102E`, Silver | primary=navy, secondary=columbia, accent=navy | navy only | ❌ columbia blue, ❌ red, ❌ silver |
| 13 | **DEN** Broncos | Orange `#FB4F14`, Navy `#002244`, White | primary=orange, secondary=navy, accent=orange | orange only | ❌ navy, ❌ white |
| 14 | **KC** Chiefs | Red `#E31837`, Gold `#FFB81C`, White | primary=red, secondary=gold, accent=red | red only | ❌ gold, ❌ white (Justin's example) |
| 15 | **LV** Raiders | Black `#000000`, Silver `#A5ACAF`, White | primary=black, secondary=silver, accent=silver (swap) | black + silver ✅✅ | ❌ white |
| 16 | **LAC** Chargers | Powder Blue `#0080C6`, Sunshine Gold `#FFC20E`, Navy, White | primary=powder, secondary=gold, accent=powder | powder blue only (light axis) | ❌ gold, ❌ navy, ❌ white |
| 17 | **DAL** Cowboys | Royal `#003594`, Silver `#869397`, Navy, White | primary=royal, secondary=silver, accent=royal | royal only (light axis cream) | ❌ silver, ❌ navy, ❌ white |
| 18 | **NYG** Giants | Royal Blue `#0B2265`, Red `#A71930`, Gray, White | primary=royal, secondary=red, accent=royal (Phase 1.5f flip) | royal blue only | ❌ red, ❌ gray, ❌ white (regression — pre-1.5f showed red) |
| 19 | **PHI** Eagles | Midnight Green `#004C54`, Silver `#A5ACAF`, Black, White, Charcoal | primary=green, secondary=silver, accent=green | green only | ❌ silver, ❌ black, ❌ white (Justin's example) |
| 20 | **WAS** Commanders | Burgundy `#5A1414`, Gold `#FFB612`, Black, White | primary=burgundy, secondary=gold, accent=gold (swap) | burgundy + gold ✅✅ | ❌ black, ❌ white |
| 21 | **CHI** Bears | Navy `#0B162A`, Orange `#C83803`, White | primary=navy, secondary=orange, accent=orange (swap) | navy + orange ✅✅ | ❌ white |
| 22 | **DET** Lions | Honolulu Blue `#0076B6`, Silver `#B0B7BC`, Black, White | primary=blue, secondary=silver, accent=blue | blue only | ❌ silver, ❌ black, ❌ white |
| 23 | **GB** Packers | Green `#203731`, Gold `#FFB612`, White | primary=green, secondary=gold, accent=gold (swap) | green + gold ✅✅ | ❌ white |
| 24 | **MIN** Vikings | Purple `#4F2683`, Gold `#FFC62F`, White | primary=purple, secondary=gold, accent=purple | purple only | ❌ gold, ❌ white |
| 25 | **ATL** Falcons | Red `#A71930`, Black `#000000`, Silver `#A5ACAF`, White | primary=red, secondary=black, accent=red (Bred template) | red + black (Bred surface) ✅✅ | ❌ silver, ❌ white |
| 26 | **CAR** Panthers | Carolina Blue `#0085CA`, Black `#101820`, Silver `#BFC0BF`, White | primary=carolina, secondary=black, accent=carolina | carolina blue only (light axis cream) | ❌ black, ❌ silver, ❌ white |
| 27 | **NO** Saints | Gold `#D3BC8D`, Black `#101820`, White | primary=gold, secondary=black, accent=gold (Saints flip) | black surface + gold ✅✅ | ❌ white |
| 28 | **TB** Buccaneers | Red `#D50A0A`, Pewter `#34302B`, Black, Bay Orange `#FF7900`, White | primary=red, secondary=orange, accent=red, surfaceFrom=secondary | red + warm-pewter surface (derived from orange, not true pewter) | ❌ true pewter `#34302B`, ❌ black, ❌ white |
| 29 | **ARI** Cardinals | Cardinal `#97233F`, Black `#000000`, Yellow `#FFB612`, White | primary=cardinal, secondary=gold, accent=cardinal | cardinal only (light axis cream) | ❌ black, ❌ yellow, ❌ white |
| 30 | **LAR** Rams | Sol `#FFA300`, Royal `#003594`, White, Bone | primary=royal, secondary=gold, accent=gold (swap) | royal + gold ✅✅ | ❌ white, ❌ bone |
| 31 | **SF** 49ers | Red `#AA0000`, Gold `#B3995D`, Black, White | primary=red, secondary=gold, accent=red | red only | ❌ gold, ❌ black, ❌ white (Justin's example) |
| 32 | **SEA** Seahawks | Navy `#002244`, Action Green `#69BE28`, Wolf Grey `#A5A8AB`, White | primary=navy, secondary=green, accent=green (swap) | navy + green ✅✅ | ❌ wolf grey, ❌ white |

### Aggregate

- **0 of 32** teams render their full official palette
- **8 teams** render 2 colors (PIT, LV, WAS, CHI, GB, ATL, NO, LAR, SEA — the secondary-swap or special-template set)
- **24 teams** render 1 color
- **White is missing from every team** (no team has white anywhere in rendered UI, even though almost every team has white in its official palette — jerseys, helmets, logo backgrounds)
- **Black is missing from 9 teams** that have it as official (CIN, JAX, DET, ATL secondary, CAR secondary, TB, ARI, SF) — present indirectly in 2 (BAL surface, LV primary)

---

## Root cause (structural, not per-team)

The current pipeline:

```
nflTeams.js                  teamTemplate.js                themeMode.js              UI
─────────────                ───────────────                ─────────────             ──
team.primary    ───────────► deriveSurface()  ─► surface ─► --color-bg            ─► bg
team.secondary  ─── (lost) ─────────────────────────────────────────────────────────  invisible (or swatch only)
team.accent     ───────────► textSafe() ─────► accent ───► --color-team-accent   ─► text, CTA, borders
                            readableOn() ────► textOn ───► --color-text-on-accent ─► CTA text
                            (template 6 bypass — ATL only)
```

Of the team's official palette, only `primary` (as derived surface) and `accent` (as text/border/CTA) make it to pixels. Secondary is consumed by `teamTemplate` if `scheme === 'secondary'` (it swaps with primary in some places) but never lives alongside primary visibly. Whites, tertiary colors, and neutrals are not in the data model at all.

The Phase 1.5e per-team `surfaceAxis` decision compounded this: light-axis teams (MIA/IND/LAC/DAL/CAR/ARI) get a cream surface tinted with primary at 15% saturation — that cream is NOT white, NOT a team color, and reads as a "cream design" rather than as the team's white.

---

## Phase 1.5h proposal

### 1. Data shape: palette array

Replace `{ primary, secondary, accent, scheme }` with a `palette` array per team:

```js
{
  abbr: 'KC',
  city: 'Kansas City',
  name: 'Chiefs',
  div: 'AFC West',
  palette: [
    { hex: '#E31837', name: 'Chiefs Red',    role: 'primary'  },
    { hex: '#FFB81C', name: 'Gold',          role: 'secondary'},
    { hex: '#FFFFFF', name: 'White',         role: 'neutral'  },
  ],
  // ... existing copy (cultureTag/cry/wardRoom/lore/culturalAnchor)
}
```

Role values (suggested vocabulary, open for revision):
- `primary` — dominant brand color (usually the helmet/jersey color)
- `secondary` — second brand color (the visible counterpart)
- `tertiary` — third brand color when applicable (LAR bone, TB orange, etc.)
- `neutral` — white, off-white, cream (the team's "negative space")
- `mute` — black or near-black when not the primary (used for hairlines, depth, contrast frames)
- `accent-pop` — optional 5th color for hover/active states (KC gold-on-red, etc.)

Required minimum per team: `primary + secondary + neutral`. Optional: `tertiary, mute, accent-pop`.

### 2. Render targets: every palette color appears somewhere

The page-system spec needs to assign each palette role to specific UI affordances. Draft mapping:

| Role | Where it appears |
|---|---|
| `primary` | Page surface tint (the "world" color), primary CTA fill |
| `secondary` | Secondary CTA / Section headers / Border accents / Identity copy headline (`wardRoom`) |
| `tertiary` | Tertiary accents (chip backgrounds, optional flourishes) |
| `neutral` | Body text on dark surfaces, surface-card fills on light surfaces, frame borders, swatch labels |
| `mute` | Hairline dividers, frame outlines on light surfaces, secondary text |
| `accent-pop` | Hover/active states on CTAs, focus rings, "selected" indicators |

Every themed page must render at least `primary + secondary + neutral` somewhere visible. The Appearance page's selected meta block becomes the canonical demo: a row of N labeled swatches (one per palette entry), with named tags ("Chiefs Red / Gold / White"). The identity copy block uses 2-3 different palette colors for visual hierarchy (`cultureTag` in secondary, `cry` in primary, `wardRoom` in primary bold, `lore` in mute).

### 3. Doctrine reversal: roll back `surfaceAxis` as a stylistic policy

Justin: "No team page should be in dark mode. Teams may have black and be dark because the colors of the teams are dark." Translation:

- **Drop** the per-team `surfaceAxis: 'light' | 'dark'` field as a design decision
- **Replace** with derived logic: the page surface IS the team's `primary` color (or a deep tint of it for accent legibility). If the primary is dark (PIT black, BAL purple, NE navy, ATL red), the page reads dark — and that's the team being itself, not Corvus imposing dark mode. If the primary is light (MIA aqua, IND blue surface but with iconic white — see open question), the page reads lighter — same logic.
- The `Mode` picker tile labels update: "Team — Your team's actual colors paint the app." (drop the "light or dark" framing entirely)

This means the Phase 1.5f light-axis surface recipes (`L≈94, sat × 0.15`) likely go away — replaced by surface-from-primary-direct-or-deep-tint logic. The 6 "light-flip" teams (MIA/IND/LAC/DAL/CAR/ARI) become whatever their actual primary palette dictates, with white/cream coming from the explicit `neutral` palette entry rather than from a forced light surface.

### 4. Data sourcing

Need authoritative palettes for all 32. Two paths:
- **(Fast)** I source from NFL.com team brand kits + Wikipedia infoboxes, draft the new data, you review per team in batches of 8 (one division at a time)
- **(Slow but cleanest)** Justin curates each team's palette himself, possibly with a separate doc, to make sure cultural calls (TB pewter vs orange, NYG red vs blue dominance, GB green vs gold dominance, etc.) match his eye

I'd recommend (Fast) for the initial pass + (Slow) for the ~6-8 teams where there's a legitimate dominance call to make.

### 5. Render-pipeline refactor

- `teamTemplate.js`: replace `accent + accentBg + textOnAccent` outputs with a full role map. Each role exposes a CSS variable: `--color-team-primary`, `--color-team-secondary`, `--color-team-tertiary`, `--color-team-neutral`, `--color-team-mute`, `--color-team-pop`.
- `themeMode.js applyTeamTokens`: write the full role map to the document root.
- `nflTeams.js teamAccentOn()` / `readableOn()` may stay for individual contrast calculations, but the "lift" logic gets simpler: each palette color is curated to be displayable as-is (or near-as-is); we don't algorithmically maul brand identity into something that "works on a dark background."
- The `surfaceAxis`, `accentLifted`, `surfaceFrom`, and `accent` fields all retire. `culturalAnchor` stays (it's orthogonal — describes WHY the palette is what it is).
- Programmatic contrast sweep (`frontend/scripts/contrast-sweep.mjs`) gets rewritten: now N palette colors × N UI roles × foreground/background combinations.

### 6. Render-component updates

- `Appearance.jsx` selected meta block: swatch row becomes N named swatches with role labels ("Chiefs Red — Primary", "Gold — Secondary", "White — Neutral"). Identity copy block (cultureTag, cry, wardRoom, lore) uses 2-3 different palette roles for hierarchy.
- `LivePreview` component: card shows the same multi-color treatment a real Omen recommendation card would (primary surface, secondary border, neutral text, primary CTA, etc.) so the preview is a real preview, not just "one color sample".
- Every other accent-active page (`Football`, `Ledger`, `Standings`, `TradeAnalyzer`, `DraftAssistant`, `OmenPage`, `Onboarding PickLookStep`) needs an updated rule for which palette role goes where.

### 7. Spec doc updates

- `Blueprints/specs/page-system.md` §Team Accent Token — replaces single-accent rules with role-mapping rules. The two-axis section added in Phase 1.5f gets struck and replaced with "team's primary IS the surface" doctrine.
- New section: per-team palette inventory (mirror of the gap table above, but as the source-of-truth post-Phase-1.5h).
- `Brand/entity-identity-theming.md` methodology doc updates: principle #2 ("per-entity light/dark axis") gets revised to "per-entity full palette; surface is a consequence of the primary, not a stylistic axis".

### 8. Estimated complexity

This is **larger than Phase 1.5f** (which was 12 points). Rough sizing:
- Data sourcing + curation: 5-8 points
- Data shape migration + render pipeline refactor: 8 points
- 6 themed-page consumer updates: 6 points
- Spec + audit + WCAG sweep + LEDGER: 4 points
- **Total: ~25 points** — call it Phase 1.5h, expect 1-2 PRs.

---

## Open questions for Justin

1. **What happens to the surface in Team mode for KC?** Three options:
   - (a) Surface is `#E31837` Chiefs red (primary directly — vivid red world)
   - (b) Surface is a deep red tint like `#1D0C0F` (current — readable but barely "Chiefs red")
   - (c) Surface is the team's `neutral` (white) — Chiefs white world with red CTAs
   The current Phase 1.5f picks (b). The new doctrine seems to want (a) for most teams, but (a) is visually intense and may make body text unreadable. Need a per-team call or a categorical rule.
2. **Does "every page must have official colors" mean Account/Settings/Onboarding pages too?** Or only the core themed surfaces (Football/Omen/Ledger/Standings/Trade/Draft/Appearance)? Phase 1.5 PR1's sweep is currently whole-app; Phase 1.5h needs the same scope question answered.
3. **For ATL "Bred" template:** is the Bred treatment (pure black canvas + raw varsity red) the canonical Falcons look, or just one mode? Other teams have cultural template references (Jordan colorways, etc.) — should each get a special template, or do they all reduce to "primary + secondary + neutral on canvas"?
4. **Cultural-anchor citation UI:** keep it as is on Appearance? Or extend to other surfaces?
5. **Roll-back vs forward-only:** do we revert Phase 1.5f on `main` before starting Phase 1.5h, or build Phase 1.5h on top of the 1.5f branch and ship as one larger PR?

---

## Evidence index — 32 screenshots captured 2026-06-21

All on local dev `localhost:5173/account/appearance` against branch `claude/phase1-5f-theme-aware-axis`. Screenshot IDs (in audit order):

| Team | Screenshot ID |
|---|---|
| MIA | ss_8051c25mj |
| ATL | ss_00474eia8 |
| KC  | ss_255454bjx |
| PHI | ss_0182v5vc3 |
| SF  | ss_8227r33v2 |
| BUF | ss_3008fnl2h |
| NE  | ss_311576n7d |
| NYJ | ss_3225bxvot |
| BAL | ss_7344cypju |
| CIN | ss_7454t22bm |
| CLE | ss_75629xl01 |
| PIT | ss_7677tyq18 |
| HOU | ss_9878tmr8k |
| IND | ss_9994v6fin |
| JAX | ss_0102m49hn |
| TEN | ss_0211gqvjp |
| DEN | ss_3620hqf0o |
| LV  | ss_3736gsx95 |
| LAC | ss_38395hxca |
| DAL | ss_5510xb2tk |
| NYG | ss_5618m4ql6 |
| WAS | ss_5726hqhh8 |
| CHI | ss_0636t24pr |
| DET | ss_0743u2kyx |
| GB  | ss_0852by158 |
| MIN | ss_09626jsgu |
| CAR | ss_1850jp2dd |
| NO  | ss_1958k0vkb |
| TB  | ss_20673jbv3 |
| ARI | ss_4931rlogq |
| LAR | ss_5040sa1ht |
| SEA | ss_5150rqipm |
