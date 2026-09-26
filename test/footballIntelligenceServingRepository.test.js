"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createFootballIntelligenceServingRepository } = require("../src/services/footballIntelligence/servingRepository");

const hash = (character) => `sha256:${character.repeat(64)}`;
const receipt = (character) => `receipt:${character.repeat(64)}`;

function payload(status = "available") {
  return {
    contract_version: "football-intelligence-signal.v1", status, signal_type: "coach_transfer_system_signal",
    subject: { team_id: "omen:team:chicago-2026", coach_id: "omen:coach:ben-johnson", season: 2026 },
    quality: { state: "published", limitations: [] }, freshness: { state: "fresh" },
    publication: { artifact_id: hash("a"), artifact_version: "version-1", published_at_utc: "2026-09-26T12:00:00.000Z" },
  };
}

function row(overrides = {}) {
  return {
    contract_version: "football-intelligence-signal.v1", signal_type: "coach_transfer_system_signal",
    team_id: "omen:team:chicago-2026", coach_id: "omen:coach:ben-johnson", season: 2026, status: "available", payload: payload(),
    artifact_id: hash("a"), artifact_version: "version-1", receipt_id: receipt("b"), output_hash: hash("c"),
    source_artifact_ids: [hash("d")], publication_state: "published",
    published_at: "2026-09-26T12:00:00.000Z", stale_after: "2026-09-27T12:00:00.000Z", ...overrides,
  };
}

class Query {
  constructor(result) { this.result = result; this.calls = []; }
  select(value) { this.calls.push(["select", value]); return this; }
  eq(field, value) { this.calls.push(["eq", field, value]); return this; }
  order(field, value) { this.calls.push(["order", field, value]); return this; }
  limit(value) { this.calls.push(["limit", value]); return this; }
  maybeSingle() { this.calls.push(["maybeSingle"]); return Promise.resolve(this.result); }
}

function setup(result, now = new Date("2026-09-26T18:00:00.000Z")) {
  const query = new Query(result);
  const repository = createFootballIntelligenceServingRepository({ client: { from: (table) => { query.calls.push(["from", table]); return query; } }, now: () => now });
  return { query, repository };
}

test("serving repository resolves only the explicit published scope", async () => {
  const { query, repository } = setup({ data: row(), error: null });
  const result = await repository.findPublishedCoachTransfer({ teamId: "omen:team:chicago-2026", coachId: "omen:coach:ben-johnson", season: 2026 });
  assert.equal(result.status, "available");
  assert.deepEqual(query.calls.filter((call) => call[0] === "eq"), [
    ["eq", "team_id", "omen:team:chicago-2026"], ["eq", "coach_id", "omen:coach:ben-johnson"], ["eq", "season", 2026],
    ["eq", "signal_type", "coach_transfer_system_signal"], ["eq", "publication_state", "published"],
  ]);
  assert.deepEqual(query.calls.at(-4), ["order", "published_at", { ascending: false }]);
  assert.deepEqual(query.calls.at(-3), ["order", "artifact_id", { ascending: false }]);
  assert.deepEqual(query.calls.at(-2), ["limit", 1]);
});

test("serving repository resolves a deterministic published team signal without a caller-supplied coach", async () => {
  const { query, repository } = setup({ data: row(), error: null });
  const result = await repository.findPublishedTeamSignal({ teamId: "omen:team:chicago-2026", season: 2026 });
  assert.equal(result.subject.coach_id, "omen:coach:ben-johnson");
  assert.equal(query.calls.some((call) => call[0] === "eq" && call[1] === "coach_id"), false);
  assert.deepEqual(query.calls.filter((call) => call[0] === "order"), [
    ["order", "published_at", { ascending: false }],
    ["order", "artifact_id", { ascending: false }],
  ]);
});

test("serving repository returns null rather than falling back to a candidate", async () => {
  const { repository } = setup({ data: null, error: null });
  assert.equal(await repository.findPublishedCoachTransfer({ teamId: "omen:team:chicago-2026", coachId: "omen:coach:ben-johnson", season: 2026 }), null);
});

test("serving repository derives stale state from the accepted deadline without mutating stored payload", async () => {
  const stored = row({ stale_after: "2026-09-26T13:00:00.000Z" });
  const { repository } = setup({ data: stored, error: null });
  const result = await repository.findPublishedCoachTransfer({ teamId: "omen:team:chicago-2026", coachId: "omen:coach:ben-johnson", season: 2026 });
  assert.equal(result.status, "stale");
  assert.equal(result.reason_code, "source_stale");
  assert.equal(result.freshness.state, "stale");
  assert.equal(stored.payload.status, "available");
});

test("serving repository fails closed on database errors and invalid rows", async () => {
  const failed = setup({ data: null, error: { message: "private database detail" } }).repository;
  await assert.rejects(failed.findPublishedCoachTransfer({ teamId: "omen:team:chicago-2026", coachId: "omen:coach:ben-johnson", season: 2026 }), (error) => error.code === "SERVING_READ_FAILED" && !error.message.includes("private"));
  const invalid = setup({ data: row({ publication_state: "candidate" }), error: null }).repository;
  await assert.rejects(invalid.findPublishedCoachTransfer({ teamId: "omen:team:chicago-2026", coachId: "omen:coach:ben-johnson", season: 2026 }), (error) => error.code === "SERVING_ROW_INVALID");
  const mismatchedPublication = setup({ data: row({ published_at: "2026-09-26T13:00:00.000Z" }), error: null }).repository;
  await assert.rejects(mismatchedPublication.findPublishedCoachTransfer({ teamId: "omen:team:chicago-2026", coachId: "omen:coach:ben-johnson", season: 2026 }), (error) => error.code === "SERVING_ROW_INVALID");
});
