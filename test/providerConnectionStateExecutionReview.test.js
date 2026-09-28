"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sql = fs.readFileSync(
  path.join(__dirname, "..", "sql", "2026-09-28_provider_connection_state_review.sql"),
  "utf8",
);
const review = fs.readFileSync(
  path.join(__dirname, "..", "sql", "2026-09-28_provider_connection_state_execution_review.md"),
  "utf8",
);

test("provider-state execution review is read-only until explicit approval", () => {
  assert.match(review, /review artifact, not an execution instruction/i);
  assert.match(review, /current backup/i);
  assert.match(review, /Mandatory stop conditions/i);
  assert.match(review, /Postflight stop conditions/i);
  assert.match(review, /single reviewed\s+change/i);
});

test("provider-state execution review checks the real target and preserves grants", () => {
  assert.match(review, /public\.platform_connections/g);
  assert.match(review, /platform_connections_row_count/g);
  assert.match(review, /role_table_grants/g);
  assert.match(review, /service_role/g);
  assert.match(review, /non-nullable/i);
  assert.match(review, /row count must be unchanged/i);
  assert.match(sql, /revoke all on table public\.platform_connections from anon\s*;/i);
  assert.doesNotMatch(sql, /revoke all on table public\.platform_connections from anon, authenticated/i);
});

test("provider-state SQL remains additive and contains no row mutation", () => {
  assert.doesNotMatch(sql, /\b(insert|update|delete|truncate)\s+(into\s+)?public\.platform_connections\b/i);
  assert.match(sql, /alter table public\.platform_connections\s+add column if not exists/i);
});
