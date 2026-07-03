# Codex Prompt — Phase 1.13 Discrete Fixes

**Owner:** Codex (execution) / Justin (merge)
**Date drafted:** 2026-07-03
**Branch:** `frontend/phase1-13-discrete-fixes`
**Scope:** single PR, single scoped change — four named fixes only
**Prerequisite:** the logo-suite-swap PR (`frontend/logo-suite-swap`) should land or at least be open before this branches off `main`, to avoid stepping on `Header.jsx` / `Landing.jsx` diffs.

---

## Why

Phase 1.13 real-device QA (2026-07-03) passed on scrolling, buttons, and general responsiveness — but flagged four discrete issues:

1. **Text isn't consistently using the agreed-upon fonts** — audit against the reconciled design-system spec.
2. **`Birds Gang` typo** on the Eagles' `cultureTag`.
3. **Appearance picker team list not alphabetical.**
4. **Some teams' two colorway options don't visually differentiate** — the "second skin" reads identical to the primary.

The doctrine and specs to land against, all authored 2026-07-03:

- `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md` — Look Good — Play Good, two-sided presence.
- `slops-saloon/omen/Blueprints/specs/omen-ux-ui-design-system-v1.md` v2 — reconciled palette + typography + Phase 1.x subsystem index.
- `slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md` — team colorway rules + regional identity + three tests.
- `slops-saloon/Blueprints/specs/chant-and-fan-copy-spec-v1.md` — chant string inventory + copy correctness rules.

Read all four before starting.

---

## Fix 1 — Bird Gang typo (trivial, do this first as a warm-up)

**File:** `frontend/src/data/nflTeams.js`
**Line:** 647

```diff
-    cultureTag: 'Birds Gang',
+    cultureTag: 'Bird Gang',
```

**Verify** afterward with `grep -rn "Birds Gang" frontend/src/` returning zero matches. If any other file references `'Birds Gang'` as a lookup key (unlikely), update those too — the source of truth is the string in `nflTeams.js`.

---

## Fix 2 — Alphabetize the Appearance picker team list

**Files to inspect:**

- `frontend/src/pages/Appearance.jsx` — page consumer.
- `frontend/src/components/theme/AppearancePicker.jsx` — the `TeamTile` renderer + list layout.
- `frontend/src/data/nflTeams.js` — `NFL_TEAMS` and `TEAMS_BY_DIV` exports.

**Task:**

1. Locate where the picker's team-tile grid renders its list (likely iterating `NFL_TEAMS` or a division-flattened variant).
2. Add an alphabetical sort **by team `name`** (not `abbr`, not `city`) at render time — do NOT reorder the exported `NFL_TEAMS` array itself, because `TEAMS_BY_DIV` and other consumers may rely on the source order or the division grouping.
3. If the picker currently uses a division-grouped layout (`TEAMS_BY_DIV`), preserve the division groups, but sort teams alphabetically *within* each group.
4. If the picker is a flat grid, sort the flat list alphabetically.
5. Preserve selection state and scroll position — an alphabetical re-sort must not blow away the currently-selected team.

**Ask before deciding structure:** if the current picker layout is division-grouped and Justin's intent was a flat alphabetical grid, that's a *layout change*, not an alphabetization. Flag as a follow-up rather than rewriting the picker in this scope.

---

## Fix 3 — Font audit against the reconciled v2 spec

**Read first:** `slops-saloon/omen/Blueprints/specs/omen-ux-ui-design-system-v1.md` §Typography and §Usage Rules table.

The reconciled v2 spec declares three fonts:

- **Alegreya Sans** — headings, display, UI labels, buttons, inputs, navigation.
- **Alegreya** — body text, long-form reading copy.
- **DM Mono** — numeric / code-adjacent contexts (score readouts, hex swatches, cell values, monospace-aligned tables).

**Audit tasks:**

1. **Grep for hardcoded `font-family:` CSS strings** in `frontend/src/**/*.{jsx,css}` outside `index.css`. Every hit is a potential token bypass. Report or fix as appropriate — the goal is that all font-family styling flows through Tailwind classes (`font-sans` / `font-serif` / `font-mono` / `font-display`) or through `--type-flourish-family` (the Phase 1.5g motif override, legitimate).
2. **Verify Tailwind config** (`frontend/tailwind.config.*`) — `fontFamily` should map:
   - `sans` → `['Alegreya Sans', 'system-ui', 'sans-serif']`
   - `serif` → `['Alegreya', 'Georgia', 'serif']`
   - `display` → `['Alegreya Sans', 'system-ui', 'sans-serif']`
   - `mono` → `['DM Mono', 'ui-monospace', 'monospace']` — **verify this exists.** If it doesn't, DM Mono is loaded via `@import` in `index.css` line 2 but never surfaces through `font-mono` classes. Fix by adding the `mono` mapping to Tailwind config.
