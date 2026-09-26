"use strict";

const CONTRACT_VERSION = "football-intelligence-signal.v1";
const SIGNAL_TYPE = "coach_transfer_system_signal";
const SERVABLE_STATUSES = new Set(["available", "insufficient_coverage", "stale", "disputed"]);
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const RECEIPT = /^receipt:[0-9a-f]{64}$/;

class FootballIntelligenceServingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "FootballIntelligenceServingError";
    this.code = code;
  }
}

function createFootballIntelligenceServingRepository({ client, now = () => new Date() } = {}) {
  if (!client || typeof client.from !== "function") {
    throw new TypeError("a Supabase client is required");
  }

  async function findPublishedCoachTransfer({ teamId, coachId, season }) {
    return findPublished({ teamId, coachId, season });
  }

  async function findPublishedTeamSignal({ teamId, season }) {
    return findPublished({ teamId, season });
  }

  async function findPublished({ teamId, coachId, season }) {
    let result;
    try {
      let query = client
        .from("football_intelligence_signals")
        .select([
          "contract_version", "signal_type", "team_id", "coach_id", "season", "status", "payload",
          "artifact_id", "artifact_version", "receipt_id", "output_hash", "source_artifact_ids",
          "publication_state", "published_at", "stale_after",
        ].join(","))
        .eq("team_id", teamId);
      if (coachId !== undefined) query = query.eq("coach_id", coachId);
      query = query
        .eq("season", season)
        .eq("signal_type", SIGNAL_TYPE)
        .eq("publication_state", "published");
      result = await query
        .order("published_at", { ascending: false })
        .order("artifact_id", { ascending: false })
        .limit(1)
        .maybeSingle();
    } catch {
      throw servingFailure();
    }

    if (result?.error) throw servingFailure();
    if (!result?.data) return null;
    validateRow(result.data, { teamId, coachId, season });

    const payload = structuredClone(result.data.payload);
    const staleAfter = result.data.stale_after ? Date.parse(result.data.stale_after) : null;
    const current = now();
    const currentTime = current instanceof Date ? current.getTime() : Number.NaN;
    if (staleAfter !== null && Number.isFinite(staleAfter) && Number.isFinite(currentTime) && currentTime > staleAfter) {
      payload.status = "stale";
      payload.reason_code = "source_stale";
      payload.freshness = { ...payload.freshness, state: "stale" };
      payload.quality = {
        ...payload.quality,
        limitations: [...new Set([...(payload.quality?.limitations || []), "The latest published evidence is stale."])],
      };
    }
    return payload;
  }

  return Object.freeze({ findPublishedCoachTransfer, findPublishedTeamSignal });
}

function validateRow(row, scope) {
  const payload = row?.payload;
  if (row.contract_version !== CONTRACT_VERSION
    || row.signal_type !== SIGNAL_TYPE
    || row.publication_state !== "published"
    || row.team_id !== scope.teamId
    || (scope.coachId !== undefined && row.coach_id !== scope.coachId)
    || Number(row.season) !== scope.season
    || !SERVABLE_STATUSES.has(row.status)
    || !payload || Array.isArray(payload) || typeof payload !== "object"
    || payload.contract_version !== CONTRACT_VERSION
    || payload.signal_type !== SIGNAL_TYPE
    || payload.status !== row.status
    || payload.subject?.team_id !== row.team_id
    || payload.subject?.coach_id !== row.coach_id
    || Number(payload.subject?.season) !== Number(row.season)
    || payload.publication?.artifact_id !== row.artifact_id
    || payload.publication?.artifact_version !== row.artifact_version
    || payload.publication?.published_at_utc !== row.published_at
    || typeof row.artifact_version !== "string"
    || row.artifact_version.length === 0
    || !Number.isFinite(Date.parse(row.published_at))
    || !SHA256.test(row.artifact_id)
    || !SHA256.test(row.output_hash)
    || !RECEIPT.test(row.receipt_id)
    || !Array.isArray(row.source_artifact_ids)
    || row.source_artifact_ids.length === 0
    || row.source_artifact_ids.some((id) => !SHA256.test(id))) {
    throw new FootballIntelligenceServingError("SERVING_ROW_INVALID", "football intelligence serving row failed validation");
  }
}

function servingFailure() {
  return new FootballIntelligenceServingError("SERVING_READ_FAILED", "football intelligence serving read failed");
}

module.exports = {
  CONTRACT_VERSION,
  FootballIntelligenceServingError,
  SIGNAL_TYPE,
  createFootballIntelligenceServingRepository,
};
