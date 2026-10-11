"use strict";

/**
 * The Ledger on the redo's tables (sql/2026-10-01-redo/05_ledger.up.sql): the write path from
 * POST /api/omen/mvp-move and /feedback, the moves-history.v2 and move-detail.v1 read paths, and
 * Tuesday scoring into decision_outcomes.
 *
 * The fake database below enforces the parts of step 05 these paths depend on: one first call per
 * team-week, a call superseded at most once, the league-membership check, append-only decisions,
 * a final outcome that cannot change, and the ledger_current_calls view.
 */

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const test = require("node:test");
const express = require("express");

// --- Fake database -------------------------------------------------------------------------------

const USER = "00000000-0000-4000-8000-0000000000a1";
const OTHER_USER = "00000000-0000-4000-8000-0000000000b2";
const LEAGUE = "00000000-0000-4000-8000-00000000c001";
const OTHER_LEAGUE = "00000000-0000-4000-8000-00000000c002";

function createFakeDb(seed = {}) {
  const tables = {
    leagues: [], league_memberships: [], decisions: [], decision_factors: [],
    decision_actions: [], decision_outcomes: [], moves: [],
    ...JSON.parse(JSON.stringify(seed)),
  };
  const calls = [];
  const hooks = {};
  let counter = 0;
  const nextId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

  function rowsOf(table) {
    if (table === "ledger_current_calls") {
      const superseded = new Set(tables.decisions.map((row) => row.supersedes_id).filter(Boolean));
      return tables.decisions.filter((row) => !superseded.has(row.id));
    }
    if (!tables[table]) throw new Error(`unexpected table ${table}`);
    return tables[table];
  }

  function checkInsert(table, row) {
    if (table === "decisions") {
      if (row.call_type !== "legacy" && !tables.league_memberships.some((m) => m.user_id === row.user_id && m.league_id === row.league_id)) {
        return { code: "23514", message: "decisions: user does not follow this league" };
      }
      const sameWeek = (other) => other.user_id === row.user_id && other.league_id === row.league_id
        && (other.provider_team_id || "") === (row.provider_team_id || "") && other.season === row.season && other.week === row.week;
      if (!row.supersedes_id && tables.decisions.some((other) => !other.supersedes_id && sameWeek(other))) {
        return { code: "23505", message: "duplicate key value violates unique constraint \"decisions_one_first_call_per_team_week\"" };
      }
      if (row.supersedes_id && tables.decisions.some((other) => other.supersedes_id === row.supersedes_id)) {
        return { code: "23505", message: "duplicate key value violates unique constraint \"decisions_superseded_once\"" };
      }
      if (row.band == null && !row.band_unavailable_reason) return { code: "23514", message: "decisions_band_or_reason" };
      if (!row.headline) return { code: "23514", message: "headline" };
    }
    if (table === "decision_factors") {
      if (row.evidence_kind === "limitation" && !row.reason_code) return { code: "23514", message: "decision_factors_unread_has_reason" };
      if (!row.used && row.contribution_points != null) return { code: "23514", message: "contribution_only_if_used" };
    }
    if (table === "decision_outcomes" && tables.decision_outcomes.some((other) => other.decision_id === row.decision_id)) {
      return { code: "23505", message: "duplicate key value violates unique constraint \"decision_outcomes_pkey\"" };
    }
    return null;
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.op = "select";
      this.filters = [];
      this.orderBy = null;
      this.limitValue = null;
    }

    select(columns) { this.columns = columns; return this; }
    eq(field, value) { this.filters.push({ field, op: "eq", value }); return this; }
    in(field, values) { this.filters.push({ field, op: "in", value: values }); return this; }
    lt(field, value) { this.filters.push({ field, op: "lt", value }); return this; }
    order(field, options = {}) { this.orderBy = { field, ascending: options.ascending !== false }; return this; }
    limit(value) { this.limitValue = value; return this; }
    insert(payload) { this.op = "insert"; this.payload = payload; return this; }
    upsert(payload, options = {}) { this.op = "upsert"; this.payload = payload; this.options = options; return this; }
    update(payload) { this.op = "update"; this.payload = payload; return this; }

    matches(row) {
      return this.filters.every(({ field, op, value }) => {
        if (op === "eq") return row[field] === value;
        if (op === "in") return value.includes(row[field]);
        return row[field] < value;
      });
    }

    async run() {
      calls.push({ table: this.table, op: this.op, filters: this.filters.map(({ field, op, value }) => ({ field, op, value })) });
      const hook = hooks[`${this.table}.${this.op}`];
      if (hook) {
        const injected = hook(this);
        if (injected) return injected;
      }

      if (this.op === "select") {
        let rows = rowsOf(this.table).filter((row) => this.matches(row));
        if (this.orderBy) {
          const { field, ascending } = this.orderBy;
          rows = [...rows].sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (ascending ? 1 : -1));
        }
        if (this.limitValue != null) rows = rows.slice(0, this.limitValue);
        return { data: rows.map((row) => ({ ...row })), error: null };
      }

      if (this.op === "insert") {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload];
        const store = rowsOf(this.table);
        const prepared = [];
        for (const raw of list) {
          const row = { ...raw };
          if (this.table !== "decision_outcomes" && this.table !== "decision_actions") row.id ||= nextId();
          if (this.table === "decisions") row.issued_at ||= new Date(Date.now() + counter).toISOString();
          const error = checkInsert(this.table, row);
          if (error) return { data: null, error };
          prepared.push(row);
        }
        store.push(...prepared);
        return { data: prepared.map((row) => ({ ...row })), error: null };
      }

      if (this.op === "upsert") {
        const store = rowsOf(this.table);
        const keys = String(this.options.onConflict || "id").split(",");
        const row = { ...this.payload };
        const index = store.findIndex((other) => keys.every((key) => other[key] === row[key]));
        if (index >= 0) store[index] = { ...store[index], ...row };
        else store.push({ id: nextId(), ...row });
        return { data: [{ ...store[index >= 0 ? index : store.length - 1] }], error: null };
      }

      if (this.op === "update") {
        if (this.table === "decisions" || this.table === "decision_factors") {
          return { data: null, error: { code: "42501", message: `${this.table} is append-only` } };
        }
        const targets = rowsOf(this.table).filter((row) => this.matches(row));
        if (this.table === "decision_outcomes" && targets.some((row) => row.state !== "data_incomplete")) {
          return { data: null, error: { code: "42501", message: "decision_outcomes: outcome is final" } };
        }
        for (const row of targets) Object.assign(row, this.payload);
        return { data: targets.map((row) => ({ ...row })), error: null };
      }
      throw new Error(`unsupported op ${this.op}`);
    }

    then(resolve, reject) { return this.run().then(resolve, reject); }

    async maybeSingle() {
      const result = await this.run();
      if (result.error) return result;
      return { data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data, error: null };
    }

    async single() {
      const result = await this.maybeSingle();
      if (!result.error && !result.data) return { data: null, error: { code: "PGRST116", message: "no rows" } };
      return result;
    }
  }

  return { client: { from: (table) => new Query(table) }, tables, calls, hooks, nextId };
}

