const CONFIDENCE_SCORES = {
  low: 45,
  medium: 70,
  high: 85,
};

export function buildTradeShareUrl(origin, hash) {
  return `${String(origin || '').replace(/\/+$/, '')}/trade/share/${hash}`;
}

export function tradeShareTitle(verdict) {
  if (verdict === 'accept') return 'Accept the deal';
  if (verdict === 'decline') return 'Decline the deal';
  return 'Hold for now';
}

export function formatSignedValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return numeric > 0 ? `+${numeric}` : String(numeric);
}

export function formatConfidenceLabel(confidence) {
  const text = String(confidence || 'medium').replace(/_/g, ' ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} confidence`;
}

export function confidenceScoreForLabel(confidence) {
  return CONFIDENCE_SCORES[String(confidence || '').toLowerCase()] ?? CONFIDENCE_SCORES.medium;
}

export function riskLabelForSnapshot(snapshot = {}) {
  const confidence = String(snapshot.result?.confidence || '').toLowerCase();
  if (confidence === 'low') return 'High risk';
  if (snapshot.result?.depth_discounted) return 'Medium risk';
  return 'Medium risk';
}

function namesFor(players = []) {
  return players.map((player) => player?.name || 'Unknown').join(', ');
}

export function formatShareExpiry(value) {
  if (!value) return 'Expires after 30 days';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Expires after 30 days';
  return `Expires ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })}`;
}

export function summarizeTradeSnapshot(snapshot = {}) {
  const trade = snapshot.trade || {};
  const result = snapshot.result || {};
  const send = namesFor(trade.send);
  const receive = namesFor(trade.receive);

  return {
    title: tradeShareTitle(result.verdict),
    description: `Receive ${receive || 'the incoming side'} for ${send || 'the outgoing side'}.`,
    netValueLabel: formatSignedValue(result.net_value),
    confidenceLabel: formatConfidenceLabel(result.confidence),
    confidenceScore: confidenceScoreForLabel(result.confidence),
    riskLabel: riskLabelForSnapshot(snapshot),
    dataLabel: 'Public snapshot',
    expiresLabel: formatShareExpiry(snapshot.expires_at),
    sendLabel: send,
    receiveLabel: receive,
    scoringFormat: trade.scoring_format || result.scoring_format || 'ppr',
  };
}
