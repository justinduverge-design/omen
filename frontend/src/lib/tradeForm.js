export const TRADE_POSITIONS = Object.freeze(['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF']);

export const TRADE_SCORING_FORMATS = Object.freeze([
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half PPR' },
  { value: 'standard', label: 'Standard' },
]);

export const TRADE_DEAL_SHAPES = Object.freeze([
  {
    value: 'two_team',
    label: 'Two-team',
    description: 'Classic swap: what you send against what you receive.',
  },
  {
    value: 'multi_team',
    label: 'Multi-team',
    description: 'Use your net side from the full deal. Omen compares only what leaves and enters your roster.',
  },
]);

export const DEFAULT_TRADE_SCORING_FORMAT = 'ppr';
export const DEFAULT_TRADE_DEAL_SHAPE = 'two_team';

export const EMPTY_TRADE_PLAYER = Object.freeze({
  name: '',
  position: 'RB',
  team: '',
  projected_points: '',
  status: '',
});

export function tradeDealShapeMeta(value) {
  return TRADE_DEAL_SHAPES.find((shape) => shape.value === value) ?? TRADE_DEAL_SHAPES[0];
}

function normalizePosition(position) {
  const next = String(position || '').trim().toUpperCase();
  return TRADE_POSITIONS.includes(next) ? next : EMPTY_TRADE_PLAYER.position;
}

function normalizeScoringFormat(scoringFormat) {
  return TRADE_SCORING_FORMATS.some((format) => format.value === scoringFormat)
    ? scoringFormat
    : DEFAULT_TRADE_SCORING_FORMAT;
}

export function cleanTradePlayer(player) {
  const cleaned = {
    name: String(player.name || '').trim() || 'Unknown',
    position: normalizePosition(player.position),
  };

  const team = String(player.team || '').trim().toUpperCase();
  if (team) cleaned.team = team;

  const projected = Number(player.projected_points);
  if (player.projected_points !== '' && Number.isFinite(projected)) {
    cleaned.projected_points = projected;
  }

  const status = String(player.status || '').trim();
  if (status) cleaned.status = status;

  return cleaned;
}

export function buildTradePayload({
  send = [],
  receive = [],
  scoringFormat = DEFAULT_TRADE_SCORING_FORMAT,
} = {}) {
  return {
    scoring_format: normalizeScoringFormat(scoringFormat),
    send: send.map(cleanTradePlayer),
    receive: receive.map(cleanTradePlayer),
  };
}
