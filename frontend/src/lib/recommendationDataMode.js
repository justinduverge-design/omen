const SUPPORTED_MODES = new Set(['live', 'mock', 'demo']);

/** Resolve the recommendation envelope's user-visible truth state. */
export function recommendationDataMode(data) {
  const mode = typeof data?.mode === 'string' ? data.mode.trim().toLowerCase() : '';
  if (!SUPPORTED_MODES.has(mode)) return 'unverified';

  if (mode === 'live') {
    const statuses = Object.values(data?.signals || {})
      .map((signal) => String(signal?.status || '').toLowerCase())
      .filter(Boolean);
    const hasPreviewSignal = statuses.some((status) => status === 'mock' || status === 'demo');
    const hasMockWarning = data?.warnings?.some((warning) =>
      /\b(mock|demo)\b/i.test(String(warning)),
    );
    if (hasPreviewSignal || hasMockWarning) return 'unverified';
  }

  return mode;
}

/** Legacy waiver envelopes use an explicit boolean instead of `mode`. */
export function waiverDataMode(data) {
  if (data?.is_mock === true) return 'mock';
  if (data?.is_mock === false) return 'live';
  return 'unverified';
}
