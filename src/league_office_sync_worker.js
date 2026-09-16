"use strict";

// League Office sync worker.
// SECURITY: never logs or stores ESPN credentials or raw provider payloads.

const { createClient } = require("@supabase/supabase-js");
const config = require("./config");
const { getAuthenticatedEspnCredentials } = require("./services/espnAuth");
const espnAdapter = require("./adapters/espn");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false },
});

const LEAGUE_OFFICE_LEAGUE_ID = process.env.LEAGUE_OFFICE_LEAGUE_ID || "13338821";
const LEAGUE_OFFICE_PLATFORM = "espn";

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
    .select("id,status")
    .eq("user_id", connection.user_id)
    .eq("platform", LEAGUE_OFFICE_PLATFORM)
    .eq("league_id", LEAGUE_OFFICE_LEAGUE_ID)
    .eq("season", season)
    .eq("week", week)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error("League Office current-week lookup failed");

  if (existing?.id) {
    if (existing.status === "queued" || existing.status === "running") return existing.id;
    const { error } = await supabase
      .from("league_office_sync_jobs")
      .update({
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
    const matchups = await espnAdapter.fetchEspnLeagueWeek(
      job.league_id,
      credentials.espn_s2,
      credentials.swid,
      { seasonId: job.season, week: job.week }
    );

    if (matchups.length) {
      stage = "persist";
      const rows = matchups.map((row) => ({
        ...row,
        user_id: job.user_id,
        platform: job.platform,
        league_id: String(job.league_id),
        season: Number(job.season),
        week: Number(job.week),
      }));
      const { error } = await supabase
        .from("league_office_matchups")
        .upsert(rows, { onConflict: "user_id,platform,league_id,season,week,game_id" });
      if (error) {
        const persistError = new Error("League Office matchup persistence failed");
        persistError.code = error.code || null;
        throw persistError;
      }
    }

    stage = "complete";
    await markJob(job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      error_code: null,
    });
    log("job completed", { id: job.id, league_id: job.league_id, season: job.season, week: job.week, matchups: matchups.length });
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