function seedLeague(extra = {}) {
  return {
    leagues: [
      { id: LEAGUE, provider: "yahoo", provider_league_id: "414.l.12345", season: 2026 },
      { id: OTHER_LEAGUE, provider: "espn", provider_league_id: "22222", season: 2026 },
    ],
    league_memberships: [
      { user_id: USER, league_id: LEAGUE, provider_team_id: "414.l.12345.t.7", is_followed: true },
      { user_id: USER, league_id: OTHER_LEAGUE, provider_team_id: "7", is_followed: true },
    ],
    ...extra,
  };
}

function liveCall(overrides = {}) {
  const body = {
    contract_version: "2026-05-18.omen-live.v1",
    state: "success",
    feature: "omen_mvp_move",
    mode: "live",
    request_id: "omen_req_test",
    generated_at: "2026-10-01T15:00:00.000Z",
    platform: { name: "yahoo", status: "connected", recovery: null },
    league: { id: "414.l.12345", name: null, season: 2026, week: 4, scoring_format: "ppr" },
    team: { id: "414.l.12345.t.7", name: null },
    signals: {
      roster: { status: "live", used: true, source: "yahoo_roster", message: "Roster imported." },
      projections: { status: "live", used: true, source: "yahoo_projections", message: "Yahoo projections were read." },
      waivers: { status: "unavailable", used: false, source: "yahoo_waivers", message: "Waiver context is not available." },
    },
    recommendation: {
      id: "live_omen_start_sit_bench-1",
      type: "start_sit",
      title: "Start Bench Breakout over Starter Wideout",
      move: "Move Bench Breakout into your WR slot and bench Starter Wideout.",
      primary_player: { id: "bench-1", name: "Bench Breakout", position: "WR", team: "PHI" },
      comparison_player: { id: "starter-1", name: "Starter Wideout", position: "WR", team: "DAL" },
      expected_value_delta: { points: 4, label: "meaningful" },
      confidence: { score: 82, label: "medium_high", rationale: "Live edge." },
      risk: { level: "low", reasons: ["Live route test."] },
      explanation: { summary: "Start Bench Breakout.", data_used: ["Yahoo roster"] },
      scoring: {
        format: "ppr", contract_required: true, contract_version: "scoring-contract.v1",
        contract_hash: "sha256:abc", provider_rule_snapshot_hash: "sha256:def",
        coverage_state: "supported", reconciliation_state: "pending",
      },
    },
    alternatives: [],
    warnings: [],
  };
  return { ...body, ...overrides };
}

const ledger = require("../src/services/ledger");

// --- Write path: the service ---------------------------------------------------------------------

test("an issued call writes one decisions row and its evidence lines", async () => {
  const db = createFakeDb(seedLeague());
  const result = await ledger.recordDecision(db.client, { userId: USER, response: liveCall() });

  assert.equal(result.written, true);
  assert.equal(db.tables.decisions.length, 1);
  const decision = db.tables.decisions[0];
  assert.equal(decision.user_id, USER);
  assert.equal(decision.league_id, LEAGUE);
  assert.equal(decision.provider_team_id, "414.l.12345.t.7");
  assert.equal(decision.season, 2026);
  assert.equal(decision.week, 4);
  assert.equal(decision.call_type, "start_sit");
  assert.equal(decision.headline, "Start Bench Breakout over Starter Wideout");
  assert.equal(decision.band, "confident");
  assert.deepEqual(decision.band_drivers, ["Live edge."]);
  assert.equal(decision.band_unavailable_reason, null);
  assert.equal(decision.internal_score, 82);
  assert.equal(decision.risk_level, "low");
  assert.equal(decision.expected_value_delta, 4);
  assert.equal(decision.supersedes_id, null);
  assert.equal(decision.scoring_format, "ppr");
  assert.equal(decision.scoring_contract_version, "scoring-contract.v1");
  assert.equal(decision.scoring_coverage_state, "supported");
  assert.equal(decision.issued_at, "2026-10-01T15:00:00.000Z");
  assert.equal(decision.recommendation.id, "live_omen_start_sit_bench-1");
  assert.equal(decision.primary_player_id, null, "no guessed canonical player id against the FK");

  const factors = db.tables.decision_factors;
  assert.deepEqual(factors.map((factor) => factor.factor_key), ["projections", "roster", "waivers"]);
  assert.ok(factors.every((factor) => factor.decision_id === decision.id && factor.user_id === USER));
  assert.deepEqual(factors.map((factor) => factor.position), [0, 1, 2]);
  const projection = factors.find((factor) => factor.factor_key === "projections");
  assert.equal(projection.evidence_kind, "projection");
  assert.equal(projection.line_label, "projected");
  const waivers = factors.find((factor) => factor.factor_key === "waivers");
  assert.equal(waivers.evidence_kind, "limitation");
  assert.equal(waivers.used, false);
  assert.ok(waivers.reason_code, "a limitation always says why");
});

