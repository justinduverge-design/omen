// Phase 1.9 metallic tier treatment. Draft Assistant top-3 ordinal pill only —
// ranks 4+ keep the plain bordered circle. Gradient + inset bevel (not a flat
// fill) simulate a brushed-metal surface; base hues are identical across
// themes since these are decorative/branded tones, not page surface tokens
// (see page-system.md "Metallic Tier (Phase 1.9)").
const TIER_TOKEN = {
  1: { base: '--color-tier-gold', on: '--color-on-tier-gold' },
  2: { base: '--color-tier-silver', on: '--color-on-tier-silver' },
  3: { base: '--color-tier-bronze', on: '--color-on-tier-bronze' },
};

export function metallicTierStyle(rank) {
  const tier = TIER_TOKEN[rank];
  if (!tier) return null;
  const base = `var(${tier.base})`;
  return {
    borderColor: `color-mix(in srgb, ${base} 72%, black)`,
    background: `linear-gradient(135deg, color-mix(in srgb, ${base} 75%, white) 0%, ${base} 45%, color-mix(in srgb, ${base} 80%, black) 100%)`,
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 -1px 1px rgba(0, 0, 0, 0.35)',
    color: `var(${tier.on})`,
  };
}