3. **Spot-check numeric-heavy components** for `font-mono` usage:
   - Confidence score readout in `OmenOfTheWeek.jsx` and `DraftAssistant.jsx` — the numeric value should be `font-mono`, the label ("Medium-High") should be `font-sans`.
   - `Standings.jsx` and `LeagueStandings.jsx` — W/L/T/PF/PA columns should render `font-mono tabular-nums`.
   - `MoveHistory.jsx` — timestamp / score deltas should be `font-mono`.
   - `Appearance.jsx` Swatch — hex code display already uses `font-mono` (verified in current code).
4. **Spot-check body copy** for `font-serif`:
   - Long-form paragraphs on Landing, About, Onboarding welcome copy.
5. **Report gaps** as P1/P2 in the End of Task Report — fix P1s (typography wrong on load-bearing surfaces), defer P2s (typography wrong on decorative surfaces) as follow-ups.

**Do not restyle anything based on personal taste.** The audit is strictly "does the rendered face match the spec's Usage Rules table for that context?" Anything else is scope creep.

---

## Fix 4 — Duplicate-second-skin audit and repair

**Read first:** `slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md` §The three tests.

**Context:** the current `nflTeams.js` already implements two skins per team via `palettes[].mode: 'official' | 'special'`. The mapping to the fan-experience doctrine is:

- `mode: 'official'` → **War Room** (primary skin per doctrine)
- `mode: 'special'` → **Color Rush** (fan-authored alt per doctrine)

Justin flagged that "several teams' two color options repeat the same color or don't visually differentiate the second skin from the primary." The file header says 30/32 teams have a `mode: 'special'` — so at least 2 teams have only `mode: 'official'` and by definition fail the two-skin doctrine.

**Task:**

1. **Walk every team in `NFL_TEAMS`.**
2. **Identify teams without a `mode: 'special'` palette.** Report them — do NOT auto-generate special palettes for them. Regional identity requires fan verification (per colorway spec §3 Region Test); Codex cannot pick regional colors alone.
3. **For teams WITH a `mode: 'special'` palette**, compute the ΔE (Delta E CIE76 is fine; CIE2000 is also fine — use whichever you have a lib for) between `official.colors[0].hex` (the official primary) and `special.colors[0].hex` (the special primary). Flag any pair with **ΔE < 15** as visually indistinguishable.
4. **For each flagged team**, do NOT auto-pick a new special primary — instead, apply a **minimum-differentiation nudge**: shift the special primary's hue by 15° in HSL space, or lightness by ±10% (whichever preserves the palette's intent better based on the color's current position). Log every nudge in the End of Task Report so Justin can review whether the nudge preserves the team's identity or needs a proper spec pass.
5. **For teams with no `mode: 'special'`**, add a `TODO(colorway-spec-v1)` comment in `nflTeams.js` above the team entry pointing to `slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md` §Team Roster and the "extended-roster author pass" workflow. Do NOT ship an auto-generated special palette.
6. **Verify contrast** for every nudged palette: `--color-team-primary` (nudged) must still pass 4.5:1 against `--color-text-primary` (`#F5F0E8`) when used as a surface, per colorway spec §2.1. If the nudge breaks contrast, revert and flag as needing spec pass instead.

**Do not touch:**

