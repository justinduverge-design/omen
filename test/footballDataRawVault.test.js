"use strict";

const assert = require("node:assert/strict");
const { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  MANIFEST_SCHEMA,
  MAX_SNAPSHOT_BYTES,
  REPLAY_SCHEMA,
  assertLocalVaultRoot,
  assertRightsReviewCurrent,
  captureSnapshot,
  replaySnapshot,
} = require("../src/services/footballData/rawVault");

const CSV = [
  "player_id,player_name,season,week,season_type,fantasy_points,fantasy_points_ppr",
  "00-0030279,Keenan Allen,2025,1,REG,12.8,19.8",
].join("\n");

const TEAM_CSV = [
  "season,week,team,season_type,game_id,opponent_team,def_sacks,def_interceptions,fumble_recovery_opp,fg_made,pat_made",
  "2025,1,ARI,REG,2025_01_ARI_NO,NO,1,0,0,2,2",
].join("\n");

const SCHEDULE_CSV = [
  "game_id,season,game_type,week,gameday,away_team,away_score,home_team,home_score,old_game_id,gsis,pfr,pff,espn",
  "2025_01_ARI_NO,2025,REG,1,2025-09-07,ARI,20,NO,13,old,gsis,pfr,pff,espn",
].join("\n");

function response(body = CSV, options = {}) {
  return new Response(body, {
    status: options.status || 200,
    headers: {
      "content-type": options.contentType || "text/csv",
      etag: options.etag || '"fixture-etag"',
      "last-modified": options.lastModified || "Sun, 24 Aug 2025 12:00:00 GMT",
    },
  });
}

