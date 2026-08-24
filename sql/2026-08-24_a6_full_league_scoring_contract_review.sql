-- A6 — REVIEW ONLY. DO NOT APPLY from an agent session.
--
-- This proposal is deliberately nullable and additive. Its application is a
-- separate founder-controlled sequence: explicit approval -> staging ->
-- verification -> production. It stores the immutable contract reference for
-- new recommendations without rewriting or inventing a contract for history.
--
-- Historical moves with no contract retain the established PPR fallback only
-- while the legacy scorer remains in use. New recommendations must carry the
-- complete contract and must fail closed when its coverage is not `supported`.

begin;

alter table public.moves
  add column if not exists scoring_contract jsonb,
  add column if not exists scoring_contract_hash text,
  add column if not exists scoring_contract_version text,
  add column if not exists scoring_contract_required boolean,
  add column if not exists scoring_coverage_state text,
  add column if not exists provider_rule_snapshot_hash text,
  add column if not exists provider_final_outcome jsonb,
  add column if not exists reconciliation_state text;

-- Existing `scoring` values are legacy three-format labels. Removing its default
-- stops a new row from silently acquiring PPR merely because the caller omitted
-- a contract; historical rows retain their stored value unchanged.
alter table public.moves
  alter column scoring drop default;

comment on column public.moves.scoring_contract is
  'Immutable canonical Omen scoring contract captured at recommendation time; nullable only for rows predating A6.';
comment on column public.moves.scoring_contract_hash is
  'SHA-256 of the canonical scoring_contract bytes, used for replay and provenance.';
comment on column public.moves.scoring_contract_required is
  'True only for a post-A6 recommendation that must fail closed without a complete contract; null identifies a pre-A6 historical row.';
comment on column public.moves.provider_rule_snapshot_hash is
  'SHA-256 reference to minimal private provider-rule snapshot; never a credential or cookie.';
comment on column public.moves.provider_final_outcome is
  'Minimal private final-score evidence for reconciliation; never a shared public stats corpus.';

commit;
