"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const memberships = require("../src/services/leagueMemberships");
const { createLeagueMembershipDb } = require("./fixtures/fakeLeagueMembershipDb");

const USER = "user-1";
const ESPN_CONN = { id: "conn-espn", user_id: USER, platform: "espn", is_active: true };

const TEN_ESPN_LEAGUES = Array.from({ length: 10 }, (_, i) => ({
  league_id: String(1000 + i),
  league_name: `League ${i}`,
  season: 2026,
  team_id: String(i + 1),
  team_name: `Team ${i}`,
}));

test("a connect writes one league and one followed membership per discovered league", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES, source: "connect",
  });

  assert.equal(result.persisted, true);
  assert.equal(result.inserted, 10);
  const rows = db.membershipsOf(USER);
  assert.equal(rows.length, 10);
  assert.ok(rows.every((m) => m.is_followed === true && m.source === "connect" && m.connection_id === "conn-espn"));
  assert.deepEqual(rows.map((m) => m.provider_league_id).sort(), TEN_ESPN_LEAGUES.map((l) => l.league_id).sort());
  assert.equal(db.state.leagues.find((l) => l.provider_league_id === "1003").name, "League 3");
});

test("syncing twice is idempotent: no duplicate leagues, no duplicate memberships", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  const args = { userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES, source: "connect" };
  await memberships.syncMemberships(db.client, args);
  const second = await memberships.syncMemberships(db.client, args);

  assert.equal(second.inserted, 0);
  assert.equal(second.updated, 0);
  assert.equal(db.state.leagues.length, 10);
  assert.equal(db.membershipsOf(USER).length, 10);
});

// The observed production bug: disconnect deletes the connection row, `on delete cascade` removes
// its memberships, and the reconnect wrote a new connection but no memberships — 10 became 9.
test("disconnect then reconnect restores every membership on the new connection", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES, source: "connect",
  });

  // connection_revoke: the row goes, and the cascade takes the memberships with it.
  db.state.connections = [];
  db.state.memberships = db.state.memberships.filter((m) => m.connection_id !== "conn-espn");
  db.state.connections.push({ id: "conn-espn-2", user_id: USER, platform: "espn", is_active: true });

  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES, source: "connect",
  });

  assert.equal(result.inserted, 10);
  const rows = db.membershipsOf(USER);
  assert.equal(rows.length, 10);
  assert.ok(rows.every((m) => m.connection_id === "conn-espn-2"));
  // The shared league rows survived the disconnect and were reused, not duplicated.
  assert.equal(db.state.leagues.length, 10);
});

test("the connection id is looked up when the caller does not have it", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 1),
  });
  assert.equal(db.membershipsOf(USER)[0].connection_id, "conn-espn");
});

test("no connection means nothing is written and the caller is told why", async () => {
  const db = createLeagueMembershipDb({ connections: [] });
  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES,
  });
  assert.equal(result.persisted, false);
  assert.equal(result.reason, "no_connection");
  assert.equal(db.state.memberships.length, 0);
});

test("a later sync keeps the user's unfollow choice and only fills in what it learned", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026,
    leagues: [{ league_id: "1000", league_name: null, team_id: null, team_name: null }],
  });
  db.state.memberships[0].is_followed = false;

  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, source: "backfill",
    leagues: [{ league_id: "1000", league_name: "Named Now", team_id: "8", team_name: "Mine" }],
  });

  assert.equal(result.updated, 1);
  const [row] = db.membershipsOf(USER);
  assert.equal(row.is_followed, false);
  assert.equal(row.provider_team_id, "8");
  assert.equal(row.team_name, "Mine");
  assert.equal(row.source, "connect");
  assert.equal(row.name, "Named Now");
});

test("an unknown name or team never erases a stored one", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026,
    leagues: [{ league_id: "1000", league_name: "Kept", team_id: "8", team_name: "Mine" }],
  });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026,
    leagues: [{ league_id: "1000", league_name: null, team_id: null, team_name: null }],
  });

  const [row] = db.membershipsOf(USER);
  assert.equal(row.name, "Kept");
  assert.equal(row.provider_team_id, "8");
  assert.equal(row.team_name, "Mine");
});

test("a league absent from a full discovery is unfollowed, not deleted", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES,
  });
  db.state.memberships.find((m) => db.state.leagues.find((l) => l.id === m.league_id).provider_league_id === "1009")
    .is_active_selection = true;

  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 9), markMissing: true,
  });

  assert.equal(result.unfollowed, 1);
  const rows = db.membershipsOf(USER);
  assert.equal(rows.length, 10);
  const gone = rows.find((m) => m.provider_league_id === "1009");
  assert.equal(gone.is_followed, false);
  assert.equal(gone.is_active_selection, false);
  assert.equal(rows.filter((m) => m.is_followed).length, 9);
});

