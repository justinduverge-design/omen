"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const { refreshEvidenceSignals } = require("../src/services/omen");

test("the call's evidence is rebuilt from Omen's read, stats and grades; first-MVP placeholders go", () => {
  const body = {
    recommendation: {
      primary_player: {
        name: "Jahmyr Gibbs",
        projected_points: 19.1,
        sight: {
          sight_points: 21.4,
          drivers: [
            { name: "vegas_total", points: 1.3 },
            { name: "noise", points: 0.02 },
          ],
        },
        stats: { points_per_game: 30.7, games: 5 },
        rating: { rating: 73.5 },
      },
      comparison_player: { name: "Bijan Robinson", projected_points: 17.0, stats: { points_per_game: 21.4, games: 6 } },
    },
    signals: {
      waivers: { status: "unavailable" },
      game_time_tv: { status: "stub" },
      travel_home_away: { status: "stub" },
      weather: { status: "stub" },
      matchup_dvp: { status: "stub" },
      roster: { status: "live", used: true },
    },
  };
  refreshEvidenceSignals(body);
  const keys = Object.keys(body.signals).sort();
  assert.deepEqual(keys, ["omen_grade", "omen_read", "roster", "season_stats", "what_moved_it"]);
  assert.match(body.signals.omen_read.message, /Gibbs: Omen 21\.4 vs 19\.1 projected/);
  assert.match(body.signals.what_moved_it.message, /vegas total \+1\.3/);
  assert.doesNotMatch(body.signals.what_moved_it.message, /noise/);
  assert.match(body.signals.season_stats.message, /30\.7 PPG over 5 games.*21\.4 PPG over 6 games/);
});

test("with no evidence attached nothing is removed, and a waiver call keeps its waivers signal", () => {
  const bare = {
    recommendation: { primary_player: { name: "A" } },
    signals: { waivers: { status: "unavailable" }, weather: { status: "stub" } },
  };
  refreshEvidenceSignals(bare);
  assert.deepEqual(Object.keys(bare.signals).sort(), ["waivers", "weather"]);

  const waiver = {
    recommendation: { type: "waiver_pickup", primary_player: { name: "A", sight: { sight_points: 9 } } },
    signals: {
      waivers: { status: "live", used: true },
      game_time_tv: { status: "live" },
      travel_home_away: { status: "stub" },
    },
  };
  refreshEvidenceSignals(waiver);
  assert.ok(waiver.signals.waivers);
  assert.ok(waiver.signals.game_time_tv, "a live signal is never removed");
  assert.equal(waiver.signals.travel_home_away, undefined);
});
