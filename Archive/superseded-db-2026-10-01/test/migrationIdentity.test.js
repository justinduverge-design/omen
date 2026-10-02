"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { execSync } = require("child_process");
const { Client } = require("pg");

test("Identity Unification Migration (1790735188136_identity-unification.js)", { skip: !process.env.TEST_DB_URL }, async () => {
  const dbUrl = process.env.TEST_DB_URL;
  if (!dbUrl) {
    return;
  }

  const rootClient = new Client({ connectionString: dbUrl });
  await rootClient.connect();

  await rootClient.query("DROP DATABASE IF EXISTS test_identity_migration;");
  await rootClient.query("CREATE DATABASE test_identity_migration;");

  const roles = ['anon', 'authenticated', 'service_role'];
  for (const role of roles) {
    const res = await rootClient.query(`SELECT 1 FROM pg_roles WHERE rolname=$1`, [role]);
    if (res.rowCount === 0) {
      await rootClient.query(`CREATE ROLE ${role} NOLOGIN;`);
    }
  }
  await rootClient.end();

  const dbUrlObj = new URL(dbUrl);
  dbUrlObj.pathname = "/test_identity_migration";
  const migrationDbUrl = dbUrlObj.toString();

  const client = new Client({ connectionString: migrationDbUrl });
  await client.connect();

  try {
    await client.query("CREATE SCHEMA IF NOT EXISTS auth;");
    // Add email to the mock auth.users table for the reconciliation logic
    await client.query("CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);");
    await client.query("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '00000000-0000-0000-0000-000000000000'::uuid $$ LANGUAGE SQL;");

    // Run baseline
    execSync(`DATABASE_URL=${migrationDbUrl} ./node_modules/.bin/node-pg-migrate up 1 -m migrations`, { stdio: 'ignore' });

    // Insert mock data
    await client.query("INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'valid@example.com');");
    await client.query("INSERT INTO public.users (id, email, platform, league_id) VALUES ('11111111-1111-1111-1111-111111111111', 'valid@example.com', 'sleeper', '123');");

    // Orphan user (no auth.users record)
    await client.query("INSERT INTO public.users (id, email, platform, league_id) VALUES ('22222222-2222-2222-2222-222222222222', 'orphan@example.com', 'espn', '456');");
    await client.query("INSERT INTO public.consent_records (user_id, consent_type, granted) VALUES ('22222222-2222-2222-2222-222222222222', 'analytics', true);");

    // Split identity to be reconciled
    await client.query("INSERT INTO auth.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333', 'reconcile@example.com');");
    await client.query("INSERT INTO public.users (id, email, platform, league_id) VALUES ('44444444-4444-4444-4444-444444444444', 'reconcile@example.com', 'yahoo', '789');");
    await client.query("INSERT INTO public.consent_records (user_id, consent_type, granted) VALUES ('44444444-4444-4444-4444-444444444444', 'marketing', true);");

    // Run identity unification
    execSync(`DATABASE_URL=${migrationDbUrl} ./node_modules/.bin/node-pg-migrate up 1 -m migrations`, { stdio: 'ignore' });

    const usersRes = await client.query("SELECT * FROM public.users ORDER BY email");
    assert.equal(usersRes.rows.length, 2, "Only the valid user and reconciled user should remain");

    // Check reconciled user
    const legacyUser = usersRes.rows.find(u => u.email === 'reconcile@example.com');
    assert.equal(legacyUser.id, '33333333-3333-3333-3333-333333333333', "Legacy user should be reconciled to auth.users ID");

    assert.ok(!('platform' in usersRes.rows[0]), "platform column should be dropped");
    assert.ok(!('league_id' in usersRes.rows[0]), "league_id column should be dropped");

    const consentRes = await client.query("SELECT * FROM public.consent_records ORDER BY consent_type");
    assert.equal(consentRes.rows.length, 1, "The orphan's consent record should be cascade deleted, reconciled kept");
    assert.equal(consentRes.rows[0].user_id, '33333333-3333-3333-3333-333333333333', "The reconciled user's consent should update user_id");

    // Test that the FK restricts inserting into public.users without auth.users
    await assert.rejects(
      async () => {
        await client.query("INSERT INTO public.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555', 'new@example.com');");
      },
      (err) => err.code === '23503', // foreign_key_violation
      "Should not allow inserting a public user without a corresponding auth user"
    );

  } finally {
    await client.end();
  }
});
