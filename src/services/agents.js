"use strict";

/**
 * MVP Move Agent Orchestration Service
 *
 * Runs six specialized sub-agents then a Manager Agent to produce
 * ONE weekly move recommendation per user.
 *
 * External data stubs are clearly marked: // STUB: replace with [API name]
 * All stub functions return realistic placeholder data structured to match
 * the real API shape so future replacement is a drop-in.
 *
 * Pure functions (formatVORPBlock, formatScarcityBlock, vorpLetterGrade,
 * scarcityLevel) are fully testable without any I/O.
 */

const fs   = require("fs");
const path = require("path");
const { vorpForPlayer, SCARCITY_BONUS } = require("./vorp");
const { runAgent } = require("./llm");
const nflSchedule   = require("./nflSchedule");
const weatherService = require("./weatherService");
const { getDvpContext } = require("./matchupService");

// ── Prompt templates ────────────────────────────────────────────────────────

// Load sub-agent system prompts from the DBS prompt blueprints.
// Each is a short system prompt string extracted from sub_agents.md.
// We define them inline here to keep the service self-contained.
const SUB_AGENT_PROMPTS = Object.freeze({
  weather:  "You are the Omen Weather Agent. Reply with exactly one sentence summarizing fantasy football impact. Format: \"[Condition summary] — [fantasy impact]\"",
  travel:   "You are the Omen Travel Agent. Reply with exactly one sentence summarizing fantasy football impact. Format: \"[Game situation] — [fantasy impact]\"",
  gametime: "You are the Omen Game Time Agent. Reply with exactly one sentence summarizing fantasy football impact. Format: \"[Kickoff context] — [fantasy impact]\"",
  roster:   "You are the Omen Roster Agent. Reply with exactly one sentence summarizing the roster situation and fantasy impact. Format: \"[Roster situation] — [fantasy impact]\"",
  perf:     "You are the Omen Performance Agent. Reply with exactly one sentence summarizing performance trend and VORP context. You MUST reference the VORP grade. Format: \"[Trend summary with VORP grade] — [projection implication]\"",
  matchup:  "You are the Omen Matchup Agent. Reply with exactly one sentence summarizing matchup quality. You MUST include the DvP rank. Format: \"[Defense rank vs position] — [scheme insight]\"",
});

// ── VORP grade mapping ───────────────────────────────────────────────────────

/**
 * Map numeric VORP to letter grade for Manager Agent consumption.
 * Thresholds calibrated to match typical 12-team PPR ranges.
 */
function vorpLetterGrade(vorp) {
  const v = Number(vorp) || 0;
  if (v >= 12) return "A+";
  if (v >= 9)  return "A";
  if (v >= 6)  return "B+";
  if (v >= 3)  return "B";
  if (v >= 1)  return "C+";
  if (v >= 0)  return "C";
  return "D";
}

// ── Scarcity level mapping ───────────────────────────────────────────────────

/**
 * Map position tier distribution across a roster to scarcity level.
 * Used to populate the SCARCITY_BLOCK for the Manager Agent.
 *
 * Logic: if any player at this position is elite, the position is
 * ADEQUATE for the owner (they have it covered). Scarcity reflects
 * how hard it is to FIND a replacement on waivers — not what you own.
 *
 * TE is inherently scarcer than RB/WR — hard floor applied.
 */
function scarcityLevel(position) {
  // Position-based baseline scarcity (waiver wire difficulty).
  // STUB: replace with live waiver wire depth data when Sportradar is wired.
  const baselines = {
    QB:  { level: "MODERATE",  bonus: 5 },
    RB:  { level: "HIGH",      bonus: 12 },
    WR:  { level: "MODERATE",  bonus: 5 },
    TE:  { level: "CRITICAL",  bonus: 20 },
    K:   { level: "ADEQUATE",  bonus: 0 },
    DST: { level: "ADEQUATE",  bonus: 0 },
    DEF: { level: "ADEQUATE",  bonus: 0 },
  };
  const norm = String(position || "").toUpperCase().replace("D/ST", "DST");
  return baselines[norm] || { level: "ADEQUATE", bonus: 0 };
}

// ── VORP block formatter ─────────────────────────────────────────────────────

/**
 * Format a VORP table for injection into the Manager Agent system prompt.
 * players: array of normalized player objects (from platform adapter)
 * scoringFormat: "ppr" | "half_ppr" | "standard"
 * Returns a human-readable string block.
 */
