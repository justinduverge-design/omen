"use strict";

// In-memory stand-in for the Supabase client, scoped to `saved_trades`. It enforces the parts of
// `sql/2026-10-01-redo/12_saved_trades.up.sql` the server relies on: the unique key, the
// trade/side checks, saved -> sent once, outcome only after sent, and the update trigger that
// keeps scope, trade and reasoning fixed. Not a test file: it has no tests of its own.

const UNIQUE = ["user_id", "provider", "provider_league_id", "season", "week", "candidate_id"];
const FIXED = ["user_id", "provider", "provider_league_id", "season", "week", "provider_team_id",
  "candidate_id", "trade", "reasoning", "saved_at"];

function sideOk(side) {
  const named = (p) => p && typeof p === "object" && !Array.isArray(p) && String(p.player_key ?? p.player_id ?? "") !== "";
  if (Array.isArray(side)) return side.length > 0 && side.every(named);
  return named(side);
}

function checkRow(row) {
  if (!["sleeper", "espn", "yahoo"].includes(row.provider)) return "provider check";
  if (!row.provider_league_id || row.provider_league_id === row.provider) return "provider_league_id check";
  if (!Number.isInteger(row.season) || row.season < 2000 || row.season > 2100) return "season check";
  if (!Number.isInteger(row.week) || row.week < 1 || row.week > 22) return "week check";
  if (!row.provider_team_id) return "provider_team_id check";
  if (!row.candidate_id || row.candidate_id.length > 200) return "candidate_id check";
  const t = row.trade;
  if (!t || typeof t !== "object" || Array.isArray(t) || !sideOk(t.give) || !sideOk(t.receive) || !t.opponent_team_id) {
    return "trade check";
  }
  if (!row.reasoning || typeof row.reasoning !== "object" || Array.isArray(row.reasoning)) return "reasoning check";
  if (!["saved", "sent"].includes(row.state)) return "state check";
  if ((row.state === "sent") !== (row.sent_at != null)) return "saved_trades_sent_at";
  if (row.outcome != null && row.state !== "sent") return "saved_trades_outcome_after_sent";
  if ((row.outcome == null) !== (row.outcome_at == null) || (row.outcome == null) !== (row.outcome_provenance == null)) {
    return "saved_trades_outcome_fields";
  }
  return null;
}

function project(row, columns) {
  if (!columns || columns === "*") return { ...row };
  const out = {};
  for (const c of columns.split(",")) out[c.trim()] = row[c.trim()];
  return out;
}

class Query {
  constructor(db, op, payload, options) {
    this.db = db;
    this.op = op;
    this.payload = payload;
    this.options = options || {};
    this.filters = [];
    this.columns = null;
    this.returning = op === "select";
    this.limitN = null;
    this.orderBy = null;
  }

  select(columns) { this.columns = columns; this.returning = true; return this; }
  eq(field, value) { this.filters.push([field, value]); return this; }
  order(field, { ascending = true } = {}) { this.orderBy = { field, ascending }; return this; }
  limit(n) { this.limitN = n; return this; }

  matches(row) { return this.filters.every(([f, v]) => row[f] === v); }

  run() {
    const db = this.db;
    db.calls.push({ op: this.op, filters: this.filters.slice(), payload: this.payload, options: this.options });
    if (db.failWith) return { data: null, error: db.failWith };
    let out = [];
    if (this.op === "select") {
      out = db.rows.filter((r) => this.matches(r));
      if (this.orderBy) {
        const { field, ascending } = this.orderBy;
        out = out.slice().sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (ascending ? 1 : -1));
      }
      if (this.limitN != null) out = out.slice(0, this.limitN);
    } else if (this.op === "upsert") {
      const row = { state: "saved", outcome: null, outcome_provenance: null, sent_at: null, outcome_at: null,
        saved_at: db.now(), ...this.payload };
      const bad = checkRow(row);
      if (bad) return { data: null, error: { code: "23514", message: `violates check constraint ${bad}` } };
      if (!db.userIds.has(row.user_id)) return { data: null, error: { code: "23503", message: "violates foreign key users" } };
      const dup = db.rows.find((r) => UNIQUE.every((k) => r[k] === row[k]));
      if (dup) {
        if (!this.options.ignoreDuplicates) return { data: null, error: { code: "23505", message: "duplicate key" } };
      } else {
        db.rows.push(row);
        out = [row];
      }
    } else if (this.op === "update") {
      for (const r of db.rows.filter((x) => this.matches(x))) {
        const next = { ...r, ...this.payload };
        if (FIXED.some((k) => JSON.stringify(next[k]) !== JSON.stringify(r[k]))) {
          return { data: null, error: { code: "42501", message: "scope, trade and reasoning never change" } };
        }
        if (r.state === "sent" && (next.state !== "sent" || next.sent_at !== r.sent_at)) {
          return { data: null, error: { code: "42501", message: "a sent trade stays sent" } };
        }
        const bad = checkRow(next);
        if (bad) return { data: null, error: { code: "23514", message: `violates check constraint ${bad}` } };
        Object.assign(r, this.payload);
        out.push(r);
      }
    } else if (this.op === "delete") {
      out = db.rows.filter((r) => this.matches(r));
      db.rows = db.rows.filter((r) => !this.matches(r));
    }
    return { data: this.returning ? out.map((r) => project(r, this.columns)) : null, error: null };
  }

  then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }
}

function createFakeSavedTradesSupabase({ userIds = ["user-1", "user-2"], now = () => new Date().toISOString() } = {}) {
  const db = { rows: [], calls: [], failWith: null, userIds: new Set(userIds), now };
  return {
    db,
    from(table) {
      if (table !== "saved_trades") throw new Error(`fake only knows saved_trades, got ${table}`);
      return {
        select: (columns) => new Query(db, "select").select(columns),
        upsert: (payload, options) => new Query(db, "upsert", payload, options),
        update: (payload) => new Query(db, "update", payload),
        delete: () => new Query(db, "delete"),
      };
    },
  };
}

module.exports = { createFakeSavedTradesSupabase };
