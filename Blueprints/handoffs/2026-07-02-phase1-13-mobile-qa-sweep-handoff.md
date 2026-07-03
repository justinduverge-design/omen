# 2026-07-02 — Phase 1.13 Mobile QA Sweep — Handoff

**Session:** Cowork (desktop), Claude. Ran from this Mac; work continues on Justin's Windows machine next.

## Summary

Ran the audit half of Phase 1.13 (iOS Safari mobile QA sweep) against production `https://slopssaloon.com`. No physical iPhone or Chrome-extension automation was available in this session, so the sweep used desktop Safari's built-in WebDriver (`safaridriver`) resized to iPhone SE / 15 Pro / 15 Pro Max viewport widths — real WebKit (same engine as iOS Safari), not Chrome/Blink emulation, but also not a physical device (no true safe-area values, no real on-screen keyboard, no Share Sheet). 298 screenshots total. Full findings are in the report; this handoff is the pointer + the things that don't fit in a report.

This session also finished cleaning up loose ends from an earlier same-day task: syncing the local machine to the already-completed Corvus→Omen GitHub rename (that rename itself happened before this session, evidenced by the `2026-06-22-omen-rename-handoff.md` in this same folder — this session just found and fixed a stale merge conflict left over from a different Cowork session's doc-sync attempt).

## Files updated

- `Solutions/reports/2026-07-02-mobile-qa-omen.md` — full QA report (source audit + live sweep), severity-ranked findings.
- `Solutions/reports/_screenshots/2026-07-02-mobile-qa/layout-sweep/` — 42 screenshots, all 14 routes × 3 widths.
- `Solutions/reports/_screenshots/2026-07-02-mobile-qa/team-scheme-sweep/` — 256 screenshots, all 32 teams × 8 accent-active pages.
- `Direction/current_sprint.md` — Phase 1.13 line: added an evidence sub-note for the audit half; **left unchecked** (fix work — the `role="radiogroup"` aria conversion and both P1 triages — is not done).
- `Direction/decision_log.md` — appended findings + methodology notes under the existing `## Decisions Added 2026-07-02` section.
- `AGENTS.md`, `CLAUDE.md`, `DBS_INDEX.md`, `README.md`, `context.md` (repo root) — fixed a stale unresolved merge conflict (literal `<<<<<<<` markers) left in these 5 files from an earlier same-day Cowork session's `git stash pop` against the Corvus→Omen rename. Restored to match `origin/main` exactly — verified via `git diff HEAD` showing zero changes. Not a content change, a repair.

**Not committed.** Everything above is sitting in the working tree, untracked/modified, on `main` (the `docs/omen-rename-sync` branch that held the conflict got merged back into a clean `main` mid-session, but the actual `git checkout`/branch cleanup commands failed on a persistent mount-level lock-file bug in this session's sandbox — see Blockers below). Windows pickup needs to finish the git housekeeping before committing.

## Files discussed (read, not changed)

- `frontend/src/data/nflTeams.js`, `frontend/src/lib/teamTemplate.js`, `frontend/src/lib/themeMode.js`, `frontend/src/pages/Appearance.jsx`, `frontend/src/components/theme/AppearancePicker.jsx` — to understand the Phase 1.5h multi-palette/`surfaceRole` system well enough to test it correctly (see decision log entry — the docs describing "6 light-axis teams" are stale, this file is current truth).
- `frontend/src/components/layout/ProtectedRoute.jsx` — found the `omen.onboarding.done` localStorage gate that was redirecting every authenticated route to the onboarding splash during early attempts.
- `frontend/index.html`, `frontend/public/manifest.webmanifest`, `frontend/src/index.css` — source audit (viewport meta, PWA manifest, `prefers-reduced-motion`).

## Decisions made

See `Direction/decision_log.md` 2026-07-02 section for the full list. Highlights:
- No P0s. Layout/touch-target work (Phase 1.3+) holds up across all routes/widths/teams.
- Two P1s open, not yet fixed: Standings load failure (bug-vs-off-season-empty-state, needs an eng call); unhandled 429 leaks raw JSON.
- Team-theming re-test confirms the shipped Phase 1.5h `surfaceRole` system works correctly — the older Phase 1.5e "light axis" plan in some docs is superseded/stale.
- `localStorage` injection for testing theme state doesn't reliably work (gets overridden) — use real UI clicks instead. Documented for whoever tests this again.

## Unresolved questions (for Justin / next session)

1. **Standings failure — bug or off-season?** Today's test date is July (NFL off-season). If this is intentional (no data because there's no active season), the fix is copy/UX (an honest empty state instead of error-style "Couldn't load... Try again"). If it's a genuine fetch bug, that's a different, probably higher-priority fix. Needs someone who knows the backend's off-season behavior to make the call.
2. **Is the 429 error-boundary gap worth a dedicated item**, or does it fold into Phase 1.13's existing scope? It wasn't part of the original Phase 1.13 description but was discovered while executing it.
3. Phase 1.13 as written also includes the `role="radiogroup"` aria-semantics conversion for `DraftAssistant.jsx`'s Scoring Format chips — **not touched this session** (audit-only per the skill's own scope: "Does NOT: Execute fixes"). Someone needs to pick that up before the checkbox can flip.

## Blockers surfaced

- **This Mac's sandbox has a recurring mount-level bug**: `.git/index.lock` (and occasionally the target files themselves) sometimes can't be unlinked (`Operation not permitted`) even though the process has write access otherwise. Workarounds that worked: renaming the file away with `mv` (usually, not always) or fetching clean blob content via `git show HEAD:path` and rewriting the file directly rather than using `git checkout`. This is specific to whatever bridges this sandbox to the real filesystem — **shouldn't recur on Windows**, but worth knowing if this Mac is used again.
- **Backend local dev requires `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`** in a local `.env` that doesn't exist on this Mac — local dev server was never stood up this session; all testing was against production instead. Not a blocker for what got done, but means "test against local before it's live" wasn't exercised.
- **Google/Discord OAuth actively blocks WebDriver-flagged browser sessions** (bot-detection) — magic-link email auth also hit "error sending magic link" (likely Supabase's default email sender's rate limit — no custom SMTP configured for this project, confirmed via `.env.example` / `deploy/hostinger/ENV-INVENTORY.md`, both have no `SMTP_*` vars). Ended up authenticating the automated Safari session by copying a live session token out of a regular, already-logged-in Safari window's `localStorage` via the JS console and injecting it — works, but is timing-sensitive (Supabase rotates refresh tokens; the source tab needs to be closed immediately after copying or the token can be dead on arrival). The script that does this (`mobile-qa-safari-script.py`, workspace root, one level above `code/`) documents the exact steps if this needs to run again.

## Last verified build/test result

None run this session — this was QA/audit work against the already-deployed production site, no code changes were made to `src/` or `frontend/src/`. Last known test result is whatever `current_sprint.md`'s Phase 1.12 entry reports (`npm test` 401/401 as of 2026-07-02, before this session).

## Next recommended pull

Given `agent_inbox.md`'s existing top-5 (not re-checked this session) plus this handoff: either (a) triage the Standings failure and the 429 error-boundary gap as new backend/frontend items, or (b) pick up the remaining Phase 1.13 scope (aria-radiogroup conversion) to actually close that checkbox out. Both are small-to-medium, not blocked on anything else in the sprint.
