-- 00_preflight.sql
-- Check RLS and policy configurations before WO-01 modifications.

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'waitlist_signups',
    'platform_connections',
    'oauth_state',
    'league_office_sync_jobs',
    'league_office_matchups',
    'league_office_executives',
    'league_office_rivalries',
    'league_office_lines',
    'league_office_awards',
    'league_office_accolades'
)
ORDER BY tablename;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'waitlist_signups',
    'platform_connections',
    'oauth_state',
    'league_office_sync_jobs',
    'league_office_matchups',
    'league_office_executives',
    'league_office_rivalries',
    'league_office_lines',
    'league_office_awards',
    'league_office_accolades'
)
ORDER BY tablename, policyname;

-- Note: We can't trivially capture row counts dynamically in pure SELECT queries
-- without writing a PL/pgSQL function or using psql's \gexec. We'll write simple counts.
SELECT 'waitlist_signups' as table, count(*) as c from waitlist_signups
UNION ALL SELECT 'platform_connections', count(*) from platform_connections
UNION ALL SELECT 'oauth_state', count(*) from oauth_state
UNION ALL SELECT 'league_office_sync_jobs', count(*) from league_office_sync_jobs
UNION ALL SELECT 'league_office_matchups', count(*) from league_office_matchups
UNION ALL SELECT 'league_office_executives', count(*) from league_office_executives
UNION ALL SELECT 'league_office_rivalries', count(*) from league_office_rivalries
UNION ALL SELECT 'league_office_lines', count(*) from league_office_lines
UNION ALL SELECT 'league_office_awards', count(*) from league_office_awards
UNION ALL SELECT 'league_office_accolades', count(*) from league_office_accolades;