- Palette *role* assignments (`primary` / `secondary` / `tertiary` / `neutral` / `mute` / `accent-pop`).
- The `culturalAnchor` object.
- The `cultureTag`, `cry`, `wardRoom`, `lore` identity-copy fields (that's chant-spec work, not this batch — except for the Bird Gang typo, Fix 1).
- The `surfaceRole` field.
- The Justin doctrine reversal comment at the top of `nflTeams.js` (the "no stylistic dark-mode-on-team-accent" rule from 2026-06-21 remains authoritative).

---

## Naming reconciliation (docs only, no code rename)

The current code uses `mode: 'official' | 'special'`. The fan-experience doctrine uses `War Room / Color Rush`. **Do NOT rename** the code identifiers — that's a large-scale rename that touches every consumer of `palettes[]` and warrants its own PR. Instead, **add a paragraph to the `nflTeams.js` header comment** explicitly mapping the two vocabularies:

```js
 *
 *   Doctrine-vocabulary mapping (2026-07-03 fan-experience doctrine v1):
 *     mode: 'official'  ⟷  "War Room" primary skin — inside, institutional, chants as curated art
 *     mode: 'special'   ⟷  "Color Rush" alt skin — outside, city on game day, chants as graffiti
 *
 *   Doctrine reference: slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md
 *   Colorway spec:      slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md
 *   Chant spec:         slops-saloon/Blueprints/specs/chant-and-fan-copy-spec-v1.md
```

That's it for the naming pass. Full rename is a separate future PR.

---

## Out of scope (do not touch this PR)

- Logo asset work (that's the `frontend/logo-suite-swap` PR).
- Any per-team colorway rewrite based on the priority-tier examples in the colorway spec (Eagles Mummers Gold, Cowboys State Fair Gold, Chiefs BBQ Smoke). Those are new colorway *values* that need fan verification before shipping — Fix 4 above is only about the duplicate-color repair, not full colorway rewrites.
- Chant medium implementation (curated art vs graffiti overlay). That's `frontend/src/lib/teamChant.js` and requires new components — separate scope.
- Empty-state inflection copy from the chant spec §7 — separate scope, requires per-team fan verification.
- The `wardRoom` field spelling (nautical "wardroom" vs. doctrinal "war room") — deliberate naming choice that predates the new doctrine; do not rename in this PR.
- Any refactor to platformChip, positionChip, metallicTier, confidenceGradient helpers.
- SVG-ification of the logo PNGs (already noted as future work in the logo prompt).

---

## Acceptance criteria

1. `'Birds Gang'` → `'Bird Gang'` in `nflTeams.js:647`. No other file references `'Birds Gang'`.
2. Appearance picker renders the team list alphabetically (by team name, ascending), preserving division grouping if that layout is preserved.
3. Font audit report attached to the handoff — Tailwind `mono` alias present, spot-check components report which use correct font family and which don't, all P1s fixed.
4. Duplicate-second-skin repair complete — 30 teams reviewed, ΔE < 15 pairs identified and nudged (or reverted if contrast breaks), 2 teams without `mode: 'special'` flagged with TODO comments.
5. Naming-vocabulary mapping paragraph added to `nflTeams.js` header comment.
6. No changes outside the five files above (`nflTeams.js`, `Appearance.jsx`, `AppearancePicker.jsx`, `tailwind.config.*` if `mono` alias was missing, plus any single component where a P1 font issue was fixed).
7. No new dependencies. No `package.json` / `package-lock.json` edits. Exception: **may add a color-diff library** (e.g., `culori` or `chroma-js`) as a devDependency only if used for the ΔE computation script; if the ΔE math is done inline without a lib, no dep changes.
8. Existing tests still pass. Frontend build clean. Audit clean.
9. Bird Gang fix visible in the Appearance picker's Eagles tile (unauth demo route if possible; otherwise handoff a manual real-device check to Justin).

---

## Verification

```bash
npm --prefix frontend run build
npm test
npm audit --audit-level=moderate
git diff --check
grep -rn "Birds Gang" frontend/src/   # must return zero matches
```

Manual visual (dev server, unauth routes):

- Appearance picker at `/account/appearance` if reachable unauth (or handoff to Justin for real-device check on prod).
- Confidence score readouts at `/demo` (unauth demo route) — verify DM Mono renders on the numeric value.

Authenticated routes cannot be verified in the sandbox per the recurring Supabase `getSession()` limitation — hand a real-device checklist to Justin.

---

## Guardrails / skills

- `slops-code-review` — self-administered pre-merge review; merge verdict required.
- `slops-ui-ux-audit` — verify font compliance against the reconciled v2 spec §Usage Rules table.
- `slops-mobile-smoke` — proposal-only; substitute manual mobile-viewport check per prior phases.
- `slops-ship` — do NOT invoke; deploy is Justin's gate.

---

## Skill receipt template (fill in on completion)

- **Task:** Phase 1.13 discrete fixes — Bird Gang typo, alphabetize picker, font audit, duplicate-skin repair, naming-vocabulary docs.
- **Change type:** frontend user-visible behavior + data + docs.
- **Skills invoked:** …
- **Conditional skills considered but not applicable:** `slops-tdd` (data + doc + audit, no new testable behavior contract); `security-privacy-evidence` (no trust boundary or credential change); `demo-mode-pre-empty-state` (no fixture change).
- **Evidence:** ΔE report per team, font audit report, build/test/audit/diff-check results, screenshots or descriptions of the Appearance picker before/after.
- **Procedure gap found:** …

---

## Handoff back

Write the completion handoff to `slops-saloon/omen/Blueprints/handoffs/2026-07-0X-phase1-13-discrete-fixes-handoff.md` using the standard template. Include: files changed, ΔE audit results, font audit findings, screenshots of picker before/after, verification results, any P1 / P2 flagged, and a list of teams still needing a colorway spec author pass (referenced by the roster in the colorway spec §8).