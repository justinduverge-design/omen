export const OMEN_DECISION_BRIEF_VERSION = 'omen-decision-brief.v3';

const BAND_LABELS = Object.freeze({
  confident: 'Confident',
  leaning: 'Leaning',
  coin_flip: 'Coin flip',
});

export function omenDecisionBriefRequest() {
  return { contract_version: OMEN_DECISION_BRIEF_VERSION };
}

export function confidenceBandPresentation(confidence) {
  if (!confidence || typeof confidence !== 'object') return null;

  const band = typeof confidence.band === 'string' ? confidence.band : null;
  const drivers = Array.isArray(confidence.drivers)
    ? confidence.drivers.filter((item) => typeof item === 'string' && item.trim())
    : [];
  const unavailableReasons = Array.isArray(confidence.unavailable_reason)
    ? confidence.unavailable_reason.filter((item) => typeof item === 'string' && item.trim())
    : [];

  if (!band && !unavailableReasons.length) return null;
  return {
    band,
    label: band ? (BAND_LABELS[band] || band.replace(/_/g, ' ')) : 'No confidence read',
    drivers,
    unavailableReasons,
  };
}

export function normalizeCapabilities(capabilities) {
  if (!Array.isArray(capabilities)) return [];
  return capabilities.filter((capability) => (
    capability
      && typeof capability.name === 'string'
      && typeof capability.state === 'string'
      && typeof capability.statement === 'string'
  ));
}

export function footballIntelligenceExplanation(data) {
  const value = data?.football_intelligence;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const status = typeof value.status === 'string' ? value.status : 'unavailable';
  const nonAdvisory = ['unavailable', 'insufficient_coverage', 'disputed', 'pending'].includes(status);
  const summary = typeof value.summary === 'string' && value.summary.trim()
    ? value.summary.trim()
    : null;
  const whatCouldChangeThis = Array.isArray(value.interpretation?.what_could_change_this)
    ? value.interpretation.what_could_change_this.filter((item) => typeof item === 'string' && item.trim())
    : [];
  const limitations = Array.isArray(value.quality?.limitations)
    ? value.quality.limitations.filter((item) => typeof item === 'string' && item.trim())
    : [];

  if (!summary && !whatCouldChangeThis.length && !limitations.length && !value.reason_code) return null;
  return {
    status,
    reasonCode: typeof value.reason_code === 'string' ? value.reason_code : null,
    summary: nonAdvisory ? null : summary,
    whatCouldChangeThis,
    limitations,
    coverageState: typeof value.quality?.coverage === 'string' ? value.quality.coverage : null,
    freshnessState: typeof value.freshness?.state === 'string' ? value.freshness.state : null,
    coverageRatio: Number.isFinite(value.evidence?.coverage_ratio) ? value.evidence.coverage_ratio : null,
    games: Number.isFinite(value.evidence?.games) ? value.evidence.games : null,
    plays: Number.isFinite(value.evidence?.plays) ? value.evidence.plays : null,
    chartedPlays: Number.isFinite(value.evidence?.charted_plays) ? value.evidence.charted_plays : null,
    latestObservationAt: typeof value.freshness?.latest_observation_at_utc === 'string'
      ? value.freshness.latest_observation_at_utc
      : null,
  };
}
