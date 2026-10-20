"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("ESPN and Yahoo personalize like Sleeper: league slots, size and own roster; unread scoring is not claimed", async () => {
  const { resolveTradeLeagueContext } = require("../src/services/tradeLeagueContext");
  for (const row of [
    { platform: "espn", league_id: "L1", is_active: true, espn_secret_id: "s", swid_secret_id: "w", espn_team_id: "3" },
    { platform: "yahoo", league_id: "461.l.9", is_active: true, token_secret_id: "t" },
  ]) {
    let seenUser = null;
    const result = await resolveTradeLeagueContext({
      userId: "u1",
      deps: {
        getConnections: async () => [row],
        readProviderContext: async (connection, userId) => {
          seenUser = userId;
          return {
            scoringFormat: row.platform === "espn" ? "half_ppr" : null,
            rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "BN"],
            teamCount: 10,
            rosterPlayers: [{ position: "RB" }, { position: "WR" }],
            leagueName: "Test",
          };
        },
      },
    });
    assert.equal(result.status, "personalized", row.platform);
    assert.equal(seenUser, "u1");
    assert.ok(result.applied.includes("roster_construction"));
    assert.equal(result.applied.includes("scoring_format"), row.platform === "espn", "unread scoring is not claimed");
  }
});
