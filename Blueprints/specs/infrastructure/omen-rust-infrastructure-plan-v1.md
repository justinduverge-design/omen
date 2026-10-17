# Omen Rust infrastructure plan — v1

**valid-as-of:** 2026-10-17
**Status:** APPROVED DIRECTION, NOT STARTED. The founder approved the direction on 2026-10-17. Every production step
still needs its own approval (map rules 4, 5 and 10).
**Tracking:** one programme, not one sprint item per phase.

## Why

The industry move to Rust is mostly about two things: replacing C/C++ for memory safety, and Rust-built tooling
(uv, ruff, Biome, Polars, Rolldown, Vector) replacing slower tools. Omen's server is network-bound
Node and is already memory-safe, so **we adopt Rust-built tools first, write Rust only where it earns its place**, and
make one strategic Rust investment: a shared decision core.

## Target shape

```
nflverse Parquet ─► Polars ingest ─► Postgres warehouse ─► Rust decision core ─► API / iOS / (Android) / web
                                          │                        ▲
                                          ▼                        │
                            overnight model jobs (KVM2) ─► stored, grounded notes and summaries

Ops: Vector → Command Center · Rust binaries on the Pi fleet · uv / ruff / Biome / typos in every repo
```

Data is facts, the core is deterministic math, and models write words ahead of time. **No model is on a request path.**

## Phases (run in this order)

### Phase 1 — Developer tooling
- Python (`warehouse/`, `infra/warehouse/*.py`, `scripts/research/`, `ops/`): **uv** (lockfile) and **ruff**.
- JS (server, `frontend/`, `extension/`, `scripts/`, and the Slops-OS `Blueprints/tools/`): **Biome**.
- CI: **typos**. Keep shellcheck.
- `frontend/`: **Tailwind 4** (Rust engine, drops the PostCSS/autoprefixer setup) and **Vite with Rolldown**.
- Retire or merge the legacy `client/` (React 18, Vite 5). The Dockerfile still builds it on every deploy.
- Done when: CI is green with the new tools and the old ones are removed. No runtime behaviour changes.

### Phase 2 — Local model batch jobs (KVM2)
Implements `Blueprints/specs/football-data/omen-llm-batch-jobs-v1.md` in its build order: player notes, then founder
digest, ops summaries, and data-quality suggestions.
- Every output passes `narrationGrounding` or is dropped. Advisory only, never authoritative, and never sent to a third
  party.
- Small specialists: a tiny classifier (report/alert type) and embeddings (EmbeddingGemma or nomic-embed) for
  duplicate reports and fuzzy player-name matching.
- Model comparison: `gemma3:4b` vs **Ministral 3B**, scored on the share of notes that pass grounding. Run them
  **one after the other**, because only one model fits in KVM2's 7.9 GB.
- Keep Ollama. Consider **mistral.rs** (a Rust runtime) only if Ollama becomes a problem.
- Done when: Start/Sit, the Omen call and Waivers show stored notes with zero added latency, and each job reports to a
  Kuma push monitor.

### Phase 3 — Warehouse ingest
- nflverse **Parquet** read with **Polars**, then Postgres (Postgres stays the serving database). **DuckDB** for research
  queries.
- Proof on one season: identical rows to the current writer, with memory and time measured. Then backfill and retire
  the `--max-old-space-size=3072` workaround.
- `nfl_games.kickoff_at`: TIMERS.md lists it as empty, but `scheduleSource.js` already derives it
  (`kickoffInstantUtc`) and `scheduleWriter.js` writes it. Check the live column. If old rows are empty, re-run the
  schedule ingest, then close the TIMERS.md open item. The Polars path must keep the same derivation.
- Parity risk: adapters store the raw row as strings in `source_row`, and some SQL compares that text (for example
  `two_point_attempt IS DISTINCT FROM '1'`). Parquet must not turn `1` into `1.0` (see
  `rust-prep/phase3-parquet-column-map.md`).
- Done when: a full-season ingest runs under 1 GB and every `warehouse/test` script passes.

### Phase 4 — Server ops
- **Vector** ships logs and metrics to Command Center.
- **Rust binaries for the Pi fleet**: replace the watchdog/status scripts. Steward and Sentinel are Pi Zero 2 W boards
  (512 MB, native binaries only, no Docker), which is exactly where a single static Rust binary fits.
- Add the missing heartbeat monitor for the weekly restore proof.
- Keep nginx, Tailscale, Postgres, restic, Supabase, Upstash Redis and GlitchTip/Sentry.
- Done when: Vector delivers every host's logs, the Rust watchdog runs on the Pi, and every timer has a monitor.

### Phase 5 — Shared Rust decision core
- Local baseline (`rust-prep/phase5-decision-core-baseline.md`, synthetic inputs): the only CPU hot path is the trade
  search (`tradeLineup.js`, `tradeFind.js`). It takes about 340 ms for a 10-team league and 1.2–1.4 s for 16×20, and
  it blocks the event loop. Everything else runs under 1.5 ms.
