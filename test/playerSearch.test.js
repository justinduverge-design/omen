"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizePlayerSearchQuery,
  normalizePosition,
  searchNflPlayers,
  searchPlayerSource,
} = require("../src/services/playerSearch");

const SOURCE = {
  100: {
    full_name: "Patrick Mahomes",
    position: "QB",
    team: "KC",
    active: true,
    search_rank: 1,
  },
  200: {
    full_name: "Pat Freiermuth",
    position: "TE",
    team: "PIT",
    active: true,
    search_rank: 200,
  },
  300: {
    full_name: "Tony Pollard",
    position: "RB",
    team: "TEN",
    active: true,
    search_rank: 50,
  },
  400: {
    full_name: "Inactive Patrick",
    position: "RB",
    team: "FA",
    active: false,
  },
  500: {
    full_name: "C.J. Stroud",
    position: "QB",
    team: "HOU",
    active: true,
    projected_points: 18.4,
  },
};

test("normalizePosition accepts defense aliases", () => {
  assert.equal(normalizePosition("D/ST"), "DEF");
  assert.equal(normalizePosition("dst"), "DEF");
  assert.equal(normalizePosition("pk"), "K");
});

test("normalizePlayerSearchQuery rejects unsupported positions", () => {
  const normalized = normalizePlayerSearchQuery({ position: "LB", q: "pat" });

  assert.equal(normalized.error, "position must be one of QB, RB, WR, TE, K, DEF");
  assert.equal(normalized.code, "player_search_invalid_position");
});

test("searchPlayerSource filters by position and excludes inactive players", () => {
  const results = searchPlayerSource(SOURCE, { position: "QB", q: "pat" });

  assert.deepEqual(results, [{
    id: "sleeper:100",
    name: "Patrick Mahomes",
    position: "QB",
    team: "KC",
    projected_points: null,
  }]);
});

test("searchPlayerSource handles punctuation-insensitive names", () => {
  const results = searchPlayerSource(SOURCE, { q: "cj" });

  assert.deepEqual(results, [{
    id: "sleeper:500",
    name: "C.J. Stroud",
    position: "QB",
    team: "HOU",
    projected_points: 18.4,
  }]);
});

test("searchPlayerSource returns an empty array for blank autocomplete queries", () => {
  assert.deepEqual(searchPlayerSource(SOURCE, { position: "RB", q: "" }), []);
});

test("searchNflPlayers caps results at ten", async () => {
  const source = Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [
      String(index + 1),
      {
        full_name: `Test Runner ${index + 1}`,
        position: "RB",
        team: "TEN",
        active: true,
      },
    ])
  );

  const results = await searchNflPlayers(
    { position: "RB", q: "test", limit: 99 },
    { fetchPlayers: async () => source, cacheTtlMs: 0 }
  );

  assert.equal(results.length, 10);
});