test("a call without a confidence value records why there is no band instead of inventing one", async () => {
  const db = createFakeDb(seedLeague());
  const response = liveCall();
  delete response.recommendation.confidence;
  await ledger.recordDecision(db.client, { userId: USER, response });
  const decision = db.tables.decisions[0];
  assert.equal(decision.band, null);
  assert.deepEqual(decision.band_drivers, []);
  assert.match(decision.band_unavailable_reason, /Waiver context is not available/);
  assert.equal(decision.internal_score, null);
});

test("a refresh that produces the same call writes nothing new", async () => {
  const db = createFakeDb(seedLeague());
  const first = await ledger.recordDecision(db.client, { userId: USER, response: liveCall() });
  const again = await ledger.recordDecision(db.client, {
    userId: USER,
    response: liveCall({ request_id: "omen_req_refresh", generated_at: "2026-10-01T15:05:00.000Z" }),
  });

  assert.equal(again.written, false);
  assert.equal(again.reason, "unchanged");
  assert.equal(again.decision_id, first.decision_id);
  assert.equal(db.tables.decisions.length, 1);
  assert.equal(db.tables.decision_factors.length, 3);
});

test("a different call for the same team-week supersedes the earlier one, which stays", async () => {
  const db = createFakeDb(seedLeague());
  const first = await ledger.recordDecision(db.client, { userId: USER, response: liveCall() });
  const changed = liveCall();
  changed.recommendation = { ...changed.recommendation, id: "live_omen_start_sit_other", title: "Start Other Guy over Starter Wideout" };
  const second = await ledger.recordDecision(db.client, { userId: USER, response: changed });

  assert.equal(second.written, true);
  assert.equal(second.supersedes_id, first.decision_id);
  assert.equal(db.tables.decisions.length, 2);

  // A third, again different, supersedes the second — one straight chain.
  const third = liveCall();
  third.recommendation = { ...third.recommendation, id: "live_omen_start_sit_third", title: "Start Third Guy over Starter Wideout" };
  const result = await ledger.recordDecision(db.client, { userId: USER, response: third });
  assert.equal(result.supersedes_id, second.decision_id);
});

test("a concurrent first call is resolved by superseding the winner, not by failing", async () => {
  const db = createFakeDb(seedLeague());
  let raced = false;
  db.hooks["decisions.insert"] = (query) => {
    if (raced) return null;
    raced = true;
    // Another request's first call lands between this request's chain read and its insert.
    db.tables.decisions.push({
      id: db.nextId(), user_id: USER, league_id: LEAGUE, provider_team_id: "414.l.12345.t.7", season: 2026, week: 4,
      call_type: "start_sit", headline: "Racing call", band: "leaning", recommendation: { id: "racer" },
      supersedes_id: null, issued_at: "2026-10-01T14:59:00.000Z",
    });
    return query.payload.supersedes_id ? null : { data: null, error: { code: "23505", message: "duplicate" } };
  };
  const result = await ledger.recordDecision(db.client, { userId: USER, response: liveCall() });
  assert.equal(result.written, true);
  assert.equal(result.supersedes_id, db.tables.decisions[0].id);
});

test("calls for leagues Omen cannot attribute are skipped, never written to the wrong league", async () => {
  const unregistered = createFakeDb({ leagues: [], league_memberships: [] });
  assert.deepEqual(
    await ledger.recordDecision(unregistered.client, { userId: USER, response: liveCall() }),
    { written: false, reason: "league_not_registered" }
  );

  const notFollowed = createFakeDb({ ...seedLeague(), league_memberships: [] });
  assert.deepEqual(
    await ledger.recordDecision(notFollowed.client, { userId: USER, response: liveCall() }),
    { written: false, reason: "league_not_followed" }
  );
  assert.equal(notFollowed.tables.decisions.length, 0);

  const mock = createFakeDb(seedLeague());
  assert.equal((await ledger.recordDecision(mock.client, { userId: USER, response: liveCall({ mode: "mock" }) })).reason, "not_live");
  assert.equal((await ledger.recordDecision(mock.client, { userId: USER, response: liveCall({ state: "empty", recommendation: null }) })).reason, "no_call");
  assert.equal(mock.tables.decisions.length, 0);
});

