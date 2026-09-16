"use strict";

const { createClient } = require("@supabase/supabase-js");
const config = require("./config");
const { getAuthenticatedEspnCredentials } = require("./services/espnAuth");
const espnAdapter = require("./adapters/espn");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false },
});

function safeCode(error) {
  if (error?.status === 401) return "reconnect_required";
  if (error?.status === 404) return "league_not_found";
  return "provider_failed";
}

async function claimJob() {
  const { data, error } = await supabase
    .from("league_office_sync_jobs")
    .select("id,user_id,platform,league_id,season,week")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`League Office queue read failed: ${error.message}`);
  if (!data) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("league_office_sync_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), error_code: null })
    .eq("id", data.id)
    .eq("status", "queued")
    .select("id,user_id,platform,league_id,season,week")
    .maybeSingle();
  if (claimError) throw new Error(`League Office queue claim failed: ${claimError.message}`);
  return claimed || null;
}

async function syncEspn(job) {
  const credentials = await getAuthenticatedEspnCredentials(job.user_id);
  const rows = await espnAdapter.fetchEspnLeagueWeek(
    job.league_id,
    credentials.espn_s2,
    credentials.swid,
    { seasonId: job.season, week: job.week }
  );
  const payload = rows.map((row) => ({
    user_id: job.user_id,
    platform: "espn",
    league_id: String(job.league_id),
    season: Number(job.season),
    week: Number(job.week),
    ...row,
    synced_at: new Date().toISOString(),
  }));
  if (!payload.length) return 0;

  const { error } = await supabase
    .from("league_office_matchups")
    .upsert(payload, { onConflict: "user_id,platform,league_id,season,week,game_id" });
  if (error) throw new Error(`League Office matchup write failed: ${error.message}`);
  return payload.length;
}

async function runOnce() {
  const job = await claimJob();
  if (!job) return { status: "idle" };
  try {
    if (job.platform !== "espn") throw Object.assign(new Error("Unsupported League Office provider"), { status: 400 });
    const matchupCount = await syncEspn(job);
    await supabase.from("league_office_sync_jobs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      error_code: null,
    }).eq("id", job.id);
    return { status: "completed", job_id: job.id, matchup_count: matchupCount };
  } catch (error) {
    await supabase.from("league_office_sync_jobs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_code: safeCode(error),
    }).eq("id", job.id);
    throw error;
  }
}

if (require.main === module) {
  runOnce()
    .then((result) => console.log("[league-office-sync]", JSON.stringify(result)))
    .catch((error) => {
      console.error("[league-office-sync] failed", safeCode(error));
      process.exitCode = 1;
    });
}

module.exports = { runOnce, claimJob, syncEspn, safeCode };
