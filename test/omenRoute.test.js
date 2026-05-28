"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");
const llm = require("../src/services/llm");
const matchupService = require("../src/services/matchupService");
const omenRoutes = require("../src/routes/omen");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/omen", omenRoutes);
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

async function postMvpMove(body) {
  const server = http.createServer(buildApp());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/omen/mvp-move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function baseRequest(overrides = {}) {
  return {
    platform: "yahoo",
    league_id: "414.l.12345",
    team_id: "7",
    season: 2026,
    week: 8,
    scoring_format: "ppr",
    decision_scope: ["start_sit", "waiver_pickup", "trade_suggestion"],
    include_signals: {
      weather: true,
      travel_home_away: true,
      game_time_tv: true,
      matchup_dvp: false,
      llm_reasoning: true,
    },
    use_mock_data: true,
    ...overrides,
  };
}

function assertEnvelope(body, state) {
  assert.equal(body.state, state);
  assert.equal(body.feature, "omen_mvp_move");
  assert.ok(body.mode);
  assert.ok(body.request_id);
  assert.ok(body.generated_at);
  assert.ok(body.platform);
  assert.ok(body.league);
  assert.ok(body.team);
  assert.ok(body.signals);
  assert.ok(Array.isArray(body.alternatives));
  assert.ok(Array.isArray(body.warnings));
}

function assertSignal(signal) {
  assert.ok(["live", "stub", "mock", "unavailable"].includes(signal.status));
  assert.equal(typeof signal.used, "boolean");
  assert.equal(typeof signal.source, "string");
  assert.equal(typeof signal.message, "string");
}

async function withMockOmenLlm(handler, fn) {
  const original = llm.explainOmenMvpMove;
  llm.explainOmenMvpMove = handler;
  try {
    return await fn();
  } finally {
    llm.explainOmenMvpMove = original;
  }
}

async function withMockOmenDvp(handler, fn) {
  const original = matchupService.getDvpContext;
  matchupService.getDvpContext = handler;
  try {
    return await fn();
  } finally {
    matchupService.getDvpContext = original;
  }
}

test("POST /api/omen/mvp-move returns success response envelope", async () => {
  const res = await postMvpMove(baseRequest());

  assert.equal(res.status, 200);
  assertEnvelope(res.body, "success");
  assert.equal(res.body.recommendation.type, "start_sit");
  assert.equal(typeof res.body.recommendation.confidence.score, "number");
  assert.equal(res.body.recommendation.risk.level, "medium");
  assert.equal(typeof res.body.recommendation.explanation.summary, "string");
  Object.values(res.body.signals).forEach(assertSignal);
});

test("POST /api/omen/mvp-move requires auth for non-mock live requests", async () => {
  const res = await postMvpMove({
    platform: "sleeper",
    decision_scope: ["start_sit"],
    include_signals: { matchup_dvp: true, llm_reasoning: true },
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.state, "error");
  assert.equal(res.body.mode, "live");
  assert.equal(res.body.recommendation, null);
  assert.equal(res.body.platform.status, "auth_required");
  assert.equal(res.body.platform.recovery.code, "sign_in");
  assert.equal(res.body.signals.roster.status, "unavailable");
  assert.equal(res.body.error.code, "omen_auth_required");
});

test("POST /api/omen/mvp-move uses live LLM explanation for eligible success response", async () => {
  const liveExplanation = {
    summary: "Live Gemma says Vale is the best weekly swing.",
    why_it_matters: "The selected move adds meaningful projected value without changing the rest of the lineup.",
    risk: "The risk is medium because matchup DvP is still stubbed.",
    confidence: "Confidence is 74 out of 100 with a clear but not perfect edge.",
    data_used: ["connected roster", "weekly projections", "signal statuses"],
  };

  await withMockOmenLlm(async (payload) => {
    assert.equal(payload.state, "success");
    assert.equal(payload.title, "Start Marquise Vale over Trent Holloway");
    assert.equal(payload.primary_player.name, "Marquise Vale");
    assert.equal(payload.comparison_player.name, "Trent Holloway");
    assert.equal(payload.confidence.score, 74);
    assert.equal(payload.risk.level, "medium");
    assert.ok(payload.signal_statuses.llm_reasoning);
    return liveExplanation;
  }, async () => {
    const res = await postMvpMove(baseRequest());

    assert.equal(res.status, 200);
    assert.equal(res.body.recommendation.explanation.summary, liveExplanation.summary);
    assert.deepEqual(res.body.recommendation.explanation.data_used, liveExplanation.data_used);
    assert.equal(res.body.signals.llm_reasoning.status, "live");
    assert.equal(res.body.signals.llm_reasoning.used, true);
    assert.equal(res.body.signals.llm_reasoning.source, "ollama_gemma");
  });
});

test("POST /api/omen/mvp-move falls back when LLM helper returns null", async () => {
  await withMockOmenLlm(async () => null, async () => {
    const res = await postMvpMove(baseRequest());

    assert.equal(res.status, 200);
    assert.equal(
      res.body.recommendation.explanation.summary,
      "Your best move is to start Marquise Vale over Trent Holloway."
    );
    assert.equal(res.body.signals.llm_reasoning.status, "stub");
    assert.notEqual(res.body.signals.llm_reasoning.source, "ollama_gemma");
  });
});

test("POST /api/omen/mvp-move falls back when LLM helper returns invalid output", async () => {
  await withMockOmenLlm(async () => ({
    summary: "",
    why_it_matters: "Not enough shape.",
    data_used: [],
  }), async () => {
    const res = await postMvpMove(baseRequest());

    assert.equal(res.status, 200);
    assert.equal(
      res.body.recommendation.explanation.summary,
      "Your best move is to start Marquise Vale over Trent Holloway."
    );
    assert.equal(res.body.signals.llm_reasoning.status, "stub");
  });
});

test("POST /api/omen/mvp-move marks matchup DvP live when context is available", async () => {
  await withMockOmenDvp(async (lookup) => {
    assert.equal(lookup.position, "WR");
    assert.equal(lookup.opponentTeam, "PHI");
    assert.equal(lookup.season, 2026);
    assert.equal(lookup.week, 8);
    return {
      opponent_team: "PHI",
      position: "WR",
      avg_points_allowed: 18.4,
      sample_weeks: 5,
      dvp_label: "favorable",
    };
  }, async () => {
    const res = await postMvpMove(baseRequest({
      include_signals: {
        weather: true,
        travel_home_away: true,
        game_time_tv: true,
        matchup_dvp: true,
        llm_reasoning: false,
      },
    }));

    assert.equal(res.status, 200);
    assert.equal(res.body.signals.matchup_dvp.status, "live");
    assert.equal(res.body.signals.matchup_dvp.used, true);
    assert.equal(res.body.signals.matchup_dvp.source, "nflverse_data");
    assert.match(res.body.signals.matchup_dvp.message, /nflverse-data/);
    assert.match(res.body.recommendation.confidence.rationale, /Matchup DvP is live/);
    assert.ok(res.body.recommendation.explanation.data_used.includes("matchup DvP"));
  });
});

test("POST /api/omen/mvp-move uses live DvP only when context shape is valid", async () => {
  await withMockOmenDvp(async () => ({
    opponent_team: "PHI",
    position: "WR",
    avg_points_allowed: 18.4,
    sample_weeks: 2,
    dvp_label: "favorable",
  }), async () => {
    const res = await postMvpMove(baseRequest({
      include_signals: {
        weather: true,
        travel_home_away: true,
        game_time_tv: true,
        matchup_dvp: true,
        llm_reasoning: false,
      },
    }));

    assert.equal(res.status, 200);
    assert.equal(res.body.signals.matchup_dvp.status, "stub");
    assert.equal(res.body.signals.matchup_dvp.used, false);
    assert.equal(res.body.signals.matchup_dvp.source, "pending_nflverse_data");
  });
});

test("POST /api/omen/mvp-move falls back when matchup DvP returns null", async () => {
  await withMockOmenDvp(async () => null, async () => {
    const res = await postMvpMove(baseRequest({
      include_signals: {
        weather: true,
        travel_home_away: true,
        game_time_tv: true,
        matchup_dvp: true,
        llm_reasoning: false,
      },
    }));

    assert.equal(res.status, 200);
    assert.equal(res.body.signals.matchup_dvp.status, "stub");
    assert.equal(res.body.signals.matchup_dvp.used, false);
    assert.equal(
      res.body.recommendation.confidence.rationale,
      "The projection gap is clear, but matchup DvP is still stubbed."
    );
  });
});

test("POST /api/omen/mvp-move skips matchup DvP when include_signals.matchup_dvp is false", async () => {
  let calls = 0;
  await withMockOmenDvp(async () => {
    calls += 1;
    return {
      opponent_team: "PHI",
      position: "WR",
      avg_points_allowed: 18.4,
      sample_weeks: 5,
      dvp_label: "favorable",
    };
  }, async () => {
    const res = await postMvpMove(baseRequest({
      include_signals: {
        weather: true,
        travel_home_away: true,
        game_time_tv: true,
        matchup_dvp: false,
        llm_reasoning: false,
      },
    }));

    assert.equal(res.status, 200);
    assert.equal(calls, 0);
    assert.equal(res.body.signals.matchup_dvp.status, "stub");
  });
});

test("POST /api/omen/mvp-move returns empty state", async () => {
  const res = await postMvpMove(baseRequest({ mock_state: "empty" }));

  assert.equal(res.status, 200);
  assertEnvelope(res.body, "empty");
  assert.equal(res.body.recommendation, null);
  assert.equal(typeof res.body.explanation.summary, "string");
  assert.equal(typeof res.body.confidence.score, "number");
});

test("POST /api/omen/mvp-move returns platform disconnected state", async () => {
  const res = await postMvpMove(baseRequest({
    platform: "sleeper",
    mock_state: "platform_disconnected",
  }));

  assert.equal(res.status, 200);
  assertEnvelope(res.body, "platform_disconnected");
  assert.equal(res.body.recommendation, null);
  assert.equal(res.body.platform.status, "disconnected");
  assert.equal(res.body.platform.recovery.code, "connect_platform");
  assert.equal(res.body.signals.roster.status, "unavailable");
});

for (const state of [
  "espn_reauth_required",
  "espn_league_context_missing",
  "espn_import_blocked",
  "espn_recovery_needed",
]) {
  test(`POST /api/omen/mvp-move returns ${state} recovery state`, async () => {
    const res = await postMvpMove(baseRequest({
      platform: "espn",
      mock_state: state,
    }));

    assert.equal(res.status, 200);
    assertEnvelope(res.body, state);
    assert.equal(res.body.recommendation, null);
    assert.equal(res.body.platform.name, "espn");
    assert.ok(res.body.platform.recovery.code);
    assert.equal(res.body.signals.roster.status, "unavailable");
    if (state === "espn_reauth_required") {
      assert.deepEqual(res.body.platform.recovery.fields_needed, ["ESPN_S2", "SWID"]);
    }
  });
}

for (const state of [
  "espn_reauth_required",
  "espn_league_context_missing",
  "espn_import_blocked",
  "espn_recovery_needed",
]) {
  test(`POST /api/omen/mvp-move does not call matchup DvP for ${state}`, async () => {
    let calls = 0;
    await withMockOmenDvp(async () => {
      calls += 1;
      return null;
    }, async () => {
      const res = await postMvpMove(baseRequest({
        platform: "espn",
        mock_state: state,
        include_signals: {
          weather: true,
          travel_home_away: true,
          game_time_tv: true,
          matchup_dvp: true,
          llm_reasoning: false,
        },
      }));

      assert.equal(res.status, 200);
      assert.equal(res.body.state, state);
      assert.equal(calls, 0);
    });
  });
}

for (const state of [
  "espn_reauth_required",
  "espn_league_context_missing",
  "espn_import_blocked",
  "espn_recovery_needed",
]) {
  test(`POST /api/omen/mvp-move does not call LLM for ${state}`, async () => {
    let calls = 0;
    await withMockOmenLlm(async () => {
      calls += 1;
      return null;
    }, async () => {
      const res = await postMvpMove(baseRequest({
        platform: "espn",
        mock_state: state,
      }));

      assert.equal(res.status, 200);
      assert.equal(res.body.state, state);
      assert.equal(calls, 0);
    });
  });
}

test("POST /api/omen/mvp-move does not call LLM for platform disconnected state", async () => {
  let calls = 0;
  await withMockOmenLlm(async () => {
    calls += 1;
    return null;
  }, async () => {
    const res = await postMvpMove(baseRequest({
      platform: "sleeper",
      mock_state: "platform_disconnected",
    }));

    assert.equal(res.status, 200);
    assert.equal(res.body.state, "platform_disconnected");
    assert.equal(calls, 0);
  });
});

test("POST /api/omen/mvp-move does not call matchup DvP for platform disconnected state", async () => {
  let calls = 0;
  await withMockOmenDvp(async () => {
    calls += 1;
    return null;
  }, async () => {
    const res = await postMvpMove(baseRequest({
      platform: "sleeper",
      mock_state: "platform_disconnected",
      include_signals: {
        weather: true,
        travel_home_away: true,
        game_time_tv: true,
        matchup_dvp: true,
        llm_reasoning: false,
      },
    }));

    assert.equal(res.status, 200);
    assert.equal(res.body.state, "platform_disconnected");
    assert.equal(calls, 0);
  });
});

test("POST /api/omen/mvp-move returns stable error state", async () => {
  const res = await postMvpMove(baseRequest({ mock_state: "error" }));

  assert.equal(res.status, 500);
  assertEnvelope(res.body, "error");
  assert.equal(res.body.recommendation, null);
  assert.equal(res.body.error.code, "omen_generation_failed");
  assert.equal(res.body.error.retryable, true);
});

test("POST /api/omen/mvp-move does not call LLM for error state", async () => {
  let calls = 0;
  await withMockOmenLlm(async () => {
    calls += 1;
    return null;
  }, async () => {
    const res = await postMvpMove(baseRequest({ mock_state: "error" }));

    assert.equal(res.status, 500);
    assert.equal(res.body.state, "error");
    assert.equal(calls, 0);
  });
});

test("POST /api/omen/mvp-move does not call matchup DvP for error state", async () => {
  let calls = 0;
  await withMockOmenDvp(async () => {
    calls += 1;
    return null;
  }, async () => {
    const res = await postMvpMove(baseRequest({
      mock_state: "error",
      include_signals: {
        weather: true,
        travel_home_away: true,
        game_time_tv: true,
        matchup_dvp: true,
        llm_reasoning: false,
      },
    }));

    assert.equal(res.status, 500);
    assert.equal(res.body.state, "error");
    assert.equal(calls, 0);
  });
});

test("POST /api/omen/mvp-move skips LLM when include_signals.llm_reasoning is false", async () => {
  let calls = 0;
  await withMockOmenLlm(async () => {
    calls += 1;
    return {
      summary: "Should not be used.",
      why_it_matters: "Should not be used.",
      risk: "Should not be used.",
      confidence: "Should not be used.",
      data_used: ["should not be used"],
    };
  }, async () => {
    const res = await postMvpMove(baseRequest({
      include_signals: {
        weather: true,
        travel_home_away: true,
        game_time_tv: true,
        matchup_dvp: false,
        llm_reasoning: false,
      },
    }));

    assert.equal(res.status, 200);
    assert.equal(calls, 0);
    assert.equal(
      res.body.recommendation.explanation.summary,
      "Your best move is to start Marquise Vale over Trent Holloway."
    );
    assert.equal(res.body.signals.llm_reasoning.status, "stub");
  });
});

test("POST /api/omen/mvp-move rejects unsupported platform with error envelope", async () => {
  const res = await postMvpMove(baseRequest({ platform: "nfl" }));

  assert.equal(res.status, 400);
  assertEnvelope(res.body, "error");
  assert.equal(res.body.error.code, "omen_generation_failed");
});

test("POST /api/omen/mvp-move rejects unsupported mock_state with error envelope", async () => {
  const res = await postMvpMove(baseRequest({ mock_state: "surprise_me" }));

  assert.equal(res.status, 400);
  assertEnvelope(res.body, "error");
  assert.equal(res.body.error.code, "omen_generation_failed");
});
