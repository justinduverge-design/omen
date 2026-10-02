-- REVIEW ONLY. Rollback for step 04. Lossless until the crosswalk job runs; after that the job can
-- rebuild every row from its sources (its output is deterministic by design, D3).
-- Fails if step 05 or 06 still references players: roll those back first (reverse order).
begin;
drop table if exists public.player_identity_unresolved;
drop table if exists public.player_provider_ids;
drop table if exists public.players;
commit;
