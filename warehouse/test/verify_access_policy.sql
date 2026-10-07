\set ON_ERROR_STOP on

do $$
declare
  role_name text;
  expected_group text;
  expected_limit integer;
  attrs record;
  memberships text[];
begin
  if has_database_privilege('public', current_database(), 'connect')
     or has_database_privilege('public', current_database(), 'temporary') then
    raise exception 'PUBLIC retains warehouse database access';
  end if;

  for role_name in
    values ('omen_warehouse_reader'), ('omen_warehouse_writer'), ('omen_warehouse_backup')
  loop
    select rolcanlogin, rolinherit, rolsuper, rolcreatedb, rolcreaterole,
           rolreplication, rolbypassrls, rolconnlimit, rolconfig
      into attrs
      from pg_roles where rolname = role_name;
    if not found or attrs.rolcanlogin or not attrs.rolinherit or attrs.rolsuper
       or attrs.rolcreatedb or attrs.rolcreaterole or attrs.rolreplication
       or attrs.rolbypassrls or attrs.rolconnlimit <> -1 or attrs.rolconfig is not null then
      raise exception 'capability role attributes are not exact for %', role_name;
    end if;
  end loop;

  for role_name, expected_group, expected_limit in
    values
      ('omen_warehouse_ingest', 'omen_warehouse_writer', 4),
      ('omen_warehouse_read', 'omen_warehouse_reader', 8),
      ('omen_warehouse_backup_agent', 'omen_warehouse_backup', 1)
  loop
    select rolcanlogin, rolinherit, rolsuper, rolcreatedb, rolcreaterole,
           rolreplication, rolbypassrls, rolconnlimit, rolconfig
      into attrs
      from pg_roles where rolname = role_name;
    if not found or not attrs.rolcanlogin or not attrs.rolinherit or attrs.rolsuper
       or attrs.rolcreatedb or attrs.rolcreaterole or attrs.rolreplication
       or attrs.rolbypassrls or attrs.rolconnlimit <> expected_limit
       or not attrs.rolconfig @> array['search_path=pg_catalog, football','statement_timeout=5min','lock_timeout=15s'] then
      raise exception 'LOGIN role attributes are not exact for %', role_name;
    end if;
    if not exists (
      select 1 from pg_authid
      where rolname = role_name
        and rolpassword like 'SCRAM-SHA-256$%'
        and (rolvaliduntil is null or rolvaliduntil = 'infinity'::timestamptz)
    ) then
      raise exception 'LOGIN role credential policy is not exact for %', role_name;
    end if;

    select coalesce(array_agg(parent.rolname order by parent.rolname), '{}'::text[])
      into memberships
      from pg_auth_members membership
      join pg_roles parent on parent.oid = membership.roleid
      join pg_roles member on member.oid = membership.member
      where member.rolname = role_name;
    if memberships <> array[expected_group] then
      raise exception 'LOGIN role membership is not exact for %: %', role_name, memberships;
    end if;
    if exists (
      select 1 from pg_auth_members membership
      join pg_roles member on member.oid = membership.member
      where member.rolname = role_name and membership.admin_option
    ) then
      raise exception 'LOGIN role unexpectedly has membership admin option: %', role_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_auth_members membership
    join pg_roles member on member.oid = membership.member
    where member.rolname in (
      'omen_warehouse_reader', 'omen_warehouse_writer', 'omen_warehouse_backup'
    )
  ) then
    raise exception 'capability role unexpectedly inherits another role';
  end if;

  if not has_database_privilege('omen_warehouse_ingest', current_database(), 'connect,temporary')
     or has_database_privilege('omen_warehouse_read', current_database(), 'temporary')
     or has_database_privilege('omen_warehouse_backup_agent', current_database(), 'temporary') then
    raise exception 'database capability matrix is invalid';
  end if;

  if exists (
    select 1 from aclexplode((select datacl from pg_database where datname=current_database())) acl
    join pg_roles login on login.oid=acl.grantee
    where login.rolname in ('omen_warehouse_ingest','omen_warehouse_read','omen_warehouse_backup_agent')
  ) or exists (
    select 1 from pg_namespace namespace
    cross join lateral aclexplode(namespace.nspacl) acl
    join pg_roles login on login.oid=acl.grantee
    where namespace.nspname='football'
      and login.rolname in ('omen_warehouse_ingest','omen_warehouse_read','omen_warehouse_backup_agent')
  ) or exists (
    select 1 from pg_class object
    join pg_namespace namespace on namespace.oid=object.relnamespace
    cross join lateral aclexplode(object.relacl) acl
    join pg_roles login on login.oid=acl.grantee
    where namespace.nspname='football'
      and login.rolname in ('omen_warehouse_ingest','omen_warehouse_read','omen_warehouse_backup_agent')
  ) or exists (
    select 1 from pg_proc function
    join pg_namespace namespace on namespace.oid=function.pronamespace
    cross join lateral aclexplode(function.proacl) acl
    join pg_roles login on login.oid=acl.grantee
    where namespace.nspname='football'
      and login.rolname in ('omen_warehouse_ingest','omen_warehouse_read','omen_warehouse_backup_agent')
  ) then
    raise exception 'LOGIN role has a direct grant';
  end if;
end
$$;

select 'VERIFIED warehouse access policy' as result;
