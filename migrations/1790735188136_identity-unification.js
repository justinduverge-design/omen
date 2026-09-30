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
