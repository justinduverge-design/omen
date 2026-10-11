# Omen LLM batch jobs v1 — what the CPU model is for

**Status:** PROPOSED (2026-10-11). Not built. Founder asked to note this down; build order below.

## Measured facts (2026-10-11, KVM2 `model-host`, Ollama on the tailnet)

- Hardware: 2 vCPU (AMD EPYC 9354P), 7.9 GB RAM, no GPU. Installed model: `gemma3:4b` (3.3 GB).
- Speed: about **10 tokens/s** generation, about 2 s prompt evaluation for a short prompt, **19 s model load** when cold
  (the model unloads when idle). A two-sentence answer takes 8-10 s.
- The production API calls it live with a 1.25 s budget (Omen), 1.5 s (Trade, Start/Sit). It never finishes in time, so
  narration is effectively absent today; the circuit breaker (PR #626) skips it after 3 misses and probes once a minute.
- A smaller model would not fix a live path (a 1B model is ~3-4 s and writes worse text).

## Principle

**The LLM is never on a request path.** It runs as scheduled batch work, writes grounded results to storage, and the
app reads them with zero added latency. Batch also allows a better model than any live path could use (an 8B model at ~4
tokens/s still yields ~800k tokens/day, enough for everything below). Everything it writes is validated and is never
authoritative for data.

## Jobs, in build order

1. **Pre-written player notes (replaces live narration).** After each warehouse ingest, write 1-2 plain sentences per
   fantasy-relevant player (about 600) from warehouse facts: recent usage trend, red-zone/inside-10 work, role. Store in a
   warehouse table with a hash of the input facts; rewrite only when the facts change. Start/Sit, the Omen call and waiver
   adds read the stored note. Validation: the existing grounding check (`narrationGrounding`) — every number and name in the
   sentence must come from the input facts, no "predicts/beats/guarantees" overclaims; failures are dropped, never repaired.
   Fallback when no note exists: today's deterministic text. About 3 h overnight for 600 players on the 4B model.
2. **Founder Digest and beta-report triage.** Summarize in-app beta reports (`beta_reports`), cluster repeats, and draft the
   daily digest described in `omen-app-pages-workshop-v1.md` Part 2. Internal only; slow is fine.
3. **Ops summaries.** One-line plain-English cause attached to Kuma/Beszel alerts. Needs a secret-scrubbing filter before any
   log text reaches the model.
4. **Data-quality suggestions.** Propose matches for unmatched player ids and explain ingest anomalies; suggestions only,
   always human-approved, never auto-applied.

## Not LLM jobs

- Player similarity / "also considered": nearest neighbors on standardized stats in SQL (deterministic, explainable).
- Anything needing sub-second latency, and anything that sends user data to a hosted third-party model (Omen is
  self-hosted by design).

## Operating notes

- Keep the model warm during a batch (`keep_alive`) to avoid 19 s reloads; unload when idle is fine otherwise.
- Run batches inside a defined window (see `infra/schedule/TIMERS.md`), after the daily ingest, never during the Friday
  maintenance window; report completion through a Kuma push monitor like every other job.
- Cost control: batch size and token caps are config, not code; the job exits cleanly if KVM2 is busy.
