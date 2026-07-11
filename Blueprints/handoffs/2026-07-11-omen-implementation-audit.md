# Omen Implementation Audit — 2026-07-11

Founder-mode verification pass. Every claim below is backed by a quoted line, an exact grep count, or an explicit "not found" — nothing here is inferred from a filename or a doc's stated intent alone. Where evidence was incomplete, that's stated rather than papered over.

## 1. Executive Verdict

The design doctrine is ahead of the code, and the code knows it. Two 2026-07-10 specs (`component-lock-v1.md`, `team-theme-contract-v1.md`) correctly diagnose real bugs that are still live in the shipped app. The single biggest gap: `themeMode.js` writes team palette values directly onto the app's shell tokens (`--color-bg`, `--color-surface-1/2/3`, `--color-border*`, `--color-accent*`) with zero contrast guard, while text color *is* WCAG-checked. That asymmetry is exactly why some teams "drown" the shell and others don't — it's not a vague drift, it's one function (`applyTeamTokens`, `themeMode.js:347–407`) doing two different things to two different token groups.

The second-biggest gap isn't drift, it's absence: no Card/Section/Panel/Shell primitive exists anywhere in this codebase, and no shadcn/Radix/cva is installed. Seven token-correct pages hand-roll layout via inline `style={{}}` (30–40 instances each) not because anyone is freelancing against a standard, but because there is no standard to freelance against yet. `component-lock-v1.md` is not "unenforced" — it is unimplemented from zero.

The one confirmed shadow design system is narrow and contained: `Landing.jsx` and `OmenLanding.jsx` share a completely separate hardcoded marketing palette (136 and 19 raw hex literals respectively) that never touches a CSS token. Every other page checked is hex-free. This is a two-file problem, not a repo-wide one — don't over-scope the fix.

No evidence directory (`output/phase4-design-verification*`, `output/phase4-team-depth-fix*`) exists. The only real verification artifact is a markdown doc with actual WCAG math (`2026-07-10-team-theme-contract-verification.md`), and it already found a real gap: card-vs-shell contrast fails for Packers/Steelers/Eagles under the spec's default fill. Say this plainly rather than assuming screenshots exist somewhere unlisted.

## 2. Headline Findings Validation

| Claim | Verdict | Evidence | Why it matters |
|---|---|---|---|
| 1. `team-theme-contract-v1.md` diagnoses the bug; `themeMode.js` still overwrites shell tokens with no contrast guard | **TRUE** (precision matters) | `applyTeamTokens()` (themeMode.js:347–407): `--color-bg` set directly from `template.surface` (line 362, unconditional); `--color-surface-1/2/3`, `--color-border*`, `--color-accent*` set via `color-mix()` derived from team palette (lines 363–391) — zero contrast-ratio math anywhere in this file. `--color-text-primary` (line 395) *does* inherit a WCAG-checked value, but that check (`readableOn()`) lives in `frontend/src/data/nflTeams.js:1143`, not in `themeMode.js`. | The bug isn't "no contrast checking exists" — it's that contrast checking exists for text and was never extended to shell tokens. That's a smaller, more surgical fix than a full rebuild. |
| 2. `themeResolver.js`/`teamTheme.js` don't match reality | **TRUE** | Repo-wide grep for both exact filenames: zero `.js`/`.jsx` hits. Real files: `frontend/src/lib/themeMode.js` (468 lines, 12 confirmed importers), `frontend/src/lib/teamTemplate.js` (143 lines), `frontend/src/data/nflTeams.js` (1235 lines — note: in `data/`, not `lib/` — 32 teams confirmed via `grep -c "abbr:"`). | Anyone acting on the old filenames would edit nothing and think they'd fixed something. |
| 3. `Landing.jsx`/`OmenLanding.jsx` run a shadow palette | **TRUE** | Landing.jsx: 136 raw hex occurrences (`#050505`, `#C9A44C`, `#F4EFE1` confirmed via direct quote). OmenLanding.jsx: 19 occurrences, identical palette family plus `#dbb95a`. Every other audited page (Appearance, Onboarding, DraftAssistant, Standings, Football, Account, TradeAnalyzer, WaiverWire, ConnectLeague — 1 minor exception) has zero raw hex. | Confirms this is a contained, two-file problem — a founder decision, not a repo-wide sweep. |
| 4. Token-correct pages freelance layout via inline styles, proving the need for primitive enforcement | **PARTIAL — true but understated** | Confirmed inline-style counts: Appearance 33, Onboarding 34, DraftAssistant 40, Standings 30, Football 17, ConnectLeague 10, Account 7 — all zero-hex. But full export-grep across `frontend/src/components/**` found **no Card/Section/Panel/Shell component anywhere**, and `package.json` has no shadcn/Radix/cva dependency at all. | The claim implies pages are ignoring an existing primitive. They aren't — no primitive exists to ignore. `component-lock-v1.md` needs to be built from zero, not "enforced harder." |
| 5. `theme.js` is dead code, zero importers | **TRUE** | Zero static importers repo-wide (grep). Zero dynamic `import()` references (separate targeted grep, confirmed empty). `themeMode.js` has 12 real importers by direct contrast. | Confidently deletable — the strongest verdict in this audit. |
| 6. `CLAUDE.md`/`AGENTS.md` point to superseded design docs | **PARTIAL — incomplete, not simply stale** | `CLAUDE.md:26` names `Blueprints/specs/omen-ux-ui-design-system-v1.md`. That file's own banner (lines 1–10) reads: `⚠ 2026-07-10: PARTIALLY SUPERSEDED` — component guidance → `component-lock-v1.md`, team-theming → `team-theme-contract-v1.md`, but base palette hexes, dark-mode token names, and brand voice **remain authoritative in the old doc**. `AGENTS.md`'s "reads on demand" section references no design spec at all — a gap, not staleness. | Swapping the pointer to only the new docs would lose live content (palette hexes, voice). The fix is additive (cite all three), not a swap. |

