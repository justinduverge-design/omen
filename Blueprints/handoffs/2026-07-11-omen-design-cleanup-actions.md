# Omen Design Cleanup Actions — 2026-07-11

Companion to `2026-07-11-omen-design-cleanup-map.md`. No code changes, file moves, or deletes have been executed — this is the proposed action sheet for sign-off. Nothing here touches package files, env files, DNS, SSL, Stripe, Supabase migrations, or infra config.

## Proposed File Moves / Archives

| From | To | Why |
|---|---|---|
| `Blueprints/prompts/codex-docs-commit.md`, `codex-slops-saloon-rename.md`, `codex-corvus-restructure.md`, `codex-git-ssffmvp-clean-tree.md` | `Archive/prompts-historical/` (new, mirrors existing `Archive/handoffs-pre-dbs`, `Archive/specs-pre-dbs` convention) | Repo's own `Blueprints/prompts/README.md` already flags these as historical/should-not-be-re-run; formalize the flag into an actual move. |
| `Blueprints/prompts/codex-npm-audit-fix.md`, `codex-logo-suite-swap.md`, `codex-stripe-live-validation.md`, `codex-transparent-lockup-composite.md`, `codex-omen-path-canonicalize.md`, `codex-docker-prove-out.md`, `codex-phase1-13-discrete-fixes.md`, `omen-mvp-move-development.md`, `omen-mvp-move-llm-reasoning.md`, `omen-mvp-move-frontend.md`, `matchup-dvp-nflverse-development.md`, `claude-layer-2-frontend-build-fix-and-qa-2026-05-25.md`, `claude-homepage-trade-analyzer.txt`, `codex-verify-trade-analyzer.txt` | `Archive/prompts-completed/` (new) | Each tied to a shipped, closed phase; keep for history, remove from the active-looking directory. |
| `Blueprints/audits/` — all files dated before 2026-07-10 (35 of 38) | `Blueprints/audits/closed/` (new subfolder, in-place reorg) | Keeps the 3 live/active audits visually distinct from the closed historical record without leaving the repo. |
| `Blueprints/specs/omen-ux-ui-design-system-v1.md` | `Archive/specs-pre-dbs/` (existing folder — reuse, don't create new) | `component-lock-v1.md` explicitly supersedes the component/token portions. **Before moving**, spot-check the doc for any non-component doctrine (page-system routing, IA, content voice) that `component-lock-v1.md` and `team-theme-contract-v1.md` don't cover — if any exists, extract it into a short standalone note first so it isn't lost in the archive. |

## Proposed Deletions

- `frontend/src/lib/theme.js` — confirmed via repo-wide grep to have zero importers (`grep -rn "lib/theme['\"]" frontend/src` returns nothing outside the file itself). Superseded entirely by `frontend/src/lib/themeMode.js`. One final check before deleting: confirm no dynamic/string-based import path references it (e.g. `import(\`./lib/${x}\`)`) — unlikely in this codebase but cheap to verify.

## REBUILD Punchlist (code changes — described here, not executed)

1. **`frontend/src/lib/themeMode.js` — `applyTeamTokens()` contrast guard.** Currently writes team palette values directly onto `--color-bg`, `--color-surface-1/2/3`, `--color-accent*`, `--color-text-*`. Per `team-theme-contract-v1.md`'s page-family depth ladder (Owner Suite/GM Suite/Locker Room) and contrast/fallback rules, team color should be confined to the tokens actually meant for it (`--color-team-primary/secondary/accent/surface/surface-card`) with the shell tokens staying independent, falling back to a documented light/dark-safe default when a team's palette would fail contrast against shell text. This is the direct fix for "team colors must not overpower the product."
2. **Card/Section primitive** per `component-lock-v1.md`'s Card-shell spec — extract from the repeated inline-style patterns already visible in `Appearance.jsx`, `Onboarding.jsx`, `DraftAssistant.jsx`, `Standings.jsx`, `Football.jsx`, `ConnectLeague.jsx`, `Account.jsx`. Build once, then have those seven pages adopt it rather than hand-editing each page's bespoke layout independently.
3. **Token-compliance sweep** on `components/ui/`: `ErrorState.jsx` (swap `red-*` Tailwind utilities → `--color-risk-*`), `MockBanner.jsx` (swap `amber-*` → `--color-data-mock`), `Spinner.jsx` (swap `slate-700`/`amber-400` → surface/accent tokens), `UpgradeState.jsx` (replace raw `rgba(93,45,142,...)` with either an existing token or a newly-declared one in `index.css`, founder's call which).
4. **Relocate `HelpButton.jsx`** from `frontend/src/components/ui/` to a feature-level path (e.g. `frontend/src/components/help/HelpButton.jsx`) — no content change, corrects its classification as a feature component, not a primitive.
5. **`Landing.jsx` / `OmenLanding.jsx` palette decision** (see Open Questions) — once decided, either declare the marketing palette as its own documented token block (e.g. `--marketing-*` custom properties in a scoped stylesheet) or migrate the hardcoded hex values onto the main token set.
6. **Root doctrine pointer fix** — `CLAUDE.md`/`AGENTS.md` line currently reading `Blueprints/specs/omen-ux-ui-design-system-v1.md — tokens + components` should point to `Blueprints/specs/design/component-lock-v1.md` and `Blueprints/specs/design/team-theme-contract-v1.md` instead.

## Checklist — Do First / Do Second / Do Last

**Do first (unblocks everything else, low risk):**
1. Fix the root doctrine pointer in `CLAUDE.md`/`AGENTS.md`.
2. Delete `frontend/src/lib/theme.js` (after the dynamic-import check).

**Do second (the actual product fix, medium risk — needs testing):**
3. Implement the `themeMode.js` shell-override contrast guard per `team-theme-contract-v1.md`. This is the highest-value item in the whole audit — it's the code fix for the founder's stated #1 priority.
4. Build the Card/Section primitive per `component-lock-v1.md`.

**Do last (mechanical/low-risk, no doctrine depends on these):**
5. Token-compliance sweep on the four `components/ui/` files.
6. Relocate `HelpButton.jsx`.
7. Archive completed/historical prompts and pre-2026-07-10 audits.
8. Archive `omen-ux-ui-design-system-v1.md` (after the non-component-doctrine spot-check).

**Needs a founder decision before scheduling:**
9. `Landing.jsx`/`OmenLanding.jsx` marketing-palette fate.

## Risks and Open Questions

- **`component-lock-v1.md` flags its own doc-layer uncertainty.** The spec itself notes it may belong at a different architectural layer once the per-team/per-room/per-page-family `design.md` scheme (mentioned as "queued" in `2026-07-10-frontend-doctrine-audit.md`) is built. Don't treat its current location as permanent — re-evaluate once that scheme exists.
- **Landing.jsx/OmenLanding.jsx's hardcoded palette may be intentional.** Marketing/landing pages sometimes legitimately run a different visual register than the authenticated product shell (this is common practice — brand marketing vs. product UI). Before treating this as pure drift, confirm with the founder whether the gold/cream/black palette is a deliberate marketing identity that should be *formalized* as its own documented token set, or whether it's supposed to converge with the main tokens. Either answer is defensible; only "leave it hardcoded and undocumented" is not.
- **`theme.js` deletion should get one more check** (dynamic import paths) before executing, even though the static grep is clean — cheap insurance given it's a deletion.
- **Moving `omen-ux-ui-design-system-v1.md` to archive** needs a content spot-check first — `component-lock-v1.md` only claims to supersede the *component* portions; if the older doc contains still-live IA/routing/voice doctrine not captured elsewhere, extract that into a short standalone doc before archiving the rest.
- **Team-surface-logic centralization is "mostly" true, not fully.** UI consumers (`HelpButton.jsx`, `AppearancePicker.jsx`, `Header.jsx`, `Appearance.jsx`, `Account.jsx`) correctly read team tokens via `var(--color-team-*)` rather than redefining colors — so the founder's ask ("theme files should remain the only allowed place for team-surface logic") is largely already satisfied at the consumption layer. The gap is specifically in `themeMode.js`'s *application* logic (item 1 above), not in scattered redefinition elsewhere.
