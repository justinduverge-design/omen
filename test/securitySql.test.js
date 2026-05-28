"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

test("Supabase Vault RPCs are service-role only", () => {
  const sql = readRepoFile("sql", "corvus_rls_security.sql");
  const vaultGrantLines = sql
    .split(/\r?\n/)
    .filter((line) => /grant execute on function public\.vault_/i.test(line));

  assert.ok(vaultGrantLines.length >= 4, "expected explicit Vault RPC grants");
  assert.ok(
    vaultGrantLines.every((line) => /\bto service_role\b/i.test(line)),
    "Vault RPCs should only be granted to service_role"
  );
  assert.ok(
    vaultGrantLines.every((line) => !/\bauthenticated\b/i.test(line)),
    "authenticated users must not execute Vault RPCs directly"
  );
});

test("platform_connections client grant excludes Vault secret identifiers", () => {
  const sql = readRepoFile("sql", "corvus_rls_security.sql");
  const grantMatch = sql.match(
    /grant select\s*\(([\s\S]*?)\)\s*on table public\.platform_connections to authenticated;/i
  );

  assert.ok(grantMatch, "expected a column-scoped platform_connections grant");
  const grantedColumns = grantMatch[1].toLowerCase();

  for (const secretColumn of [
    "token_secret_id",
    "refresh_secret_id",
    "espn_secret_id",
    "swid_secret_id",
  ]) {
    assert.equal(
      grantedColumns.includes(secretColumn),
      false,
      `${secretColumn} must not be client-readable`
    );
  }
});

test("schema includes backend-owned columns used by active routes and workers", () => {
  const sql = readRepoFile("sql", "corvus_rls_security.sql");

  for (const column of [
    "swid_secret_id",
    "scoring",
    "platform",
    "league_id",
    "eff",
    "result",
    "scored_at",
    "user_stars",
    "user_note",
    "push_token",
    "updated_at",
  ]) {
    assert.match(sql, new RegExp(`\\b${column}\\b`, "i"));
  }

  assert.match(sql, /create or replace function public\.vault_delete_secret/i);
});

test("waitlist_signups allows browser insert without exposing reads", () => {
  const sql = readRepoFile("sql", "corvus_rls_security.sql");
  const compactSql = sql.replace(/\s+/g, " ");

  assert.match(sql, /create table if not exists public\.waitlist_signups/i);
  assert.match(sql, /alter table public\.waitlist_signups\s+enable row level security/i);
  assert.match(compactSql, /create policy anon_insert on public\.waitlist_signups for insert to anon, authenticated with check \(true\);/i);
  assert.match(sql, /revoke all on table public\.waitlist_signups from anon, authenticated;/i);
  assert.match(sql, /grant insert \(email, platform\) on table public\.waitlist_signups to anon, authenticated;/i);
  assert.doesNotMatch(sql, /grant select .*waitlist_signups to anon/i);
});

test("subscriptions migration repairs Stripe date columns on existing tables", () => {
  const sql = readRepoFile("sql", "corvus_rls_security.sql");
  const compactSql = sql.replace(/\s+/g, " ");

  assert.match(compactSql, /alter table public\.subscriptions add column if not exists trial_ends_at timestamptz, add column if not exists current_period_end timestamptz;/i);
});

test("compliance evidence manifest points at current Corvus files", () => {
  const manifest = readRepoFile("probo.yaml");

  assert.match(manifest, /project:\s*"Corvus"/);
  assert.match(manifest, /sql\/corvus_rls_security\.sql/);
  assert.match(manifest, /src\/corvus_gdpr\.js/);
  assert.doesNotMatch(manifest, /ssffmvp_(rls_security|gdpr)\.js|ssffmvp_rls_security\.sql/);
});
