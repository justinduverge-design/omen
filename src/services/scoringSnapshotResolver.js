"use strict";

/**
 * A6 step 2 — join the two halves.
 *
 * PR #372 built the write path: every issued live recommendation is persisted,
 * and the route refuses to issue one it cannot persist. It writes
 * `scoring_contract: null` with the metadata beside it, because nothing derived
 * the contract yet.
 *
 * PR #371 built the derivation (`scoringRuleSnapshot.js`). This module is the
 * seam between them: given a platform and a league id, produce the persistence
 * metadata the write path wants.
 *
 * Two constraints shape everything here.
 *
 * 1. **It must never throw.** Because #372 refuses to issue a recommendation
 *    when persistence fails, an exception raised here would not degrade scoring
 *    metadata — it would take away the user's recommendation entirely. Every
 *    failure path returns a `pending` snapshot instead.
 *
 * 2. **Retention of the rule BODY is rights-gated, per provider.** A6's external
 *    blocker reads: "each provider needs an affirmative rights/entitlement path
 *    before Omen may capture and retain its complete private rule snapshot."
 *    Sleeper's written commercial-use permission is still pending, Yahoo's
 *    entitlement still returns 403, and ESPN is restricted by default. So
 *    `RETAIN_RULE_BODY` is **false for every provider** and this module persists
 *    only *derived* metadata — coverage state, contract version, and hashes,
 *    which is exactly what #372 already persists.
 *
 *    Deriving a snapshot in memory to compute a hash is not the same act as
 *    retaining the provider's rules in our database. This module does the first
 *    and refuses the second until someone with the authority to say so flips a
 *    flag. That question is deliberately visible in one place rather than
 *    settled implicitly by whoever wired this up.
 */

const { deriveScoringSnapshot } = require("./scoringRuleSnapshot");
const { SCORING_CONTRACT_VERSION } = require("./scoringContract");

/**
 * Per-provider permission to persist the full rule body into `moves.scoring_contract`.
 *
 * Flip a provider to `true` ONLY when its affirmative rights path is evidenced
 * and recorded in `Direction/facts-of-record.md`. Nothing else needs to change:
 * the derivation, hashing, and coverage states already work.
 */
const RETAIN_RULE_BODY = Object.freeze({
  // TRUE since 2026-08-27. Sleeper's own documentation does not restrict storage — it
  // instructs it ("You should save this information on your own servers", "if you are
  // storing information, you'll want to hold onto the user_id"). The single gate Sleeper
  // publishes is commercial vs non-commercial, and it does not distinguish reading from
  // retaining. Storing a league's rules therefore adds no rights exposure beyond the call
  // that already fetched them, on the same request, to serve that user.
  //
  // This does NOT resolve whether Omen is "non-commercial" to Sleeper. That question is
  // open, is a founder/counsel judgement, and governs the whole integration — thirteen
  // source files call the Sleeper adapter on the serving path. Withholding one column never
  // reduced that exposure; it only degraded the product.
  // Analysis: Direction/reviews/2026-08-27-sleeper-retention-rights.md
  sleeper: true,
  // **Founder-authorized 2026-09-06**, on the record, after being shown that the previous
  // `provider_restricted` state was a rights position rather than a technical limit: ESPN
  // serves the complete rule set to the league's own member, through the same authenticated
  // session Omen already uses to read that member's roster. The concern raised before the
  // decision — that this also feeds the grading pipeline currently held by
  // `OMEN_CRON_SCORING_ENABLED=false` — was stated and the founder reaffirmed both halves.
  // See the decision log entry of that date.
  espn: true,
  // Was withheld because "the API is refused at the application-entitlement level, so there is
  // nothing to retain". **That refusal ended 2026-08-28** (facts-of-record #11). Yahoo's
  // settings endpoint reads fine — measured 2026-09-06 — and its rules are now derived, so
  // retention follows the same founder authorization recorded for ESPN.
  yahoo: true,
});

const LEGACY_FORMAT_LABEL = Object.freeze({
  standard: "Standard",
  half_ppr: "Half PPR",
  ppr: "PPR",
});

/**
 * Map a derived contract back to the legacy three-label column. Only an exact,
 * fully supported reception rule earns a label; anything else stays null rather
 * than rounding an unmapped league to its nearest familiar name.
 */
function legacyFormatFromSnapshot(snapshot) {
  if (snapshot?.coverage_state !== "supported") return null;
  const reception = (snapshot.contract?.rules || [])
    .find((rule) => rule.event_key === "receiving_receptions" && rule.operator === "per_event");
  if (!reception) return null;
  if (reception.value === 0) return "standard";
  if (reception.value === 0.5) return "half_ppr";
  if (reception.value === 1) return "ppr";
  return null;
}

function metadataFrom(snapshot, { retain }) {
  const format = legacyFormatFromSnapshot(snapshot);
  return {
    format,
    legacy_label: format ? LEGACY_FORMAT_LABEL[format] : null,
    contract_required: true,
    contract_version: snapshot.contract?.ruleset_version || null,
    contract_hash: snapshot.contract_hash || null,
    provider_rule_snapshot_hash: snapshot.provider_rule_snapshot_hash || null,
    coverage_state: snapshot.coverage_state,
    reconciliation_state: "pending",
    // Null until the provider's retention right is evidenced. The hash above
    // still pins exactly which rules produced this row, so provenance survives
    // even though the body is not retained.
    contract: retain ? (snapshot.contract || null) : null,
    retention_withheld: !retain && snapshot.coverage_state === "supported",
  };
}

