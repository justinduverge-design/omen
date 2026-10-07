begin;

-- Database access is deny-by-default. The ingest capability alone receives
-- TEMPORARY because its transactional writers use temporary staging tables.
revoke connect, temporary on database omen_football from public;

alter role omen_warehouse_reader
  nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit;
alter role omen_warehouse_writer
  nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit;
alter role omen_warehouse_backup
  nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls inherit;
alter role omen_warehouse_reader reset all;
alter role omen_warehouse_writer reset all;
alter role omen_warehouse_backup reset all;

-- Capability roles are leaves in the role graph. Remove any inherited parent
-- membership so a future or partially reconciled cluster cannot widen them.
do $$
declare
  membership record;
begin
  for membership in
    select parent.rolname as parent_name, member.rolname as member_name
    from pg_auth_members relation
    join pg_roles parent on parent.oid = relation.roleid
    join pg_roles member on member.oid = relation.member
    where member.rolname in (
      'omen_warehouse_reader', 'omen_warehouse_writer', 'omen_warehouse_backup'
    )
  loop
    execute format('revoke %I from %I', membership.parent_name, membership.member_name);
  end loop;
end
$$;

revoke all privileges on database omen_football
  from omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant connect on database omen_football
  to omen_warehouse_reader, omen_warehouse_backup;
grant connect, temporary on database omen_football
  to omen_warehouse_writer;

revoke all on schema football from public;
revoke all on all tables in schema football from public;
revoke all on all sequences in schema football from public;
revoke execute on all functions in schema football from public;

grant usage on schema football
  to omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on all tables in schema football
  to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert, update, delete on all tables in schema football
  to omen_warehouse_writer;
grant usage, select on all sequences in schema football
  to omen_warehouse_writer;
grant select on all sequences in schema football
  to omen_warehouse_backup;

alter default privileges in schema football revoke all on tables from public;
alter default privileges in schema football revoke all on sequences from public;
alter default privileges in schema football revoke execute on functions from public;
alter default privileges in schema football
  grant select on tables to omen_warehouse_reader, omen_warehouse_backup;
alter default privileges in schema football
  grant select, insert, update, delete on tables to omen_warehouse_writer;
alter default privileges in schema football
  grant usage, select on sequences to omen_warehouse_writer;
alter default privileges in schema football
  grant select on sequences to omen_warehouse_backup;

commit;
