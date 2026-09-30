/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    -- Reconcile matching identities first by updating child tables of split identities to point to the canonical auth.users IDs.
    -- (This happens where public.users has a matching email with auth.users but a different ID)

    DO \$\$
    DECLARE
      r record;
    BEGIN
      -- For every record in public.users that has a different ID but matching email in auth.users
      FOR r IN
        SELECT pu.id as old_id, au.id as new_id, pu.email, pu.team_name, pu.created_at
        FROM public.users pu
        JOIN auth.users au ON pu.email = au.email
        WHERE pu.id != au.id
      LOOP
        -- The canonical record in public.users MUST exist before we can point FKs to it.
        -- We cannot insert it with the same email because of the UNIQUE constraint on email.
        -- So we must temporally set the old email to something else!

        -- Let's temporally rename the old email
        UPDATE public.users SET email = 'reconciled_' || r.old_id || '_' || r.email WHERE id = r.old_id;

        -- Now insert the canonical record (which might already exist if we've run before)
        BEGIN
          INSERT INTO public.users (id, email, team_name, created_at)
          VALUES (r.new_id, r.email, r.team_name, r.created_at);
        EXCEPTION WHEN unique_violation THEN
          -- Do nothing, the canonical record already exists
        END;

        -- Update all known child tables (from baseline schema) that reference user_id
        UPDATE public.consent_records SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.league_office_accolades SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.league_office_awards SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.league_office_executives SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.league_office_lines SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.league_office_matchups SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.league_office_rivalries SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.league_office_sync_jobs SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.moves SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.oauth_state SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.platform_connections SET user_id = r.new_id WHERE user_id = r.old_id;
        UPDATE public.profiles SET user_id = r.new_id WHERE user_id = r.old_id;

        -- Delete the old split record now that it has no children
        DELETE FROM public.users WHERE id = r.old_id;
      END LOOP;
    END \$\$;

    -- Delete orphan rows (public.users with no auth.users match)
    DELETE FROM public.users WHERE id NOT IN (SELECT id FROM auth.users);

    -- Remove single-league columns
    ALTER TABLE public.users DROP COLUMN IF EXISTS platform;
    ALTER TABLE public.users DROP COLUMN IF EXISTS league_id;

    -- Drop the default UUID generation on public.users.id
    ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;

    -- Add the foreign key constraint pointing to auth.users.id with cascade deletion
    ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    -- Drop the foreign key constraint
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

    -- Restore the default UUID generation
    ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

    -- Restore single-league columns
    ALTER TABLE public.users ADD COLUMN platform text;
    ALTER TABLE public.users ADD COLUMN league_id text;
  `);
};
