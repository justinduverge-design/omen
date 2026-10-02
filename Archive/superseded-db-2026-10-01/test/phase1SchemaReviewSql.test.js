"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const REVIEW_SQL = path.join(root, "sql", "2026-06-12_phase1_adp_scoring_schema_review.sql");

function readReviewSql() {
  return fs.readFileSync(REVIEW_SQL, "utf8");
}

function compact(sql) {
  return sql.replace(/\s+/g, " ");
}

test("Phase 1 schema file is explicitly review-only", () => {
  const sql = readReviewSql();

  assert.match(sql, /REVIEW ONLY/i);
  assert.match(sql, /Do not apply to Supabase until Justin approves/i);
  assert.doesNotMatch(sql, /apply migration/i);
});

test("Phase 1 schema creates ADP source and player ranking tables", () => {
  const sql = readReviewSql();

  for (const table of ["adp_sources", "adp_player_rankings"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+enable row level security`, "i"));
    assert.match(sql, new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`, "i"));
  }

  assert.match(sql, /create unique index if not exists idx_adp_sources_scope/i);
  assert.match(sql, /create index if not exists idx_adp_player_rankings_board/i);
  assert.match(sql, /scoring_format in \('ppr', 'half_ppr', 'standard', 'custom'\)/i);
});

test("Phase 1 ADP tables are not exposed directly to browser roles", () => {
  const sql = readReviewSql();

  assert.match(sql, /revoke all on table public\.adp_sources from anon, authenticated;/i);
  assert.match(sql, /revoke all on table public\.adp_player_rankings from anon, authenticated;/i);
  assert.doesNotMatch(sql, /grant\s+[^;]*on table public\.adp_sources to anon/i);
  assert.doesNotMatch(sql, /grant\s+[^;]*on table public\.adp_player_rankings to anon/i);
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete)[^;]*on table public\.adp_/i);
});

test("Phase 1 schema creates per-league scoring config tables", () => {
  const sql = readReviewSql();

  for (const table of [
    "league_scoring_configs",
    "league_scoring_rules",
    "league_roster_slots",
    "league_scarcity_weights",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table}\\s+enable row level security`, "i"));
    assert.match(sql, new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`, "i"));
  }

  assert.match(sql, /create unique index if not exists idx_league_scoring_configs_user_league/i);
  assert.match(sql, /create unique index if not exists idx_league_scoring_rules_config_stat/i);
  assert.match(sql, /create unique index if not exists idx_league_roster_slots_config_slot/i);
  assert.match(sql, /create unique index if not exists idx_league_scarcity_weights_config_position/i);
});

test("per-league scoring config is user-readable and backend-writable only", () => {
  const sql = readReviewSql();
  const compactSql = compact(sql);

  assert.match(
    compactSql,
    /create policy league_scoring_configs_self_select on public\.league_scoring_configs for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\);/i
  );

  for (const table of [
    "league_scoring_configs",
    "league_scoring_rules",
    "league_roster_slots",
    "league_scarcity_weights",
  ]) {
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`, "i"));
    assert.match(sql, new RegExp(`grant select on table public\\.${table} to authenticated;`, "i"));
    assert.doesNotMatch(sql, new RegExp(`grant\\s+[^;]*(insert|update|delete)[^;]*on table public\\.${table} to authenticated`, "i"));
  }
});

test("child scoring tables inherit access through owned league config", () => {
  const compactSql = compact(readReviewSql());

  for (const [policy, table] of [
    ["league_scoring_rules_self_select", "league_scoring_rules"],
    ["league_roster_slots_self_select", "league_roster_slots"],
    ["league_scarcity_weights_self_select", "league_scarcity_weights"],
  ]) {
    assert.match(
      compactSql,
      new RegExp(
        `create policy ${policy} on public\\.${table} for select to authenticated using \\( exists \\( select 1 from public\\.league_scoring_configs cfg where cfg\\.id = ${table}\\.config_id and cfg\\.user_id = \\(select auth\\.uid\\(\\)\\) \\) \\);`,
        "i"
      )
    );
  }
});
