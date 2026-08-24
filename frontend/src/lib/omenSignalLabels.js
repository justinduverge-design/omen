const SIGNAL_STATUS_META = {
  live: {
    label: 'Live',
    description: 'Active input',
    usedLabel: 'Used',
    token: '--color-data-live',
  },
  stub: {
    label: 'Stub',
    description: 'Placeholder input',
    usedLabel: 'Limited',
    token: '--color-data-stub',
  },
  mock: {
    label: 'Mock',
    description: 'Preview input',
    usedLabel: 'Preview',
    token: '--color-data-mock',
  },
  unavailable: {
    label: 'Unavailable',
    description: 'Input missing',
    usedLabel: 'Not used',
    token: '--color-data-unavailable',
  },
};

const SIGNAL_KEY_LABELS = {
  roster: 'Roster',
  projections: 'Projections',
  weather: 'Weather',
  travel_home_away: 'Home/away context',
  game_time_tv: 'Kickoff window',
  matchup_dvp: 'Matchup DvP',
  waivers: 'Waiver context',
  llm_reasoning: 'Plain-English reasoning',
  exact_espn_scoring_unavailable: 'Exact ESPN scoring unavailable',
};

function normalizeSignalStatus(status) {
  if (status === 'demo') return 'mock';
  return SIGNAL_STATUS_META[status] ? status : 'unavailable';
}

export function omenSignalStatusMeta(status) {
  const meta = SIGNAL_STATUS_META[normalizeSignalStatus(status)];
  return {
    label: meta.label,
    description: meta.description,
    usedLabel: meta.usedLabel,
  };
}

export function omenSignalBadgeStyle(status) {
  const meta = SIGNAL_STATUS_META[normalizeSignalStatus(status)];
  const token = `var(${meta.token})`;
  return {
    color: token,
    borderColor: `color-mix(in srgb, ${token} 45%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${token} 14%, transparent)`,
  };
}

export function formatOmenSignalKey(key) {
  if (SIGNAL_KEY_LABELS[key]) return SIGNAL_KEY_LABELS[key];
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
