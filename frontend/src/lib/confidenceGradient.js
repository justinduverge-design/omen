// Phase 1.8 confidence bar gradient. Interpolates in HSL (not RGB) between the
// deep-crimson floor and deep-green ceiling tokens; color-mix's default hue
// interpolation takes the shorter 0deg->~140deg arc, which lands the 50%
// midpoint on a rich amber automatically (see page-system.md "Confidence
// Gradient (Phase 1.8)").
export function confidenceBarStyle(score) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  return {
    width: `${pct}%`,
    background: `color-mix(in hsl, var(--color-confidence-ceiling) ${pct}%, var(--color-confidence-floor))`,
  };
}
