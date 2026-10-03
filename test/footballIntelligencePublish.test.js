"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

const { publishSignals, streamGzCsv, contentHash, runFootballIntelligence } = require("../src/omen_football_intelligence_cron");
const { getTeamSystemSummaries } = require("../src/services/footballIntelligence/teamSystemLines");
const { buildStartSitDetail } = require("../src/services/startSitDetail");

const ART = `sha256:${"a".repeat(64)}`;
function signal(team, summary, overrides = {}) {
  return {
    contract_version: "football-intelligence-signal.v1", signal_type: "team_system_identity", status: "available",
    subject: { team_id: `omen:team:${team}`, coach_id: "omen:coach:x", season: 2026 }, summary,
    evidence: { source_artifacts: [ART] },
    publication: { artifact_id: ART, artifact_version: "league-2026-w4", published_at_utc: "2026-10-03T10:00:00.000Z" },
    ...overrides,
  };
}

function fakeDb(published = {}) {
  const ops = [];
  return {
    ops,
    from: (table) => ({
      select: () => ({ eq: (_c, scope) => ({ eq: () => ({ maybeSingle: async () => ({ data: published[scope] || null, error: null }) }) }) }),
      update: (values) => ({ eq: async (_c, id) => { ops.push({ op: "update", table, id, values }); return { error: null }; } }),
      insert: async (row) => { ops.push({ op: "insert", table, row }); return { error: null }; },
    }),
  };
}

test("an unchanged team is skipped; a changed one supersedes the published row before the new row goes in", async () => {
  const chi = signal("chi", "Chicago: play-action 1st.");
  const det = signal("det", "Detroit: screens 6th.");
  const db = fakeDb({
    "team_system_identity:omen:team:chi:2026": { id: "old-chi", output_hash: contentHash(chi) },
    "team_system_identity:omen:team:det:2026": { id: "old-det", output_hash: "sha256:" + "f".repeat(64) },
  });
  const r = await publishSignals({ client: db, signals: [chi, det], publishedAt: "2026-10-03T10:00:00.000Z", log: { info() {} } });
  assert.deepEqual(r, { published: 1, unchanged: 1 });
  assert.equal(db.ops[0].op, "update");
  assert.deepEqual([db.ops[0].id, db.ops[0].values.publication_state], ["old-det", "superseded"]);
  const row = db.ops[1].row;
  assert.equal(db.ops[1].op, "insert");
  assert.equal(row.scope_key, "team_system_identity:omen:team:det:2026");
  assert.equal(row.supersedes_id, "old-det");
  assert.equal(row.publication_state, "published");
  assert.equal(row.payload.publication.artifact_id, row.artifact_id);
  assert.match(row.receipt_id, /^receipt:[0-9a-f]{64}$/);
  assert.match(row.output_hash, /^sha256:[0-9a-f]{64}$/);
  assert.ok(Date.parse(row.stale_after) > Date.parse(row.published_at));
});

test("the content hash ignores the publication stamp, so a re-run with the same data publishes nothing new", () => {
  const a = signal("chi", "same");
  const b = signal("chi", "same", { publication: { artifact_id: `sha256:${"b".repeat(64)}`, artifact_version: "v2", published_at_utc: "2026-10-04T10:00:00.000Z" } });
  assert.equal(contentHash(a), contentHash(b));
  assert.notEqual(contentHash(a), contentHash(signal("chi", "different")));
});

test("play-by-play streams from gzip keeping only the asked-for columns", async () => {
  const csv = 'game_id,play_id,desc,posteam,season_type\ng1,1,"pass, deep",CHI,REG\ng1,2,run,DET,REG\n';
  const gz = zlib.gzipSync(csv);
  const fetchImpl = async () => new Response(gz);
  const { rows, sha256 } = await streamGzCsv("https://example/x.csv.gz", ["game_id", "play_id", "posteam", "season_type"], fetchImpl);
  assert.deepEqual(rows, [
    { game_id: "g1", play_id: "1", posteam: "CHI", season_type: "REG" },
    { game_id: "g1", play_id: "2", posteam: "DET", season_type: "REG" },
  ]);
  assert.match(sha256, /^sha256:[0-9a-f]{64}$/);
  await assert.rejects(streamGzCsv("https://example/x.csv.gz", ["nope"], fetchImpl), /missing columns: nope/);
});

test("too few teams refuses to publish anything", async () => {
  const db = fakeDb();
  const tiny = "season,week,game_type,home_team,away_team,home_coach,away_coach\n2026,1,REG,CHI,DET,Ben Johnson,Dan Campbell\n";
  const ftn = "nflverse_game_id,nflverse_play_id,season,week,qb_location\n";
  const pbp = zlib.gzipSync("game_id,play_id,posteam,season_type\n");
  const fetchImpl = async (url) => new Response(url.endsWith(".gz") ? pbp : url.includes("games") ? tiny : ftn);
  await assert.rejects(runFootballIntelligence({ client: db, season: 2026, fetchImpl, log: { info() {}, error() {} } }), /publish refused/);
  assert.equal(db.ops.length, 0);
});

test("team summaries come from published available rows only, keyed by any provider spelling", async () => {
  const calls = [];
  const supabase = {
    from: () => {
      const q = {
        select: () => q, in: (c, v) => { calls.push([c, v]); return q; }, eq: (c, v) => { calls.push([c, v]); return q; },
        then: (resolve) => resolve({ data: [
          { team_id: "omen:team:chi", status: "available", payload: { summary: "Chicago's offense in 2025: play-action 2nd." } },
          { team_id: "omen:team:jax", status: "insufficient_coverage", payload: { summary: null } },
        ], error: null }),
      };
      return q;
    },
  };
  const m = await getTeamSystemSummaries({ supabase, teams: ["CHI", "JAC", "CHI", "XYZ"], season: 2026 });
  assert.deepEqual([...m], [["CHI", "Chicago's offense in 2025: play-action 2nd."]]);
  assert.deepEqual(calls.find((c) => c[0] === "team_id")[1], ["omen:team:chi", "omen:team:jax"]);
  assert.ok(calls.some((c) => c[0] === "publication_state" && c[1] === "published"));
  const failing = { from: () => { throw new Error("down"); } };
  assert.equal((await getTeamSystemSummaries({ supabase: failing, teams: ["CHI"], season: 2026 })).size, 0);
});

test("the start/sit call shows one team-system line per team, labelled observed context", () => {
  const p = (key, name, pos, team, proj, slot) => ({ player_key: key, name, position: pos, team, projected_points: proj, selected_position: slot, eligible_positions: [pos, "FLEX"], status: "" });
  const roster = { week: 5, slots: { starters: [p("espn:1", "Kyle Monangai", "RB", "CHI", 8.1, "FLEX")], bench: [p("espn:2", "Kalif Raymond", "WR", "CHI", 9.7, "BN")] } };
  const teamSystem = new Map([["CHI", "Chicago's offense in 2025: play-action on 18.7% of plays (2nd of 32)."]]);
  const r = buildStartSitDetail({ roster, platform: "espn", leagueId: "1", week: 5, season: 2026, scoringFormat: "1 point per reception", teamSystem });
  const lines = r.evidence.filter((e) => e.category === "team_system");
  assert.equal(lines.length, 1, "two Chicago players share one Chicago line");
  assert.equal(lines[0].kind, "observed_context");
  assert.match(lines[0].statement, /play-action on 18\.7%/);
});

test("the football-intelligence job runs nightly in the cron image", () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, "..", "Dockerfile.cron"), "utf8");
  assert.match(dockerfile, /node \/app\/src\/omen_football_intelligence_cron\.js/);
});
