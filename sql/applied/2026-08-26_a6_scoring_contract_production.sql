-- A6 production compatibility migration.
--
-- Founder-authorized only after the reviewed staging/preflight sequence. The
-- production database predates the reviewed bootstrap schema and lacks even
-- the nullable legacy `scoring` field; adding it is required before the
-- reviewed A6 proposal can remove its default. No existing row is rewritten.

begin;

alter table public.moves
  add column if not exists scoring text,
  add column if not exists scoring_contract jsonb,
  add column if not exists scoring_contract_hash text,
  add column if not exists scoring_contract_version text,
  add column if not exists scoring_contract_required boolean,
  add column if not exists scoring_coverage_state text,
  add column if not exists provider_rule_snapshot_hash text,
  add column if not exists provider_final_outcome jsonb,
  add column if not exists reconciliation_state text;

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
