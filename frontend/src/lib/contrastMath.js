/**
 * contrastMath.js — WCAG contrast + CIELAB ΔE math for the team-theme
 * contrast/collision rules (team-theme-contract-v1.md §Contrast enforcement).
 *
 * Self-contained (no deps) so it can run identically in the browser resolver
 * (themeResolver.js) and the Node verification script
 * (scripts/verify-team-themes.js). Hand-rolled per Prompt C's default —
 * no chroma-js dependency added.
 */

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const c = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return v * 255;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio between two hex colors (1-21). */
export function wcagContrast(fgHex, bgHex) {
  const lFg = relativeLuminance(fgHex);
  const lBg = relativeLuminance(bgHex);
  const [lighter, darker] = lFg > lBg ? [lFg, lBg] : [lBg, lFg];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * sRGB linear-space blend — approximation of `color-mix(in oklab, ...)`.
 * team-theme-contract-verification.md item 3: diverges from true oklab by
 * <5% across the 5-40% α range this contract uses, well under the pass/fail
 * decision boundary for the 3:1 / 4.5:1 / 20 ΔE checks. Browsers do the
 * exact oklab mix at paint time via CSS `color-mix()`; this function exists
 * so the resolver (which needs a JS hex value for computed vars) and the
 * verification script can both reason about the same approximate result.
 */
export function mixLinear(hexA, hexB, alpha) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const mix = (ca, cb) => linearToSrgb(srgbToLinear(ca) * alpha + srgbToLinear(cb) * (1 - alpha));
  return rgbToHex({ r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b) });
}

// ── CIELAB ΔE (CIE76) ────────────────────────────────────────────────────

function srgbToXyz(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  // sRGB D65 matrix
  return {
    x: lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375,
    y: lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175,
    z: lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041,
  };
}

// D65 reference white
const WHITE = { x: 0.95047, y: 1.0, z: 1.08883 };

function xyzToLab({ x, y, z }) {
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / WHITE.x);
  const fy = f(y / WHITE.y);
  const fz = f(z / WHITE.z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function hexToLab(hex) {
  return xyzToLab(srgbToXyz(hex));
}

/** CIE76 ΔE distance between two hex colors in Lab space. */
export function deltaE_CIELAB(hexA, hexB) {
  const labA = hexToLab(hexA);
  const labB = hexToLab(hexB);
  return Math.sqrt((labA.l - labB.l) ** 2 + (labA.a - labB.a) ** 2 + (labA.b - labB.b) ** 2);
}

// ── HSL helpers for the color-wheel-derived fallback (step 4 of the cascade) ──

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

export function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  const hh = ((h % 360) + 360) % 360;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return rgbToHex({ r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 });
}
