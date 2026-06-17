/**
 * themeMode.js — Phase 1.5 PR1 theme-mode store.
 *
 * Modes are exclusive:
 *   - 'system' — data-theme follows OS prefers-color-scheme. Team tokens
 *                cleared (CSS falls back to brand `--color-accent`).
 *   - 'team'   — data-theme forced 'dark'. Team tokens applied per the
 *                selected team's role recipe.
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
  for (const v of TEAM_TOKEN_VARS) root.style.removeProperty(v);
}

function resolveDataTheme(mode) {
  if (mode === 'team' || mode === 'corvus') return 'dark';
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

  root.setAttribute('data-theme', resolveDataTheme(mode));

  if (mode !== 'team') {
    clearTeamTokens(root);
    return;
  }

  const recipe = getTeamTemplate(team);
  if (!recipe) {
    clearTeamTokens(root);
    return;
  }

  root.style.setProperty('--color-team-primary',      recipe.primary);
  root.style.setProperty('--color-team-secondary',    recipe.secondary);
  root.style.setProperty('--color-team-accent',       recipe.accent);
  root.style.setProperty('--color-team-surface',      recipe.surface);
  root.style.setProperty('--color-team-surface-card', recipe.surfaceCard);
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
