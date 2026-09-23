"use strict";

// League Office sync worker.
// SECURITY: never logs or stores ESPN credentials or raw provider payloads.

const { createClient } = require("@supabase/supabase-js");
const config = require("./config");
const { getAuthenticatedEspnCredentials } = require("./services/espnAuth");
const espnAdapter = require("./adapters/espn");
const { buildLeagueOfficeLine } = require("./services/leagueOfficeMessage");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false },
});

const LEAGUE_OFFICE_LEAGUE_ID = process.env.LEAGUE_OFFICE_LEAGUE_ID || "13338821";
const LEAGUE_OFFICE_PLATFORM = "espn";
const DIAGNOSE = process.env.LEAGUE_OFFICE_DIAGNOSE === "1";

function log(message, meta = {}) {
  console.log("[league-office-sync]", message, JSON.stringify(meta));
}

function safeErrorCode(error, stage = "unknown") {
  if (error?.status === 401) return "provider_reconnect_required";
  if (error?.status === 404) return "league_or_connection_not_found";
  if (error?.status === 429) return "provider_rate_limited";
  if (error?.status === 400) return "provider_request_invalid";
  if (error?.status >= 500) return "provider_unavailable";
  if (stage === "credentials") return "credential_read_failed";
  if (stage === "provider") return "provider_read_failed";
  if (stage === "persist" && error?.code) return `matchup_persist_${String(error.code).toLowerCase()}`;
  if (stage === "persist") return "matchup_persist_failed";
  return "sync_failed";
}

function nflSeasonAndWeek(now = new Date()) {
  const year = now.getUTCFullYear();
  // NFL regular season week 1 is the week containing the first Thursday in September.
  // Use Thursday as the rollover boundary so Tuesday/Wednesday League Office runs still
  // archive the week that just completed rather than jumping to the upcoming slate.
  const septemberFirst = new Date(Date.UTC(year, 8, 1));
  const daysToThursday = (4 - septemberFirst.getUTCDay() + 7) % 7;
  const opener = new Date(Date.UTC(year, 8, 1 + daysToThursday));
  const diffDays = Math.floor((now.getTime() - opener.getTime()) / 86400000);
  if (diffDays < 0) return { season: year, week: 1 };
  return { season: year, week: Math.max(1, Math.min(25, Math.floor(diffDays / 7) + 1)) };
}

async function ensureCurrentLeagueOfficeJob(now = new Date()) {
  const { season, week } = nflSeasonAndWeek(now);

  // Find the authenticated Omen user whose active ESPN connection is Slops Saloon.
  // This avoids hard-coding a user UUID and keeps credentials in Vault.
  const { data: connection, error: connectionError } = await supabase
    .from("platform_connections")
    .select("user_id,league_id,is_active")
    .eq("platform", LEAGUE_OFFICE_PLATFORM)
    .eq("league_id", LEAGUE_OFFICE_LEAGUE_ID)
    .eq("is_active", true)
    // Several league members can connect the same ESPN league. Pick deterministically
    // instead of relying on PostgREST row order, which can change between weekly runs.
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connectionError) throw new Error("League Office connection lookup failed");
  if (!connection?.user_id) {
    log("league connection unavailable", { league_id: LEAGUE_OFFICE_LEAGUE_ID, season, week });
    return null;
  }

  // A completed job is safe to re-queue: matchup persistence is an upsert, so this lets
  // Tuesday/Wednesday reruns capture stat corrections without duplicating record-book rows.
  const { data: existing, error: existingError } = await supabase
    .from("league_office_sync_jobs")
    .select("id,user_id,status")
    .eq("platform", LEAGUE_OFFICE_PLATFORM)
    .eq("league_id", LEAGUE_OFFICE_LEAGUE_ID)
    .eq("season", season)
    .eq("week", week)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error("League Office current-week lookup failed");

  if (existing?.id) {
    if (existing.status === "running") return existing.id;
    const { error } = await supabase
      .from("league_office_sync_jobs")
      .update({
        // The league/week row is unique independently of user_id. ESPN reconnects can
        // move the active league connection to a different Omen user, so always bind
        // the reusable job to the connection that is active now.
        user_id: connection.user_id,
        status: "queued",
        error_code: null,
        started_at: null,
        completed_at: null,
      })
      .eq("id", existing.id);
    if (error) throw new Error("League Office current-week requeue failed");
    log("current week requeued", { id: existing.id, league_id: LEAGUE_OFFICE_LEAGUE_ID, season, week });
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("league_office_sync_jobs")
    .insert({
      user_id: connection.user_id,
      platform: LEAGUE_OFFICE_PLATFORM,
      league_id: LEAGUE_OFFICE_LEAGUE_ID,
      season,
      week,
      status: "queued",
    })
    .select("id")
    .single();

  if (insertError) throw new Error("League Office current-week enqueue failed");
  log("current week enqueued", { id: inserted.id, league_id: LEAGUE_OFFICE_LEAGUE_ID, season, week });
  return inserted.id;
}

