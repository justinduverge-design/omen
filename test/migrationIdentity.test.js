"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { execSync } = require("child_process");
const { Client } = require("pg");

test("Identity Unification Migration (1790735188136_identity-unification.js)", async () => {
  const rootClient = new Client({ connectionString: "postgres://postgres:password@localhost:5432/postgres" });
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

  const dbUrl = "postgres://postgres:password@localhost:5432/test_identity_migration";
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query("CREATE SCHEMA IF NOT EXISTS auth;");
    await client.query("CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);");
    await client.query("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT '00000000-0000-0000-0000-000000000000'::uuid $$ LANGUAGE SQL;");

    // Run baseline
    execSync(`DATABASE_URL=${dbUrl} ./node_modules/.bin/node-pg-migrate up 1 -m migrations`, { stdio: 'ignore' });

    // Insert mock data
    await client.query("INSERT INTO auth.users (id) VALUES ('11111111-1111-1111-1111-111111111111');");
    await client.query("INSERT INTO public.users (id, email, platform, league_id) VALUES ('11111111-1111-1111-1111-111111111111', 'valid@example.com', 'sleeper', '123');");

    // Orphan user (no auth.users record)
    await client.query("INSERT INTO public.users (id, email, platform, league_id) VALUES ('22222222-2222-2222-2222-222222222222', 'orphan@example.com', 'espn', '456');");
    await client.query("INSERT INTO public.consent_records (user_id, consent_type, granted) VALUES ('22222222-2222-2222-2222-222222222222', 'analytics', true);");

    // Run identity unification
    execSync(`DATABASE_URL=${dbUrl} ./node_modules/.bin/node-pg-migrate up 1 -m migrations`, { stdio: 'ignore' });

    const usersRes = await client.query("SELECT * FROM public.users");
    assert.equal(usersRes.rows.length, 1, "Only the valid user should remain");
    assert.equal(usersRes.rows[0].id, '11111111-1111-1111-1111-111111111111', "The valid user id should match");
    assert.ok(!('platform' in usersRes.rows[0]), "platform column should be dropped");
    assert.ok(!('league_id' in usersRes.rows[0]), "league_id column should be dropped");

    const consentRes = await client.query("SELECT * FROM public.consent_records");
    assert.equal(consentRes.rows.length, 0, "The orphan's consent record should be cascade deleted");

    // Test that the FK restricts inserting into public.users without auth.users
    await assert.rejects(
      async () => {
        await client.query("INSERT INTO public.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333', 'new@example.com');");
      },
      (err) => err.code === '23503', // foreign_key_violation
      "Should not allow inserting a public user without a corresponding auth user"
    );

  } finally {
    await client.end();
  }
});
