"use strict";

/**
 * Omen football-intelligence nightly publish (FI-LEAGUE step 5).
 *
 * Downloads nflverse FTN charting and play-by-play for the current and previous season plus the
 * schedule; builds every offense's Scheme DNA (leagueSchemeDna.js) and one `team_system_identity` signal
 * per team (teamSignals.js); publishes them to `football_intelligence_signals` (redo step 13).
 *
 * Publishing: per team, a signal whose content is unchanged is skipped; a changed one supersedes the
 * published row (superseded first, then the new row inserted pointing at it). Refuses to publish when the
 * sources look truncated. Each run is recorded as a `data_events` ingest.
 *
 * Play-by-play is streamed line by line and only four columns are kept: the cron container has 1 GB.
 */

const crypto = require("crypto");
const readline = require("readline");
const zlib = require("zlib");
const { Readable } = require("stream");
const { initSentry, flushSentry } = require("./middleware/sentry");
const { parseCsv, parseCsvLine } = require("./services/csvRows");
const { joinFtnToOffense, mapLeagueRowsToFacts, buildLeagueDna, leagueRanks } = require("./services/footballIntelligence/leagueSchemeDna");
const { buildTeamSignals, SIGNAL_TYPE } = require("./services/footballIntelligence/teamSignals");
const { hashCanonical } = require("./services/footballIntelligence/canonicalize");
const { MODELS } = require("./services/footballIntelligence/contracts");

const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const URLS = {
  games: `${BASE}/schedules/games.csv`,
  ftn: (season) => `${BASE}/ftn_charting/ftn_charting_${season}.csv`,
  pbp: (season) => `${BASE}/pbp/play_by_play_${season}.csv.gz`,
};
const PBP_COLUMNS = ["game_id", "play_id", "posteam", "season_type"];
const FETCH_TIMEOUT_MS = 120_000;
const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
const MIN_SIGNALS = 30;

const defaultLog = {
  info: (...args) => console.log(`[${new Date().toISOString()}] [omen-fi]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [omen-fi] ERROR`, ...args),
};

async function open(url, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetchImpl(url, { signal: controller.signal, redirect: "follow" });
  if (!res.ok) { clearTimeout(timer); throw new Error(`${url} returned ${res.status}`); }
  return { res, done: () => clearTimeout(timer) };
}

async function fetchText(url, fetchImpl) {
  const { res, done } = await open(url, fetchImpl);
  try {
    const text = await res.text();
    return { text, sha256: `sha256:${crypto.createHash("sha256").update(text).digest("hex")}` };
  } finally { done(); }
}

/** Streams a gzipped CSV, keeping only `columns`; returns rows and the hash of the compressed bytes. */
async function streamGzCsv(url, columns, fetchImpl) {
  const { res, done } = await open(url, fetchImpl);
  try {
    const hash = crypto.createHash("sha256");
    const source = Readable.fromWeb(res.body);
    source.on("data", (chunk) => hash.update(chunk));
    const lines = readline.createInterface({ input: source.pipe(zlib.createGunzip()), crlfDelay: Infinity });
    let keep = null;
    const rows = [];
    for await (const line of lines) {
      if (!line) continue;
      const values = parseCsvLine(line);
      if (!keep) {
        keep = columns.map((c) => [c, values.indexOf(c)]);
        const missing = keep.filter(([, i]) => i < 0).map(([c]) => c);
        if (missing.length) throw new Error(`${url} is missing columns: ${missing.join(", ")}`);
        continue;
      }
      const row = {};
      for (const [c, i] of keep) row[c] = values[i] == null ? "" : values[i].trim();
      rows.push(row);
    }
    return { rows, sha256: `sha256:${hash.digest("hex")}` };
  } finally { done(); }
}

async function buildSeason(season, fetchImpl) {
  const [ftn, pbp] = await Promise.all([fetchText(URLS.ftn(season), fetchImpl), streamGzCsv(URLS.pbp(season), PBP_COLUMNS, fetchImpl)]);
  const ftnRows = parseCsv(ftn.text, { required: ["nflverse_game_id", "nflverse_play_id", "season", "week", "qb_location"] });
  const { rows, unmatched } = joinFtnToOffense({ ftnRows, pbpRows: pbp.rows });
  // One team's facts at a time: the whole league's at once is ~500k objects and most of the job's memory.
  const byTeam = new Map();
  for (const row of rows) {
    if (!byTeam.has(row.possession_team)) byTeam.set(row.possession_team, []);
    byTeam.get(row.possession_team).push(row);
  }
  const dna = {};
  for (const [team, teamRows] of [...byTeam].sort(([a], [b]) => a.localeCompare(b))) {
    const facts = mapLeagueRowsToFacts(teamRows, { artifactSha256: ftn.sha256 });
    Object.assign(dna, buildLeagueDna({ facts, season }));
    byTeam.set(team, null);
  }
  const latestWeek = rows.reduce((max, r) => Math.max(max, Number(r.week) || 0), 0);
  return { dna, ranks: leagueRanks(dna), sources: [ftn.sha256, pbp.sha256], unmatched, latestWeek };
}

