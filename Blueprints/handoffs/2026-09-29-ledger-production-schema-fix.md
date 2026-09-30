# Handoff — Ledger v2 production-schema fix (GlitchTip #13)

**Symptom:** `moves lookup failed: column moves.result does not exist`, 150 events 2026-09-16 to 2026-09-28, every one `GET /api/moves?...contract_version=moves-history.v2`.

**Cause:** production `public.moves` has no `result`, `scored_at`, `platform` or `league_id`. `DETAIL_COLUMNS_LEGACY` still named `result`/`scored_at`, so the fallback failed identically. The detail route (`GET /api/moves/:id`) had the same defect.

**Changed:** `src/routes/moves.js` — `selectTolerantly` drops optional columns as the database names them; list selects only what `ledgerRow` reads; v2 returns `503 moves-history-error.v1 / league_scope_unavailable` when `platform`/`league_id` are absent. New `test/movesProductionSchema.test.js` (stub enforces the reported production column set; red before the fix). New review-only `sql/2026-09-29_moves_league_scope_review.sql`.

**Not applied / founder-gated:** the migration. Until it is applied the native Ledger shows its error state in production (the client maps any non-2xx to "try again in a moment"). After it lands, existing rows have NULL league and stay hidden; no backfill.

**`scripts/check-a4-scoring-gates.js:125`:** same message format, different cause. It selects only columns that exist in production; its failure would be a different column.

**Open, same class:** Tuesday cron writes `result`/`scored_at`; `userPrivacy.js:128` selects `feature`/`updated_at` from `moves`. Decision: `Direction/decision_log.md` 2026-09-29.
