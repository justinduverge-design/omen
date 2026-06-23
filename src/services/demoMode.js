"use strict";

const { evaluateLineup } = require("./optimizer");

const DEMO_CONTRACT_VERSION = "omen-demo.v1";
const DEMO_SEASON = 2026;
const DEMO_WEEK = 1;

const DEMO_ROSTER_FIXTURE = Object.freeze({
  source: "demo_fixture",
  platform: "demo",
  league_key: "demo-league-omen",
  team_key: "demo-team-ravens",
  week: DEMO_WEEK,
  slots: Object.freeze({
    starters: Object.freeze([
      Object.freeze({
        player_key: "demo:qb:starter",
        player_id: "demo-qb-starter",
        name: "Sample QB Starter",
        position: "QB",
        eligible_positions: Object.freeze(["QB"]),
        selected_position: "QB",
        team: "BAL",
        opponent: "CLE",
        status: null,
        projected_points: 20.4,
        actual_points: null,
        image_url: null,
        is_starter: true,
      }),
      Object.freeze({
        player_key: "demo:rb:starter:1",
        player_id: "demo-rb-starter-1",
        name: "Sample RB Starter",
        position: "RB",
        eligible_positions: Object.freeze(["RB", "FLEX"]),
        selected_position: "RB",
        team: "CHI",
        opponent: "GB",
        status: null,
        projected_points: 11.2,
        actual_points: null,
        image_url: null,
        is_starter: true,
      }),
      Object.freeze({
        player_key: "demo:rb:starter:2",
        player_id: "demo-rb-starter-2",
        name: "Sample RB Two",
        position: "RB",
        eligible_positions: Object.freeze(["RB", "FLEX"]),
        selected_position: "RB",
        team: "DET",
        opponent: "MIN",
        status: null,
        projected_points: 15.1,
        actual_points: null,
        image_url: null,
        is_starter: true,
      }),
      Object.freeze({
        player_key: "demo:wr:starter:1",
        player_id: "demo-wr-starter-1",
        name: "Sample WR One",
        position: "WR",
        eligible_positions: Object.freeze(["WR", "FLEX"]),
        selected_position: "WR",
        team: "DAL",
        opponent: "PHI",
        status: null,
        projected_points: 16.3,
        actual_points: null,
        image_url: null,
        is_starter: true,
      }),
      Object.freeze({
        player_key: "demo:wr:starter:2",
        player_id: "demo-wr-starter-2",
        name: "Sample WR Two",
        position: "WR",
        eligible_positions: Object.freeze(["WR", "FLEX"]),
        selected_position: "WR",
        team: "MIA",
        opponent: "BUF",
        status: "Q",
        projected_points: 13.4,
        actual_points: null,
        image_url: null,
        is_starter: true,
      }),
      Object.freeze({
        player_key: "demo:te:starter",
        player_id: "demo-te-starter",
        name: "Sample TE Starter",
        position: "TE",
        eligible_positions: Object.freeze(["TE", "FLEX"]),
        selected_position: "TE",
        team: "KC",
        opponent: "LV",
        status: null,
        projected_points: 10.6,
        actual_points: null,
        image_url: null,
        is_starter: true,
      }),
      Object.freeze({
        player_key: "demo:flex:starter",
        player_id: "demo-flex-starter",
        name: "Sample Flex Starter",
        position: "WR",
        eligible_positions: Object.freeze(["WR", "FLEX"]),
        selected_position: "FLEX",
        team: "SEA",
        opponent: "LAR",
        status: null,
        projected_points: 12.8,
        actual_points: null,
        image_url: null,
        is_starter: true,
      }),
    ]),
    bench: Object.freeze([
      Object.freeze({
        player_key: "demo:rb:bench",
        player_id: "demo-rb-bench",
        name: "Sample RB Breakout",
        position: "RB",
        eligible_positions: Object.freeze(["RB"]),
        selected_position: "BN",
        team: "ATL",
        opponent: "TB",
        status: null,
        projected_points: 16.8,
        actual_points: null,
        image_url: null,
        is_starter: false,
      }),
      Object.freeze({
        player_key: "demo:wr:bench",
        player_id: "demo-wr-bench",
        name: "Sample WR Bench",
        position: "WR",
        eligible_positions: Object.freeze(["WR"]),
        selected_position: "BN",
        team: "HOU",
        opponent: "IND",
        status: null,
        projected_points: 11.7,
        actual_points: null,
        image_url: null,
        is_starter: false,
      }),
      Object.freeze({
        player_key: "demo:te:bench",
        player_id: "demo-te-bench",
        name: "Sample TE Bench",
        position: "TE",
        eligible_positions: Object.freeze(["TE"]),
        selected_position: "BN",
        team: "ARI",
        opponent: "SF",
        status: null,
        projected_points: 7.9,
        actual_points: null,
        image_url: null,
        is_starter: false,
      }),
      Object.freeze({
        player_key: "demo:qb:bench",
        player_id: "demo-qb-bench",
        name: "Sample QB Bench",
        position: "QB",
        eligible_positions: Object.freeze(["QB"]),
        selected_position: "BN",
        team: "LAC",
        opponent: "DEN",
        status: null,
        projected_points: 18.1,
        actual_points: null,
        image_url: null,
        is_starter: false,
      }),
    ]),
    ir: Object.freeze([
      Object.freeze({
        player_key: "demo:wr:ir",
        player_id: "demo-wr-ir",
        name: "Sample WR Reserve",
        position: "WR",
        eligible_positions: Object.freeze(["WR", "FLEX"]),
        selected_position: "IR",
        team: "NYJ",
        opponent: null,
        status: "IR",
        projected_points: 0,
        actual_points: null,
        image_url: null,
        is_starter: false,
      }),
    ]),
  }),
});

