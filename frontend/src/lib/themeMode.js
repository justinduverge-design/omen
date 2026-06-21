/**
 * themeMode.js — Phase 1.5 theme-mode store (two-axis after Phase 1.5f).
 *
 * Modes are exclusive:
 *   - 'system' — data-theme follows OS prefers-color-scheme. Team tokens
 *                cleared (CSS falls back to brand `--color-accent`).
 *   - 'team'   — data-theme follows the selected team's surfaceAxis
 *                ('dark' for 26 teams, 'light' for MIA/IND/LAC/DAL/CAR/ARI).
 *                Team tokens applied per the team's role recipe.
 *   - 'corvus' — data-theme forced 'dark'. Team tokens cleared (the
 *                current pre-Phase-1.5 look: gold on graphite).
 *
 * Persistence: `corvus.theme.mode` (mode) and `corvus.theme.team` (NFL abbr).
 * Default for new users: 'system'.
 *
 * Components that render team voice (NavDrawer label, dashboard header pill,
 * Omen subhead, Standings subhead) should subscribe via `subscribeTheme()`
 * so they re-render when the mode/team changes in the same tab without a
 * full reload.
 */

import { useEffect, useState } from 'react';
import { getTeamTemplate } from './teamTemplate.js';
import { NFL_TEAMS } from '../data/nflTeams.js';

const MODE_KEY = 'corvus.theme.mode';
const TEAM_KEY = 'corvus.theme.team';
const VALID_MODES = ['system', 'team', 'corvus'];

const TEAM_TOKEN_VARS = [
  '--color-team-primary',
  '--color-team-secondary',
  '--color-team-accent',
  '--color-team-surface',
  '--color-team-surface-card',
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
    const v = localStorage.getItem(MODE_KEY);
    return VALID_MODES.includes(v) ? v : 'system';
  } catch { return 'system'; }
}

export function getThemeTeam() {
  try { return localStorage.getItem(TEAM_KEY) || null; } catch { return null; }
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

// ── Apply ─────────────────────────────────────────────────────────────────

function clearTeamTokens(root) {
  for (const v of [...TEAM_TOKEN_VARS, ...CORE_TEAM_OVERRIDE_VARS]) {
    root.style.removeProperty(v);
  }
}

function applyTeamTokens(root, recipe) {
  root.style.setProperty('--color-team-primary',      recipe.primary);
  root.style.setProperty('--color-team-secondary',    recipe.secondary);
  root.style.setProperty('--color-team-accent',       recipe.accent);
  root.style.setProperty('--color-team-surface',      recipe.surface);
  root.style.setProperty('--color-team-surface-card', recipe.surfaceCard);

  root.style.setProperty('--color-bg',            recipe.surface);
  root.style.setProperty('--color-surface-1',     recipe.surfaceCard);
  root.style.setProperty('--color-accent',        recipe.accent);
  root.style.setProperty('--color-text-on-accent', recipe.textOnAccent);

  if (recipe.axis === 'light') {
    // Light-axis surfaces: elevation darkens, borders darken, text inverts.
    root.style.setProperty('--color-surface-2',     `color-mix(in srgb, ${recipe.surfaceCard} 92%, black 8%)`);
    root.style.setProperty('--color-surface-3',     `color-mix(in srgb, ${recipe.surfaceCard} 82%, black 18%)`);
    root.style.setProperty('--color-border',        `color-mix(in srgb, ${recipe.accent} 30%, #C8C8C5 70%)`);
    root.style.setProperty('--color-border-subtle', `color-mix(in srgb, ${recipe.accent} 14%, ${recipe.surfaceCard} 86%)`);
    root.style.setProperty('--color-accent-hover',  `color-mix(in srgb, ${recipe.accent} 84%, black 16%)`);
    root.style.setProperty('--color-accent-muted',  `color-mix(in srgb, ${recipe.accent} 16%, ${recipe.surfaceCard} 84%)`);
    root.style.setProperty('--color-text-primary',   '#1C1C1E');
    root.style.setProperty('--color-text-secondary', '#4A5158');
    root.style.setProperty('--color-text-tertiary',  '#6B7280');
  } else {
    // Dark axis (existing behavior preserved).
    root.style.setProperty('--color-surface-2',     `color-mix(in srgb, ${recipe.surfaceCard} 84%, white 16%)`);
    root.style.setProperty('--color-surface-3',     `color-mix(in srgb, ${recipe.surfaceCard} 74%, white 26%)`);
    root.style.setProperty('--color-border',        `color-mix(in srgb, ${recipe.accent} 26%, #3A3A3C 74%)`);
    root.style.setProperty('--color-border-subtle', `color-mix(in srgb, ${recipe.accent} 12%, ${recipe.surfaceCard} 88%)`);
    root.style.setProperty('--color-accent-hover',  `color-mix(in srgb, ${recipe.accent} 84%, white 16%)`);
    root.style.setProperty('--color-accent-muted',  `color-mix(in srgb, ${recipe.accent} 18%, ${recipe.surfaceCard} 82%)`);
    // text-* removed: dark-axis teams inherit dark-theme defaults.
  }
}

function resolveDataTheme(mode, teamAbbr) {
  if (mode === 'team') {
    const team = teamAbbr ? NFL_TEAMS.find((t) => t.abbr === teamAbbr) : null;
    return team?.surfaceAxis === 'light' ? 'light' : 'dark';
  }
  if (mode === 'corvus') return 'dark';
  // 'system' — follow OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Read mode + team from localStorage, apply data-theme attribute and team
 * tokens to <html>. Idempotent; safe to call repeatedly.
 */
export function applyThemeMode() {
  const root = document.documentElement;
  const mode = getThemeMode();
  const team = getThemeTeam();

  root.setAttribute('data-theme', resolveDataTheme(mode, team));

  if (mode !== 'team') {
    clearTeamTokens(root);
    return;
  }

  const recipe = getTeamTemplate(team);
  if (!recipe) {
    clearTeamTokens(root);
    return;
  }

  applyTeamTokens(root, recipe);
}

// ── React hook ────────────────────────────────────────────────────────────

/**
 * Live snapshot of { mode, team } that re-renders when either changes in
 * this tab. Use in components that paint team voice on accent-active pages.
 */
export function useTheme() {
  const [snap, setSnap] = useState(() => ({ mode: getThemeMode(), team: getThemeTeam() }));
  useEffect(() => {
    const sync = () => setSnap({ mode: getThemeMode(), team: getThemeTeam() });
    sync();
    return subscribeTheme(sync);
  }, []);
  return snap;
}
