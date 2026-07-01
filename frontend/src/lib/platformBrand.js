const PLATFORM_BRANDS = {
  sleeper: {
    key: 'sleeper',
    label: 'Sleeper',
    letter: 'S',
    accent: '#1FA3E8',
    hover: '#178EC9',
    onAccent: '#04131A',
    softBackground: 'rgba(31, 163, 232, 0.14)',
    softBorder: 'rgba(31, 163, 232, 0.34)',
  },
  yahoo: {
    key: 'yahoo',
    label: 'Yahoo',
    letter: 'Y',
    accent: '#6E2E89',
    hover: '#5C2672',
    onAccent: '#F5F0E8',
    softBackground: 'rgba(110, 46, 137, 0.14)',
    softBorder: 'rgba(110, 46, 137, 0.3)',
  },
  espn: {
    key: 'espn',
    label: 'ESPN',
    letter: 'E',
    accent: '#CC0000',
    hover: '#A80000',
    onAccent: '#FFF1EF',
    softBackground: 'rgba(204, 0, 0, 0.12)',
    softBorder: 'rgba(204, 0, 0, 0.28)',
  },
  'manual-entry': {
    key: 'manual-entry',
    label: 'Manual Entry',
    letter: 'M',
    accent: 'var(--color-text-secondary)',
    hover: 'var(--color-text-secondary)',
    onAccent: 'var(--color-bg)',
    softBackground: 'rgba(100, 116, 139, 0.15)',
    softBorder: 'var(--color-border)',
  },
};

function normalizePlatformKey(platform) {
  const key = String(platform || '').trim().toLowerCase().replace(/\s+/g, '-');
  return PLATFORM_BRANDS[key] ? key : null;
}

export function platformLabel(platform) {
  const key = normalizePlatformKey(platform);
  return key ? PLATFORM_BRANDS[key].label : platform;
}

export function getPlatformBrand(platform) {
  const key = normalizePlatformKey(platform);
  if (key) return PLATFORM_BRANDS[key];

  return {
    key: key ?? String(platform || '').trim().toLowerCase(),
    label: platform || 'Platform',
    letter: String(platform || 'P').trim().charAt(0).toUpperCase() || 'P',
    accent: 'var(--color-accent)',
    hover: 'var(--color-accent-hover)',
    onAccent: 'var(--color-text-on-accent)',
    softBackground: 'var(--color-accent-muted)',
    softBorder: 'var(--color-border)',
  };
}

export function getPlatformBadgeStyle(platform) {
  const brand = getPlatformBrand(platform);
  return {
    borderColor: brand.softBorder,
    background: brand.softBackground,
    color: brand.accent,
  };
}

export function getPlatformCardStyle(platform) {
  const brand = getPlatformBrand(platform);
  return {
    borderColor: brand.softBorder,
    background: `linear-gradient(135deg, ${brand.softBackground} 0%, var(--color-surface-1) 60%)`,
    boxShadow: `inset 0 1px 0 ${brand.softBorder}`,
  };
}

export function getPlatformIconStyle(platform) {
  const brand = getPlatformBrand(platform);
  return {
    borderColor: brand.softBorder,
    background: brand.softBackground,
    color: brand.accent,
  };
}

export function getPlatformButtonStyle(platform) {
  const brand = getPlatformBrand(platform);
  return {
    background: brand.accent,
    color: brand.onAccent,
  };
}

export function getPlatformSelectionStyle(platform, selected) {
  if (!selected) {
    return {
      borderColor: 'var(--color-border)',
      background: 'var(--color-surface-2)',
    };
  }

  const brand = getPlatformBrand(platform);
  return {
    borderColor: brand.softBorder,
    background: `linear-gradient(135deg, ${brand.softBackground} 0%, var(--color-surface-2) 88%)`,
  };
}

export function getPlatformButtonHover(platform) {
  return getPlatformBrand(platform).hover;
}
