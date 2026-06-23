/**
 * themeMode.js — Phase 1.5h theme-mode store (multi-role palettes + variants).
 *
 * Modes are exclusive:
 *   - 'system' — data-theme follows OS prefers-color-scheme. Team tokens
 *                cleared (CSS falls back to brand `--color-accent`).
 *   - 'team'   — data-theme follows the selected team's palette surface
 *                luminance (dark surface → data-theme=dark; light surface →
 *                data-theme=light). Team's full role-palette applied as
 *                CSS variables.
 *   - 'omen'   — data-theme forced 'dark'. Team tokens cleared (the
 *                pre-Phase-1.5 look: gold on graphite).
 *
 * Variant (per-team sub-mode, Phase 1.5h):
 *   - 'official' (default) — team's canonical NFL palette
 *   - 'special'            — team's cultural variant (Stankonia, Calle Ocho,
 *                            Paisley Park, etc.) — only available when the
 *                            team's `palettes` array includes one
 *
 * Persistence keys:
 *   omen.theme.mode     → 'system' | 'team' | 'omen'
 *   omen.theme.team     → NFL abbr ('KC', 'MIA', etc.)
 *   omen.theme.variant  → 'official' | 'special'
 *
 * Legacy `corvus.theme.*` values are read and migrated in place so the
 * product rename does not reset an existing user's appearance preference.
 *
 * Components that render team voice subscribe via `subscribeTheme()` so they
 * re-render when mode/team/variant change in the same tab without reload.
 */

import { useEffect, useState } from 'react';
import { getTeamTemplate } from './teamTemplate.js';

const MODE_KEY    = 'omen.theme.mode';
const TEAM_KEY    = 'omen.theme.team';
const VARIANT_KEY = 'omen.theme.variant';
const LEGACY_MODE_KEY    = 'corvus.theme.mode';
const LEGACY_TEAM_KEY    = 'corvus.theme.team';
const LEGACY_VARIANT_KEY = 'corvus.theme.variant';
const VALID_MODES    = ['system', 'team', 'omen'];
const VALID_VARIANTS = ['official', 'special'];

// All role + surface CSS variables themeMode writes onto :root when team
// mode is active. Cleared together when switching out of team mode.
const TEAM_TOKEN_VARS = [
  '--color-team-primary',
  '--color-team-primary-name',
  '--color-team-secondary',
  '--color-team-secondary-name',
  '--color-team-tertiary',
  '--color-team-tertiary-name',
  '--color-team-neutral',
  '--color-team-neutral-name',
  '--color-team-mute',
  '--color-team-mute-name',
  '--color-team-pop',
  '--color-team-pop-name',
  '--color-team-surface',
  '--color-team-surface-card',
  '--color-team-text-on-primary',
  '--color-team-text-on-secondary',
  '--color-team-text-on-tertiary',
  '--color-team-text-on-pop',
  '--color-team-anchor-name',
  // Legacy 1.5f tokens still consumed by un-refactored pages; kept in the
  // clear list so switching modes wipes them cleanly.
  '--color-team-accent',
];

const CORE_TEAM_OVERRIDE_VARS = [
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
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-tertiary',
];

// ── In-tab change notification ────────────────────────────────────────────

const listeners = new Set();
function notify() { for (const cb of listeners) cb(); }

