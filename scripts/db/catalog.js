#!/usr/bin/env node
"use strict";

/**
 * Catalog fingerprint of the `public` schema — the same read-only queries that were run against
 * production on 2026-10-01, so a scratch database can be compared with production exactly and two
 * scratch states (before an `up`, after its `down`) can be compared with each other.
 *
 * Usage:
 *   node scripts/db/catalog.js dump > state.json
 *   node scripts/db/catalog.js compare-production   # scratch snapshot vs production fixture
 *   node scripts/db/catalog.js diff a.json b.json   # exit 1 and print the difference if they differ
 *
 * Connection comes from the standard PG* environment variables. Never point this at production:
 * production is compared through the committed fixture, not by connecting to it.
 */

const fs = require("fs");
const path = require("path");

const FIXTURE = path.join(__dirname, "../../sql/2026-10-01-redo/production-catalog-2026-10-01.json");

const QUERIES = {
  columns: `select table_name k, string_agg(column_name || ':' || data_type || ':' || is_nullable
              || coalesce(':' || column_default, ''), ', ' order by ordinal_position) v
            from information_schema.columns where table_schema = 'public' group by table_name`,
  constraints: `select conrelid::regclass::text || '|' || conname || '|' || pg_get_constraintdef(oid) v
                from pg_constraint where connamespace = 'public'::regnamespace and contype <> 't'`,
  indexes: `select tablename || '|' || indexdef v from pg_indexes where schemaname = 'public'`,
  policies: `select tablename || '|' || policyname || '|' || cmd || '|' || roles::text || '|'
               || coalesce(qual, '') || '|' || coalesce(with_check, '') v
             from pg_policies where schemaname = 'public'`,
  acls: `select 'table|' || relname || '|' || coalesce(relacl::text, '') v from pg_class
           where relnamespace = 'public'::regnamespace and relkind in ('r', 'v')
         union all
         select 'func|' || proname || '(' || pg_get_function_identity_arguments(oid) || ')|' || coalesce(proacl::text, '')
           from pg_proc where pronamespace = 'public'::regnamespace`,
  rls: `select relname || '|' || relrowsecurity::text v from pg_class
          where relnamespace = 'public'::regnamespace and relkind = 'r'`,
  triggers: `select tgrelid::regclass::text || '|' || tgname || '|' || pg_get_triggerdef(oid) v
             from pg_trigger where not tgisinternal and tgrelid::regclass::text not like '%.%'`,
  functions: `select proname || '(' || pg_get_function_identity_arguments(oid) || ')|' || md5(pg_get_functiondef(oid)) v
              from pg_proc where pronamespace = 'public'::regnamespace`,
  views: `select viewname || '|' || md5(definition) v from pg_views where schemaname = 'public'`,
};

async function dump() {
  const { Client } = require("pg");
  const client = new Client();
  await client.connect();
  const out = {};
  for (const [name, sql] of Object.entries(QUERIES)) {
    const { rows } = await client.query(sql);
    if (name === "columns") {
      out.columns = Object.fromEntries(rows.map((r) => [r.k, r.v]).sort(([a], [b]) => a.localeCompare(b)));
    } else {
      out[name] = rows.map((r) => r.v).sort();
    }
  }
  await client.end();
  return out;
}

function diff(a, b) {
  const lines = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (key.startsWith("_")) continue;
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) || Array.isArray(right)) {
      const l = new Set(left || []);
      const r = new Set(right || []);
      for (const v of l) if (!r.has(v)) lines.push(`- ${key}: ${v}`);
      for (const v of r) if (!l.has(v)) lines.push(`+ ${key}: ${v}`);
    } else {
      for (const t of new Set([...Object.keys(left || {}), ...Object.keys(right || {})])) {
        if ((left || {})[t] !== (right || {})[t]) {
          lines.push(`- ${key}.${t}: ${(left || {})[t] ?? "(absent)"}`);
          lines.push(`+ ${key}.${t}: ${(right || {})[t] ?? "(absent)"}`);
        }
      }
    }
  }
  return lines;
}

/**
 * Content checksum of production's original tables, over production's original columns only, so a
 * step that adds a column can still prove it rewrote no existing value.
 */
async function dataChecksums() {
  const { Client } = require("pg");
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const client = new Client();
  await client.connect();
  const out = { data: [] };
  for (const [table, spec] of Object.entries(fixture.columns)) {
    const cols = spec.split(", ").map((c) => `"${c.split(":")[0]}"`).join(", ");
    const { rows } = await client.query(
      `select count(*)::int n, coalesce(md5(string_agg(r::text, '|' order by r::text)), '') h
         from (select ${cols} from public."${table}") r`
    );
    out.data.push(`${table}|${rows[0].n}|${rows[0].h}`);
  }
  const vault = await client.query(
    "select count(*)::int n, coalesce(md5(string_agg(id::text || secret, '|' order by id)), '') h from vault.secrets"
  );
  out.data.push(`vault.secrets|${vault.rows[0].n}|${vault.rows[0].h}`);
  await client.end();
  return out;
}

async function main() {
  const [mode, a, b] = process.argv.slice(2);
  if (mode === "dump") {
    process.stdout.write(`${JSON.stringify(await dump(), null, 2)}\n`);
    return;
  }
  if (mode === "data") {
    process.stdout.write(`${JSON.stringify(await dataChecksums(), null, 2)}\n`);
    return;
  }
  if (mode === "diff") {
    const lines = diff(JSON.parse(fs.readFileSync(a, "utf8")), JSON.parse(fs.readFileSync(b, "utf8")));
    if (lines.length) {
      console.error(lines.join("\n"));
      process.exit(1);
    }
    console.log("catalog: identical");
    return;
  }
  if (mode === "compare-production") {
    const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
    const live = await dump();
    // The fixture records the five families read from production; compare exactly those.
    const scoped = Object.fromEntries(["columns", "constraints", "indexes", "policies", "acls"].map((k) => [k, live[k]]));
    const lines = diff(fixture, scoped);
    if (lines.length) {
      console.error("scratch snapshot differs from production (- production, + scratch):");
      console.error(lines.join("\n"));
      process.exit(1);
    }
    console.log("catalog: scratch snapshot matches production (columns, constraints, indexes, policies, ACLs)");
    return;
  }
  console.error("usage: catalog.js dump | diff a.json b.json | compare-production");
  process.exit(2);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