function cloneFixture(value) {
  return JSON.parse(JSON.stringify(value));
}

function findRosterPlayer(roster, playerKey) {
  return [
    ...roster.slots.starters,
    ...roster.slots.bench,
    ...roster.slots.ir,
  ].find((player) => player.player_key === playerKey) || null;
}

function demoSignal(source, message) {
  return {
    status: "demo",
    used: true,
    source,
    message,
  };
}

function buildDemoOmen(roster, swap, generatedAt) {
  const startPlayer = findRosterPlayer(roster, swap.to.player_key) || swap.to;
  const sitPlayer = findRosterPlayer(roster, swap.from.player_key) || swap.from;
  const slot = swap.slot || sitPlayer.selected_position || sitPlayer.position || "lineup";
  const confidenceScore = Number(swap.confidence) || 50;
  const riskLevel = startPlayer.status ? "medium" : "low";

  return {
    state: "success",
    feature: "omen_mvp_move",
    mode: "demo",
    is_demo: true,
    is_live: false,
    is_mock: false,
    request_id: "demo_omen_start_sit_001",
    generated_at: generatedAt,
    platform: {
      name: "demo",
      status: "demo",
      recovery: null,
    },
    league: {
      id: roster.league_key,
      name: "Omen Demo League",
      season: DEMO_SEASON,
      week: roster.week,
      scoring_format: "ppr",
    },
    team: {
      id: roster.team_key,
      name: "The Sample Rookery",
    },
    signals: {
      roster: demoSignal("demo_roster_fixture", "Roster context comes from the deterministic Omen demo fixture."),
      projections: demoSignal("demo_projection_fixture", "Projected points are sample values for demonstrating Omen behavior."),
      matchup_dvp: demoSignal("demo_matchup_fixture", "Matchup context is illustrative and is not current NFL data."),
      llm_reasoning: demoSignal("demo_explanation_template", "Explanation is deterministic and does not call an LLM."),
    },
    recommendation: {
      id: "demo_omen_start_sit_001",
      type: "start_sit",
      title: `Start ${startPlayer.name} over ${sitPlayer.name}`,
      move: `Move ${startPlayer.name} into your ${slot} slot and bench ${sitPlayer.name}.`,
      primary_player: {
        id: startPlayer.player_key,
        name: startPlayer.name,
        position: startPlayer.position,
        team: startPlayer.team,
        opponent_team: startPlayer.opponent,
      },
      comparison_player: {
        id: sitPlayer.player_key,
        name: sitPlayer.name,
        position: sitPlayer.position,
        team: sitPlayer.team,
        opponent_team: sitPlayer.opponent,
      },
      expected_value_delta: {
        points: swap.delta,
        label: swap.delta >= 5 ? "major" : swap.delta >= 2 ? "meaningful" : "small",
      },
      confidence: {
        score: confidenceScore,
        label: confidenceScore >= 80 ? "high" : confidenceScore >= 65 ? "medium-high" : "medium",
        rationale: `The demo optimizer sees a ${swap.delta.toFixed(2)} point edge in the sample lineup.`,
      },
      risk: {
        level: riskLevel,
        reasons: [
          "The roster and projections are deterministic sample data, not current league information.",
          "A real recommendation can change with injuries, matchups, scoring settings, and roster context.",
        ],
      },
      explanation: {
        summary: `Start ${startPlayer.name} over ${sitPlayer.name}.`,
        why_it_matters: `${startPlayer.name} improves the sample lineup by ${swap.delta.toFixed(2)} projected points.`,
        risk: "This demonstrates the decision shape only; it is not live fantasy advice.",
        confidence: `Confidence is ${confidenceScore} out of 100 for this deterministic demo scenario.`,
        data_used: [
          "deterministic demo roster",
          "sample projected points",
          "sample player availability",
        ],
      },
    },
    alternatives: [],
    warnings: [
      "Demo Mode uses sample data and never mixes with connected league data.",
      "Generate a live Omen only after explicitly connecting a league and leaving Demo Mode.",
    ],
  };
}

function buildDemoModeResponse(now = new Date()) {
  const generatedAt = now.toISOString();
  const roster = cloneFixture(DEMO_ROSTER_FIXTURE);
  const [swap] = evaluateLineup(roster);

  if (!swap) {
    throw new Error("demo_fixture_invalid: expected a lineup recommendation");
  }

  return {
    contract_version: DEMO_CONTRACT_VERSION,
    feature: "omen_demo",
    mode: "demo",
    is_demo: true,
    is_live: false,
    is_mock: false,
    generated_at: generatedAt,
    demo_notice: {
      label: "Demo Mode",
      message: "Sample league and roster data. This is not live fantasy advice.",
      deterministic_fixture: true,
      requires_explicit_live_switch: true,
    },
    telemetry: {
      analytics_eligible: false,
      llm_training_eligible: false,
    },
    roster,
    omen: buildDemoOmen(roster, swap, generatedAt),
  };
}

module.exports = {
  DEMO_CONTRACT_VERSION,
  DEMO_ROSTER_FIXTURE,
  buildDemoModeResponse,
};
