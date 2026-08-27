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

/**
 * Per-provider permission to persist the full rule body into `moves.scoring_contract`.
 *
 * Flip a provider to `true` ONLY when its affirmative rights path is evidenced
 * and recorded in `Direction/facts-of-record.md`. Nothing else needs to change:
 * the derivation, hashing, and coverage states already work.
 */
const RETAIN_RULE_BODY = Object.freeze({
  // Written commercial-use permission requested 2026-08-22, still pending.
  sleeper: false,
  // Provider-restricted absent express permission.
  espn: false,
  // Agreement executed, but the API entitlement still returns 403.
  yahoo: false,
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
    contract_version: null,
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
async function resolveScoringPersistenceMetadata({ platform, leagueId, deps = {} } = {}) {
  const name = String(platform || "").trim().toLowerCase();
  if (!name) return pendingMetadata("No platform was recorded on this recommendation.");

  const retain = RETAIN_RULE_BODY[name] === true;

  // ESPN and Yahoo need no provider call at all — their coverage state is a
  // rights and entitlement fact, not a data fact. Deriving without a fetch also
  // means an outage at either provider cannot affect this path.
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