function formatVORPBlock(players, scoringFormat = "ppr") {
  if (!players || !players.length) return "No roster data available.";

  const rows = players
    .filter(p => p && (p.name || p.full_name))
    .map(p => {
      const result = vorpForPlayer(p, { scoringFormat });
      const grade  = vorpLetterGrade(result.vorp);
      const name   = (p.name || p.full_name || "Unknown").padEnd(22);
      const pos    = (result.position || "UNK").padEnd(5);
      const vorp   = result.vorp >= 0
        ? `+${result.vorp.toFixed(1)}`.padStart(6)
        : `${result.vorp.toFixed(1)}`.padStart(6);
      return `  ${name} ${pos} VORP ${vorp}  Grade: ${grade}  Tier: ${result.tier}`;
    })
    .join("\n");

  return `VORP TABLE (${scoringFormat.toUpperCase()} scoring):\n${rows}`;
}

// ── Scarcity block formatter ─────────────────────────────────────────────────

/**
 * Format a positional scarcity report for injection into the Manager Agent.
 * players: array of normalized player objects
 * Returns a human-readable string block.
 */
function formatScarcityBlock(players, scoringFormat = "ppr") {
  const positions = ["QB", "RB", "WR", "TE"];
  const lines = positions.map(pos => {
    const { level, bonus } = scarcityLevel(pos);
    const bonusStr = bonus > 0 ? `  confidenceBonus: +${bonus}` : "  confidenceBonus: 0";
    return `  ${pos.padEnd(4)} ${level.padEnd(10)}${bonusStr}`;
  });

  return `POSITIONAL SCARCITY (waiver wire availability):\n${lines.join("\n")}\n\nApply the confidenceBonus for the target player's position to your base confidence score.`;
}

// ── Stub fallback data ───────────────────────────────────────────────────────
// Used when real APIs are unavailable (offseason, API key missing, network error).

const WEATHER_STUB = Object.freeze({
  temp_f: 65, wind_mph: 7, conditions: "Partly cloudy", precip_chance: 10,
});
const TRAVEL_STUB = Object.freeze({
  home_away: "Home", rest_days: 7, travel_miles: 0, back_to_back: false,
});
const GAMETIME_STUB = Object.freeze({
  kickoff_time: "1:00PM ET", tv_slate: "Early 1PM",
  playoff_implications: "Game context unavailable (offseason or bye week)",
});
const MATCHUP_STUB = Object.freeze({
  defense_name: "Opponent Defense",
  dvp_rank:     16,
  pts_allowed:  20.0,
  scheme:       "Unknown",
  key_defender: "No injury information available",
});

/**
 * Fetch weather data for the target player's game venue.
 * gameInfo: result from nflSchedule.getGameInfo(), or null.
 * Returns real weather if available, stub if not (dome game or API unavailable).
 */
async function fetchWeatherData(gameInfo) {
  if (!gameInfo) return WEATHER_STUB;
  if (gameInfo.is_dome) {
    return {
      ...WEATHER_STUB,
      conditions:    `Dome game at ${gameInfo.venue_name} - weather neutral`,
      precip_chance: 0,
      wind_mph:      0,
    };
  }
  const real = await weatherService.getVenueWeather({
    lat:     gameInfo.venue_lat,
    lng:     gameInfo.venue_lng,
    is_dome: gameInfo.is_dome,
  }).catch(() => null);
  return real || WEATHER_STUB;
}

/**
 * Fetch travel and rest data for the target player's game.
 * gameInfo: result from nflSchedule.getGameInfo(), or null.
 */
async function fetchTravelData(gameInfo) {
  if (!gameInfo) return TRAVEL_STUB;
  return {
    home_away:    gameInfo.home_away,
    rest_days:    7,   // TODO: compute from last game date once schedule history is available
    travel_miles: gameInfo.travel_miles || 0,
    back_to_back: false, // TODO: compute from consecutive away games
  };
}

/**
 * Fetch game time and slate data.
 * gameInfo: result from nflSchedule.getGameInfo(), or null.
 */
async function fetchGameTimeData(gameInfo) {
  if (!gameInfo) return GAMETIME_STUB;
  return {
    kickoff_time:         gameInfo.kickoff_local,
    tv_slate:             gameInfo.tv_slate,
    playoff_implications: "Not computed - add record-based logic in a future session",
  };
}

async function fetchMatchupData(playerInfo) {
  try {
    return await getDvpContext({
      position:     playerInfo?.position,
      opponentTeam: playerInfo?.opponent,
      season:       playerInfo?.season || new Date().getFullYear(),
      week:         playerInfo?.week || 1,
    });
  } catch {
    return null;
  }
}

// ── Sub-agent runners ────────────────────────────────────────────────────────

/**
 * Build the user prompt for a single sub-agent and call the LLM.
 * Returns the agent's one-sentence signal string, or a fallback.
 */
