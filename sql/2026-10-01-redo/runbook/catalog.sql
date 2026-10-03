-- READ-ONLY. The public schema's catalog fingerprint as one JSON value: the same queries as
-- scripts/db/catalog.js, so a database reached only through SQL (production via the Supabase connector,
-- the KVM1 clone via docker exec) can be compared with the expected structure after each step.
select json_build_object(
 'columns', (select json_object_agg(k, v) from (select table_name k, string_agg(column_name || ':' || data_type || ':' || is_nullable || coalesce(':' || column_default, ''), ', ' order by ordinal_position) v from information_schema.columns where table_schema = 'public' group by table_name) c),
 'constraints', (select coalesce(json_agg(v order by v), '[]') from (select conrelid::regclass::text || '|' || conname || '|' || pg_get_constraintdef(oid) v from pg_constraint where connamespace = 'public'::regnamespace and contype <> 't') x),
 'indexes', (select coalesce(json_agg(v order by v), '[]') from (select tablename || '|' || indexdef v from pg_indexes where schemaname = 'public') x),
 'policies', (select coalesce(json_agg(v order by v), '[]') from (select tablename || '|' || policyname || '|' || cmd || '|' || roles::text || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '') v from pg_policies where schemaname = 'public') x),
 'acls', (select coalesce(json_agg(v order by v), '[]') from (select 'table|' || relname || '|' || coalesce(relacl::text, '') v from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r', 'v') union all select 'func|' || proname || '(' || pg_get_function_identity_arguments(oid) || ')|' || coalesce(proacl::text, '') from pg_proc where pronamespace = 'public'::regnamespace) x),
 'rls', (select coalesce(json_agg(v order by v), '[]') from (select relname || '|' || relrowsecurity::text v from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r') x),
 'triggers', (select coalesce(json_agg(v order by v), '[]') from (select tgrelid::regclass::text || '|' || tgname || '|' || pg_get_triggerdef(oid) v from pg_trigger where not tgisinternal and tgrelid::regclass::text not like '%.%') x),
 'functions', (select coalesce(json_agg(v order by v), '[]') from (select proname || '(' || pg_get_function_identity_arguments(oid) || ')|' || md5(pg_get_functiondef(oid)) v from pg_proc where pronamespace = 'public'::regnamespace) x),
 'views', (select coalesce(json_agg(v order by v), '[]') from (select viewname || '|' || md5(definition) v from pg_views where schemaname = 'public') x)
) catalog;
