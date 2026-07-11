/**
 * teamTheme.js — team-theme-contract-v1.md token population (Prompt B).
 *
 * Resolves a team + room mode into the CSS variable values the token
 * contract's "allow list" permits team color to drive: --color-team-surface,
 * --color-team-surface-card, --color-accent (+ derived hover/muted/on), and
 * the shell aliases (--color-bg, --color-surface-1/2/3, --color-border*).
 *
 * Deliberately does NOT touch text tokens (--color-text-*), role tokens
 * (--color-risk-*, --color-omen, --color-data-*), position tokens
 * (--color-pos-*), or platform tokens (--color-platform-*) — the contract's
 * deny list. This is the fix for the pre-Prompt-B implementation, which set
 * --color-text-primary per team (a doctrine violation).
 */

import { NFL_TEAMS, readableOn } from '@/data/nflTeams.js';
import { getTeamTemplate } from '@/lib/teamTemplate.js';
import { mixHex } from '@/lib/colorMath.js';
import { wcagContrast, hexToHsl, hslToHex } from '@/lib/contrastMath.js';

export const ROOM_ALPHA = {
  owner: 0.05,
  gm: 0.14,
  locker: 0.35,
};

const SURFACE_BASE = {
  dark: {
    bg: '#0A0A0B',
    surface1: '#1C1C1E',
    surface2: '#2C2C2E',
    surface3: '#3A3A3C',
    border: '#3A3A3C',
    borderSubtle: '#2C2C2E',
  },
  light: {
    bg: '#FAFAF9',
    surface1: '#FFFFFF',
    surface2: '#F5F5F4',
    surface3: '#EBEBEA',
    border: '#E5E5E3',
    borderSubtle: '#F0F0EE',
  },
};

// Brand constants used by the accent fallback ladder's step 3 — real team
// colors for many NFL palettes (Packers/Cowboys white, Steelers/Raiders
// black), not invented placeholders. See team-theme-contract-v1.md
// "Fallback cascade for --color-accent".
const BONE_WHITE = '#F5F0E8';
const RAVEN_BLACK = '#0A0A0B';
const OMEN_BRASS = '#A67C2E';

const RULE2_MIN_CONTRAST = 3;

/**
 * Step 4 of the fallback cascade — team-theme-contract-v1.md "Fallback
 * cascade for --color-accent" step 4: rotate the shell's hue (complementary
 * first, then triadic), sweeping lightness until both Rule 2 (≥3:1 vs shell)
 * and Rule 4 (checkRule4) clear. Returns null if no rotation/lightness
 * combination works (falls through to Omen brass).
 */