test("recordDecisionSafely logs a stage and code only, and never throws", async () => {
  const db = createFakeDb(seedLeague());
  db.hooks["decisions.insert"] = () => ({ data: null, error: { code: "XX000", message: `boom for ${USER} in 414.l.12345` } });
  const logs = [];
  const log = { info: (message, meta) => logs.push({ message, meta }), warn: (message, meta) => logs.push({ message, meta }) };
  const result = await ledger.recordDecisionSafely(db.client, { userId: USER, response: liveCall() }, { log });
  assert.deepEqual(result, { written: false, reason: "write_failed" });
  assert.equal(logs.length, 1);
  assert.deepEqual(logs[0].meta, { stage: "decision_insert", code: "XX000" });
  assert.equal(JSON.stringify(logs).includes(USER), false);
  assert.equal(JSON.stringify(logs).includes("414.l.12345"), false);
});

// --- Write path: the routes ----------------------------------------------------------------------

function loadOmenRouter({ db, liveResponse = liveCall, logs = [] }) {
  const routePath = require.resolve("../src/routes/omen");
  delete require.cache[routePath];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => db.client };
      if (request === "../middleware/auth") {
        return { requireAuth: (req, _res, next) => { req.user = { id: USER, email: "user@example.com" }; next(); } };
      }
      if (request === "../middleware/logging") {
        const record = (level) => (message, meta) => logs.push({ level, message, meta });
        return { logger: { info: record("info"), warn: record("warn"), error: record("error") } };
      }
      if (request === "../services/appUser") return { ensureAppUser: async () => {} };
      if (request === "../services/omen") {
        return {
          authenticateOmenRequest: async () => ({ id: USER }),
          authRequiredMvpResponse: () => ({ status: 401, body: { state: "error" } }),
          offSeasonMvpResponse: () => ({ status: 200, body: { state: "off_season" } }),
          buildLiveOmenMvpMoveForUser: async () => ({ status: 200, body: liveResponse() }),
          buildOmenMvpMoveResponse: () => ({ status: 200, body: liveCall({ mode: "mock" }) }),
        };
      }
      if (request === "../services/scoringSnapshotResolver") {
        return {
          pendingMetadata: () => ({ coverage_state: "pending", reconciliation_state: "pending", contract_required: true }),
          resolveScoringPersistenceMetadata: async () => ({
            format: "ppr", legacy_label: "PPR", contract_required: true, contract_version: "scoring-contract.v1",
            contract_hash: "sha256:abc", provider_rule_snapshot_hash: "sha256:def",
            coverage_state: "supported", reconciliation_state: "pending",
          }),
        };
      }
      if (request === "../services/scheduleTravelCapabilities") {
        return { resolveScheduleTravelCapabilities: async () => ({}) };
      }
      if (request === "../services/mvpEvidenceEnrichment") {
        return {
          resolveMvpDvpContext: async () => null, applyDvpContext: () => false,
          generateMvpLlmNarration: async () => null, applyMvpLlmNarration: () => false,
        };
      }
      if (request === "../services/nflSchedule") return { suppressLiveFootballData: () => false, isOffSeason: () => false };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("../src/routes/omen");
  } finally {
    Module._load = originalLoad;
  }
}

function serve(router, mount) {
  const app = express();
  app.use(express.json());
  app.use(mount, router);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  return app;
}

