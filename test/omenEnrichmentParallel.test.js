"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function body() {
  return {
    state: "success",
    mode: "live",
    platform: { name: "sleeper" },
    league: { id: "L1", season: 2026, week: 8 },
    signals: {
      roster: { status: "live" },
      matchup_dvp: { status: "stub", used: false, source: "pending_nflverse_data", message: "stub" },
      waivers: { status: "live", used: false, source: "w", message: "m" },
    },
    recommendation: {
      type: "start_sit",
      primary_player: { id: "p1", name: "Player One", position: "WR", team: "PHI" },
      confidence: { score: 80, rationale: "Live edge. matchup DvP is still stubbed." },
      risk: { level: "low", reasons: ["one matchup signal is still stubbed."] },
      explanation: { summary: "s", why_it_matters: "w", risk: "r", confidence: "c", data_used: ["roster"] },
    },
  };
}

function loadRoute({ scheduleDelay, projectionDelay, intelligenceDelay, dvpDelay, failing = [] }) {
  const routePath = require.resolve("../src/routes/omen");
  delete require.cache[routePath];
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (parent?.filename === routePath) {
      if (request === "../services/scheduleTravelCapabilities") {
        return {
          resolveScheduleTravelCapabilities: async () => {
            await sleep(scheduleDelay);
            if (failing.includes("schedule")) throw new Error("schedule down");
            return {
              game_time_tv: { status: "live", resolution: "available", facts: [{ name: "opponent", value: "DAL" }] },
              travel_home_away: { status: "live", resolution: "available", facts: [] },
            };
          },
        };
      }
      if (request === "../services/projectionBreakdown") {
        return {
          attachOmenProjectionBreakdown: async ({ response }) => {
            await sleep(projectionDelay);
            if (failing.includes("projection")) throw new Error("projection down");
            response.projection_breakdown = { player_id: "p1", status: "available", statement: "stat line" };
            return response;
          },
        };
      }
      if (request === "../services/footballIntelligence/omenExplanation") {
        return {
          enrichOmenWithFootballIntelligence: async ({ response }) => {
            await sleep(intelligenceDelay);
            if (failing.includes("intelligence")) throw new Error("fi down");
            response.football_intelligence = { status: "available", summary: "scheme" };
            response.signals = response.signals || {};
            response.signals.football_intelligence = { status: "live", used: false, source: "football_intelligence", message: "scheme" };
            return response;
          },
        };
      }
      if (request === "../services/mvpEvidenceEnrichment") {
        const real = originalLoad.apply(this, arguments);
        return {
          ...real,
          resolveMvpDvpContext: async (response) => {
            await sleep(dvpDelay);
            assert.equal(response.recommendation.matchup_context?.opponent_team, "DAL", "DvP must run after the schedule merge");
            return { opponent_team: "DAL", position: "WR", avg_points_allowed: 20, sample_weeks: 5, dvp_label: "favorable" };
          },
        };
      }
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    return require("../src/routes/omen");
  } finally {
    Module._load = originalLoad;
  }
}

const req = { body: {}, headers: { authorization: "Bearer test" } };

async function bothWays(options, contract) {
  const route = loadRoute(options);
  const serial = body();
  const parallel = body();
  await route.runEnrichmentStagesSerial(serial, req, { started_at: Date.now() }, contract);
  await route.runEnrichmentStages(parallel, req, { started_at: Date.now() }, contract);
  return { serial, parallel };
}

test("parallel enrichment is byte-identical to the serial pipeline (brief v3, completion order reversed)", async () => {
  const { serial, parallel } = await bothWays(
    { scheduleDelay: 30, projectionDelay: 15, intelligenceDelay: 1, dvpDelay: 5 },
    "omen-decision-brief.v3"
  );
  // Sanity: every stage actually wrote something.
  assert.equal(serial.recommendation.matchup_context.opponent_team, "DAL");
  assert.ok(serial.capability_overrides.game_time_tv && serial.capability_overrides.waivers);
  assert.ok(serial.projection_breakdown && serial.football_intelligence && serial.signals.football_intelligence);
  assert.equal(serial.signals.matchup_dvp.status, "live");
  assert.equal(JSON.stringify(parallel), JSON.stringify(serial));
});

test("parallel enrichment matches serial without v3 (football intelligence skipped)", async () => {
  const { serial, parallel } = await bothWays({ scheduleDelay: 1, projectionDelay: 20, intelligenceDelay: 1, dvpDelay: 1 }, undefined);
  assert.equal(serial.football_intelligence, undefined);
  assert.equal(JSON.stringify(parallel), JSON.stringify(serial));
});

test("a failing stage is simply absent and does not disturb the others", async () => {
  for (const failing of [["schedule"], ["projection"], ["intelligence"], ["schedule", "projection", "intelligence"]]) {
    const { serial, parallel } = await bothWays(
      { scheduleDelay: 5, projectionDelay: 5, intelligenceDelay: 5, dvpDelay: 1, failing },
      "omen-decision-brief.v3"
    );
    assert.equal(JSON.stringify(parallel), JSON.stringify(serial), failing.join(","));
  }
});

test("stages overlap: wall time is the slowest chain, not the sum", async () => {
  const route = loadRoute({ scheduleDelay: 60, projectionDelay: 60, intelligenceDelay: 60, dvpDelay: 10 });
  const started = Date.now();
  await route.runEnrichmentStages(body(), req, { started_at: started }, "omen-decision-brief.v3");
  assert.ok(Date.now() - started < 150, `took ${Date.now() - started}ms`);
});
