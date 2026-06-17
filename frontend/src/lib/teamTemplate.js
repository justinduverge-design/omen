/**
 * teamTemplate.js — Phase 1.5 PR1 role recipes.
 *
 * Maps an NFL team abbr to a runtime token bundle for the team-theming
 * system: surface tint (HSL-derived from primary), surface card, accent
 * (the curated team identity color from nflTeams.js, textSafe-lifted for
 * AA contrast on text/borders), plus pass-through primary/secondary for
 * components that consume the raw hexes (Falcons Bred hero band etc.).
 *
 * Six templates (see audit doc):
 *   1 — Deep & Brand      hue(primary), S/2, L=10%
 *   2 — Two-Tone Royal    hue(primary), S/2, L=10%
 *   3 — Hot Brand         hue(primary), S/2, L=8%
 *   4 — Aqua / Cool       hue(primary), S/2, L=8%
 *   5 — Earth             hue(primary), S*0.7, L=8%
 *   6 — Bred (Falcons)    pure #080608, no team-hue derivation
 *
 * Saints special case: template 2 but primary is gold (light) and secondary
 * is black (dark). Naive template-2 logic would tint the world gold. We
 * detect the flip and derive surface from secondary, so the visual world is
 * black with gold accents.
 *
 * The single `--color-team-accent` token (consumed by the Phase 1.5 sweep)
 * resolves to textSafe(team.accent). `team.accent` is already curated per
 * team in nflTeams.js to be the team's distinctive identity color (often
 * secondary or color-rush rather than primary). Templates control SURFACE
 * derivation; accent is per-team.
 */

import { NFL_TEAMS, textSafe } from '../data/nflTeams.js';

const BRED_SURFACE      = '#080608';
const BRED_SURFACE_CARD = '#0F0E10';

const SURFACE_RECIPES = {
  1: { sMul: 0.5, l: 10 },
  2: { sMul: 0.5, l: 10 },
  3: { sMul: 0.5, l:  8 },
  4: { sMul: 0.5, l:  8 },
  5: { sMul: 0.7, l:  8 },
};

// ── Local color math (mirrors nflTeams.js helpers; intentionally inlined to
//    keep this file standalone and avoid circular import surface). ─────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLum([r, g, b]) {
  return [r, g, b]
    .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function isLight(hex) { return relLum(hexToRgb(hex)) > 0.45; }
function isDark(hex)  { return relLum(hexToRgb(hex)) < 0.12; }

// ── Recipes ───────────────────────────────────────────────────────────────

function deriveSurface(sourceHex, template) {
  if (template === 6) return BRED_SURFACE;
  const recipe = SURFACE_RECIPES[template] ?? SURFACE_RECIPES[1];
  const [h, s] = rgbToHsl(...hexToRgb(sourceHex));
  return hslToHex(h, s * recipe.sMul, recipe.l);
}

function deriveSurfaceCard(surfaceHex, template) {
  if (template === 6) return BRED_SURFACE_CARD;
  const [h, s, l] = rgbToHsl(...hexToRgb(surfaceHex));
  return hslToHex(h, s, Math.min(l + 2, 98));
}

/**
 * Saints heuristic: their primary is gold (light) and secondary is near-black.
 * Detect either by abbr ('NO') or by the structural pattern, so future teams
 * with the same shape stay correct.
 */
function needsSurfaceFlip(team) {
  return team.abbr === 'NO' || (team.template === 2 && isLight(team.primary) && isDark(team.secondary));
}

/**
 * Return the runtime token bundle for `abbr`. Returns null when no team is
 * selected (caller falls back to the brand `--color-accent`/`--color-bg`).
 */
export function getTeamTemplate(abbr) {
  if (!abbr) return null;
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);
  if (!team) return null;

  const template       = team.template ?? 1;
  const isSaintsFlip   = needsSurfaceFlip(team);
  const surfaceSource  = isSaintsFlip ? team.secondary : team.primary;
  const surface        = deriveSurface(surfaceSource, template);
  const surfaceCard    = deriveSurfaceCard(surface, template);
  const accent         = textSafe(team.accent);

  return {
    template,
    primary:    team.primary,
    secondary:  team.secondary,
    accent,
    surface,
    surfaceCard,
    isSaintsFlip,
    isBred:     template === 6,
  };
}

export const TEMPLATE_LABELS = {
  1: 'Deep & Brand',
  2: 'Two-Tone Royal',
  3: 'Hot Brand',
  4: 'Aqua / Cool',
  5: 'Earth',
  6: 'Bred',
};
