"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createSupabaseSavedTradesStore, UNIQUE_KEY } = require("../src/services/savedTradesStore");
const {
  createMemoryTradeSavedQueueStore,
  createDisabledTradeSavedQueueStore,
  createRedisTradeSavedQueueStore,
  KEY_PREFIX,
} = require("../src/services/tradeSavedQueueStore");
const { createFakeSavedTradesSupabase } = require("./fixtures/fakeSavedTradesSupabase");

function row(overrides = {}) {
  return {
    user_id: "user-1",
    provider: "sleeper",
    provider_league_id: "L1",
    season: 2026,
    week: 5,
    provider_team_id: "3",
    candidate_id: "0123456789abcdef.find_7_a_b",
    trade: { give: { player_key: "a" }, receive: { player_key: "b" }, opponent_team_id: "7" },
    reasoning: { fills_need_for: ["user"] },
    state: "saved",
    saved_at: "2026-10-03T00:00:00.000Z",
    ...overrides,
  };
}

function setup() {
  const fake = createFakeSavedTradesSupabase();
  return { fake, store: createSupabaseSavedTradesStore({ client: fake }) };
}

test("insertIfAbsent upserts on the table's full unique key and ignores a duplicate", async () => {
  const { fake, store } = setup();
  assert.deepEqual(await store.insertIfAbsent(row()), { inserted: true });
  assert.deepEqual(await store.insertIfAbsent(row({ reasoning: { other: true } })), { inserted: false });
  assert.equal(fake.db.rows.length, 1);
  assert.deepEqual(fake.db.rows[0].reasoning, { fills_need_for: ["user"] });
  const upsert = fake.db.calls.find((c) => c.op === "upsert");
  assert.equal(upsert.options.onConflict, UNIQUE_KEY);
  assert.equal(UNIQUE_KEY, "user_id,provider,provider_league_id,season,week,candidate_id");
  assert.equal(upsert.options.ignoreDuplicates, true);
});

test("a row the table's checks reject surfaces as a storage error, never a silent success", async () => {
  const { store } = setup();
  await assert.rejects(
    store.insertIfAbsent(row({ trade: { give: null, receive: { player_key: "b" }, opponent_team_id: "7" } })),
    (e) => e.code === "trade_saved_queue_storage_unavailable" && e.dbCode === "23514",
  );
});

test("every read and write is scoped by user_id (the service role bypasses RLS)", async () => {
  const { fake, store } = setup();
  await store.insertIfAbsent(row());
  await store.insertIfAbsent(row({ user_id: "user-2" }));
  assert.equal((await store.list("user-1")).length, 1);
  assert.equal(await store.get("user-2", "nope"), null);
  await store.markSent("user-2", row().candidate_id, "2026-10-03T01:00:00.000Z");
  assert.equal(fake.db.rows.find((r) => r.user_id === "user-1").state, "saved");
  assert.equal(await store.remove("user-2", row().candidate_id), true);
  assert.equal(fake.db.rows.length, 1);
  assert.equal(fake.db.rows[0].user_id, "user-1");
  for (const call of fake.db.calls.filter((c) => c.op !== "upsert")) {
    assert.ok(call.filters.some(([field]) => field === "user_id"), `${call.op} must filter by user_id`);
  }
});

test("markSent moves saved -> sent once and never moves sent_at again", async () => {
  const { store } = setup();
  await store.insertIfAbsent(row());
  const first = await store.markSent("user-1", row().candidate_id, "2026-10-03T01:00:00.000Z");
  assert.equal(first.state, "sent");
  const second = await store.markSent("user-1", row().candidate_id, "2026-10-03T02:00:00.000Z");
  assert.equal(second.sent_at, "2026-10-03T01:00:00.000Z");
  assert.equal(await store.markSent("user-1", "nope", "2026-10-03T02:00:00.000Z"), null);
});

test("setOutcome is self-reported and only after sent", async () => {
  const { store } = setup();
  await store.insertIfAbsent(row());
  assert.equal((await store.setOutcome("user-1", row().candidate_id, "accepted", "t1")).status, "not_sent");
  assert.equal((await store.setOutcome("user-1", "nope", "accepted", "t1")).status, "not_found");
  await store.markSent("user-1", row().candidate_id, "2026-10-03T01:00:00.000Z");
  const ok = await store.setOutcome("user-1", row().candidate_id, "rejected", "2026-10-03T03:00:00.000Z");
  assert.equal(ok.status, "ok");
  assert.equal(ok.row.outcome, "rejected");
  assert.equal(ok.row.outcome_provenance, "self_reported");
});

test("remove deletes one row and reports whether it existed", async () => {
  const { store } = setup();
  await store.insertIfAbsent(row());
  assert.equal(await store.remove("user-1", row().candidate_id), true);
  assert.equal(await store.remove("user-1", row().candidate_id), false);
});

// --- #519's Redis blob: erased with the account during the transition ---------------------

test("legacy stores can erase a user's blob; the disabled store holds nothing and erases as a no-op", async () => {
  const memory = createMemoryTradeSavedQueueStore();
  await memory.writeAll("user-1", [{ candidate_id: "c1" }]);
  await memory.writeAll("user-2", [{ candidate_id: "c2" }]);
  await memory.deleteAll("user-1");
  assert.deepEqual(await memory.readAll("user-1"), []);
  assert.equal((await memory.readAll("user-2")).length, 1);

  await createDisabledTradeSavedQueueStore().deleteAll("user-1");

  const deleted = [];
  const redisStore = createRedisTradeSavedQueueStore({ redis: { async del(key) { deleted.push(key); return 1; } } });
  await redisStore.deleteAll("user-1");
  assert.deepEqual(deleted, [`${KEY_PREFIX}user-1`]);
});