async function runSubAgent(agentName, templateVars) {
  const system = SUB_AGENT_PROMPTS[agentName];
  if (!system) return `[${agentName} agent unavailable]`;

  const varStr = Object.entries(templateVars)
    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
    .join(", ");

  const user = `Game context: ${varStr}. Provide your one-sentence signal.`;

  const result = await runAgent(system, user, { maxTokens: 80 });
  return result || `[${agentName} agent: LLM unavailable — using stub signal]`;
}

/**
 * Run all six sub-agents and return the signals object.
 * targetPlayer: the primary player for this week's recommendation.
 * roster: normalized player array (for Roster + Performance agents).
 * scoringFormat: string.
 */
async function buildSignals(targetPlayer, roster, scoringFormat) {
  // Fetch game info for the target player's team (schedule + venue).
  // Returns null during offseason or on API failure; all fetch functions handle null gracefully.
  const gameInfo = await nflSchedule
    .getGameInfo(targetPlayer.team || targetPlayer.nfl_team)
    .catch(() => null);

  // Fetch external data in parallel where possible.
  const [weather, travel, gametime] = await Promise.all([
    fetchWeatherData(gameInfo),
    fetchTravelData(gameInfo),
    fetchGameTimeData(gameInfo),
  ]);
  const matchupContext = await fetchMatchupData({
    position: targetPlayer.position,
    opponent: gameInfo?.opponent_abbr,
    season:   targetPlayer.season,
    week:     targetPlayer.week,
  });
  const matchup = matchupContext
    ? {
        defense_name: matchupContext.opponent_team,
        dvp_rank:     matchupContext.dvp_label,
        pts_allowed:  matchupContext.avg_points_allowed,
        scheme:       `${matchupContext.sample_weeks}-game nflverse-data sample`,
        key_defender: "Not modeled",
      }
    : MATCHUP_STUB;

  // Performance agent uses live VORP data.
  const vorpResult = vorpForPlayer(targetPlayer, { scoringFormat });
  const grade      = vorpLetterGrade(vorpResult.vorp);

  // Roster agent uses live player status from the platform adapter.
  const status   = targetPlayer.status || "Active";
  const position = targetPlayer.position || "UNK";
  const name     = targetPlayer.name || targetPlayer.full_name || "Unknown";

  const [weatherSignal, travelSignal, gametimeSignal, rosterSignal, perfSignal, matchupSignal] =
    await Promise.all([
      runSubAgent("weather", {
        temp_f:        weather.temp_f,
        wind_mph:      weather.wind_mph,
        conditions:    weather.conditions,
        precip_chance: weather.precip_chance,
      }),
      runSubAgent("travel", {
        home_away:    travel.home_away,
        rest_days:    travel.rest_days,
        travel_miles: travel.travel_miles,
        back_to_back: travel.back_to_back,
      }),
      runSubAgent("gametime", {
        kickoff_time:         gametime.kickoff_time,
        tv_slate:             gametime.tv_slate,
        playoff_implications: gametime.playoff_implications,
      }),
      runSubAgent("roster", {
        player_name:     name,
        position,
        injury_status:   status,
        upstream_status: "Not available",
        depth_change:    "Not available",
        target_share:    "Not available",
      }),
      runSubAgent("perf", {
        player_name: name,
        position,
        vorp_grade:  grade,
        vorp_value:  vorpResult.vorp,
        tier:        vorpResult.tier,
        scoring:     scoringFormat,
      }),
      runSubAgent("matchup", {
        defense_name: matchup.defense_name,
        pos:          position,
        dvp_rank:     matchup.dvp_rank,
        pts_allowed:  matchup.pts_allowed,
        scheme:       matchup.scheme,
        key_defender: matchup.key_defender,
      }),
    ]);

  return {
    weather:  weatherSignal,
    travel:   travelSignal,
    gametime: gametimeSignal,
    roster:   rosterSignal,
    perf:     perfSignal,
    matchup:  matchupSignal,
  };
}

// ── Manager Agent runner ─────────────────────────────────────────────────────

/**
 * Build the Manager Agent prompt and call the LLM.
 * Returns parsed JSON recommendation or null on failure.
 */
