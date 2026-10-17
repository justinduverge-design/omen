-- Step 17 down: drop connection_invalidate. Credentials it already removed are not restored (they were refused).
begin;
drop function if exists public.connection_invalidate(uuid, text, text);
commit;
