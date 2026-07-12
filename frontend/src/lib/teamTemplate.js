/**
 * teamTemplate.js — Phase 1.5h palette resolver.
 *
 * Resolves an NFL team abbr (+ optional variant: 'official' | 'special')
 * into a runtime token bundle with one slot per UI role:
 *
 *   primary, secondary, tertiary, neutral, mute, accentPop
 *
 * Plus derived elevation surfaces (surface, surfaceCard) and text colors
 * computed for the chosen surface — so any themed page can paint multi-color
 * brand identity without re-deriving colors per component.
 *
 * Doctrine (Phase 1.5h, Justin 2026-06-21):
 *   - The team's palette IS the source of truth. We do not algorithmically
 *     "lift" or hue-shift brand colors. If a brand color isn't legible as
 *     text on the team's surface, the palette includes a separately curated
 *     color for that role (typically `neutral` for text-on-dark-surface,
 *     `mute` for text-on-light-surface).
 *   - The page's data-theme (light vs dark) is a CONSEQUENCE of the team's
 *     surface luminance, not a stylistic toggle. PIT, BAL, LV, ATL render
 *     dark because their canonical world is dark — not because Omen
 *     imposed dark mode.
 *   - `--color-text-on-accent` per role is computed via WCAG contrast
 *     comparison against #0A0A0B vs #F5F0E8.
 */

import { NFL_TEAMS, getTeamPalette, readableOn, readableOnFloor, relLum, hexToRgb } from '../data/nflTeams.js';
import { resolveMotifs } from './motifs.js';
import { resolveTypeFlourishes } from './typeFlourishes.js';

/**
 * Return the runtime token bundle for `abbr` + `variant`. Returns null when
 * no team is selected (caller falls back to brand defaults).
 *
 * Output shape:
 *   {
 *     mode, name,                         // palette identity
 *     primary, secondary, tertiary,       // role-keyed { hex, name } pairs
 *     neutral, mute, accentPop,           //   (any of these may be undefined)
 *     surface, surfaceCard,               // surface hex + derived card hex
 *     surfaceIsDark,                      // boolean — page reads dark?
 *     textOnSurface,                      // body text color (cream on dark, black on light)
 *     textOnPrimary, textOnSecondary,     // foreground for filled CTAs/affordances
 *     textOnTertiary, textOnAccentPop,    //   per role
 *     culturalAnchor,                     // { name, year?, kind } | null
 *   }
 *
 * Roles with no palette entry come back as `null` so callers can branch on
 * presence (`if (template.tertiary)`) without crashing.
 */
export function getTeamTemplate(abbr, variant = 'official') {
  const palette = getTeamPalette(abbr, variant);
  if (!palette) return null;
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);

  const r = palette.byRole;
  const surfaceHex = palette.surface.hex;
  const surfaceLum = relLum(hexToRgb(surfaceHex));
  // `surfaceIsDark` drives data-theme attribute (light vs dark page chrome
  // for icons/scrollbars/etc.). Mid-luminance surfaces (DEN orange, DET
  // blue) still want the dark/cream binary for the macro chrome.
  const surfaceIsDark = surfaceLum < 0.35;

  // Body text: chosen by actual WCAG contrast against the surface (not a
  // luminance heuristic). This matters for mid-luminance surfaces like DEN
  // Broncos orange and DET Honolulu blue where the luminance-based pick
  // gives the wrong polarity (cream-on-orange = 2.97 contrast, dark-on-
  // orange = ~5.5). readableOnFloor adds a real computed-shade fallback for
  // surfaces where neither black nor cream clears WCAG AA at all (DET: best
  // of the two fixed anchors is 4.34:1, under the 4.5 floor) -- text
  // legibility must never silently ship under the accessibility minimum.
  const textOnSurface = readableOnFloor(surfaceHex);

  // For each role that exists, compute the best foreground for filled CTAs.
  function textOn(roleHex) {
    return roleHex ? readableOn(roleHex) : null;
  }

  // The "accent" role is the team's primary CTA color against the surface.
  // When surfaceRole === 'primary' the world IS the primary color (GB green-
  // on-green, PIT black-on-black, BAL purple-on-purple), so the CTA needs
  // to fall through to secondary or tertiary to remain visible. When
  // surfaceRole is anything else (neutral, mute), primary is naturally the
  // contrasting accent.
  let accent = r.primary;
  if (palette.surfaceRole === 'primary' && r.secondary) {
    accent = r.secondary;
  } else if (palette.surfaceRole === 'secondary' && r.primary) {
    accent = r.primary;
  } else if (palette.surfaceRole === 'tertiary' && r.primary) {
    accent = r.primary;
  }
  // Same logic for identity-copy hierarchy: the wardRoom/cry text needs to
  // pop against the surface. If primary == surface, fall through.
  const identityPrimary   = accent ?? r.primary;
  const identitySecondary = (accent === r.secondary && r.primary) ? r.primary : (r.secondary ?? accent);

  return {
    mode: palette.mode,
    name: palette.name,

    primary:    r.primary    ?? null,
    secondary:  r.secondary  ?? null,
    tertiary:   r.tertiary   ?? null,
    neutral:    r.neutral    ?? null,
    mute:       r.mute       ?? null,
    accentPop:  r['accent-pop'] ?? null,

    // Derived "what serves as the CTA accent against this surface" — use
    // this in CSS as `--color-team-accent` and for the LivePreview CTA.
    accent,
    textOnAccent: accent ? readableOn(accent.hex) : '#0A0A0B',

    // Derived identity-copy hierarchy that picks contrasting roles when
    // surface == primary (so wardRoom/cry don't blend into the surface).
    identityPrimary,
    identitySecondary,

    surface:        surfaceHex,
    surfaceCard:    surfaceHex, // elevation handled in themeMode via color-mix
    surfaceIsDark,
    textOnSurface,
    surfaceRole:    palette.surfaceRole,

    textOnPrimary:    textOn(r.primary?.hex),
    textOnSecondary:  textOn(r.secondary?.hex),
    textOnTertiary:   textOn(r.tertiary?.hex),
    textOnAccentPop:  textOn(r['accent-pop']?.hex),

    culturalAnchor: palette.culturalAnchor,

    motifs: resolveMotifs(team, palette, surfaceIsDark),
    typeFlourishes: resolveTypeFlourishes(team, palette.mode),
  };
}

/**
 * List the palette variants available for a team. Used by Appearance.jsx
 * to render the Official / Special sub-mode picker.
 */
export function getTeamVariants(abbr) {
  if (!abbr) return [];
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);
  if (!team) return [];
  return team.palettes.map((p) => ({ mode: p.mode, name: p.name }));
}
