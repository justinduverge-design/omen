# Omen Cleanup Actions — 2026-07-11

Companion to `2026-07-11-omen-implementation-audit.md`. No code changes, file moves, or deletes executed — proposals only, pending sign-off. Every action below traces to a specific, quoted finding in the audit; nothing speculative.

## 1. Do First

The fewest, highest-leverage actions:

1. **Delete `frontend/src/lib/theme.js`.** Confirmed dead twice over — zero static importers repo-wide, zero dynamic `import()` references. Zero risk.
2. **Fix `CLAUDE.md`'s design-spec pointer** (line 26). Currently cites only `Blueprints/specs/omen-ux-ui-design-system-v1.md`. Change to cite all three current specs by scope: `component-lock-v1.md` (components), `team-theme-contract-v1.md` (team theming), `omen-ux-ui-design-system-v1.md` (still-live: base palette hexes, dark-mode token names, brand voice). This is additive, not a swap — the old doc's banner already confirms it's only *partially* superseded.
3. **Ship the `themeMode.js` shell-token contrast guard.** `applyTeamTokens()` (lines 347–407) needs to route `--color-bg`, `--color-surface-1/2/3`, `--color-border*`, `--color-accent*` through the same `readableOn()`/contrast-check pattern already proven correct for `--color-text-primary`. The math exists in `frontend/src/data/nflTeams.js` (`readableOn`, `contrastRatio`, `relLum` — all confirmed real WCAG functions, not heuristics); this is wiring existing logic to more tokens, not building new logic. This is the direct fix for the founder's #1 priority.

## 2. Do Second

Structural cleanup:

4. **Build a Card/Section primitive** per `component-lock-v1.md`'s Card-shell spec. Confirmed zero scaffolding exists (no Card/Section/Panel/Shell export anywhere, no shadcn/Radix/cva installed). Build before touching any of the 7 inline-style-heavy pages — building first means each page gets touched once during migration, not twice.
5. **Migrate `Appearance.jsx`, `Onboarding.jsx`, `DraftAssistant.jsx`, `Standings.jsx`, `Football.jsx`, `ConnectLeague.jsx`, `Account.jsx`** to the new primitive, replacing their 7–40 inline-`style={{}}` instances each. All are confirmed token-correct on color already — this is a layout-only migration, not a re-theming.
6. **Sweep `components/ui/` hardcoded colors:** `ErrorState.jsx` (`red-*` → `--color-risk-*`), `MockBanner.jsx` (`amber-*` → `--color-data-mock`), `Spinner.jsx` (`slate-700`/`amber-400` → surface/accent tokens), `UpgradeState.jsx` (replace raw `rgba(93,45,142,...)` with a real token — new or existing, founder's call), `DisconnectedState.jsx` + `EmptyState.jsx` (strip the one `hover:bg-amber-400/20` each).
7. **Relocate `HelpButton.jsx`** from `frontend/src/components/ui/` to a feature-level path — it's a legitimate 341-line page-help feature component with a route-keyed `PAGE_HELP` structure, not a reusable primitive. No content change, just correct its location.

## 3. Do Last

Lower-risk cleanup, archive/deletion candidates:

8. **Trim `Blueprints/specs/omen-ux-ui-design-system-v1.md`** to only its still-authoritative content (base palette hexes, dark-mode token names, voice guidance) once the component/team-theming portions are confirmed fully migrated into the newer specs. Do not archive wholesale — its own banner already distinguishes what's live from what's superseded.
9. **Add a design-spec reference section to `AGENTS.md`.** Confirmed it currently cites zero design docs at all. Low risk, closes a real gap.
10. **Decide and document `--color-team-tertiary/neutral/mute/pop` fallback status** — either add static CSS defaults in `index.css` or explicitly document them as JS-only-by-design. Currently undocumented either way; not urgent since JS always runs before paint today, but worth closing.

## 4. Proposed Merges

- **`CLAUDE.md`'s design-spec citation** — not a file merge, but a content merge: the pointer should read as one citation covering all three specs by their actual current scope, not a single-file reference that implies the others don't exist.
- No other doc merges are proposed. `component-lock-v1.md` and `team-theme-contract-v1.md` are correctly separate (component API vs. team-theming rules are genuinely different concerns) and should stay that way.

## 5. Proposed Archive Targets

- **Component/team-theming sections of `omen-ux-ui-design-system-v1.md`** — once confirmed redundant with the two newer specs, move those specific sections (not the whole file) to an archive location, keeping the still-live palette/voice content in place at its current path.
- **No other archive moves are proposed in this pass** — the prior Slops-OS-style cleanup map already covered `Blueprints/prompts/` and `Blueprints/audits/` archival candidates; this audit didn't re-verify those and isn't re-proposing them without fresh evidence.

## 6. Proposed Deletions

- **`frontend/src/lib/theme.js`** — the only item in this entire audit confidently dead enough to delete outright. Zero static importers, zero dynamic imports, fully superseded by `themeMode.js` (12 confirmed importers).

## 7. Founder Decisions Needed

Items requiring taste/strategy input, not technical cleanup:

1. **`Landing.jsx`/`OmenLanding.jsx`'s hardcoded marketing palette** (`#050505`, `#C9A44C`, `#F4EFE1`, `#dbb95a`, 136 + 19 hex occurrences). Two legitimate paths: formalize it as a documented, intentional marketing-only token set (common practice — landing pages often run a different visual register than the authenticated product shell), or fold it into the main token system so it stays in sync with future token changes. Either is defensible; leaving it hardcoded and undocumented is the only wrong answer.
2. **`--color-team-tertiary/neutral/mute/pop` fallback strategy** — static CSS defaults vs. documented JS-only. Low urgency, but someone should decide rather than leave it ambiguous.
3. **`UpgradeState.jsx`'s undocumented purple** (`rgba(93,45,142,...)`) — promote to a real named token (it's clearly intentional, used for an upgrade/premium state) or replace with an existing token (`--color-omen` is already used elsewhere in the same file for text). A quick call, but a call nonetheless — this color means something specific (premium/upgrade) that a generic token might blur.

## Note on Evidence Gaps

Two items from the original ask could not be inspected because they don't exist in this repo: `output/phase4-design-verification*` and `output/phase4-team-depth-fix*` — both searched explicitly, confirmed absent. The only real verification evidence in the repo is `Blueprints/audits/2026-07-10-team-theme-contract-verification.md`, a markdown doc with actual WCAG contrast math against 5 stress-test teams — it already found that card-vs-shell contrast fails for Packers/Steelers/Eagles under the spec's default fill, a finding worth carrying forward into the Card/Section primitive work (item 4 above), since that primitive will need to handle the same edge cases.