function contentHash(signal) {
  const { publication, ...content } = signal;
  return hashCanonical(content);
}

async function publishSignals({ client, signals, publishedAt, log = defaultLog }) {
  let published = 0;
  let unchanged = 0;
  for (const signal of signals) {
    const scopeKey = `${signal.signal_type}:${signal.subject.team_id}:${signal.subject.season}`;
    const outputHash = contentHash(signal);
    const { data: current, error: readError } = await client.from("football_intelligence_signals")
      .select("id, output_hash").eq("scope_key", scopeKey).eq("publication_state", "published").maybeSingle();
    if (readError) throw new Error(`published read failed: ${readError.code || "unknown"}`);
    if (current && current.output_hash === outputHash) { unchanged += 1; continue; }
    if (current) {
      const { error } = await client.from("football_intelligence_signals")
        .update({ publication_state: "superseded", updated_at: publishedAt }).eq("id", current.id);
      if (error) throw new Error(`supersede failed: ${error.code || "unknown"}`);
    }
    const { error } = await client.from("football_intelligence_signals").insert({
      scope_key: scopeKey,
      contract_version: signal.contract_version,
      signal_type: signal.signal_type,
      team_id: signal.subject.team_id,
      coach_id: signal.subject.coach_id,
      season: signal.subject.season,
      status: signal.status,
      payload: signal,
      artifact_id: signal.publication.artifact_id,
      artifact_version: signal.publication.artifact_version,
      receipt_id: `receipt:${crypto.createHash("sha256").update(`${signal.publication.artifact_id}|${scopeKey}|${publishedAt}`).digest("hex")}`,
      output_hash: outputHash,
      source_artifact_ids: signal.evidence.source_artifacts,
      publication_state: "published",
      published_at: publishedAt,
      stale_after: new Date(Date.parse(publishedAt) + STALE_AFTER_MS).toISOString(),
      supersedes_id: current ? current.id : null,
    });
    if (error) throw new Error(`publish failed for ${scopeKey}: ${error.code || "unknown"}`);
    published += 1;
  }
  log.info(`published ${published}, unchanged ${unchanged}`);
  return { published, unchanged };
}

async function runFootballIntelligence({ client, season, fetchImpl = fetch, now = () => new Date(), log = defaultLog }) {
  const games = await fetchText(URLS.games, fetchImpl);
  const gameRows = parseCsv(games.text, { required: ["season", "week", "home_team", "away_team", "home_coach", "away_coach"] });
  const [previous, current] = [await buildSeason(season - 1, fetchImpl), await buildSeason(season, fetchImpl)];
  const sourceArtifacts = [games.sha256, ...previous.sources, ...current.sources].sort();
  const artifactId = hashCanonical({ sources: sourceArtifacts, models: MODELS, signal_type: SIGNAL_TYPE });
  const publishedAt = now().toISOString();
  const signals = buildTeamSignals({
    season,
    dnaBySeason: { [season - 1]: previous.dna, [season]: current.dna },
    ranksBySeason: { [season - 1]: previous.ranks, [season]: current.ranks },
    games: gameRows,
    latestObservationAtUtc: null,
    publication: { artifact_id: artifactId, artifact_version: `league-${season}-w${current.latestWeek}`,
                   published_at_utc: publishedAt, source_artifacts: sourceArtifacts },
  });
  const available = signals.filter((s) => s.status === "available").length;
  if (signals.length < MIN_SIGNALS || available < MIN_SIGNALS) {
    throw new Error(`publish refused: ${signals.length} signals, ${available} available; sources likely truncated`);
  }
  const result = await publishSignals({ client, signals, publishedAt, log });
  const { error } = await client.from("data_events").insert({
    event: "ingest", subject: "football_intelligence", provider: "nflverse",
    rights_basis: "nflverse_cc_by_4_0;ftn_charting_cc_by_sa_4_0",
    job: "omen_football_intelligence_cron v1", source_ref: artifactId, row_count: result.published,
    details: { signals: signals.length, available, published: result.published, unchanged: result.unchanged,
               season, latest_week: current.latestWeek, unmatched_ftn_plays: previous.unmatched + current.unmatched },
  });
  if (error) throw new Error(`data_events ingest failed: ${error.code || "unknown"}`);
  log.info(`football intelligence: ${signals.length} teams, ${available} available, season ${season} through week ${current.latestWeek}`);
  return { signals: signals.length, available, ...result };
}

if (require.main === module) {
  initSentry({ component: "cron-football-intelligence" });
  const Sentry = require("@sentry/node");
  const { createClient } = require("@supabase/supabase-js");
  const { getCurrentNflWeekContext } = require("./services/nflSchedule");
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].filter((key) => !process.env[key]);
  (async () => {
    if (missing.length) throw new Error(`missing env: ${missing.join(", ")}`);
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    await runFootballIntelligence({ client, season: Number(getCurrentNflWeekContext().season) });
  })().then(
    async () => { await flushSentry(); process.exit(0); },
    async (err) => { defaultLog.error(err.message); Sentry.captureException(err); await flushSentry(); process.exit(1); }
  );
}

module.exports = { runFootballIntelligence, publishSignals, streamGzCsv, contentHash, URLS };
