"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
delete process.env.REDIS_URL;

const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeProjections } = require("../src/adapters/sleeper");
const optimizer = require("../src/services/optimizer");

// Founder cases (2026-10-23): Omen said "Start Mike Evans" (Questionable) and moved Bhayshul Tuten into FLEX
// while Sleeper projected both not to play. Sleeper sent a row with no points; Omen dropped it and Sight filled
// the gap with a full week.

test("a Sleeper row with no points is a projection of 0, not a missing read", () => {
  const points = normalizeProjections([
    { player_id: "2133", stats: { adp_dd_ppr: 1000 } },
    { player_id: "1", stats: { pts_ppr: 9.74 } },
    { player_id: "2" },
  ]);
  assert.equal(points["2133"], 0);
  assert.equal(points["1"], 9.74);
  assert.equal("2" in points, false);
});

function player(name, projected, extra = {}) {
  return { player_key: name, name, position: "WR", eligible_positions: ["WR"], projected_points: projected, ...extra };
}

test("never start a player the provider projects not to play, however Sight reads him", () => {
  const sight = { sight_points: 11.8, confidence: "medium" };
  const recs = optimizer.evaluateLineup({
    slots: {
      starters: [{ ...player("KC Concepcion Jr.", 9.74, { status: "Questionable" }), selected_position: "WR" }],
      bench: [player("Mike Evans", 0, { status: "Questionable", sight })],
    },
  });
  assert.deepEqual(recs, []);
});

test("Sight still fills a player the provider did not read at all", () => {
  const recs = optimizer.evaluateLineup({
    slots: {
      starters: [{ ...player("Starter", 6), selected_position: "WR" }],
      bench: [player("Unread", null, { sight: { sight_points: 12, confidence: "medium" } })],
    },
  });
  assert.equal(recs[0]?.to.name, "Unread");
});
