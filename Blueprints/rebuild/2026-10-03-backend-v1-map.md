# Omen backend v1 — whole-backend map (DRAFT, 2026-10-03)

**Thesis (founder, 2026-10-03):** v1 does not try to beat ESPN/Yahoo/Sleeper
projections — it *explains* them. nflverse feeds the raw material; Omen's job
is to decipher it for the user: what is causation, what is correlation, what
is coincidence ("the three Cs"). v2 is Omen's own projections that outthink
the providers. This map is v1.

**Honest boundary:** v1 does not do true causal inference. What it does is
two deterministic things:
1. **Projection breakdown** — provider's projected stat line × the league's own
   scoring rules = "where the points come from." Pure math; parts must add up
   or the screen shows "unavailable" (already building in #553).
2. **Evidence cross-check** — the projection's assumptions vs nflverse recent
   form. "Projection assumes 8 targets/game; last three weeks: 4, 3, 5."
   That is the practical v1 version of the three Cs: which parts of the
   projection the recent evidence supports, contradicts, or can't speak to.

## The four parts

```
nflverse releases
      │
      ▼
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌────────────┐
│ INGEST      │     │ SUPABASE     │     │ API (KVM1)    │     │ GRADERS    │
│ workers     │────▶│ (notebook +  │────▶│ (the waiter)  │     │ (referees) │
│ (Pi fleet)  │ API │  scorebook)  │ SQL │ Express routes│     │ Tue cron   │
└─────────────┘     └──────────────┘     └───────────────┘     └────────────┘
      │                                            │                  │
      │ daily crosswalk (identity)                 │ serves screens   │ scores last
      │ weekly stats ingest (step 14)              │ per v2 contracts │ week's calls
      │ re-runnable, never critical path          │                  │ vs actuals → Ledger
```

### 1. Supabase — the notebook + the scorebook
The redo (steps 01–13, rehearsed, not yet applied) + step 14 (nflverse player-weekly
stats — see `nflverse-step-14-sketch.md`). Canonical player identity,
provider compartments with purge-in-one-call, append-only ledger, data_events
provenance on every batch. Server-only tables; no client writes.

### 2. API on KVM1 — the waiter
Express routes, unchanged shape, new data sources:
- `POST /api/omen/mvp-move` → omen-decision-brief.v3 (the Omen call)
- `GET /api/start-sit/detail` → start-sit-detail.v1 (evidence incl. usage lines)
- `POST /api/trade/compare` → trade-compare.v2
- `GET /api/moves` → moves-history.v2 (Ledger; needs steps 05/08 applied)
Reads the notebook instead of live-fetching where a table now exists.

### 3. Ingest workers — the librarians (command-center Pi)
- **Daily:** crosswalk refresh — nflverse `players.csv` + Sleeper dump →
  step-04 tables. (Exists: `src/omen_player_crosswalk_cron.js`; runs where?)
- **Weekly (Tue/Wed):** nflverse stats ingest → step-14 tables. New job;
  upsert by `(player_id, season, week)`; one `data_events` row per run.
- Both re-runnable: a missed run is caught by the next one. The Pi is never
  in the critical path. Logs/alerts via the GlitchTip + Uptime Kuma already
  on command-center.
- Steward/sentinel (Zeros): not workers. Sitting this out.

### 4. Graders — the referees (Tuesday cron, KVM1)
Scores last week's calls against actuals **from the notebook** (not ad-hoc
fetches), writes outcomes (worked / did_not_work / not_verified) to the
Ledger tables. This is what makes "beats the provider" a checkable claim in
v2 — the forward record starts in v1.

## v1 data flow (the explainer loop)

1. Pi ingests nflverse weekly stats → notebook.
2. Provider projections ingested → step-06 compartment (Sleeper/ESPN; Yahoo
   gated by its terms).
3. API: projection breakdown (stat line × league scoring) + evidence
   cross-check (projection assumptions vs nflverse recent form).
4. Screens render per v2 contracts; anything unverifiable renders as
   "unavailable," never invented.
5. Tuesday: graders score outcomes → Ledger → the record v2 will learn from.

## What v2 adds (not this map)
Omen's own projection engine, trained on the v1 forward record
(projection_shadow_log + graded outcomes). The v1 Ledger is v2's training
data — that is why the record-keeping matters now.

## Build order
1. Apply redo steps 01–13 to production (founder sign-off per step).
2. Build step 14 migration + Pi ingest job (test on scratch now; production
   writes after the redo lands).
3. Migrate readers (`playerUsage.js`, Tuesday cron) from live-fetch to tables.
4. #553 explainer + evidence cross-check live on the v2 screens.
