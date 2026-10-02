-- REVIEW ONLY. Rollback for step 07: restores production's 2026-10-01 grants and policies exactly.
begin;
drop policy if exists moves_self_select on public.moves;
create policy moves_self_all on public.moves for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy users_self_insert on public.users for insert to authenticated with check ((select auth.uid()) = id);
create policy users_self_update on public.users for update to authenticated using ((select auth.uid()) = id);
create policy consent_self_insert on public.consent_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy consent_self_update on public.consent_records for update to authenticated using ((select auth.uid()) = user_id);
grant insert, update on table public.moves, public.users, public.consent_records to authenticated;
commit;
