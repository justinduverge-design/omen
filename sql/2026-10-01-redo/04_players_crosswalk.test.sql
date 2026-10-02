-- SCRATCH ONLY. Assertions for step 04. Rolls back.
begin;

insert into public.players (id, full_name, position, nfl_team, birth_date, gsis_id) values
  ('omen:player:josh-allen-qb', 'Josh Allen', 'QB', 'BUF', '1996-05-21', '00-0034857'),
  ('omen:player:josh-allen-lb', 'Josh Allen', 'LB', 'JAX', '1997-07-13', '00-0035000');
insert into public.player_provider_ids (provider, provider_player_id, player_id, match_method) values
  ('sleeper', '4984', 'omen:player:josh-allen-qb', 'name_birth_date');

do $$
begin
  -- Same provider id cannot map to two players.
  begin
    insert into public.player_provider_ids values ('sleeper', '4984', 'omen:player:josh-allen-lb', 'manual');
    raise exception 'FAIL 04: one provider id mapped twice';
  exception when unique_violation then null;
  end;
  -- One player cannot hold two ids from the same provider.
  begin
    insert into public.player_provider_ids (provider, provider_player_id, player_id, match_method)
    values ('sleeper', '9999', 'omen:player:josh-allen-qb', 'manual');
    raise exception 'FAIL 04: a player got two Sleeper ids';
  exception when unique_violation then null;
  end;
  -- Ids are well-formed.
  begin
    insert into public.players (id, full_name, position) values ('Josh Allen', 'Josh Allen', 'QB');
    raise exception 'FAIL 04: malformed canonical id accepted';
  exception when check_violation then null;
  end;
  -- A mapped player cannot be deleted out from under its mappings.
  begin
    delete from public.players where id = 'omen:player:josh-allen-qb';
    raise exception 'FAIL 04: mapped player deleted';
  exception when foreign_key_violation then null;
  end;
  if has_table_privilege('authenticated', 'public.players', 'select') or has_table_privilege('anon', 'public.player_provider_ids', 'select') then
    raise exception 'FAIL 04: a client role can read the crosswalk';
  end if;
end $$;

rollback;