async function call(app, path, { method = "GET", body } = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { "content-type": "application/json", authorization: "Bearer valid-token" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("POST /api/omen/mvp-move records the served call once, and a refresh does not duplicate it", async () => {
  const db = createFakeDb(seedLeague());
  const app = serve(loadOmenRouter({ db }), "/api/omen");

  const first = await call(app, "/api/omen/mvp-move", { method: "POST", body: { contract_version: "omen-decision-brief.v3" } });
  assert.equal(first.status, 200);
  assert.equal(first.body.state, "success");
  assert.equal(db.tables.decisions.length, 1);
  const decision = db.tables.decisions[0];
  assert.equal(decision.contract_version, "omen-decision-brief.v3");
  assert.equal(decision.recommendation.confidence.band, "confident", "the recommendation is stored as served (banded)");
  assert.equal(decision.scoring_contract_hash, "sha256:abc");
  assert.ok(db.tables.decision_factors.length > 0);

  const refresh = await call(app, "/api/omen/mvp-move", { method: "POST", body: { contract_version: "omen-decision-brief.v3" } });
  assert.equal(refresh.status, 200);
  assert.equal(db.tables.decisions.length, 1);
});

test("a Ledger write failure never costs the user their recommendation, and logs no user data", async () => {
  const db = createFakeDb(seedLeague());
  db.hooks["decisions.insert"] = () => ({ data: null, error: { code: "57014", message: `timeout for ${USER}` } });
  const logs = [];
  const app = serve(loadOmenRouter({ db, logs }), "/api/omen");

  const response = await call(app, "/api/omen/mvp-move", { method: "POST", body: {} });
  assert.equal(response.status, 200);
  assert.equal(response.body.state, "success");
  assert.equal(response.body.recommendation.title, "Start Bench Breakout over Starter Wideout");
  const failure = logs.find((entry) => entry.message === "Ledger call write failed");
  assert.deepEqual(failure?.meta, { stage: "decision_insert", code: "57014" });
  assert.equal(JSON.stringify(logs).includes(USER), false);
});

test("a Ledger table that cannot be read at all still leaves the response intact", async () => {
  const db = createFakeDb(seedLeague());
  db.hooks["leagues.select"] = () => { throw new Error("socket hang up"); };
  const app = serve(loadOmenRouter({ db }), "/api/omen");
  const response = await call(app, "/api/omen/mvp-move", { method: "POST", body: {} });
  assert.equal(response.status, 200);
  assert.equal(response.body.state, "success");
});

test("POST /api/omen/feedback records the person's action against that week's current call", async () => {
  const db = createFakeDb(seedLeague());
  await ledger.recordDecision(db.client, { userId: USER, response: liveCall() });
  const app = serve(loadOmenRouter({ db }), "/api/omen");

  const response = await call(app, "/api/omen/feedback", {
    method: "POST", body: { season: 2026, week: 4, followed: true, stars: 4, note: "Worked out" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.recorded, true);
  assert.equal(db.tables.decision_actions.length, 1);
  const action = db.tables.decision_actions[0];
  assert.equal(action.decision_id, db.tables.decisions[0].id);
  assert.equal(action.user_id, USER);
  assert.equal(action.followed, true);
  assert.equal(action.stars, 4);
  assert.equal(action.note, "Worked out");
  assert.equal(action.provenance, "self_reported");

  // Changing the answer updates the one row (decision_actions is the Ledger's only mutable table).
  await call(app, "/api/omen/feedback", { method: "POST", body: { season: 2026, week: 4, followed: false } });
  assert.equal(db.tables.decision_actions.length, 1);
  assert.equal(db.tables.decision_actions[0].followed, false);
});

test("feedback is not attributed when two leagues have a call that week and none is named", async () => {
  const db = createFakeDb(seedLeague());
  await ledger.recordDecision(db.client, { userId: USER, response: liveCall() });
  await ledger.recordDecision(db.client, {
    userId: USER,
    response: liveCall({ platform: { name: "espn" }, league: { id: "22222", season: 2026, week: 4 }, team: { id: "7" } }),
  });
  assert.deepEqual(
    await ledger.recordDecisionAction(db.client, { userId: USER, season: 2026, week: 4, followed: true }),
    { written: false, reason: "ambiguous_call" }
  );
  const named = await ledger.recordDecisionAction(db.client, {
    userId: USER, season: 2026, week: 4, followed: true, platform: "espn", providerLeagueId: "22222",
  });
  assert.equal(named.written, true);
  assert.equal(db.tables.decision_actions[0].decision_id, db.tables.decisions[1].id);
});

// --- Read path: moves-history.v2 and move-detail.v1 -----------------------------------------------

function loadMovesRouter(db) {
  const routePath = require.resolve("../src/routes/moves");
  delete require.cache[routePath];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "@supabase/supabase-js") return { createClient: () => db.client };
      if (request === "../middleware/auth") return { requireAuth: (req, _res, next) => { req.user = { id: USER }; next(); } };
      if (request === "../services/nflSchedule") return { getCurrentNflWeekContext: () => ({ season: 2026, week: 5 }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("../src/routes/moves");
  } finally {
    Module._load = originalLoad;
  }
}

// A value no served timestamp or id can contain ("71" alone appears in an ISO clock reading by chance).
const INTERNAL_SCORE = 71.318;

function decisionRow(id, fields = {}) {
  return {
    id, user_id: USER, league_id: LEAGUE, provider_team_id: "414.l.12345.t.7", season: 2026, week: 1,
    call_type: "start_sit", contract_version: "omen-decision-brief.v3", engine_version: "omen-mvp-engine",
    band: "leaning", band_drivers: ["Live edge."], band_unavailable_reason: null, internal_score: INTERNAL_SCORE,
    headline: "Start A over B", summary: "Start A.", recommendation: { id: "rec", primary_player: { name: "A" } },
    scoring_format: "ppr", scoring_contract_version: "scoring-contract.v1", scoring_coverage_state: "supported",
    issued_at: "2026-09-10T15:00:00.000Z", issued_at_timezone: "UTC", supersedes_id: null, legacy_move_id: null,
    ...fields,
  };
}

const D1 = "00000000-0000-4000-8000-0000000d0001";
const D2 = "00000000-0000-4000-8000-0000000d0002";
const D3 = "00000000-0000-4000-8000-0000000d0003";
const D3B = "00000000-0000-4000-8000-0000000d003b";
const D4 = "00000000-0000-4000-8000-0000000d0004";
const DX = "00000000-0000-4000-8000-0000000d0099";
const LEGACY_MOVE = "00000000-0000-4000-8000-00000000e001";

function ledgerSeed() {
  return seedLeague({
    decisions: [
      decisionRow(D1, { week: 1, issued_at: "2026-09-10T15:00:00.000Z" }),
      decisionRow(D2, { week: 2, issued_at: "2026-09-17T15:00:00.000Z", headline: "Pick up C" , call_type: "waiver_pickup" }),
      decisionRow(D3, { week: 3, issued_at: "2026-09-24T15:00:00.000Z", headline: "First week-3 call" }),
      decisionRow(D3B, { week: 3, issued_at: "2026-09-24T18:00:00.000Z", headline: "Replacement week-3 call", supersedes_id: D3 }),
      decisionRow(D4, {
        week: 4, call_type: "legacy", provider_team_id: null, band: null, band_drivers: [], band_unavailable_reason: "recorded_before_bands",
        headline: "Hold your RB", summary: "Legacy reasoning.", issued_at: "2026-10-01T15:00:00.000Z",
        recommendation: { move_type: "hold", target_player: "Legacy Back", legacy_confidence: 64 },
        scoring_format: null, scoring_contract_version: null, scoring_coverage_state: null, legacy_move_id: LEGACY_MOVE,
      }),
      decisionRow(DX, { league_id: OTHER_LEAGUE, week: 1, headline: "Other league call" }),
      decisionRow("00000000-0000-4000-8000-0000000d0f00", { user_id: OTHER_USER, headline: "Another person's call" }),
    ],
    decision_factors: [
      { id: "f1", decision_id: D1, user_id: USER, position: 0, factor_key: "projections", family: "model_input", line_label: "projected", evidence_kind: "projection", used: true, statement: "Yahoo projections were read.", source: "yahoo_projections", reason_code: null },
      { id: "f2", decision_id: D1, user_id: USER, position: 1, factor_key: "waivers", family: "limitation", line_label: null, evidence_kind: "limitation", used: false, statement: "Waiver context is not available.", source: "yahoo_waivers", reason_code: "capability_unavailable" },
    ],
    decision_actions: [
      { decision_id: D1, user_id: USER, followed: true, stars: 5, note: "Nice", provenance: "self_reported" },
    ],
    decision_outcomes: [
      { decision_id: D1, user_id: USER, state: "resolved", result: "win", provenance: "verified", reconciliation_state: "exact", scoring_coverage_state: "supported", scoring_format: "ppr", effectiveness: 80, summary: "A scored 21.0 fantasy points.", scored_at: "2026-09-15T10:00:00.000Z" },
      { decision_id: D2, user_id: USER, state: "resolved", result: "loss", provenance: "legacy_estimate", reconciliation_state: null, scoring_format: "ppr", effectiveness: 30, summary: "C scored 3.0.", scored_at: "2026-09-22T10:00:00.000Z" },
    ],
  });
}

test("moves-history.v2 reads the league's current calls from the new Ledger tables", async () => {
  const db = createFakeDb(ledgerSeed());
  const app = serve(loadMovesRouter(db), "/api/moves");
  const response = await call(app, "/api/moves?contract_version=moves-history.v2&platform=yahoo&league_id=414.l.12345&season=2026");

  assert.equal(response.status, 200);
  assert.equal(response.body.contract_version, "moves-history.v2");
  assert.equal(response.body.season, 2026);
  assert.deepEqual(response.body.moves.map((move) => move.id), [D4, D3B, D2, D1], "newest first, current calls only, this league and person only");
  const [legacy, replacement, waiver, verified] = response.body.moves;

  assert.deepEqual(verified, {
    id: D1, season: 2026, week: 1, move_type: "start_sit", headline: "Start A over B",
    issued_at: "2026-09-10T15:00:00.000Z", issued_at_timezone: "UTC",
    followed: true, action_provenance: "self_reported", provenance: "verified", outcome: "worked",
  });
  assert.equal(waiver.outcome, "not_verified", "an estimate is never shown as worked/did not work");
  assert.equal(waiver.provenance, "unknown");
  assert.equal(waiver.followed, null);
  assert.equal(waiver.action_provenance, "unknown");
  assert.equal(replacement.headline, "Replacement week-3 call");
  assert.equal(replacement.outcome, "pending");
  assert.equal(legacy.move_type, "hold", "legacy calls keep their original move type");
  assert.equal(JSON.stringify(response.body).includes("internal_score"), false);
  assert.equal(JSON.stringify(response.body).includes(String(INTERNAL_SCORE)), false);
});

test("moves-history.v2 for a league Omen has no record of is an empty Ledger, not an error", async () => {
  const db = createFakeDb(ledgerSeed());
  const app = serve(loadMovesRouter(db), "/api/moves");
  const response = await call(app, "/api/moves?contract_version=moves-history.v2&platform=sleeper&league_id=999&season=2026");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.moves, []);
  assert.equal(db.calls.some((entry) => entry.table === "moves"), false, "v2 no longer reads moves");
});

test("move-detail.v1 for a decision is built from the issue-time factors, action and outcome", async () => {
  const db = createFakeDb(ledgerSeed());
  const app = serve(loadMovesRouter(db), "/api/moves");
  const response = await call(app, `/api/moves/${D1}`);

  assert.equal(response.status, 200);
  const body = response.body;
  assert.equal(body.contract_version, "move-detail.v1");
  assert.equal(body.id, D1);
  assert.equal(body.call_type, "start_sit");
  assert.equal(body.state, "resolved");
  assert.deepEqual(body.snapshot, {
    recommendation: "Start A over B", season: 2026, week: 1, platform: "yahoo", league_id: "414.l.12345",
    scoring_format: "ppr", scoring_contract_version: "scoring-contract.v1",
    issued_at: "2026-09-10T15:00:00.000Z", issued_at_timezone: "UTC",
  });
  assert.ok(body.evidence_at_the_time.every((line) => typeof line.kind === "string" && typeof line.statement === "string"));
  assert.ok(body.evidence_at_the_time.some((line) => line.kind === "projection" && line.statement === "Yahoo projections were read."));
  assert.ok(body.evidence_at_the_time.some((line) => line.category === "limitation" && line.statement === "Waiver context is not available."));
  assert.deepEqual(body.user_action, { known: true, followed: true, statement: "You marked this as followed." });
  assert.equal(body.observed_outcome.known, true);
  assert.equal(body.observed_outcome.provenance, "verified");
  assert.equal(body.observed_outcome.statement, "Observed outcome aligned with the recommendation.");
  assert.deepEqual(body.feedback, { stars: 5, note: "Nice" });
  assert.equal(typeof body.fairness_note, "string");
  assert.ok(Array.isArray(body.capabilities));
  assert.equal(JSON.stringify(body).includes("internal_score"), false);
  assert.equal(JSON.stringify(body).includes(String(INTERNAL_SCORE)), false, "the engine's internal number is never served");
});

test("a superseded call's receipt says so instead of waiting for a score that will not come", async () => {
  const db = createFakeDb(ledgerSeed());
  const app = serve(loadMovesRouter(db), "/api/moves");
  const response = await call(app, `/api/moves/${D3}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.state, "superseded");
  assert.equal(response.body.observed_outcome.known, false);
  assert.match(response.body.observed_outcome.statement, /later call/i);
});

test("a call copied from moves is found by its original moves id, with legacy limitations named", async () => {
  const db = createFakeDb(ledgerSeed());
  const app = serve(loadMovesRouter(db), "/api/moves");
  const response = await call(app, `/api/moves/${LEGACY_MOVE}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.id, D4);
  assert.equal(response.body.call_type, "hold");
  assert.equal(response.body.state, "pending");
  assert.ok(response.body.evidence_at_the_time.some((line) => line.statement === "The recommendation named Legacy Back."));
  assert.ok(response.body.evidence_at_the_time.some((line) => line.category === "limitation"));
  assert.equal(response.body.evidence_at_the_time.some((line) => /64/.test(line.statement)), false, "no legacy confidence number");
});

test("another person's decision is not found, and an id with no decision falls back to moves", async () => {
  const db = createFakeDb({
    ...ledgerSeed(),
    moves: [{ id: "00000000-0000-4000-8000-00000000e777", user_id: USER, week_num: 2, season: 2026, headline: "Old moves row", outcome: "pending", created_at: "2026-09-17T00:00:00Z" }],
  });
  const app = serve(loadMovesRouter(db), "/api/moves");
  const foreign = await call(app, "/api/moves/00000000-0000-4000-8000-0000000d0f00");
  assert.equal(foreign.status, 404);

  const old = await call(app, "/api/moves/00000000-0000-4000-8000-00000000e777");
  assert.equal(old.status, 200);
  assert.equal(old.body.snapshot.recommendation, "Old moves row");
});

// --- Tuesday scoring -----------------------------------------------------------------------------

const cron = require("../src/omen_tuesday_cron");

function weekFourSeed() {
  const call = (id, fields) => decisionRow(id, { week: 4, issued_at: "2026-10-01T15:00:00.000Z", ...fields });
  return seedLeague({
    decisions: [
      // Live call: a contract-required call cannot be graded on public fantasy totals.
      call("00000000-0000-4000-8000-0000000a0001", { recommendation: { id: "r1", primary_player: { name: "Bench Breakout" } } }),
      // Followed = false: not executed.
      call("00000000-0000-4000-8000-0000000a0002", { league_id: OTHER_LEAGUE, provider_team_id: "7", recommendation: { id: "r2", primary_player: { name: "Bench Breakout" } } }),
      // Legacy call without a contract: graded as a legacy estimate.
      call("00000000-0000-4000-8000-0000000a0003", {
        call_type: "legacy", provider_team_id: null, band: null, band_drivers: [], band_unavailable_reason: "recorded_before_bands",
        scoring_format: "PPR", scoring_contract_version: null, scoring_coverage_state: null, internal_score: 80,
        recommendation: { move_type: "start_sit", target_player: "Bench Breakout" },
      }),
      // Legacy call naming a player with no stat line: incomplete, not a loss.
      call("00000000-0000-4000-8000-0000000a0004", {
        user_id: OTHER_USER, call_type: "legacy", provider_team_id: null, band: null, band_drivers: [], band_unavailable_reason: "recorded_before_bands",
        scoring_format: "PPR", scoring_contract_version: null, scoring_coverage_state: null,
        recommendation: { target_player: "Nobody Atall" },
      }),
      // Superseded week-4 call and its replacement (which already has a final outcome).
      call("00000000-0000-4000-8000-0000000a0005", { user_id: OTHER_USER, recommendation: { id: "old" } }),
      call("00000000-0000-4000-8000-0000000a0006", { user_id: OTHER_USER, supersedes_id: "00000000-0000-4000-8000-0000000a0005", recommendation: { id: "new" } }),
      // Week 5 has not finished.
      call("00000000-0000-4000-8000-0000000a0007", { week: 5, recommendation: { id: "r7", primary_player: { name: "Bench Breakout" } } }),
    ],
    decision_actions: [
      { decision_id: "00000000-0000-4000-8000-0000000a0002", user_id: USER, followed: false, provenance: "self_reported" },
    ],
    decision_outcomes: [
      { decision_id: "00000000-0000-4000-8000-0000000a0006", user_id: OTHER_USER, state: "resolved", result: "win", provenance: "legacy_estimate", summary: "final" },
    ],
  });
}

const WEEK_FOUR_SCORES = { bench_breakout: { name: "Bench Breakout", rec_std: 12, rec_half: 14, rec_ppr: 16 } };
const TUESDAY = new Date("2026-10-06T11:00:00.000Z");

test("Tuesday scoring writes decision_outcomes for the finished week's current calls only", async () => {
  const db = createFakeDb(weekFourSeed());
  const fetched = [];
  const result = await cron.scoreLedgerDecisions(db.client, {
    now: TUESDAY,
    fetchScores: async ({ season, weekNum }) => { fetched.push(`${season}:${weekNum}`); return WEEK_FOUR_SCORES; },
  });

  assert.deepEqual(fetched, ["2026:4"]);
  const byId = Object.fromEntries(db.tables.decision_outcomes.map((row) => [row.decision_id, row]));

  const live = byId["00000000-0000-4000-8000-0000000a0001"];
  assert.equal(live.state, "data_incomplete");
  assert.equal(live.result, null);
  assert.equal(live.provenance, "legacy_estimate");
  assert.equal(live.reconciliation_state, "pending");
  assert.equal(live.user_id, USER);

  const skipped = byId["00000000-0000-4000-8000-0000000a0002"];
  assert.equal(skipped.state, "not_executed");
  assert.equal(skipped.provenance, "self_reported");

  const legacy = byId["00000000-0000-4000-8000-0000000a0003"];
  assert.equal(legacy.state, "resolved");
  assert.equal(legacy.result, "win");
  assert.equal(legacy.provenance, "legacy_estimate", "public fantasy totals are an estimate, never verified");
  assert.ok(Number.isInteger(legacy.effectiveness));
  assert.match(legacy.summary, /16\.0/);

  const unmatched = byId["00000000-0000-4000-8000-0000000a0004"];
  assert.equal(unmatched.state, "data_incomplete", "an unmatched player is not a loss");

  assert.equal(byId["00000000-0000-4000-8000-0000000a0005"], undefined, "a superseded call is not scored");
  assert.equal(byId["00000000-0000-4000-8000-0000000a0006"].summary, "final", "a final outcome is never touched");
  assert.equal(byId["00000000-0000-4000-8000-0000000a0007"], undefined, "the unfinished week is not scored");

  assert.deepEqual(result, { inserted: 4, updated: 0, unchanged: 0, deferred: 0, failed: 0 });
});

test("Tuesday scoring re-runs are idempotent and dry runs write nothing", async () => {
  const db = createFakeDb(weekFourSeed());
  const fetchScores = async () => WEEK_FOUR_SCORES;
  await cron.scoreLedgerDecisions(db.client, { now: TUESDAY, fetchScores });
  const snapshot = JSON.stringify(db.tables.decision_outcomes);
  const again = await cron.scoreLedgerDecisions(db.client, { now: TUESDAY, fetchScores });
  assert.deepEqual(again, { inserted: 0, updated: 0, unchanged: 2, deferred: 0, failed: 0 });
  assert.equal(JSON.stringify(db.tables.decision_outcomes), snapshot);

  const dry = createFakeDb(weekFourSeed());
  const dryResult = await cron.scoreLedgerDecisions(dry.client, { now: TUESDAY, fetchScores, dryRun: true });
  assert.equal(dry.tables.decision_outcomes.length, 1);
  assert.equal(dryResult.inserted, 4);
  assert.equal(dry.calls.some((entry) => entry.op !== "select"), false);
});

test("Tuesday scoring defers, without writing, when the week's stats are not published", async () => {
  const db = createFakeDb(weekFourSeed());
  const result = await cron.scoreLedgerDecisions(db.client, {
    now: TUESDAY,
    fetchScores: async () => ({ [Symbol.for("omen.scoring.deferred")]: true, reason: "not yet" }),
  });
  // Only the not-followed call needs no stats.
  assert.deepEqual(result, { inserted: 1, updated: 0, unchanged: 0, deferred: 3, failed: 0 });
});

test("a data_incomplete outcome is completed on a later run once it can be graded", async () => {
  const seed = weekFourSeed();
  seed.decision_outcomes.push({
    decision_id: "00000000-0000-4000-8000-0000000a0004", user_id: OTHER_USER, state: "data_incomplete", result: null,
    provenance: "legacy_estimate", summary: "No public stat line matched the recommended player.",
  });
  const db = createFakeDb(seed);
  const scores = { ...WEEK_FOUR_SCORES, nobody_atall: { name: "Nobody Atall", rec_std: 1, rec_half: 1, rec_ppr: 1 } };
  await cron.scoreLedgerDecisions(db.client, { now: TUESDAY, fetchScores: async () => scores });
  const completed = db.tables.decision_outcomes.find((row) => row.decision_id === "00000000-0000-4000-8000-0000000a0004");
  assert.equal(completed.state, "resolved");
  assert.equal(completed.result, "loss");
});

test("before week 2 nothing has finished, so nothing is read or written", async () => {
  const db = createFakeDb(weekFourSeed());
  const result = await cron.scoreLedgerDecisions(db.client, {
    now: new Date("2026-09-10T11:00:00.000Z"),
    fetchScores: async () => { throw new Error("should not fetch"); },
  });
  assert.deepEqual(result, { inserted: 0, updated: 0, unchanged: 0, deferred: 0, failed: 0 });
  assert.equal(db.calls.length, 0);
});

test("runScoring scores the Ledger even when no moves are pending, and reports it", async () => {
  const seen = [];
  const result = await cron.runScoring({
    env: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_KEY: "key" },
    now: TUESDAY,
    dependencies: {
      createSupabase: () => ({ marker: true }),
      createRedis: () => null,
      archiveNotExecutedMoves: async () => 0,
      fetchPendingMoves: async () => [],
      scoreLedgerDecisions: async (client, options) => {
        seen.push({ client, dryRun: options.dryRun });
        return { inserted: 2, updated: 0, unchanged: 0, deferred: 0, failed: 0 };
      },
    },
  });
  assert.deepEqual(seen, [{ client: { marker: true }, dryRun: false }]);
  assert.deepEqual(result.ledger, { inserted: 2, updated: 0, unchanged: 0, deferred: 0, failed: 0 });
});

test("a Ledger scoring failure is reported without failing the moves run", async () => {
  const result = await cron.runScoring({
    env: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_KEY: "key" },
    now: TUESDAY,
    dependencies: {
      createSupabase: () => ({}),
      createRedis: () => null,
      archiveNotExecutedMoves: async () => 0,
      fetchPendingMoves: async () => [],
      scoreLedgerDecisions: async () => { throw new Error("ledger down"); },
    },
  });
  assert.equal(result.ledger.error, true);
  assert.equal(result.scoredCount, 0);
});