function computeWheelDerivedAccent(shellHex, checkRule4) {
  const shellHsl = hexToHsl(shellHex);
  const rotations = [180, 120, 240]; // complementary, then triadic
  for (const rotation of rotations) {
    const hue = shellHsl.h + rotation;
    for (let l = 0.85; l >= 0.15; l -= 0.05) {
      const candidate = hslToHex({ h: hue, s: Math.max(shellHsl.s, 0.55), l });
      if (wcagContrast(candidate, shellHex) >= RULE2_MIN_CONTRAST && checkRule4(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function pickAccent(candidates, shellHex, checkRule4) {
  for (const { step, hex } of candidates) {
    if (!hex) continue;
    if (wcagContrast(hex, shellHex) >= RULE2_MIN_CONTRAST && checkRule4(hex)) {
      return { hex, step };
    }
  }
  const wheelHex = computeWheelDerivedAccent(shellHex, checkRule4);
  if (wheelHex) return { hex: wheelHex, step: 'wheel-derived' };
  return { hex: OMEN_BRASS, step: 'omen-brass' };
}

/**
 * Pick the surface-tint source per team-theme-contract-v1.md's literal
 * token formula (`--color-team-surface = team-primary * α(room)`), with the
 * Rule-1-gated fallback the contract specifies when primary can't stay
 * legible at the room's α: "Fallback for --color-team-surface... mirrors
 * [the accent] ladder but with the target being 'readable-against-text-
 * primary'... typically only steps 1-3 are needed."
 *
 * Try primary, then secondary, then no team tint at all (plain base) — the
 * last resort, since forcing a bright fallback color as the WORLD tint
 * (rather than a small accent) would just relocate the illegibility, not
 * fix it. Gated on Rule 1 (checkRule1) so Prompt B's blanket-primary bug
 * (blending Saints' light gold into the shell — see
 * Blueprints/audits/2026-07-10-team-themes-verification-report.md) can't
 * recur for any team's primary/secondary pairing.
 */
function pickSurfaceTint(primaryHex, secondaryHex, baseBg, textHex, alpha, checkRule1) {
  for (const candidate of [primaryHex, secondaryHex]) {
    if (!candidate) continue;
    const tinted = mixHex(candidate, baseBg, alpha);
    if (checkRule1(textHex, tinted)) return { tint: candidate, shell: tinted };
  }
  return { tint: null, shell: baseBg };
}

/**
 * Resolve the full team-theme token bundle for `abbr` at the given room mode
 * and resolved surface (dark|light). Returns null when no team is selected.
 *
 * `checkRule4` is the role-collision hook (ΔE vs --color-omen /
 * --color-risk-high); `checkRule1` is the text-legibility hook (≥4.5:1 vs
 * the tinted shell) that gates the surface-tint source. Both are owned by
 * themeResolver.js so Prompt C can plug in the real math without touching
 * this module. Default to always-pass (Prompt B behavior).
 */
export function resolveTeamTheme(
  abbr,
  {
    variant = 'official',
    room = 'locker',
    surface = 'dark',
    checkRule4 = () => true,
    checkRule1 = () => true,
  } = {},
) {
  if (!abbr) return null;
  const team = NFL_TEAMS.find((t) => t.abbr === abbr);
  const template = getTeamTemplate(abbr, variant);
  if (!team || !template) return null;

  const base = SURFACE_BASE[surface] ?? SURFACE_BASE.dark;
  const alpha = ROOM_ALPHA[room] ?? ROOM_ALPHA.locker;
  const textHex = surface === 'dark' ? BONE_WHITE : '#1C1C1E';

  const primaryHex = template.primary?.hex ?? null;
  const secondaryHex = template.secondary?.hex ?? null;

  const { shell: teamSurface } = pickSurfaceTint(
    primaryHex,
    secondaryHex,
    base.bg,
    textHex,
    alpha,
    checkRule1,
  );

  // Rule 3 (card vs. shell) — default is neutral, undifferentiated by team.
  // Teams that fail all three of 3a/3b/3c at neutral charcoal (verified in
  // 2026-07-10-team-theme-contract-verification.md: PHI, GB, PIT) ship a
  // lifted card fill instead, authored in nflTeams.js as `cardLift: true`.
  const teamSurfaceCard = team.cardLift
    ? mixHex(surface === 'dark' ? '#FFFFFF' : '#000000', base.surface1, surface === 'dark' ? 0.08 : 0.04)
    : base.surface1;

  const { hex: accentHex, step: accentStep } = pickAccent(
    [
      { step: 'primary', hex: primaryHex },
      { step: 'secondary', hex: secondaryHex },
      { step: 'white', hex: BONE_WHITE },
      { step: 'black', hex: RAVEN_BLACK },
    ],
    teamSurface,
    checkRule4,
  );
  const accentOnHex = readableOn(accentHex);

  return {
    team,
    template,
    room,
    alpha,
    accentStep,
    tokens: {
      '--color-team-primary': primaryHex ?? OMEN_BRASS,
      '--color-team-secondary': secondaryHex ?? primaryHex ?? OMEN_BRASS,
      '--color-team-accent': accentHex,
      '--color-team-surface': teamSurface,
      '--color-team-surface-card': teamSurfaceCard,
      '--color-bg': teamSurface,
      '--color-surface-1': teamSurfaceCard,
      '--color-surface-2': mixHex(surface === 'dark' ? '#FFFFFF' : '#000000', teamSurfaceCard, surface === 'dark' ? 0.06 : 0.04),
      '--color-surface-3': mixHex(surface === 'dark' ? '#FFFFFF' : '#000000', teamSurfaceCard, surface === 'dark' ? 0.12 : 0.08),
      '--color-border': mixHex(primaryHex ?? base.border, base.border, 0.4),
      '--color-border-subtle': mixHex(primaryHex ?? base.borderSubtle, base.borderSubtle, 0.2),
      '--color-accent': accentHex,
      '--color-accent-hover': mixHex(surface === 'dark' ? '#FFFFFF' : '#000000', accentHex, 0.16),
      '--color-accent-muted': mixHex(accentHex, teamSurface, 0.18),
      '--color-text-on-accent': accentOnHex,
      '--color-focus-ring': accentHex,
    },
  };
}

// Team-token vars this module ever sets — used to clear them cleanly when
// Switch A (accent source) is 'omen', i.e. team mode is off. Deliberately
// excludes --color-text-*, --color-risk-*, --color-omen, --color-data-*,
// --color-pos-*, --color-platform-* — this module never writes those.
export const TEAM_THEME_VARS = [
  '--color-team-primary',
  '--color-team-secondary',
  '--color-team-accent',
  '--color-team-surface',
  '--color-team-surface-card',
  '--color-bg',
  '--color-surface-1',
  '--color-surface-2',
  '--color-surface-3',
  '--color-border',
  '--color-border-subtle',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-muted',
  '--color-text-on-accent',
  '--color-focus-ring',
];
