# Handoff — 2026-08-15 — Native API scope, nflverse path repair, A5 memo

**Session type:** reconnaissance → scoping → one bounded repair
**Branch:** `main` (working tree; nothing pushed, merged, or deployed)
**Backend suite:** **537/537 pass** (`npm test`, node `--test`, ~4.6s). Baseline at session start was 535/535.

---

## 1. What was asked

1. Assess how ready native mobile is to satisfy the Figma page contracts.
2. Assess how complete the league providers are — can Omen receive real data and give real advice, and is there any preseason data given nflverse's absence.
3. Then: scope the native API client, and make A5's outcome vendor-agnostic across Sleeper, ESPN, and Yahoo.

## 2. Findings

### 2.1 Native mobile — design is ahead of wiring

Against the eight low-fidelity flows and three golden pairs in `Blueprints/specs/mobile/m1-figma-screen-contract-pass-v1.md`:

- **Built both platforms:** Command Center, Omen lead / Start-Sit, Welcome/provider connection. Two of three golden pairs.
- **Partial:** Waiver Analysis (only the Command Center strip), team/league switcher (control exists, no sheet), Account → Connected Leagues (`M4-CC-PlatformsCompact` open).
- **Placeholder only:** Trade ("Trade is landing next"), League ("League is landing next").

**The finding that outranks the table: there is no product API layer in the native app.** `URLSession` / `dashboard/summary` greps across `mobile/ios` return only auth and account files. Both platforms state it in-source — `CommandCenterView.swift:23` selects `OmenCommandCenterFixtures.realDisconnected`; `OmenCommandCenterScreen.kt:426` reads "context sees `realDisconnected` until live wiring exists." A real signed-in user sees a permanently disconnected Command Center regardless of their actual backend connections.

This means several VERIFIED items are verified as *compositions* and still show invented state: `M4-CC-LedgerPreview`, `M4-CC-LeaguePulse`, `M4-CC-WaiverWatch`, `M4-Omen-Screen`. That is not a contradiction of their records — each was explicitly scoped to composition with wiring deferred — but the cumulative effect was not visible anywhere in the queue.

### 2.2 Providers — advice path healthy, scoring path was silently broken

- **Sleeper:** healthy. `state/nfl` → `{"season":"2026","season_type":"pre","week":1}`; player index 200/14.6 MB.
- **ESPN:** adapters merged (#265/#266), provider-proven 2026-08-02, public API serving 2026 preseason.
- **Yahoo:** serving nothing, correctly paused behind `YAHOO_ENABLED`. Entitlement-level 403s; founder re-applied 2026-08-13. No code fix exists.

**Separation worth recording:** advice runs on **provider projections** (`src/services/omen.js:1060`), not nflverse. nflverse feeds **only** Tuesday scoring — grading past recommendations. The founder's question assumed nflverse gated advice; it does not.

**Preseason data does exist** — `api.sleeper.app/v1/stats/nfl/pre/2026/1` returns 1,712 players, 329 individuals with real `pts_ppr`. nflverse never carries preseason at all (verified: `REG` 1–18, `POST` 19–22, no `PRE`).

### 2.3 The silent-failure bug

`src/omen_tuesday_cron.js` fetched the **retired** `player_stats` release tag, which stopped receiving seasons after **2024** — 404 for 2025 as well as 2026. Combined with PR #302's correct 404-deferral, Tuesday scoring would have deferred every move all season while reporting `failed=0`, no error, no alert.

## 3. What changed

### Code — `src/omen_tuesday_cron.js`

- `NFLVERSE_BASE_URL` → `.../releases/download/stats_player`; filename via `nflverseStatsFileName()` → `stats_player_week_<season>.csv`
- `season_type` added to required columns and filtered to `REG` by default (`DEFAULT_SEASON_TYPE`), threaded through `fetchNFLScores`
- Deferral reason message now names the correct file

Required rather than optional-when-present so upstream schema drift fails closed. `REG` filtering matters because nflverse never ships `PRE` but Sleeper does — preseason week N would otherwise collide with regular week N.

### Tests — `test/omenTuesdayCronNflverse.test.js` (+2 net)

- URL-shape assertion rewritten to the new path, **plus a negative guard** asserting the URL no longer contains `/player_stats/`
- New: PRE/REG same-week collision test (both directions)
- New: fail-closed test for a schema missing `season_type`
- Existing fixtures updated to carry `season_type`

### Docs

- `Direction/current_sprint.md` — new `M5-Native-API-Client` (P0, M lane, 7 slices with beta-minimum called out); new `A5-NflversePath` (VERIFIED); new `A6-MovesScoringFormat` (READY, founder-gated); A5 updated with the corrected premise, the vendor-agnostic clarification, and the memo pointer
- `Direction/reviews/2026-08-15-a5-scoring-source-options.md` — the A5 options memo
- `Direction/known_issues.md` — retired-path entry, PPR-grading defect
- `Direction/decision_log.md` — 2026-08-15 entry

## 4. Evidence

- Full backend suite **537/537**, 0 fail
- Corrected URL proven live: `stats_player_week_2025.csv` downloaded, 8.6 MB, `REG` 18,540 rows / `POST` 882, required columns present
- Old path proven dead: 404 for both 2025 and 2026
- Live probes: Sleeper `state`/`stats`/`projections`, ESPN scoreboard, nflverse release index

## 5. Boundaries honored

No backend contract changed. No provider account, credential, or cookie accessed. No SQL authored or applied. No schema, dependency, deploy config, or production flag touched — `OMEN_CRON_SCORING_ENABLED` stays false and A4 is unaffected. No Figma write. Nothing pushed, merged, or deployed.

`A6-MovesScoringFormat` was deliberately **not** fixed in-session: it requires a `moves` column, and per facts-of-record #8 an agent authors schema SQL as review-only source and never applies it.

## 6. Open, needing the founder

1. **A5 decision** — approve the `ScoreSource` interface with ordered fallback; accept or reject Sleeper as secondary given its undocumented-API/no-published-licence status; confirm the fork is post-beta. Trigger date 2026-09-01.
2. **`A6-MovesScoringFormat`** — schema change approval.
3. **`M5-Native-API-Client`** — ready to pull, no gates. Slices A–D are the beta-minimum.

## 7. Skills

`slops-quality-baseline` (suite + evidence discipline) used. `pre-build-research` substituted with direct live endpoint probing — for a source-availability question, probing the actual endpoints is stronger evidence than a literature pass, and the memo records raw results rather than summaries. `slops-git-flow` / `slops-ship` N/A — nothing pushed. `slops-data-ingest-plan` partially applied: the memo covers source evaluation but stops short of a pipeline design, which waits on the founder's pick.

**Skill improvement:** the recurring failure in this repo is queue items whose *premise* silently expires — A5 was written against a file that never existed under that name, and three inbox items described merged work as pullable. A research skill should verify the premise of an item before researching its question. That check cost one HTTP call and changed the entire shape of the answer.
