const PLATFORM_TOKEN = {
  sleeper: '--color-platform-sleeper',
  yahoo: '--color-platform-yahoo',
  espn: '--color-platform-espn',
};

// Yahoo and ESPN's brand hues are too low-luminance to read as small text
// directly on the dark-theme surface; [data-theme="dark"] defines lightened
// -chip overrides for those two only. Sleeper's brand cyan is bright enough
// to use directly in both themes.
const PLATFORM_CHIP_TOKEN = {
  sleeper: '--color-platform-sleeper',
  yahoo: '--color-platform-yahoo-chip',
  espn: '--color-platform-espn-chip',
};

export function platformChipStyle(platform) {
  const token = PLATFORM_TOKEN[platform];
  if (!token) {
    return {
      borderColor: 'var(--color-border)',
      background: 'var(--color-surface-2)',
      color: 'var(--color-text-secondary)',
    };
  }
  const chipToken = PLATFORM_CHIP_TOKEN[platform];
  return {
    borderColor: `color-mix(in srgb, var(${token}) 35%, transparent)`,
    background: `color-mix(in srgb, var(${token}) 14%, transparent)`,
    color: `var(${chipToken}, var(${token}))`,
  };
}

export function platformButtonStyle(platform) {
  const token = PLATFORM_TOKEN[platform];
  if (!token) return {};
  return {
    background: `var(${token})`,
    color: `var(--color-on-platform-${platform})`,
  };
}
