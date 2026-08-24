-- A6-MovesScoringFormat — REVIEW ONLY.
--
-- Do not apply this file from a developer workstation. Founder-approved
-- execution is a separate gated sequence: approval -> staging -> verification
-- -> production. The column intentionally has no default and remains nullable:
-- NULL identifies historical rows that predate scoring-format capture, and the
-- Tuesday worker alone interprets those historical rows as PPR.

begin;

alter table public.moves
  add column if not exists scoring text;

alter table public.moves
  alter column scoring drop default;

comment on column public.moves.scoring is
  'Recommendation-time league format: Standard, Half PPR, or PPR. NULL is historical and grades as PPR.';

commit;