/** The answer when nothing could be derived. Never an exception. */
function pendingMetadata(reason) {
  return {
    format: null,
    legacy_label: null,
    contract_required: true,
    // The ruleset version is a fact about Omen's contract vocabulary, not about the league, so
    // it survives a failed read. Without it a row records that its rules were unavailable but
    // not *which* contract system was in force when that happened, and the Tuesday cron's
    // "scoring metadata must never be silently dropped" invariant loses its provenance.
    contract_version: SCORING_CONTRACT_VERSION,
    contract_hash: null,
    provider_rule_snapshot_hash: null,
    coverage_state: "pending",
    reconciliation_state: "pending",
    contract: null,
    retention_withheld: false,
    reason,
  };
}

/**
 * @param {object} input
 * @param {string|null} input.platform  "sleeper" | "espn" | "yahoo"
 * @param {string|null} input.leagueId
 * @param {object} [input.deps] injectable provider I/O, so this is testable
 *   without a network
 * @returns {Promise<object>} persistence metadata; never rejects
 */
/**
 * Reads an ESPN league's scoring settings with the connected user's own credentials.
 *
 * Required lazily so this module stays importable, and testable, without the ESPN adapter or
 * a credential path present.
 */
async function defaultEspnSettingsReader(leagueId, userId) {
  const { getAuthenticatedEspnCredentials } = require("./espnAuth");
  const { fetchEspnApi } = require("../adapters/espn");
  const credentials = await getAuthenticatedEspnCredentials(userId);
  const data = await fetchEspnApi(leagueId, credentials.espn_s2, credentials.swid, ["mSettings"], null, {});
  return data?.settings || null;
}

/**
 * Reads a Yahoo league's settings with the connected user's own OAuth token.
 *
 * Yahoo nests settings under `league[1].settings[0]`, the same walk `getLeagueMetadata` uses.
 * Required lazily so this module stays importable without the Yahoo auth path present.
 */
async function defaultYahooSettingsReader(leagueId, userId) {
  const { getAuthenticatedYahooClient } = require("./yahooAuth");
  const { client } = await getAuthenticatedYahooClient(userId);
  const data = await client.get(`/league/${leagueId}/settings`);
  const league = data?.fantasy_content?.league;
  const settings = Array.isArray(league) ? league[1]?.settings : league?.settings;
  return Array.isArray(settings) ? settings[0] : settings || null;
}

async function resolveScoringPersistenceMetadata({ platform, leagueId, userId = null, deps = {} } = {}) {
  const name = String(platform || "").trim().toLowerCase();
  if (!name) return pendingMetadata("No platform was recorded on this recommendation.");

  const retain = RETAIN_RULE_BODY[name] === true;

  if (name === "espn") {
    // Needs a credentialed read, so it needs to know whose credentials. Without a user this
    // cannot fetch, and reporting `pending` is the honest answer — never a fabricated
    // contract, and never the old blanket `provider_restricted`, which is no longer true.
    if (!leagueId || !userId) {
      return pendingMetadata("This ESPN league's scoring settings were not read when this recommendation was issued.");
    }
    const fetchEspnSettings = deps.fetchEspnScoringSettings || defaultEspnSettingsReader;
    let settings;
    try {
      settings = await fetchEspnSettings(leagueId, userId);
    } catch {
      // Never surface the provider message, and never throw: this path must not cost the
      // user their recommendation.
      return pendingMetadata("ESPN league settings could not be read when this recommendation was issued.");
    }
    return metadataFrom(deriveScoringSnapshot({ platform: "espn", leagueSettings: settings }), { retain });
  }

  if (name === "yahoo") {
    // Same shape as ESPN: a credentialed read, so it needs to know whose credentials.
    if (!leagueId || !userId) {
      return pendingMetadata("This Yahoo league's scoring settings were not read when this recommendation was issued.");
    }
    const fetchYahooSettings = deps.fetchYahooLeagueSettings || defaultYahooSettingsReader;
    let settings;
    try {
      settings = await fetchYahooSettings(leagueId, userId);
    } catch {
      return pendingMetadata("Yahoo league settings could not be read when this recommendation was issued.");
    }
    return metadataFrom(deriveScoringSnapshot({ platform: "yahoo", leagueSettings: settings }), { retain });
  }

  if (name !== "sleeper") {
    return metadataFrom(deriveScoringSnapshot({ platform: name }), { retain });
  }

  if (!leagueId) return pendingMetadata("No Sleeper league id was recorded on this recommendation.");

  const fetchLeague = deps.fetchSleeperLeague
    || require("../adapters/sleeper").fetchSleeperLeague;

  let league;
  try {
    league = await fetchLeague(leagueId);
  } catch {
    // Never surface the provider message — and never let it reach the caller as
    // an exception, because that would cost the user their recommendation.
    return pendingMetadata("Sleeper league settings could not be read when this recommendation was issued.");
  }

  return metadataFrom(
    deriveScoringSnapshot({ platform: "sleeper", leagueSettings: league?.scoring_settings || null }),
    { retain }
  );
}

module.exports = {
  RETAIN_RULE_BODY,
  legacyFormatFromSnapshot,
  pendingMetadata,
  resolveScoringPersistenceMetadata,
};
