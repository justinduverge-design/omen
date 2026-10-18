"use strict";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "test-service-key";

const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeYahooPool, yahooPercentOwned } = require("../src/services/roster");
const YahooClient = require("../src/services/yahoo");
const { withinBudget } = require("../src/adapters/yahoo");

/**
 * G6 (Yahoo free agents vs waivers, percent owned) and G8 (per-team time budget). Absent provider
 * fields stay absent: `percent_owned` is null when Yahoo did not send it, never 0.
 */

function playerNode(key, name, percent) {
  const meta = [{ player_key: key }, { player_id: key.split(".").pop() }, { name: { full: name } },
    { editorial_team_abbr: "KC" }, { eligible_positions: [{ position: "WR" }] }];
  const node = [meta];
  if (percent !== undefined) node.push({ percent_owned: [{ coverage_type: "week" }, { value: percent }] });
  return { player: node };
}

function poolResponse(nodes) {
  const players = { count: nodes.length };
  nodes.forEach((node, i) => { players[String(i)] = node; });
  return { fantasy_content: { league: [{}, { players }] } };
}

test("percent owned reads Yahoo's nested value, and absent means null", () => {
  assert.equal(yahooPercentOwned(playerNode("n.p.1", "A", "34").player), 34);
  assert.equal(yahooPercentOwned(playerNode("n.p.1", "A").player), null);
  assert.equal(yahooPercentOwned(playerNode("n.p.1", "A", "abc").player), null);
  assert.equal(yahooPercentOwned(playerNode("n.p.1", "A", "140").player), null);
});

test("the split pool tags availability and keeps the stricter one for a player seen in both", () => {
  const pool = normalizeYahooPool({
    pages: [
      { availability: "free_agent", raw: poolResponse([playerNode("n.p.1", "Free Guy", "12"), playerNode("n.p.2", "Both Guy", "40")]) },
      { availability: "waivers", raw: poolResponse([playerNode("n.p.2", "Both Guy", "40"), playerNode("n.p.3", "Wire Guy")]) },
    ],
  });
  const byKey = Object.fromEntries(pool.map((p) => [p.player_key, p]));
  assert.equal(pool.length, 3);
  assert.equal(byKey["n.p.1"].availability, "free_agent");
  assert.equal(byKey["n.p.1"].percent_owned, 12);
  assert.equal(byKey["n.p.2"].availability, "waivers");
  assert.equal(byKey["n.p.3"].percent_owned, null);
});

test("getAvailablePlayerPool asks for FA and W with ownership, and names a failed status", async () => {
  const client = new YahooClient("token");
  const paths = [];
  client.get = async (path) => {
    paths.push(path);
    if (path.includes("status=W")) throw new Error("down");
    return poolResponse([playerNode("n.p.1", "Free Guy", "12")]);
  };
  const result = await client.getAvailablePlayerPool("nfl.l.1", { count: 25 });
  assert.ok(paths.some((p) => p.includes("status=FA") && p.includes(";out=percent_owned")));
  assert.ok(paths.some((p) => p.includes("status=W")));
  assert.deepEqual(result.failed, ["waivers"]);
  assert.equal(result.pages.length, 1);
  assert.equal(result.truncated, false);
});

test("getAvailablePlayers without new options is the same call it always was", async () => {
  const client = new YahooClient("token");
  const paths = [];
  client.get = async (path) => { paths.push(path); return poolResponse([]); };
  await client.getAvailablePlayers("nfl.l.1", { count: 25 });
  assert.deepEqual(paths, ["/league/nfl.l.1/players;status=A;sort=AR;count=25;start=0"]);
});

test("a team roster read past its budget rejects as a timeout, and a fast one resolves", async () => {
  await assert.rejects(withinBudget(new Promise(() => {}), 10), { code: "team_roster_timeout" });
  assert.equal(await withinBudget(Promise.resolve("roster"), 1000), "roster");
});