export function subscribeTheme(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ── Persistence ───────────────────────────────────────────────────────────

export function getThemeMode() {
  try {
    const stored = localStorage.getItem(MODE_KEY) ?? localStorage.getItem(LEGACY_MODE_KEY);
    const v = stored === 'corvus' ? 'omen' : stored;
    if (v && !localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, v);
    return VALID_MODES.includes(v) ? v : 'system';
  } catch { return 'system'; }
}

export function getThemeTeam() {
  try {
    const value = localStorage.getItem(TEAM_KEY) ?? localStorage.getItem(LEGACY_TEAM_KEY);
    if (value && !localStorage.getItem(TEAM_KEY)) localStorage.setItem(TEAM_KEY, value);
    return value || null;
  } catch { return null; }
}

export function getThemeVariant() {
  try {
    const v = localStorage.getItem(VARIANT_KEY) ?? localStorage.getItem(LEGACY_VARIANT_KEY);
    if (v && !localStorage.getItem(VARIANT_KEY)) localStorage.setItem(VARIANT_KEY, v);
    return VALID_VARIANTS.includes(v) ? v : 'official';
  } catch { return 'official'; }
}

export function setThemeMode(mode) {
  if (!VALID_MODES.includes(mode)) return;
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
  applyThemeMode();
  notify();
}

export function setThemeTeam(abbr) {
  try {
    if (abbr) localStorage.setItem(TEAM_KEY, abbr);
    else localStorage.removeItem(TEAM_KEY);
  } catch { /* ignore */ }
  applyThemeMode();
  notify();
}

export function setThemeVariant(variant) {
  if (!VALID_VARIANTS.includes(variant)) return;
  try { localStorage.setItem(VARIANT_KEY, variant); } catch { /* ignore */ }
  applyThemeMode();
  notify();
}

// ── Apply ─────────────────────────────────────────────────────────────────

function clearTeamTokens(root) {
  for (const v of [...TEAM_TOKEN_VARS, ...CORE_TEAM_OVERRIDE_VARS]) {
    root.style.removeProperty(v);
  }
}

function setRoleTokens(root, template) {
  // Per-role hex + friendly name (the name lets future swatch labels read
  // the color name without re-importing nflTeams.js).
  const roles = [
    ['primary',    template.primary],
    ['secondary',  template.secondary],
    ['tertiary',   template.tertiary],
    ['neutral',    template.neutral],
    ['mute',       template.mute],
    ['pop',        template.accentPop],
  ];
  for (const [name, color] of roles) {
    if (!color) {
      root.style.removeProperty(`--color-team-${name}`);
      root.style.removeProperty(`--color-team-${name}-name`);
      continue;
    }
    root.style.setProperty(`--color-team-${name}`, color.hex);
    root.style.setProperty(`--color-team-${name}-name`, `"${color.name}"`);
  }

  // Per-role text-on overrides for filled CTAs / chips / etc.
  if (template.textOnPrimary)   root.style.setProperty('--color-team-text-on-primary',   template.textOnPrimary);
  if (template.textOnSecondary) root.style.setProperty('--color-team-text-on-secondary', template.textOnSecondary);
  if (template.textOnTertiary)  root.style.setProperty('--color-team-text-on-tertiary',  template.textOnTertiary);
  if (template.textOnAccentPop) root.style.setProperty('--color-team-text-on-pop',       template.textOnAccentPop);

  // Cultural-anchor name as a CSS string token so pages can read it from
  // content: var() for backgrounds, watermarks, or eyebrow text.
  if (template.culturalAnchor?.name) {
    root.style.setProperty('--color-team-anchor-name', `"${template.culturalAnchor.name}"`);
  } else {
    root.style.removeProperty('--color-team-anchor-name');
  }

  // Legacy 1.5f token alias — `accent` is the derived CTA color (which
  // falls through from primary to secondary when surface == primary). This
  // keeps pages reading --color-team-accent visible on green-on-green teams
  // like GB and on black-on-black like LV.
  if (template.accent) {
    root.style.setProperty('--color-team-accent', template.accent.hex);
  }
}

function applyTeamTokens(root, template) {
  setRoleTokens(root, template);

  // Card sits a small luminance step brighter than surface (Material-style
  // elevation) — mix toward white on both light and dark surfaces.
  const cardMix = template.surfaceIsDark ? '92%' : '96%';
  root.style.setProperty('--color-team-surface', template.surface);
  root.style.setProperty(
    '--color-team-surface-card',
    `color-mix(in srgb, ${template.surface} ${cardMix}, white)`,
  );

  // Drive the core Omen tokens from the team palette so every page that
  // consumes --color-bg, --color-accent, etc. inherits the team look
  // automatically (no per-page rewrite needed for the basic case).
  root.style.setProperty('--color-bg',            template.surface);
  root.style.setProperty(
    '--color-surface-1',
    `color-mix(in srgb, ${template.surface} ${cardMix}, white)`,
  );
  root.style.setProperty(
    '--color-surface-2',
    `color-mix(in srgb, ${template.surface} ${template.surfaceIsDark ? '84%' : '92%'}, ${template.surfaceIsDark ? 'white' : 'black'})`,
  );
  root.style.setProperty(
    '--color-surface-3',
    `color-mix(in srgb, ${template.surface} ${template.surfaceIsDark ? '74%' : '84%'}, ${template.surfaceIsDark ? 'white' : 'black'})`,
  );
  root.style.setProperty(
    '--color-border',
    `color-mix(in srgb, ${template.primary?.hex ?? template.surface} 26%, ${template.surfaceIsDark ? '#3A3A3C' : '#C8C8C5'} 74%)`,
  );
  root.style.setProperty(
    '--color-border-subtle',
    `color-mix(in srgb, ${template.primary?.hex ?? template.surface} 12%, ${template.surface} 88%)`,
  );

  // Accent semantics: `accent` is the derived CTA color (falls through to
  // secondary when surface == primary). This keeps GB green-on-green and
  // PIT black-on-black CTAs visible.
  const accentHex   = template.accent?.hex ?? template.primary?.hex ?? template.surface;
  const accentOnHex = template.textOnAccent ?? '#0A0A0B';
  root.style.setProperty('--color-accent',       accentHex);
  root.style.setProperty('--color-accent-hover', `color-mix(in srgb, ${accentHex} 84%, ${template.surfaceIsDark ? 'white' : 'black'})`);
  root.style.setProperty('--color-accent-muted', `color-mix(in srgb, ${accentHex} 18%, ${template.surface})`);
  root.style.setProperty('--color-text-on-accent', accentOnHex);

  // Body text colors on the team surface.
  root.style.setProperty('--color-text-primary',   template.textOnSurface);
  root.style.setProperty(
    '--color-text-secondary',
    template.surfaceIsDark ? '#AEAEB2' : '#4A5158',
  );
  root.style.setProperty(
    '--color-text-tertiary',
    template.surfaceIsDark ? '#6D6D72' : '#6B7280',
  );
}

function resolveDataTheme(mode, teamAbbr, variant) {
  if (mode === 'team') {
    const template = teamAbbr ? getTeamTemplate(teamAbbr, variant) : null;
    return template?.surfaceIsDark === false ? 'light' : 'dark';
  }
  if (mode === 'omen') return 'dark';
  // 'system' — follow OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Read mode + team + variant from localStorage, apply data-theme attribute
 * and team tokens to <html>. Idempotent; safe to call repeatedly.
 */
export function applyThemeMode() {
  const root = document.documentElement;
  const mode    = getThemeMode();
  const team    = getThemeTeam();
  const variant = getThemeVariant();

  root.setAttribute('data-theme', resolveDataTheme(mode, team, variant));

  if (mode !== 'team') {
    clearTeamTokens(root);
    return;
  }

  const template = getTeamTemplate(team, variant);
  if (!template) {
    clearTeamTokens(root);
    return;
  }

  applyTeamTokens(root, template);
}

// ── React hook ────────────────────────────────────────────────────────────

/**
 * Live snapshot of { mode, team, variant } that re-renders when any change
 * in this tab. Use in components that paint team voice on accent-active
 * pages.
 */
export function useTheme() {
  const [snap, setSnap] = useState(() => ({
    mode:    getThemeMode(),
    team:    getThemeTeam(),
    variant: getThemeVariant(),
  }));
  useEffect(() => {
    const sync = () => setSnap({
      mode:    getThemeMode(),
      team:    getThemeTeam(),
      variant: getThemeVariant(),
    });
    sync();
    return subscribeTheme(sync);
  }, []);
  return snap;
}
