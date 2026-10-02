-- SCRATCH ONLY. Assertions for step 07, exercised as a real signed-in client. Rolls back.
begin;

set local role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true); end $$;

do $$
begin
  -- Reads of one's own rows still work.
  if (select count(*) from public.moves) = 0 then raise exception 'FAIL 07: own moves no longer readable'; end if;
  if (select count(*) from public.moves where user_id <> '00000000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'FAIL 07: another user''s moves are visible';
  end if;
  begin
    update public.moves set outcome = 'win' where user_id = '00000000-0000-4000-8000-000000000001';
    raise exception 'FAIL 07: a client rewrote its own Ledger';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.moves (user_id, week_num) values ('00000000-0000-4000-8000-000000000001', 9);
    raise exception 'FAIL 07: a client inserted a call';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.users set email = 'x@example.test' where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'FAIL 07: a client rewrote its user row';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
