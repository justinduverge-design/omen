/**
 * themeMode.js — light/dark mode store.
 *
 * Team-based theming (per-team color repaint, cultural-moment chrome, motifs,
 * type flourishes) was removed 2026-07-12. Only two modes remain:
 *   - 'system' — data-theme follows OS prefers-color-scheme.
 *   - 'omen'   — data-theme forced 'dark' (gold on graphite).
 *
 * Persistence key: omen.theme.mode → 'system' | 'omen'.
 * Legacy `corvus.theme.mode` and old 'team' mode values are read and
 * migrated to 'omen' so an existing user's stored preference doesn't break.
 */

import { useEffect, useState } from 'react';

const MODE_KEY = 'omen.theme.mode';
const LEGACY_MODE_KEY = 'corvus.theme.mode';
const VALID_MODES = ['system', 'omen'];

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
    const v = stored === 'corvus' || stored === 'team' ? 'omen' : stored;
    if (v && !localStorage.getItem(MODE_KEY)) localStorage.setItem(MODE_KEY, v);
    return VALID_MODES.includes(v) ? v : 'system';
  } catch { return 'system'; }
}

export function setThemeMode(mode) {
  const next = mode === 'team' ? 'omen' : mode;
  if (!VALID_MODES.includes(next)) return;
  try { localStorage.setItem(MODE_KEY, next); } catch { /* ignore */ }
  applyThemeMode();
  notify();
}

// ── Apply ─────────────────────────────────────────────────────────────────

function resolveDataTheme(mode) {
  if (mode === 'omen') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Read mode from localStorage, apply data-theme attribute to <html>.
 * Idempotent; safe to call repeatedly.
 */
export function applyThemeMode() {
  const root = document.documentElement;
  const mode = getThemeMode();
  root.setAttribute('data-theme', resolveDataTheme(mode));
}

// ── React hook ────────────────────────────────────────────────────────────

/** Live snapshot of { mode } that re-renders when it changes in this tab. */
export function useTheme() {
  const [snap, setSnap] = useState(() => ({ mode: getThemeMode(), team: null, variant: 'official' }));
  useEffect(() => {
    const sync = () => setSnap({ mode: getThemeMode(), team: null, variant: 'official' });
    sync();
    return subscribeTheme(sync);
  }, []);
  return snap;
}