## 3. Design Authority Map

**Primary authority (current, correctly scoped):**
- `Blueprints/specs/design/component-lock-v1.md` (281 lines, 2026-07-10) — component API/tokens for Button, Input, Segmented, Card shell, Type scale, Spacing. Explicitly states it "Supersedes the component-level portions of `omen-ux-ui-design-system-v1.md` v2."
- `Blueprints/specs/design/team-theme-contract-v1.md` (293 lines, 2026-07-10) — team-skin override rules, contrast enforcement, three-room depth model (Owner Suite/GM Suite/Locker Room). Revised same-day after a doctrinal conflict with L1 fan-experience doctrine was caught and corrected — real verification culture in action.

**Secondary authority (still live for what it covers, not fully retired):**
- `Blueprints/specs/omen-ux-ui-design-system-v1.md` (488 lines) — its own banner confirms partial supersession; still authoritative for base Omen palette hexes, dark-mode token names/values, brand character, and voice guidance. Do not archive this wholesale.

**Unverified this pass:**
- `Blueprints/specs/page-system.md` — referenced by `CLAUDE.md:25` as "per-page typography/accent/palette/copy contract" but was not read in this audit pass. Do not cite its content as settled until read directly.

**Transitional/evidence, not authority:**
- `Blueprints/audits/2026-07-10-app-wide-ux-audit.md`, `2026-07-10-frontend-doctrine-audit.md`, `2026-07-10-team-theme-contract-verification.md` — the diagnostic record the two current specs respond to. Correctly scoped as evidence.
- `Blueprints/audits/` (remaining ~35 pre-2026-07-10 files) and `Direction/reviews/` (16 files) — closed-out, point-in-time records for shipped features. Confirmed as historical, not live.

**Stale/superseded:**
- None of the specs are fully dead — this repo doesn't have a "wrong doctrine" problem, it has an "unfinished migration" problem. The closest thing to stale is `CLAUDE.md`'s pointer, which is incomplete rather than wrong.

## 4. Shadow Design Systems

1. **`Landing.jsx` + `OmenLanding.jsx` — the real shadow system.** 136 and 19 raw hex literals respectively, sharing an identical palette (`#050505`, `#C9A44C`, `#F4EFE1`, `#dbb95a`) that appears nowhere in `index.css`. This is a genuinely separate, undocumented design language running in parallel to the token system.
2. **`components/ui/ErrorState.jsx`, `MockBanner.jsx`, `Spinner.jsx` — hardcoded Tailwind color utilities bypassing tokens that already exist for these exact purposes** (`red-*` instead of `--color-risk-*`; `amber-*` instead of `--color-data-mock`; `slate-700`/`amber-400` instead of surface/accent tokens). Small in scope (8–17 lines each) but structurally the same violation as #1, just smaller.
3. **`components/ui/UpgradeState.jsx` — hardcodes an undocumented raw color.** `rgba(93,45,142,0.4)` / `rgba(93,45,142,0.06)` purple (lines 23, 49) plus a hardcoded `hover:bg-purple-500/25` Tailwind class — none of this purple exists as a token anywhere in `index.css`, mixed in the same file with correct `var(--color-omen)` usage elsewhere.
4. **Correction to the prior pass: `DisconnectedState.jsx` and `EmptyState.jsx` are not fully clean.** Both were previously reported as pure token-driven primitives. Direct read found each has one hardcoded Tailwind utility class (`hover:bg-amber-400/20`, at line 38 and line 33 respectively) alongside otherwise-correct `var(--color-*)` usage. Smaller finding, but the earlier "fully clean" claim was itself imprecise and is corrected here.
5. **Team-token CSS var fallback gap.** `index.css` declares static defaults for `--color-team-primary/secondary/accent/surface/surface-card`, but `themeMode.js`'s `TEAM_TOKEN_VARS` list also writes `--color-team-tertiary`, `-neutral`, `-mute`, `-pop` at runtime with **no static CSS fallback declared** for them (checked `index.css` specifically; not verified against every CSS file in the repo). Not a bug today since JS always runs before paint, but it means these tokens have no documented "off" state and no CSS-only fallback if JS theming fails.

