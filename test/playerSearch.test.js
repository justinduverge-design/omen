"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizePlayerSearchQuery,
  normalizePosition,
  resolvePlayerInputs,
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
  600: {
    full_name: "Tetairoa McMillan",
    position: "WR",
    team: "CAR",
    active: true,
    search_rank: 20,
  },
  700: {
    full_name: "Jaxson Dart",
    position: "QB",
    team: "NYG",
    active: true,
    search_rank: 30,
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

test("searchPlayerSource returns explicit fuzzy suggestions for common spoken spellings", () => {
  assert.deepEqual(searchPlayerSource(SOURCE, { q: "Ted McMillan" }), [{
    id: "sleeper:600",
    name: "Tetairoa McMillan",
    position: "WR",
    team: "CAR",
    projected_points: null,
    match_type: "fuzzy",
  }]);
  assert.deepEqual(searchPlayerSource(SOURCE, { q: "Jackson Dart" }), [{
    id: "sleeper:700",
    name: "Jaxson Dart",
    position: "QB",
    team: "NYG",
    projected_points: null,
    match_type: "fuzzy",
  }]);
});

test("searchPlayerSource does not manufacture a fuzzy suggestion without a strong anchor", () => {
  assert.deepEqual(searchPlayerSource(SOURCE, { q: "Zzzqx Notaplayer" }), []);
});

test("resolvePlayerInputs accepts canonical ids and exact names only", () => {
  const [byId, byName, typo, invented] = resolvePlayerInputs(SOURCE, [
    { player_key: "sleeper:100", name: "ignored" },
    { name: "Patrick Mahomes" },
    { name: "Jackson Dart", position: "QB" },
    { name: "Zzzqx Notaplayer", position: "RB" },
  ]);

  assert.equal(byId.status, "resolved");
  assert.equal(byId.player.name, "Patrick Mahomes");
  assert.equal(byName.status, "resolved");
  assert.equal(typo.status, "unresolved");
  assert.equal(typo.suggestions[0].name, "Jaxson Dart");
  assert.equal(typo.suggestions[0].match_type, "fuzzy");
  assert.equal(invented.status, "unresolved");
  assert.deepEqual(invented.suggestions, []);
});

test("resolvePlayerInputs rejects a forged provider-scoped id even when the name is real", () => {
  const [result] = resolvePlayerInputs(SOURCE, [{
    player_key: "sleeper:not-real",
    name: "Patrick Mahomes",
  }]);
  assert.equal(result.status, "unresolved");
  assert.deepEqual(result.suggestions, []);
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
