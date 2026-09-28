"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sqlPath = path.join(__dirname, "..", "sql", "2026-09-28_provider_connection_state_review.sql");

test("provider connection state SQL is explicitly review-only", () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /REVIEW ONLY/i);
  assert.match(sql, /do not apply to Supabase until Justin approves/i);
});

test("provider state review SQL is additive and bounded", () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  for (const column of [
    "connection_state", "connection_reason_code", "credential_generation",
    "consecutive_failures", "last_status", "last_checked_at", "state_changed_at",
  ]) {
    assert.match(sql, new RegExp(`add column if not exists ${column}`, "i"));
  }
  assert.match(sql, /if not exists \(select 1 from pg_constraint[\s\S]*connection_state_check[\s\S]*temporarily_unavailable/i);
  assert.match(sql, /credential_generation_check[\s\S]*>= 0/i);
  assert.match(sql, /consecutive_failures_check[\s\S]*>= 0/i);
  assert.match(sql, /last_status_check[\s\S]*between 100 and 599/i);
  assert.match(sql, /create index if not exists idx_platform_connections_health_state/i);
});

test("provider state review SQL does not expose secrets to browser roles", () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /revoke all on table public\.platform_connections from anon, authenticated/i);
  assert.doesNotMatch(sql, /grant select on table public\.platform_connections to authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.platform_connections to service_role/i);
});

test("provider state rollback review is fail-closed and documents the destructive gate", () => {
  const rollbackPath = path.join(__dirname, "..", "sql", "2026-09-28_provider_connection_state_rollback_review.md");
  const rollback = fs.readFileSync(rollbackPath, "utf8");
  assert.match(rollback, /review artifact, not an execution instruction/i);
  assert.match(rollback, /current backup/i);
  assert.match(rollback, /drop column if exists connection_state/i);
  assert.match(rollback, /rollback; -- replace with commit/i);
});
