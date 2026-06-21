/**
 * teamTemplate.js — Phase 1.5 role recipes (two-axis after Phase 1.5f).
 *
 * Maps an NFL team abbr to a runtime token bundle for the team-theming
 * system: surface tint, surface card, accent (the curated team identity
 * color from nflTeams.js, lifted via teamAccentOn() so the text/border
 * rendering is readable on the chosen axis), text-on-accent for CTAs, plus
 * pass-through primary/secondary for components that consume raw hexes
 * (Falcons Bred hero band etc.).
 *
 * Six templates (audit: 2026-06-16-phase1-5-team-template-assignment.md):
 *   1 — Deep & Brand    hue(primary), S/2, L=10% (dark) / L=94% (light)
 *   2 — Two-Tone Royal  hue(primary), S/2, L=10% (dark) / L=94% (light)
 *   3 — Hot Brand       hue(primary), S/2, L=8%  (dark) / L=95% (light)
 *   4 — Aqua / Cool     hue(primary), S/2, L=8%  (dark) / L=95% (light)
 *   5 — Earth           hue(primary), S*0.7, L=8%  (dark) / L=93% (light)
 *   6 — Bred (Falcons)  pure #080608 (dark only — Bred is dark by definition)
 *
 * The light recipes apply ~15% of the team's saturation so the cream
 * surface carries a faint tint of team identity without becoming garish.
 * Dark recipes preserve the existing ~50% saturation.
 *
 * Per-team `surfaceFrom: 'secondary'` (set in nflTeams.js) re-derives the
 * surface from the team's secondary color instead of primary. Used for:
 *   - NO Saints  (gold primary, black secondary → black world, gold CTA)
 *   - TB Bucs    (red primary, orange-ish secondary → pewter-warm world,
 *                 cannon-red CTA; defect 1.5e-defect-5 fix)
 *
 * The single `--color-team-accent` token (consumed by the Phase 1.5 sweep)
 * resolves to teamAccentOn(team, axis). `team.accent` is curated per team
 * in nflTeams.js to be the team's distinctive identity color (often
 * secondary or color-rush rather than primary). `team.accentLifted` lets
 * specific teams (HOU/PHI/SF) hand-tune the lifted output when the
 * algorithm would lose identity.
 */

import { NFL_TEAMS, teamAccentOn, readableOn } from '../data/nflTeams.js';

const BRED_SURFACE      = '#080608';
const BRED_SURFACE_CARD = '#0F0E10';

const SURFACE_RECIPES = {
  dark: {
    1: { sMul: 0.5,  l: 10 },
    2: { sMul: 0.5,  l: 10 },
    3: { sMul: 0.5,  l:  8 },
    4: { sMul: 0.5,  l:  8 },
    5: { sMul: 0.7,  l:  8 },
  },
  light: {
    1: { sMul: 0.15, l: 94 },
    2: { sMul: 0.15, l: 94 },
    3: { sMul: 0.15, l: 95 },
    4: { sMul: 0.15, l: 95 },
    5: { sMul: 0.20, l: 93 },
  },
};

// ── Local color math (mirrors nflTeams.js helpers; intentionally inlined to
//    keep this file standalone and avoid a circular import surface). ───────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
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

// ── Recipes ───────────────────────────────────────────────────────────────

function deriveSurface(sourceHex, template, axis) {
  if (template === 6) return BRED_SURFACE; // Bred is dark by definition
  const recipeSet = SURFACE_RECIPES[axis] ?? SURFACE_RECIPES.dark;
  const recipe = recipeSet[template] ?? recipeSet[1];
  const [h, s] = rgbToHsl(...hexToRgb(sourceHex));
  return hslToHex(h, s * recipe.sMul, recipe.l);
}

function deriveSurfaceCard(surfaceHex, template, axis) {
  if (template === 6) return BRED_SURFACE_CARD;
  const [h, s, l] = rgbToHsl(...hexToRgb(surfaceHex));
  // Dark: card is slightly lighter (elevation toward white).
  // Light: card is slightly more saturated/whiter (elevation toward pure white).
  if (axis === 'light') return hslToHex(h, s, Math.min(l + 3, 99));
  return hslToHex(h, s, Math.min(l + 2, 98));
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
  const axis           = team.surfaceAxis ?? 'dark';
  const surfaceSource  = team.surfaceFrom === 'secondary' ? team.secondary : team.primary;
  const surface        = deriveSurface(surfaceSource, template, axis);
  const surfaceCard    = deriveSurfaceCard(surface, template, axis);

  // Bred (template 6) bypasses textSafe so varsity red stays varsity red.
  const accent         = template === 6 ? team.accent : teamAccentOn(team, axis);
  const accentBg       = team.accent;
  const textOnAccent   = readableOn(accentBg);

  return {
    template,
    axis,
    primary:    team.primary,
    secondary:  team.secondary,
    accent,        // lifted/safe — for text, borders
    accentBg,      // raw — for filled CTA backgrounds
    textOnAccent,  // foreground color on filled CTAs
    surface,
    surfaceCard,
    isSaintsFlip: team.surfaceFrom === 'secondary' && team.abbr === 'NO',
    isBred:       template === 6,
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
