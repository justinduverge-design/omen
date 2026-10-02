-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 07 — signed-in clients can no longer write the Ledger, their user row, or consent directly.
--
-- Review finding 9: `authenticated` holds INSERT and UPDATE on moves, users and consent_records (RLS
-- limits it to the user's own rows). Native apps never write these tables directly — the server uses
-- service_role (2026-09-27 audit; not re-checked in code here, see the design doc's "not verified").
-- But anyone holding their own session token can call the REST API and change their own calls'
-- `followed`, `outcome` or `headline`, which makes "verified versus self-reported" forgeable.
--
-- SELECT stays, so nothing a client might read today breaks. Write policies are dropped with the
-- grants so the intent is not left half-stated. Independent of steps 01-06; can ship first.

begin;

revoke insert, update on table public.moves, public.users, public.consent_records from authenticated;

drop policy if exists moves_self_all on public.moves;
create policy moves_self_select on public.moves for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists users_self_insert on public.users;
drop policy if exists users_self_update on public.users;
drop policy if exists consent_self_insert on public.consent_records;
drop policy if exists consent_self_update on public.consent_records;

commit;
