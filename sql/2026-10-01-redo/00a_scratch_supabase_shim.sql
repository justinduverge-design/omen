-- SCRATCH ONLY. NEVER RUN AGAINST PRODUCTION OR ANY SUPABASE PROJECT.
--
-- Reproduces, on a plain Postgres 17, the pieces of Supabase that the Omen migrations depend on, so
-- the redo steps can be rehearsed up -> down -> up on a scratch database. Every item below was read
-- from production's catalog on 2026-10-01 (read-only, founder-approved) and is copied as observed:
--
--   * roles anon / authenticated / service_role (service_role bypasses RLS);
--   * auth.users and auth.uid() (here: read from the `request.jwt.claim.sub` setting, as PostgREST does);
--   * vault.secrets with its UNIQUE index on name (`secrets_name_idx ... WHERE name IS NOT NULL`),
--     vault.decrypted_secrets, vault.create_secret / vault.update_secret. Secrets are stored in
--     plain text here: this is a shape stand-in, not an encryption stand-in;
--   * the DEFAULT PRIVILEGES Supabase sets on schema public: every new table, sequence and function
--     is granted to anon, authenticated and service_role. A migration that forgets to revoke leaves a
--     new table writable from a client. Reproducing the default is what lets the tests catch that;
--   * the `ensure_rls` event trigger (public.rls_auto_enable) that turns RLS on for new public tables.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema if not exists vault;
create table if not exists vault.secrets (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  description text not null default '',
  secret      text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists secrets_name_idx on vault.secrets (name) where name is not null;
create or replace view vault.decrypted_secrets as
  select id, name, description, secret, secret as decrypted_secret, created_at, updated_at from vault.secrets;

create or replace function vault.create_secret(
  new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null
) returns uuid language plpgsql as $$
declare rec_id uuid;
begin
  insert into vault.secrets (secret, name, description) values (new_secret, new_name, coalesce(new_description, ''))
  returning id into rec_id;
  return rec_id;
end $$;

create or replace function vault.update_secret(
  secret_id uuid, new_secret text default null, new_name text default null,
  new_description text default null, new_key_id uuid default null
) returns void language plpgsql as $$
begin
  update vault.secrets set
    secret = coalesce(new_secret, secret),
    name = coalesce(new_name, name),
    description = coalesce(new_description, description),
    updated_at = now()
  where id = secret_id;
end $$;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create or replace function public.rls_auto_enable() returns event_trigger
language plpgsql security definer set search_path to 'pg_catalog' as $$
declare cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      execute format('alter table if exists %s enable row level security', cmd.object_identity);
    end if;
  end loop;
end $$;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end execute function public.rls_auto_enable();