- Interim step: move the trade search into a `worker_threads` worker. That removes the blocking without Rust.
- OpenTelemetry is installed but **not wired**, so there is no production baseline. Add the spans listed in the baseline
  doc before sizing the core.
- Porting the rest is justified by one shared server-and-mobile core, not by speed. A golden file of real league
  trade inputs and outputs is needed as the parity fixture.
- One Rust library for the optimizer, projections and confidence rules, served to Node via **napi-rs**, to iOS via
  **UniFFI** (Android when it resumes), and to the web via **WebAssembly**.
- Shadow first: Rust and JS run side by side on real weeks until outputs match exactly. Then cut over, and keep JS as
  the rollback path for one release.
- Done when: the shadow parity record is clean across a full week's slate, and the founder approves the cutover.

## Build alongside, then swap

Every phase is built next to the thing it replaces, the same way the warehouse shadow reads and `SIGHT_VERSION` already
work. The lifecycle is **build alongside → shadow → flip → watch → prune**.

1. The old path stays in charge until the flip. Shadow output is never shown to users.
2. Flipping back is the rollback: no redeploy and no data restore.
3. Each phase has its own switch, because each runs in a different place. One phase failing never blocks or undoes
   another.
4. Prune only after the watch period (at least a full week of games with no flip-back). Pruning removes the old code,
   config and the switch itself.
5. Flipping a production switch is a one-line founder approval ("flip Phase 3"). It is not a change window.

### Switchboard

The one page that shows where the whole migration stands. Update a row whenever its switch moves.

| Phase | Switch | Lives on | Position | Proof to flip | Pruned after flip |
|---|---|---|---|---|---|
| 1 Tooling | CI workflow config | GitHub Actions | off | old and new tools pass on the same commit | old linters, PostCSS setup, `client/` |
| 2 Model jobs | `PLAYER_NOTES_ENABLED` | KVM2 + API | off | grounding pass rate, founder spot check | live narration call and its circuit breaker |
| 3 Ingest | `WAREHOUSE_INGEST_ENGINE=csv\|polars` | KVM1 warehouse worker | off | row-for-row match in a shadow schema | CSV parser, 3 GB heap workaround |
| 4 Ops | systemd units | Pi fleet, all hosts | off | a week of matching alerts | old watchdog and status scripts |
| 5 Decision core | `DECISION_ENGINE=js\|shadow\|rust` | API | off | identical outputs across a full week's slate | JS engine, one release after cutover |

Positions: `off` → `shadow` → `on` → `pruned`.

## Constraints that bind every phase

- **Season:** Build 12 targets 2026-10-20 and the season is live. Phase 1 can run any time. Production changes in phases
  2–5 go in quiet windows, and the largest changes wait until `is_off_season`.
- **Schedule:** new jobs are added to `infra/schedule/TIMERS.md`. KVM2 model jobs run after the 07:15 ET ingest, never in
  the Tuesday 05:15–07:45 ET window, the Friday maintenance slot, or the Sunday 14:00 UTC restore proof. KVM2 also holds
  the backup repository, so batch jobs exit cleanly when it is busy.
- **Approvals:** warehouse production work needs a change window (`infra/warehouse/runbook.md`). Each deploy, Supabase
  SQL command and credential change needs its own approval.
- **Supply chain:** add `cargo-deny`/`cargo-audit` to `dependency-health.yml`, and pin images by digest as the warehouse
  image does.
- **Secrets:** ops summaries scrub secrets before any log text reaches a model (map rules 2 and 11).
- **Pi builds:** the Pi fleet is ARM. Cross-compile in CI with `cross` or `cargo-zigbuild`.
- **Parity before removal:** every replacement proves it matches before the old path is deleted.

## Readiness checklist (prep before execution)

These have to be true before the programme can run end to end. The founder decides the items marked **(founder)**.

1. **(founder)** Approval scope: which production steps one approval covers, and which need their own.
2. **(founder)** Phase 5 timing: start now, or after `is_off_season`.
3. **(founder)** Gemma vs. Ministral comparison approved, including model licence review.
4. Phase 5 baseline: an OpenTelemetry timing record for the optimizer and cron paths. Without it, the core's scope is
   a guess.
5. Phase 3 column map: the nflverse Parquet columns each writer actually reads, mapped to the current CSV fields.
6. KVM2 batch slot: written into TIMERS.md, with its Kuma monitor named.
7. Harness: a short Rust row in `Direction/map.md` (within the `harness-cost.js` budget), a Rust testing skill, and a
   `.graphifyignore` update.
8. CI runners: a Rust toolchain and ARM cross-compile target available to GitHub Actions.

## Not doing

- Rewriting the Express API or the crons in Rust.
- Replacing Postgres, Supabase, nginx, Tailscale or restic.
- Putting any model on a live request path.
