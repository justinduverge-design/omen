"use strict";

/**
 * Keep each league's scoring rules, so a served call can later be graded against the league's own
 * scoring (and advised in its real format). One row per distinct rule set a league used in a season
 * (`league_scoring_rules`, redo step 11): a changed rule set is a new row, an unchanged one is a no-op.
 *
 * Rights: the rule body only reaches this writer when `scoringSnapshotResolver` retained it
 * (`RETAIN_RULE_BODY`, a per-provider decision recorded in the decision log). A withheld or pending body
 * is never stored; this module does not second-guess that gate and cannot widen it.
 *
 * Best-effort: a failure here is logged by stage and database code only and never costs the user their
 * answer. Logs carry no league id, rule values or user id.
 */

const UNIQUE_VIOLATION = "23505";
const PROVIDERS = new Set(["sleeper", "espn", "yahoo"]);
const HEX64 = /^[0-9a-f]{64}$/;
const JOB = "omen_api scoring_rules writer v1";

const RIGHTS_BASIS = Object.freeze({
  sleeper: "sleeper_public_api",
  espn: "espn_user_connection",
  yahoo: "yahoo_user_connection",
});

const skipped = (reason) => ({ written: false, reason });

class ScoringRulesError extends Error {
  constructor(stage, error) {
    super(`scoring rules ${stage} failed`);
    this.stage = stage;
    this.code = error?.code || null;
  }
}

function must(result, stage) {
  if (result?.error) throw new ScoringRulesError(stage, result.error);
  return result?.data ?? null;
}

/**
 * @param supabase service-role client
 * @param {{platform:string, providerLeagueId:string, season:number, scoring:object}} input
 *   `scoring` is the resolver's persistence metadata (contract, contract_version, contract_hash,
 *   coverage_state, retention_withheld).
 * @returns {Promise<{written:boolean, reason?:string, id?:number}>}
 */
async function recordLeagueScoringRules(supabase, { platform, providerLeagueId, season, scoring } = {}) {
  if (!PROVIDERS.has(platform)) return skipped("provider_unsupported");
  const leagueKey = providerLeagueId == null ? "" : String(providerLeagueId);
  const year = Number(season);
  if (!leagueKey || !Number.isInteger(year) || year < 2000 || year > 2100) return skipped("context_incomplete");

  const contract = scoring?.contract;
  const hash = typeof scoring?.contract_hash === "string" ? scoring.contract_hash : "";
  const version = typeof scoring?.contract_version === "string" ? scoring.contract_version : "";
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) return skipped("rules_not_retained");
  if (!HEX64.test(hash) || !version) return skipped("contract_incomplete");
  // Only a fully derived rule set can grade a call; a partial one is kept in `moves` as before.
  if (scoring.coverage_state !== "supported") return skipped("coverage_not_supported");

  const league = must(await supabase
    .from("leagues").select("id")
    .eq("provider", platform).eq("provider_league_id", leagueKey).eq("season", year)
    .maybeSingle(), "league_lookup");
  if (!league?.id) return skipped("league_not_registered");

  const existing = must(await supabase
    .from("league_scoring_rules").select("id")
    .eq("league_id", league.id).eq("season", year).eq("contract_hash", hash)
    .maybeSingle(), "existing_lookup");
  if (existing) return { written: false, reason: "unchanged", id: existing.id };

  const event = must(await supabase.from("data_events").insert({
    event: "ingest",
    subject: `scoring_rules:${platform}`,
    provider: platform,
    rights_basis: RIGHTS_BASIS[platform],
    job: JOB,
    source_ref: `sha256:${hash}`,
    row_count: 1,
    details: { source: "live_request" },
  }).select("id").single(), "ingest_event");

  const insert = await supabase.from("league_scoring_rules").insert({
    ingest_event_id: event.id,
    provider: platform,
    league_id: league.id,
    season: year,
    contract_version: version,
    contract_hash: hash,
    rules: contract,
    uses: ["grading", "advice"],
  }).select("id").single();
  // A concurrent request wrote the same rule set first: the goal is met.
  if (insert.error?.code === UNIQUE_VIOLATION) return { written: false, reason: "unchanged" };
  const row = must(insert, "rules_insert");
  return { written: true, id: row.id };
}

async function recordLeagueScoringRulesSafely(supabase, input, { log } = {}) {
  try {
    const result = await recordLeagueScoringRules(supabase, input);
    if (!result.written && result.reason !== "unchanged" && result.reason !== "rules_not_retained" && log) {
      log.info("League scoring rules not recorded", { reason: result.reason });
    }
    return result;
  } catch (error) {
    if (log) log.warn("League scoring rules write failed", { stage: error?.stage || "unknown", code: error?.code || null });
    return { written: false, reason: "write_failed" };
  }
}

module.exports = { recordLeagueScoringRules, recordLeagueScoringRulesSafely, ScoringRulesError };
