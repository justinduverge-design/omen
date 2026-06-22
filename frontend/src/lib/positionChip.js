const POSITION_TOKEN = {
  QB: '--color-pos-qb',
  RB: '--color-pos-rb',
  WR: '--color-pos-wr',
  TE: '--color-pos-te',
  DEF: '--color-pos-def',
  DST: '--color-pos-def',
  K: '--color-pos-k',
};

export function positionChipStyle(position) {
  const token = POSITION_TOKEN[position];
  if (!token) {
    return {
      borderColor: 'var(--color-border)',
      background: 'var(--color-surface-1)',
      color: 'var(--color-text-primary)',
    };
  }
  return {
    borderColor: `color-mix(in srgb, var(${token}) 30%, transparent)`,
    background: `color-mix(in srgb, var(${token}) 10%, transparent)`,
    color: `var(${token})`,
  };
}
