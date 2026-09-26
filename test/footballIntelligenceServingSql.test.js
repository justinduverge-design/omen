"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "2026-09-26_football_intelligence_serving_review.sql"), "utf8");
const compact = sql.replace(/\s+/g, " ");

test("football-intelligence serving SQL is review-only and compact", () => {
  assert.match(sql, /REVIEW ONLY/i);
  assert.match(sql, /Do not apply to Supabase until Justin approves/i);
  assert.match(sql, /create table if not exists public\.football_intelligence_signals/i);
  assert.doesNotMatch(sql, /play_by_play|canonical_facts|raw_bytes/i);
});

test("football-intelligence serving SQL permits one explicit published version per scope", () => {
  assert.match(sql, /publication_state in \('published', 'superseded', 'retracted'\)/i);
  assert.match(compact, /create unique index if not exists idx_football_intelligence_signals_one_published_scope on public\.football_intelligence_signals \(scope_key\) where publication_state = 'published'/i);
  assert.match(sql, /supersedes_id\s+uuid references public\.football_intelligence_signals\(id\)/i);
  assert.doesNotMatch(sql, /publication_state[^;]*candidate/i);
});

test("football-intelligence serving SQL grants authenticated published reads only", () => {
  assert.match(sql, /alter table public\.football_intelligence_signals enable row level security/i);
  assert.match(sql, /revoke all on table public\.football_intelligence_signals from anon, authenticated/i);
  assert.match(sql, /grant select on table public\.football_intelligence_signals to authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|all)[^;]*to authenticated/i);
  assert.match(compact, /create policy football_intelligence_signals_published_select on public\.football_intelligence_signals for select to authenticated using \(publication_state = 'published'\)/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.football_intelligence_signals to service_role/i);
});

test("football-intelligence serving SQL binds indexed scope and publication metadata to payload", () => {
  for (const fragment of [
    "payload ->> 'contract_version' = contract_version",
    "payload ->> 'status' = status",
    "payload #>> '{subject,team_id}' = team_id",
    "payload #>> '{publication,artifact_id}' = artifact_id",
  ]) assert.ok(compact.includes(fragment));
  assert.match(sql, /artifact_id ~ '\^sha256:\[0-9a-f\]\{64\}\$'/i);
  assert.match(sql, /receipt_id ~ '\^receipt:\[0-9a-f\]\{64\}\$'/i);
});