## 5. Theme System Diagnosis

Where team color is currently allowed to reach, verified directly in `themeMode.js`:

- **Shell (`--color-bg`, `--color-surface-1/2/3`, `--color-border*`)** — **too permissive.** Set directly from team palette via raw assignment or `color-mix()`, zero contrast check. This is the confirmed root cause of the "team colors overpower the product" complaint.
- **Accent (`--color-accent`, `--color-accent-hover`, `--color-accent-muted`)** — **too permissive, same mechanism.** Derived from team accent hex via `color-mix()`, no guard.
- **Text (`--color-text-primary/secondary/tertiary`)** — **correctly guarded.** `--color-text-primary` inherits `template.textOnSurface`, computed via real WCAG contrast math (`readableOn()` in `nflTeams.js:1143`). Secondary/tertiary use a binary `surfaceIsDark` branch with hardcoded fallback hexes (`#AEAEB2`, `#4A5158`, `#6D6D72`, `#6B7280`) — not a computed ratio, but a reasonable static split, lower risk than the shell issue.
- **CTA hierarchy** — inherits the accent-token issue above; also, `teamTemplate.js` (lines 82–89) implements an accent-role fallthrough cascade specifically to avoid a CTA rendering on an identical-color surface for teams like Packers/Steelers/Ravens whose surface role equals their primary color — this is a real, working safeguard already in place at the palette-resolution layer, separate from the shell-token problem.
- **Semantic states (risk/tier/data-quality tokens)** — **not reachable by team theming at all**, confirmed: `--color-risk-low/medium/high`, `--color-tier-gold/silver/bronze`, `--color-data-live/stub/mock/unavailable` are declared once in `index.css` and never appear in `themeMode.js`'s token-writing list. This boundary is intact and correctly protects semantic meaning from team-color drift.

Verdict: the system is **correctly restrictive for text and semantic state, and incorrectly permissive for shell/surface/accent.** It is not a uniformly "too loose" theme system — it's a system with the right idea applied to only half its surface.

## 6. Primitive Discipline Audit

