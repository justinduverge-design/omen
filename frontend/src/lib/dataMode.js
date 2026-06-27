/**
 * dataMode.js — Phase 1.5g.3 route-level mock/live indicator.
 *
 * Cultural moments (Phase 1.5g.3) are decorative chrome that must NEVER paint
 * over live fantasy data without a visible mock badge. This store is the
 * single source of truth for whether the route the user is looking at is
 * currently rendering:
 *
 *   'mock' — dev private fixtures / preview / disconnected / empty / off-season.
 *            Moment chrome is allowed (always paired with its mock badge).
 *   'demo' — public `/demo` route backed by the deterministic `omen-demo.v1`
 *            fixture (Phase 2.7). Distinct from 'mock' per
 *            `Blueprints/demo-mode.md` — demo is a separate product state with
 *            its own "Demo Mode" label, not dev mock data.
 *   'live' — real connected-league data. Moment chrome is SUPPRESSED.
 *   null   — unknown. Fail closed: treated as live, moment suppressed.
 *
 * The spec (`Blueprints/specs/team-motif-grammar.md` §CulturalMoment fallback
 * contract) requires failing closed when the indicator is undefined.
 *
 * Naming: the canonical global is `window.__omenDataMode` (rename-consistent
 * with the `omen.theme.*` localStorage convention). `window.__corvusDataMode`
 * is honored as a read alias so any pre-rename harness/bookmarklet still works,
 * mirroring how `themeMode.js` migrates legacy `corvus.theme.*` keys.
 *
 * Pub/sub mirrors `themeMode.js` so `<MomentChrome>` re-renders the moment the
 * active page declares its data mode, without a reload.
 */

import { useEffect, useState } from 'react';

const VALID_MODES = ['mock', 'demo', 'live'];

let current = null;

const listeners = new Set();
function notify() { for (const cb of listeners) cb(); }

export function subscribeDataMode(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Declare the data mode for the route currently mounted. Pages call this from
 * an effect as their connected/empty/loading state resolves. Passing an
 * invalid value (or clearing on unmount via `null`) resets to fail-closed.
 */
export function setDataMode(mode) {
  const next = VALID_MODES.includes(mode) ? mode : null;
  if (next === current) {
    // Keep the window mirror in sync even on no-op (first paint).
    mirror(next);
    return;
  }
  current = next;
  mirror(next);
  notify();
}

function mirror(mode) {
  if (typeof window === 'undefined') return;
  if (mode == null) delete window.__omenDataMode;
  else window.__omenDataMode = mode;
}

export function getDataMode() {
  if (current != null) return current;
  if (typeof window === 'undefined') return null;
  const fromWindow = window.__omenDataMode ?? window.__corvusDataMode;
  return VALID_MODES.includes(fromWindow) ? fromWindow : null;
}

/**
 * Live snapshot of the current data mode that re-renders on change in this
 * tab. Use in `<MomentChrome>` and anywhere moment chrome is gated.
 */
export function useDataMode() {
  const [mode, setMode] = useState(getDataMode);
  useEffect(() => {
    const sync = () => setMode(getDataMode());
    sync();
    return subscribeDataMode(sync);
  }, []);
  return mode;
}