test("a league kept on purpose is never unfollowed by a sync, even when discovery omits it", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 2),
  });
  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 1),
    markMissing: true, keepLeagueIds: ["1001"],
  });
  assert.equal(result.unfollowed, 0);
  assert.ok(db.membershipsOf(USER).every((m) => m.is_followed));
});

test("without markMissing a partial list never unfollows anything", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES,
  });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 1),
  });
  assert.equal(db.membershipsOf(USER).filter((m) => m.is_followed).length, 10);
});

test("markMissing is scoped to one provider and one season", async () => {
  const db = createLeagueMembershipDb({
    connections: [ESPN_CONN, { id: "conn-sleeper", user_id: USER, platform: "sleeper", is_active: true }],
  });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "sleeper", season: 2026, leagues: [{ league_id: "S1" }],
  });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2025, leagues: [{ league_id: "old" }],
  });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: [{ league_id: "1000" }], markMissing: true,
  });
  assert.ok(db.membershipsOf(USER).every((m) => m.is_followed));
});

test("placeholder and empty league ids are never written (the Yahoo 'yahoo' placeholder)", async () => {
  const db = createLeagueMembershipDb({ connections: [{ id: "conn-y", user_id: USER, platform: "yahoo" }] });
  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "yahoo", season: 2026,
    leagues: [{ league_id: "yahoo" }, { league_id: "" }, { league_id: null }, { league_id: "449.l.1" }, { league_id: "449.l.1" }],
  });
  assert.equal(result.inserted, 1);
  assert.deepEqual(db.state.leagues.map((l) => l.provider_league_id), ["449.l.1"]);
});

test("a league's own season wins over the fallback season", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: [{ league_id: "1", season: "2026" }, { league_id: "2", season: null }],
  });
  assert.deepEqual(db.state.leagues.map((l) => l.season), [2026, 2026]);
});

test("before step 03 exists the sync reports not persisted instead of throwing", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN], missing: true });
  const result = await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES,
  });
  assert.equal(result.persisted, false);
  assert.equal(result.reason, "schema_absent");
});

test("a refused write throws with the table and code only", async () => {
  const db = createLeagueMembershipDb({
    connections: [ESPN_CONN],
    failWrites: (table) => table === "league_memberships",
  });
  await assert.rejects(
    memberships.syncMemberships(db.client, { userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES }),
    /league_memberships insert failed \(XX000\)/
  );
});

test("readMemberships returns every membership with its league, or unavailable before step 03", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 2),
  });
  const read = await memberships.readMemberships(db.client, USER);
  assert.equal(read.persisted, true);
  assert.equal(read.memberships.length, 2);
  assert.deepEqual(Object.keys(read.memberships[0]).sort(), [
    "connection_id", "is_active_selection", "is_followed", "league_id", "league_name",
    "platform", "scoring_format", "season", "sort_order", "team_id", "team_name",
  ]);
  assert.equal(read.memberships[0].platform, "espn");
  assert.equal(read.memberships[0].league_id, "1000");

  const absent = await memberships.readMemberships(createLeagueMembershipDb({ missing: true }).client, USER);
  assert.deepEqual(absent, { persisted: false, memberships: [] });
});

test("replaceFollowed calls league_follows_replace with ids only and keeps submission order", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 3),
  });
  const persisted = await memberships.replaceFollowed(db.client, {
    userId: USER, platform: "espn", season: 2026, leagueIds: ["1002", "1000"],
  });

  assert.equal(persisted, true);
  const call = db.state.rpcs.find((c) => c.name === "league_follows_replace");
  assert.deepEqual(call.params.p_entries, [{ league_id: "1002", sort_order: 0 }, { league_id: "1000", sort_order: 1 }]);
  const followed = db.membershipsOf(USER).filter((m) => m.is_followed).map((m) => m.provider_league_id).sort();
  assert.deepEqual(followed, ["1000", "1002"]);
  // A sync after the choice must not undo it.
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 3), markMissing: true,
  });
  assert.deepEqual(db.membershipsOf(USER).filter((m) => m.is_followed).map((m) => m.provider_league_id).sort(), ["1000", "1002"]);
});

