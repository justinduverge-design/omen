-- 02_verify.sql
-- Verification script to run after applying WO-01 RLS policy changes.

DO $$
DECLARE
    policy_counts JSONB;
    t RECORD;
    v_count INT;
    v_expected INT;
BEGIN
    -- Expected policy counts based on 01_apply.sql + existing (e.g. platform_connections had select)
    -- waitlist_signups: 1 (insert)
    -- platform_connections: 4 (select, insert, update, delete)
    -- oauth_state: 4
    -- league_office_sync_jobs: 4
    -- league_office_matchups: 4
    -- league_office_executives: 4
    -- league_office_rivalries: 4
    -- league_office_lines: 4
    -- league_office_awards: 4
    -- league_office_accolades: 4
    policy_counts := '{
        "waitlist_signups": 1,
        "platform_connections": 4,
        "oauth_state": 4,
        "league_office_sync_jobs": 4,
        "league_office_matchups": 4,
        "league_office_executives": 4,
        "league_office_rivalries": 4,
        "league_office_lines": 4,
        "league_office_awards": 4,
        "league_office_accolades": 4
    }'::JSONB;

    FOR t IN SELECT key FROM jsonb_each(policy_counts) LOOP
        SELECT count(*) INTO v_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = t.key;

        v_expected := (policy_counts->>t.key)::INT;

        IF v_count != v_expected THEN
            RAISE EXCEPTION 'Mismatch on table %. Expected % policies, found %.', t.key, v_expected, v_count;
        END IF;
    END LOOP;

    RAISE NOTICE 'All expected policy counts match.';
END $$;

-- Verify behavior of waitlist_signups for anon user
-- We should be able to insert but not select.

-- Set role to anon
SET ROLE anon;

-- We don't have usage/select on the underlying sequence or we might run into other problems,
-- but we can verify that SELECT errors due to lack of SELECT grant (as revoked/missing).
-- If we lack SELECT grant, it returns permission denied.
DO $$
BEGIN
    -- This should raise a permission denied exception which we can catch
    PERFORM count(*) FROM waitlist_signups;
    RAISE EXCEPTION 'Anon user was able to SELECT from waitlist_signups. This should not be allowed.';
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Expected!
        NULL;
END $$;

RESET ROLE;