async function tempRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "omen-a7b-test-"));
  t.after(async () => {
    const { rm } = require("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

test("capture stores identical bytes once and records each retrieval as an immutable manifest", async (t) => {
  const root = await tempRoot(t);
  const instants = [
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:01.000Z"),
    new Date("2026-08-24T12:05:00.000Z"),
    new Date("2026-08-24T12:05:01.000Z"),
  ];
  const now = () => instants.shift();
  const fetchImpl = async () => response();

  const first = await captureSnapshot({ dataset: "stats_player", season: 2025, root, fetchImpl, now });
  const second = await captureSnapshot({ dataset: "stats_player", season: 2025, root, fetchImpl, now });

  assert.equal(first.rawCreated, true);
  assert.equal(second.rawCreated, false);
  assert.equal(first.manifest.raw.sha256, second.manifest.raw.sha256);
  assert.notEqual(first.manifest.snapshot_id, second.manifest.snapshot_id);

  const rawFiles = await readdir(path.dirname(first.rawPath));
  const manifestFiles = await readdir(path.dirname(first.manifestPath));
  assert.equal(rawFiles.length, 1);
  assert.equal(manifestFiles.length, 2);

  const manifest = JSON.parse(await readFile(first.manifestPath, "utf8"));
  assert.equal(manifest.schema, MANIFEST_SCHEMA);
  assert.equal(manifest.source, "nflverse-data");
  assert.equal(manifest.dataset, "stats_player");
  assert.equal(manifest.season_coverage.season, 2025);
  assert.equal(manifest.http.status, 200);
  assert.equal(manifest.raw.byte_length, Buffer.byteLength(CSV));
  assert.match(manifest.raw.sha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.source_schema_fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(manifest.rights.license, "CC BY 4.0");
  assert.equal(manifest.parent_snapshot, null);
});

test("capture canonicalizes the season before constructing the fixed release identity", async (t) => {
  const root = await tempRoot(t);
  const instants = [
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:01.000Z"),
  ];
  let requestedUrl;
  const captured = await captureSnapshot({
    dataset: "stats_player",
    season: "02025",
    root,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return response();
    },
    now: () => instants.shift(),
  });

  assert.match(requestedUrl, /stats_player_week_2025\.csv$/);
  assert.doesNotMatch(requestedUrl, /02025/);
  assert.equal(captured.manifest.season_coverage.season, 2025);
});

test("Phase 2 admits only the reviewed team and schedule release identities", async (t) => {
  const root = await tempRoot(t);
  const instants = [
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:01.000Z"),
    new Date("2026-08-24T12:05:00.000Z"),
    new Date("2026-08-24T12:05:01.000Z"),
  ];
  const urls = [];
  const team = await captureSnapshot({
    dataset: "stats_team",
    season: 2025,
    root,
    fetchImpl: async (url) => {
      urls.push(url);
      return response(TEAM_CSV);
    },
    now: () => instants.shift(),
  });
  const schedules = await captureSnapshot({
    dataset: "schedules",
    season: 2025,
    root,
    fetchImpl: async (url) => {
      urls.push(url);
      return response(SCHEDULE_CSV);
    },
    now: () => instants.shift(),
  });

  assert.match(urls[0], /releases\/download\/stats_team\/stats_team_week_2025\.csv$/);
  assert.match(urls[1], /releases\/download\/schedules\/games\.csv$/);
  assert.equal(team.manifest.release.tag, "stats_team");
  assert.equal(schedules.manifest.release.tag, "schedules");
  assert.equal(schedules.manifest.season_coverage.season, 2025);
});

test("capture fails closed on an unpublished release without writing vault artifacts", async (t) => {
  const root = await tempRoot(t);

  await assert.rejects(
    captureSnapshot({
      dataset: "stats_player",
      season: 2026,
      root,
      fetchImpl: async () => response("not found", { status: 404 }),
      now: () => new Date("2026-08-24T12:00:00.000Z"),
    }),
    (error) => error.code === "SOURCE_DEFERRED",
  );

  await assert.rejects(readdir(path.join(root, "raw")), /ENOENT/);
  await assert.rejects(readdir(path.join(root, "manifests")), /ENOENT/);
});

test("capture quarantines schema drift before any raw or manifest write", async (t) => {
  const root = await tempRoot(t);
  const drifted = "player_name,season,week,fantasy_points\nReceiver,2025,1,10";

  await assert.rejects(
    captureSnapshot({
      dataset: "stats_player",
      season: 2025,
      root,
      fetchImpl: async () => response(drifted),
      now: () => new Date("2026-08-24T12:00:00.000Z"),
    }),
    (error) => error.code === "SCHEMA_DRIFT" && /season_type/.test(error.message),
  );

  await assert.rejects(readdir(path.join(root, "raw")), /ENOENT/);
});

test("capture rejects non-allowlisted datasets and oversized responses before writing", async (t) => {
  const root = await tempRoot(t);
  let fetchCalls = 0;
  await assert.rejects(
    captureSnapshot({
      dataset: "sleeper_stats",
      season: 2025,
      root,
      fetchImpl: async () => {
        fetchCalls += 1;
        return response();
      },
    }),
    (error) => error.code === "SOURCE_NOT_ALLOWLISTED",
  );
  assert.equal(fetchCalls, 0);

  await assert.rejects(
    captureSnapshot({
      dataset: "stats_player",
      season: 2025,
      root,
      fetchImpl: async () => new Response("", {
        status: 200,
        headers: {
          "content-type": "text/csv",
          "content-length": String(MAX_SNAPSHOT_BYTES + 1),
        },
      }),
      now: () => new Date("2026-08-24T12:00:00.000Z"),
    }),
    (error) => error.code === "SNAPSHOT_TOO_LARGE",
  );
  await assert.rejects(readdir(path.join(root, "raw")), /ENOENT/);
});

test("capture refuses a vault subdirectory symlink that escapes the selected root", async (t) => {
  const root = await tempRoot(t);
  const outside = await tempRoot(t);
  await mkdir(root, { recursive: true });
  await symlink(outside, path.join(root, "raw"));
  const instants = [
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:01.000Z"),
  ];

  await assert.rejects(
    captureSnapshot({
      dataset: "stats_player",
      season: 2025,
      root,
      fetchImpl: async () => response(),
      now: () => instants.shift(),
    }),
    (error) => error.code === "PATH_OUTSIDE_VAULT",
  );
  assert.deepEqual(await readdir(outside), []);
});

test("exact-manifest replay verifies bytes and schema and never promotes output", async (t) => {
  const root = await tempRoot(t);
  const replayRoot = path.join(root, "local-replays");
  const instants = [
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:01.000Z"),
  ];
  const captured = await captureSnapshot({
    dataset: "stats_player",
    season: 2025,
    root,
    fetchImpl: async () => response(),
    now: () => instants.shift(),
  });

  const replay = await replaySnapshot({
    root,
    manifestPath: captured.manifestPath,
    outputRoot: replayRoot,
    now: () => new Date("2026-08-24T12:10:00.000Z"),
  });

  const receipt = JSON.parse(await readFile(replay.receiptPath, "utf8"));
  assert.equal(receipt.schema, REPLAY_SCHEMA);
  assert.equal(receipt.snapshot_id, captured.manifest.snapshot_id);
  assert.equal(receipt.raw_sha256, captured.manifest.raw.sha256);
  assert.equal(receipt.promoted, false);
  assert.equal(receipt.verification.hash, "pass");
  assert.equal(receipt.verification.schema, "pass");
  assert.equal(await readFile(replay.replayRawPath, "utf8"), CSV);
});

test("replay rejects tampered raw bytes and writes no replay", async (t) => {
  const root = await tempRoot(t);
  const instants = [
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:01.000Z"),
  ];
  const captured = await captureSnapshot({
    dataset: "stats_player",
    season: 2025,
    root,
    fetchImpl: async () => response(),
    now: () => instants.shift(),
  });
  await writeFile(captured.rawPath, "tampered");

  const replayRoot = path.join(root, "replays-after-tamper");
  await assert.rejects(
    replaySnapshot({ root, manifestPath: captured.manifestPath, outputRoot: replayRoot }),
    (error) => error.code === "RAW_HASH_MISMATCH",
  );
  await assert.rejects(readdir(replayRoot), /ENOENT/);
});

test("replay rejects a manifest whose rights evidence no longer matches the allowlist", async (t) => {
  const root = await tempRoot(t);
  const instants = [
    new Date("2026-08-24T12:00:00.000Z"),
    new Date("2026-08-24T12:00:01.000Z"),
  ];
  const captured = await captureSnapshot({
    dataset: "stats_player",
    season: 2025,
    root,
    fetchImpl: async () => response(),
    now: () => instants.shift(),
  });
  const manifest = JSON.parse(await readFile(captured.manifestPath, "utf8"));
  manifest.rights.license = "unknown";
  await writeFile(captured.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await assert.rejects(
    replaySnapshot({
      root,
      manifestPath: captured.manifestPath,
      outputRoot: path.join(root, "replay-with-bad-rights"),
    }),
    (error) => error.code === "INVALID_MANIFEST" && /rights field license/.test(error.message),
  );
});

test("rights review and local-only root checks fail closed", () => {
  assert.throws(
    () => assertRightsReviewCurrent({
      now: new Date("2026-08-24T12:00:00.000Z"),
      rightsReviewDate: "2025-08-24",
    }),
    (error) => error.code === "RIGHTS_REVIEW_STALE",
  );
  assert.throws(
    () => assertLocalVaultRoot("/var/lib/omen-football-data"),
    (error) => error.code === "PRODUCTION_ROOT_REFUSED",
  );
});