test("replaceFollowed reports false before step 03 exists", async () => {
  const db = createLeagueMembershipDb({ missing: true });
  assert.equal(await memberships.replaceFollowed(db.client, {
    userId: USER, platform: "espn", season: 2026, leagueIds: ["1"],
  }), false);
});

test("selectActive mirrors the active league and never throws", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncMemberships(db.client, {
    userId: USER, platform: "espn", season: 2026, leagues: TEN_ESPN_LEAGUES.slice(0, 2),
  });
  assert.equal(await memberships.selectActive(db.client, { userId: USER, platform: "espn", leagueId: "1001", season: 2026 }), true);
  assert.deepEqual(db.membershipsOf(USER).filter((m) => m.is_active_selection).map((m) => m.provider_league_id), ["1001"]);
  assert.equal(await memberships.selectActive(db.client, { userId: USER, platform: "espn", leagueId: "nope", season: 2026 }), false);
  assert.equal(await memberships.selectActive(createLeagueMembershipDb({ missing: true }).client, {
    userId: USER, platform: "espn", leagueId: "1001", season: 2026,
  }), false);
});

// --- syncAfterConnect: the write every connect and reconnect makes -----------------------------

test("syncAfterConnect writes every discovered league plus the bound one, all followed", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  const result = await memberships.syncAfterConnect(db.client, {
    userId: USER, platform: "espn", season: 2026,
    discover: async () => TEN_ESPN_LEAGUES.slice(1),
    boundLeagueId: "1000", boundTeamId: "3", boundVerified: true, trustDiscoveredTeams: false,
  });

  assert.equal(result.persisted, true);
  const rows = db.membershipsOf(USER);
  assert.equal(rows.length, 10);
  assert.ok(rows.every((m) => m.is_followed && m.source === "connect"));
  // ESPN's fan payload team id is an entry id, not the league-scoped team id: never stored.
  assert.equal(rows.find((m) => m.provider_league_id === "1000").provider_team_id, "3");
  assert.ok(rows.filter((m) => m.provider_league_id !== "1000").every((m) => m.provider_team_id == null && m.team_name == null));
});

test("syncAfterConnect sets the bound team on a discovered bound league", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  await memberships.syncAfterConnect(db.client, {
    userId: USER, platform: "espn", season: 2026,
    discover: async () => TEN_ESPN_LEAGUES,
    boundLeagueId: "1004", boundTeamId: "11", boundVerified: true, trustDiscoveredTeams: false,
  });
  const rows = db.membershipsOf(USER);
  assert.equal(rows.length, 10);
  assert.equal(rows.find((m) => m.provider_league_id === "1004").provider_team_id, "11");
  assert.equal(rows.find((m) => m.provider_league_id === "1004").name, "League 4");
});

test("syncAfterConnect falls back to the bound league when discovery fails", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN] });
  const result = await memberships.syncAfterConnect(db.client, {
    userId: USER, platform: "espn", season: 2026,
    discover: async () => { const e = new Error("https://fan.api/?cookie=x failed"); e.status = 503; throw e; },
    boundLeagueId: "1000",
  });

  assert.equal(result.persisted, true);
  assert.equal(result.discoveryFailed, true);
  assert.equal(result.discoveryStatus, 503);
  assert.deepEqual(db.membershipsOf(USER).map((m) => m.provider_league_id), ["1000"]);
  // The discovery error's message (which could carry a URL) is never handed back.
  assert.doesNotMatch(JSON.stringify(result), /cookie|fan\.api/);
});

test("syncAfterConnect does not add an unverified bound league the provider did not list", async () => {
  const db = createLeagueMembershipDb({ connections: [{ id: "conn-s", user_id: USER, platform: "sleeper" }] });
  await memberships.syncAfterConnect(db.client, {
    userId: USER, platform: "sleeper", season: 2026,
    discover: async () => [{ league_id: "S1" }],
    boundLeagueId: "not-listed",
  });
  assert.deepEqual(db.membershipsOf(USER).map((m) => m.provider_league_id), ["S1"]);
});

test("syncAfterConnect never throws: a refused write comes back as a reason", async () => {
  const db = createLeagueMembershipDb({ connections: [ESPN_CONN], failWrites: () => true });
  const result = await memberships.syncAfterConnect(db.client, {
    userId: USER, platform: "espn", season: 2026, discover: async () => TEN_ESPN_LEAGUES,
  });
  assert.equal(result.persisted, false);
  assert.equal(result.reason, "write_failed");
  assert.match(result.error, /leagues upsert failed \(XX000\)/);
});