- **Confirmed canonical primitives that exist:** none, beyond the small `components/ui/` state components (`DisconnectedState`, `EmptyState`, `ErrorState`, `MockBanner`, `Spinner`, `UpgradeState`) and `HelpButton.jsx` (a 341-line page-help component misfiled under `ui/` — it's a feature component, not a primitive, confirmed by its route-keyed `PAGE_HELP` structure).
- **Confirmed absent:** Card, Section, Panel, Shell, Button, Input, Segmented/Tabs — none exist anywhere in `frontend/src/components/**` (full export grep). No shadcn/ui, Radix, or cva dependency in `package.json`.
- **Direct consequence, confirmed by count:** 7 pages hand-roll layout via inline `style={{}}` at volumes of 7–40 instances each. This isn't page authors ignoring a standard — `component-lock-v1.md` specifies the standard but nothing has been scaffolded yet. Building the primitive first, then migrating pages to it, is the only order that avoids double work.

## 7. Cleanup Table

| KEEP | SIMPLIFY | REBUILD | REMOVE |
|---|---|---|---|
| `Blueprints/specs/design/component-lock-v1.md` — correct, well-scoped authority; the gap is implementation, not the spec itself. | `Blueprints/specs/omen-ux-ui-design-system-v1.md` — trim to only its still-authoritative content (base palette hexes, dark-mode token names, voice) now that component/team-theming portions are formally superseded; don't archive wholesale, its banner already does the triage work. | `frontend/src/lib/themeMode.js` `applyTeamTokens()` (lines 347–407) — extend the existing `readableOn()` contrast pattern (already proven correct for text) to `--color-bg`/`--color-surface-*`/`--color-border*`/`--color-accent*`. This is a surgical fix to one function, not a file rewrite. | `frontend/src/lib/theme.js` — confirmed dead twice over (zero static importers, zero dynamic imports). Delete. |
| `Blueprints/specs/design/team-theme-contract-v1.md` — correct diagnosis and prescription, already self-corrected once for doctrinal alignment (verification culture working as intended). | `CLAUDE.md`'s design-spec pointer (line 26) — change from a single stale-feeling reference to an explicit three-doc citation (`component-lock-v1.md`, `team-theme-contract-v1.md`, `omen-ux-ui-design-system-v1.md` for its remaining live content). | A Card/Section shell primitive per `component-lock-v1.md` — does not exist at all, needs building from zero (no scaffolding, no shadcn/Radix installed). Build once, then migrate the 7 inline-style-heavy pages to it. | — |
| `frontend/src/data/nflTeams.js`'s contrast utilities (`readableOn`, `contrastRatio`, `relLum`) — real, correct WCAG math, already proven to work for text tokens. This is the pattern to extend, not replace. | `components/ui/DisconnectedState.jsx`, `EmptyState.jsx` — near-clean, just strip the one hardcoded `hover:bg-amber-400/20` utility each and replace with a token-based hover treatment. | `frontend/src/pages/Landing.jsx` + `OmenLanding.jsx` palette — needs a founder decision (formalize as documented marketing-only tokens vs. fold into main token set), then a mechanical rebuild once decided. | — |
| `frontend/src/index.css` — the token source of truth; confirmed no competing token definitions exist except the two shadow-palette pages above. | `components/ui/ErrorState.jsx`, `MockBanner.jsx`, `Spinner.jsx` — small, mechanical token swaps (`red-*`→`--color-risk-*`, `amber-*`→`--color-data-mock`, `slate-700`/`amber-400`→surface/accent tokens). | `components/ui/UpgradeState.jsx` — the undocumented raw purple (`rgba(93,45,142,...)`) needs either promotion to a real token or replacement with an existing one; can't stay as a one-off. | — |
| `teamTemplate.js`'s accent-role fallthrough cascade (lines 82–89) — a real, working safeguard against CTA-on-identical-surface for Packers/Steelers/Ravens-type teams. Preserve this logic exactly when touching `themeMode.js`. | `HelpButton.jsx` — relocate out of `components/ui/` to a feature-level directory; it's a legitimate feature component, just misclassified by location. Content doesn't need to change. | `--color-team-tertiary/neutral/mute/pop` — decide whether these need static CSS fallbacks in `index.css` or are intentionally JS-only; currently undocumented either way. | — |
| `frontend/src/pages/{PromoCapture,PromoTradeCapture,StartSit,TradeShare,Omen,OmenPage,Ledger,NotFound,TradeAnalyzer,WaiverWire,OmenOfTheWeek}.jsx` — confirmed token-correct, low/zero inline-style. The pattern other pages should converge to. | `AGENTS.md` — add a design-spec reference section; currently references none at all (confirmed via direct read of its "reads on demand" section). | — | — |

## 8. Highest-Leverage Fixes

Ranked by leverage, not sequence-only:

1. **Extend the existing WCAG contrast pattern from text to shell tokens in `themeMode.js`'s `applyTeamTokens()`.** The hard part (real contrast math) is already built and proven in `nflTeams.js`; this is wiring, not invention. Fixes the founder's #1-named complaint directly.
2. **Build the Card/Section primitive from `component-lock-v1.md`.** Zero scaffolding exists; this single primitive would let 7 pages (152 combined inline-style instances) simplify by adoption rather than individual rewrites.
3. **Make `CLAUDE.md`'s design-spec pointer complete** (cite all three specs by their actual current scope) — cheap, prevents someone from reading only the old doc or only the new ones and getting a partial picture.
4. **Sweep the 5 `components/ui/` files with hardcoded colors** (`ErrorState`, `MockBanner`, `Spinner`, `UpgradeState`, plus the two near-clean hover-class leaks) — small, mechanical, and these are exactly the primitives other code should trust to be token-correct.
5. **Resolve `Landing.jsx`/`OmenLanding.jsx`'s palette fate** — founder decision first, then a bounded, well-scoped fix (2 files, not a repo sweep).

## 9. Execution Order

1. Delete `theme.js` (zero-risk, confirmed dead).
2. Fix `CLAUDE.md`'s pointer (zero-risk, doc-only).
3. Ship the shell-token contrast-guard fix in `themeMode.js` (the real product fix — do this before touching any page, since it changes what "correct" looks like for every themed page).
4. Build the Card/Section primitive (do this before migrating any of the 7 inline-style pages — building it first means each page is touched once, not twice).
5. Migrate the 7 inline-style-heavy pages to the new primitive.
6. Sweep the small `components/ui/` token violations (can happen in parallel with 4–5, no dependency).
7. Relocate `HelpButton.jsx`.
8. Resolve the Landing/OmenLanding palette decision and execute it.
9. Add the `AGENTS.md` design-spec reference, trim `omen-ux-ui-design-system-v1.md` to its still-live content.