async function claimQueuedJobs(limit = 10) {
  const { data, error } = await supabase
    .from("league_office_sync_jobs")
    .select("id,user_id,platform,league_id,season,week")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error("League Office queue lookup failed");
  return data || [];
}

async function markJob(id, values) {
  const { error } = await supabase
    .from("league_office_sync_jobs")
    .update(values)
    .eq("id", id);
  if (error) throw new Error("League Office queue update failed");
}

function teamNameById(matchups) {
  const names = new Map();
  for (const m of (matchups || [])) {
    names.set(String(m.home_team_id), m.home_team_name);
    names.set(String(m.away_team_id), m.away_team_name);
  }
  return names;
}

async function persistTransactionAwards(job, completedWeek, credentials, completedMatchups) {
  const transactions = await espnAdapter.fetchEspnLeagueOfficeTransactions(
    job.league_id, credentials.espn_s2, credentials.swid,
    { seasonId: job.season, week: completedWeek }
  );
  const players = await espnAdapter.fetchEspnLeagueOfficePlayers(
    job.league_id, credentials.espn_s2, credentials.swid,
    { seasonId: job.season, week: completedWeek }
  );
  const playerById = new Map(players.map((p) => [String(p.player_id), p]));
  const names = teamNameById(completedMatchups);

  const rank = (action) => transactions
    .filter((t) => t.action === action)
    .map((t) => {
      const player = playerById.get(String(t.player_id));
      return { ...t, player_name: player?.player_name || t.player_name, actual_points: Number(player?.actual_points) };
    })
    .filter((t) => Number.isFinite(t.actual_points))
    .sort((a, b) => Number(b.actual_points) - Number(a.actual_points) || Number(b.process_date || 0) - Number(a.process_date || 0));

  const pickup = rank("ADD")[0] || null;
  const drop = rank("DROP")[0] || null;
  if (!pickup || !drop) throw new Error("League Office transaction awards unavailable: ESPN transaction history incomplete");

  const rows = [
    { award_name: "Pickup of the Week", tx: pickup, evidence: `Highest Week ${completedWeek} ESPN score among executed adds.` },
    { award_name: "Drop of the Week", tx: drop, evidence: `Highest Week ${completedWeek} ESPN score among executed drops.` },
  ].map(({ award_name, tx, evidence }) => ({
    user_id: job.user_id,
    league_id: String(job.league_id),
    season: Number(job.season),
    week: completedWeek,
    award_name,
    executive_name: names.get(String(tx.team_id)) || null,
    detail: `${tx.player_name} — ${Number(tx.actual_points).toFixed(2)} pts${tx.bid_amount == null ? "" : ` (FAAB ${tx.bid_amount})`}`,
    evidence,
    created_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("league_office_awards").upsert(rows, { onConflict: "league_id,season,week,award_name" });
  if (error) throw new Error("League Office transaction award persistence failed");
  return { pickup, drop };
}

async function updateSeasonAccoladeLeaders(job, throughWeek) {
  const { data: games, error } = await supabase.from("league_office_matchups")
    .select("week,home_team_id,home_team_name,home_score,away_team_id,away_team_name,away_score,winner_team_id,status")
    .eq("platform", job.platform).eq("league_id", String(job.league_id)).eq("season", Number(job.season))
    .lte("week", Math.min(throughWeek, 14)).eq("status", "final");
  if (error) throw new Error("League Office accolade standings read failed");

  const stats = new Map();
  const ensure = (id, name) => {
    if (!stats.has(id)) stats.set(id, { id, name, wins: 0, losses: 0, points: 0, games: 0, opponents: [] });
    return stats.get(id);
  };
  for (const g of games || []) {
    const h = ensure(String(g.home_team_id), g.home_team_name);
    const a = ensure(String(g.away_team_id), g.away_team_name);
    h.points += Number(g.home_score || 0); a.points += Number(g.away_score || 0);
    h.games += 1; a.games += 1; h.opponents.push(a.id); a.opponents.push(h.id);
    if (String(g.winner_team_id) === h.id) { h.wins += 1; a.losses += 1; }
    else if (String(g.winner_team_id) === a.id) { a.wins += 1; h.losses += 1; }
  }
  const all = [...stats.values()];
  const avgLeader = [...all].sort((a,b)=>(b.points/b.games)-(a.points/a.games)||b.points-a.points)[0];
  const recordLeader = [...all].sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.points-a.points)[0];
  if (!avgLeader || !recordLeader) return;

  const updates = [
    { name: "Highest Regular-Season Average Points", recipient: avgLeader.name, value: `${(avgLeader.points/avgLeader.games).toFixed(2)} avg through Week ${throughWeek}` },
    { name: "Best Regular-Season Record", recipient: recordLeader.name, value: `${recordLeader.wins}-${recordLeader.losses} through Week ${throughWeek} (provisional; final tie uses head-to-head then strength of schedule)` },
  ];
  for (const u of updates) {
    const { error: updateError } = await supabase.from("league_office_accolades").update({ recipient: u.recipient, result_value: u.value })
      .eq("league_id", String(job.league_id)).eq("season", Number(job.season)).eq("accolade_name", u.name);
    if (updateError) throw new Error("League Office accolade leader persistence failed");
  }
}

async function persistTopPerformer(job, completedWeek, credentials) {
  if (completedWeek < 1) return null;
  const players = await espnAdapter.fetchEspnLeagueOfficePlayers(
    job.league_id, credentials.espn_s2, credentials.swid,
    { seasonId: job.season, week: completedWeek }
  );
  const scored = players.filter((p) => Number.isFinite(Number(p.actual_points)));
  if (!scored.length) throw new Error("League Office Top Performer unavailable: player scores missing");
  const top = [...scored].sort((a, b) => Number(b.actual_points) - Number(a.actual_points) || String(a.player_id).localeCompare(String(b.player_id)))[0];
  const { error } = await supabase.from("league_office_awards").upsert({
    user_id: job.user_id,
    league_id: String(job.league_id),
    season: Number(job.season),
    week: completedWeek,
    award_name: "Top Performer",
    executive_name: top.team_name,
    detail: `${top.player_name} — ${Number(top.actual_points).toFixed(2)} pts`,
    evidence: `Highest ESPN player score among league rosters in Week ${completedWeek}.`,
    created_at: new Date().toISOString(),
  }, { onConflict: "league_id,season,week,award_name" });
  if (error) throw new Error("League Office Top Performer persistence failed");
  return top;
}

async function persistCurrentWeekLine(job, matchups) {
  const line = buildLeagueOfficeLine(matchups);
  if (!line) throw new Error("League Office line unavailable: ESPN projections missing");
  const { error } = await supabase.from("league_office_lines").upsert({
    ...line,
    user_id: job.user_id,
    league_id: String(job.league_id),
    season: Number(job.season),
    week: Number(job.week),
    locked_at: new Date().toISOString(),
  }, { onConflict: "league_id,season,week,game_id" });
  if (error) throw new Error("League Office line persistence failed");
  return line;
}

async function runJob(job) {
  await markJob(job.id, { status: "running", started_at: new Date().toISOString(), error_code: null });
  let stage = "validate";
  try {
    if (job.platform !== "espn") {
      const err = new Error("Provider not implemented for League Office sync");
      err.status = 400;
      throw err;
    }

    stage = "credentials";
    const credentials = await getAuthenticatedEspnCredentials(job.user_id);
    stage = "provider";
    if (DIAGNOSE) {
      for (const diagnosticWeek of [1, 2]) {
        const raw = await espnAdapter.fetchEspnApi(
          job.league_id,
          credentials.espn_s2,
          credentials.swid,
          ["mTeam", "mMatchup", "mMatchupScore"],
          diagnosticWeek,
          { seasonId: job.season }
        );
        const games = (raw?.schedule || [])
          .filter((game) => Number(game?.matchupPeriodId ?? game?.scoringPeriodId) === diagnosticWeek)
          .map((game) => ({
            id: game?.id == null ? null : String(game.id),
            winner: game?.winner || null,
            home: { team_id: game?.home?.teamId == null ? null : String(game.home.teamId), total_points: game?.home?.totalPoints ?? null, points: game?.home?.points ?? null },
            away: { team_id: game?.away?.teamId == null ? null : String(game.away.teamId), total_points: game?.away?.totalPoints ?? null, points: game?.away?.points ?? null },
          }));
        log("diagnostic week", { week: diagnosticWeek, games });
      }
    }

    // A League Office run owns the handoff between weeks: refresh the just-completed
    // week for the recap, then sync the current slate. This is intentionally independent
    // of DIAGNOSE so the persisted record book is always message-ready.
    const weeksToSync = [...new Set([Math.max(1, Number(job.week) - 1), Number(job.week)])];
    let currentMatchupCount = 0;
    let currentMatchups = [];
    let completedMatchups = [];
    for (const syncWeek of weeksToSync) {
      stage = "provider";
      const matchups = await espnAdapter.fetchEspnLeagueWeek(
        job.league_id,
        credentials.espn_s2,
        credentials.swid,
        { seasonId: job.season, week: syncWeek }
      );
      if (syncWeek === Number(job.week)) { currentMatchupCount = matchups.length; currentMatchups = matchups; }
      if (syncWeek === Math.max(1, Number(job.week) - 1)) completedMatchups = matchups;

      if (matchups.length) {
        stage = "persist";
        const rows = matchups.map((row) => ({
          ...row,
          user_id: job.user_id,
          platform: job.platform,
          league_id: String(job.league_id),
          season: Number(job.season),
          week: syncWeek,
          synced_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("league_office_matchups")
          .upsert(rows, { onConflict: "platform,league_id,season,week,game_id" });
        if (error) {
          const persistError = new Error("League Office matchup persistence failed");
          persistError.code = error.code || null;
          throw persistError;
        }
      }

      stage = "verify";
      const { data: persisted, error: verifyError } = await supabase
        .from("league_office_matchups")
        .select("game_id,status,home_score,away_score")
        .eq("platform", job.platform)
        .eq("league_id", String(job.league_id))
        .eq("season", Number(job.season))
        .eq("week", syncWeek);
      if (verifyError || (persisted || []).length !== matchups.length) {
        throw new Error("League Office persisted matchup verification failed");
      }
      const expected = new Map(matchups.map((row) => [String(row.game_id), row]));
      const mismatch = (persisted || []).some((row) => {
        const source = expected.get(String(row.game_id));
        return !source || row.status !== source.status || Number(row.home_score) !== Number(source.home_score) || Number(row.away_score) !== Number(source.away_score);
      });
      if (mismatch) throw new Error("League Office persisted matchup verification mismatch");
      log("week synced", { league_id: job.league_id, season: job.season, week: syncWeek, matchups: currentMatchupCount });
    }

    stage = "message";
    const completedWeek = Math.max(1, Number(job.week) - 1);
    const topPerformer = await persistTopPerformer(job, completedWeek, credentials);
    if (topPerformer) log("top performer stored", { league_id: job.league_id, season: job.season, week: completedWeek, player_id: topPerformer.player_id });
    const transactionAwards = await persistTransactionAwards(job, completedWeek, credentials, completedMatchups);
    log("transaction awards stored", { league_id: job.league_id, season: job.season, week: completedWeek, pickup_player_id: transactionAwards.pickup.player_id, drop_player_id: transactionAwards.drop.player_id });
    // Slops Saloon regular season ends after Week 14; never let playoff weeks alter these $100 races.\n    await updateSeasonAccoladeLeaders(job, Math.min(completedWeek, 14));
    const line = await persistCurrentWeekLine(job, currentMatchups);
    log("primetime line stored", { league_id: job.league_id, season: job.season, week: job.week, game_id: line.game_id });

    stage = "complete";
    await markJob(job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      error_code: null,
    });
    log("job completed", { id: job.id, league_id: job.league_id, season: job.season, week: job.week, matchups: currentMatchupCount });
  } catch (error) {
    await markJob(job.id, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_code: safeErrorCode(error, stage),
    }).catch(() => {});
    log("job failed", { id: job.id, league_id: job.league_id, season: job.season, week: job.week, error_code: safeErrorCode(error, stage), stage });
  }
}

async function main() {
  await ensureCurrentLeagueOfficeJob();
  const jobs = await claimQueuedJobs();
  for (const job of jobs) await runJob(job);
  if (!jobs.length) log("queue empty");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[league-office-sync] worker failed", error?.message || "unknown error");
    process.exitCode = 1;
  });
}

module.exports = { claimQueuedJobs, ensureCurrentLeagueOfficeJob, nflSeasonAndWeek, runJob, main, safeErrorCode };
