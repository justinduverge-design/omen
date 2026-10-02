"use strict";

// Security and schema facts about PRODUCTION, checked against the read-only catalog read of production
// (`sql/2026-10-01-redo/production-catalog-2026-10-01.json`), not against a hand-written setup script.
//
// Until 2026-10-01 these tests read `sql/omen_rls_security.sql`, which did not match production: they
// asserted that `moves.result`, `moves.scored_at` and `users.updated_at` existed, and passed for months
// while production had none of them (`Direction/2026-10-01-league-connections-review.md`, finding 10).
// When production changes, refresh the fixture from a new read-only catalog read; these tests then say
// exactly what changed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "sql", "2026-10-01-redo", "production-catalog-2026-10-01.json"), "utf8"));

function columns(table) {
  const spec = catalog.columns[table];
  assert.ok(spec, `production has no table ${table}`);
  return spec.split(", ").map((c) => c.split(":")[0]);
}

function acl(kind, name) {
  const row = catalog.acls.find((a) => a.startsWith(`${kind}|${name}`));
  assert.ok(row, `no ACL recorded for ${kind} ${name}`);
  return row.split("|").pop();
}

test("Supabase Vault RPCs are executable by service_role only", () => {
  const vault = catalog.acls.filter((a) => a.startsWith("func|vault_"));
  assert.equal(vault.length, 4);
  for (const row of vault) {
    assert.match(row, /service_role=X/);
    assert.doesNotMatch(row, /\b(anon|authenticated)=/, row);
  }
});

test("clients have no access to provider connections, so Vault ids are never client-readable", () => {
  assert.doesNotMatch(acl("table", "platform_connections"), /\b(anon|authenticated)=/);
});

test("anon has no table privileges anywhere; authenticated only on users, moves, consent_records", () => {
  for (const row of catalog.acls.filter((a) => a.startsWith("table|"))) {
    assert.doesNotMatch(row, /\banon=/, row);
    const table = row.split("|")[1];
    if (/\bauthenticated=/.test(row)) {
      assert.ok(["users", "moves", "consent_records"].includes(table), `unexpected client grant on ${table}`);
    }
  }
});

test("waitlist_signups is written only through the server", () => {
  assert.doesNotMatch(acl("table", "waitlist_signups"), /\b(anon|authenticated)=/);
  assert.equal(catalog.policies.filter((p) => p.startsWith("waitlist_signups|")).length, 0);
});

test("Stripe objects are gone", () => {
  assert.equal(catalog.columns.subscriptions, undefined);
  assert.equal(columns("users").includes("is_subscribed"), false);
});

test("columns the server reads exist in production", () => {
  for (const column of ["swid_secret_id", "espn_team_id", "is_selected", "platform_user_id"]) {
    assert.ok(columns("platform_connections").includes(column), `platform_connections.${column}`);
  }
  for (const column of ["scoring", "platform", "league_id", "eff", "user_stars", "user_note", "reconciliation_state"]) {
    assert.ok(columns("moves").includes(column), `moves.${column}`);
  }
  assert.ok(columns("profiles").includes("favorite_team"));
});

test("known gaps: columns the server still references that production does not have", () => {
  // Each one is a live defect, recorded in the 2026-10-01 review. When a redo step adds one, or a code
  // change stops referencing it, update this list and the fixture together.
  assert.equal(columns("moves").includes("result"), false, "moves.result now exists: update the review and this test");
  assert.equal(columns("moves").includes("scored_at"), false, "moves.scored_at now exists: update the review and this test");
  assert.equal(columns("users").includes("updated_at"), false, "users.updated_at now exists (step 01?): update this test");
  assert.equal(catalog.columns.league_follows, undefined, "league_follows now exists: update this test");
  assert.equal(catalog.columns.beta_reports, undefined, "beta_reports now exists: update this test");
});

test("moves feedback upsert has its unique key (one row per user per week: the flaw step 05 replaces)", () => {
  assert.ok(catalog.indexes.some((i) => /idx_moves_user_week_unique ON public\.moves USING btree \(user_id, week_num, season\)/.test(i)));
});

test("compliance evidence manifest points at current Omen files", () => {
  const manifest = fs.readFileSync(path.join(root, "probo.yaml"), "utf8");
  assert.match(manifest, /project:\s*"Omen"/);
  assert.match(manifest, /sql\/2026-10-01-redo\/00b_production_schema_snapshot\.sql/);
  assert.match(manifest, /src\/routes\/userPrivacy\.js/);
  assert.doesNotMatch(manifest, /sql\/omen_rls_security\.sql/);
  assert.doesNotMatch(manifest, /src\/omen_gdpr\.js/);
  assert.doesNotMatch(manifest, /ssffmvp_(rls_security|gdpr)\.js|ssffmvp_rls_security\.sql/);
});
