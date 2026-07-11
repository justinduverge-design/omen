/**
 * colorMath.js — color-blend helper for the team-theme resolver (Prompt B).
 *
 * WCAG contrast + luminance helpers already exist in `data/nflTeams.js`
 * (hexToRgb, relLum, contrastRatio, readableOn) — this file adds the one
 * piece that's missing: alpha blending two hex colors, needed to compute
 * `--color-team-surface` at the room-mode's α.
 *
 * Blends in linear-sRGB, not oklab. team-theme-contract-v1.md specifies
 * `color-mix(in oklab, ...)`; the verification memo
 * (Blueprints/audits/2026-07-10-team-theme-contract-verification.md, item 3)
 * confirms the sRGB-linear approximation diverges from oklab by <5% in the
 * α ranges this contract uses (5-40%) — well under the pass/fail decision
 * boundary for the 3:1 / 4.5:1 checks. Swap for a true oklab mix if a future
 * team's numbers land close to a threshold.
 */

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return v * 255;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const c = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Blend hexA over hexB at `alpha` (0-1) in linear-sRGB space. */
export function mixHex(hexA, hexB, alpha) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mix = (ca, cb) => linearToSrgb(srgbToLinear(ca) * alpha + srgbToLinear(cb) * (1 - alpha));
  return rgbToHex({ r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b) });
}