async function runManagerAgent({ signals, vorpBlock, scarcityBlock, context }) {
  // Read the manager agent system prompt template.
  let systemTemplate;
  try {
    systemTemplate = fs.readFileSync(
      path.join(__dirname, "..", "..", "Blueprints", "prompts", "manager_agent.md"), "utf8"
    );
    // Extract the system prompt block (between the ``` markers after "## System Prompt")
    const match = systemTemplate.match(/## System Prompt\n\n```\n([\s\S]*?)\n```/);
    systemTemplate = match ? match[1] : systemTemplate;
  } catch {
    // Fallback: inline condensed version if file read fails
    systemTemplate =
      "You are the Omen Manager Agent. " +
      "Synthesize the agent signals and math facts into ONE weekly move. " +
      "Return ONLY valid JSON with: moveType, headline, targetPlayer, targetPosition, " +
      "confidence, vorpGrade, scarcityBonus, reasoning, shortVerdict, dataSource.";
  }

  const calibrationBlock = "No historical calibration data available yet.";

  const systemPrompt = systemTemplate
    .replace("{{VORP_BLOCK}}", vorpBlock)
    .replace("{{SCARCITY_BLOCK}}", scarcityBlock)
    .replace("{{CALIBRATION_BLOCK}}", calibrationBlock);

  const userPrompt =
    `AGENT INTELLIGENCE REPORT:\n\n` +
    `WEATHER:     ${signals.weather}\n` +
    `TRAVEL:      ${signals.travel}\n` +
    `GAME TIME:   ${signals.gametime}\n` +
    `ROSTER:      ${signals.roster}\n` +
    `PERFORMANCE: ${signals.perf}\n` +
    `MATCHUP:     ${signals.matchup}\n\n` +
    `SCORING FORMAT: ${context.scoringFormat}\n` +
    `TEAM RECORD:    ${context.record || "Unknown"}\n\n` +
    `Generate the single best move for this GM this week.`;

  const raw = await runAgent(systemPrompt, userPrompt, { maxTokens: 500 });
  if (!raw) return null;

  // Parse JSON from Manager Agent response.
  // Gemma may wrap in markdown code fences — strip them first.
  try {
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed  = JSON.parse(cleaned);
    return { ...parsed, dataSource: "gemma-hostinger" };
  } catch {
    // Return structured fallback with the raw text as reasoning.
    return {
      moveType:       "Unknown",
      headline:       "LLM response could not be parsed",
      targetPlayer:   "Unknown",
      targetPosition: "UNK",
      confidence:     0,
      vorpGrade:      "N/A",
      scarcityBonus:  0,
      reasoning:      raw.slice(0, 300),
      shortVerdict:   "Response parse error — check LLM output.",
      dataSource:     "gemma-hostinger-parse-error",
    };
  }
}

// ── Top-level orchestrator ───────────────────────────────────────────────────

/**
 * getMVPMove — entry point called by the route.
 *
 * players:       normalized player array from the platform adapter
 * opts.scoringFormat: "ppr" | "half_ppr" | "standard"
 * opts.record:   team record string e.g. "7-4"
 *
 * Returns: { recommendation, signals, vorp_block, scarcity_block, generated_at }
 * Returns null recommendation if LLM is unavailable.
 */
async function getMVPMove(players, opts = {}) {
  const scoringFormat = opts.scoringFormat || "ppr";
  const record        = opts.record || "Unknown";

  // Build math blocks from live VORP engine.
  const vorpBlock     = formatVORPBlock(players, scoringFormat);
  const scarcityBlock = formatScarcityBlock(players, scoringFormat);

  // Select the primary target player: highest VORP starter on the roster.
  // When real waiver data and matchup data are wired, this becomes smarter.
  // STUB: currently uses the best VORP player as the "target" for all agents.
  const scored = players
    .filter(p => p && (p.name || p.full_name))
    .map(p => ({ player: p, vorp: vorpForPlayer(p, { scoringFormat }).vorp }))
    .sort((a, b) => b.vorp - a.vorp);

  const targetPlayer = scored.length ? scored[0].player : (players[0] || {});

  // Run all 6 sub-agents in parallel.
  const signals = await buildSignals({ ...targetPlayer, week: opts.week }, players, scoringFormat);

  // Run Manager Agent.
  const recommendation = await runManagerAgent({
    signals,
    vorpBlock,
    scarcityBlock,
    context: { scoringFormat, record },
  });

  return {
    recommendation,
    signals,
    vorp_block:     vorpBlock,
    scarcity_block: scarcityBlock,
    generated_at:   new Date().toISOString(),
    scoring_format: scoringFormat,
    note:           "Schedule + travel + gametime: live (ESPN API). Weather: live if OPENWEATHER_API_KEY is set. Matchup DvP: live via nflverse-data when current-week opponent and trailing sample are available; otherwise stub fallback.",
  };
}

module.exports = {
  // Pure functions — fully unit-testable
  vorpLetterGrade,
  scarcityLevel,
  formatVORPBlock,
  formatScarcityBlock,
  // Orchestration
  buildSignals,
  runManagerAgent,
  getMVPMove,
};
