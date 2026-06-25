import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { NFL_TEAMS } from '../data/nflTeams.js';
import { useTheme } from './themeMode.js';
import { useDataMode } from './dataMode.js';
import { resolveActiveMoments, readMomentOverride } from './culturalMoments.js';

/**
 * useActiveMoment — Phase 1.5g.3 shared resolver hook.
 *
 * Single source of truth for "is a cultural moment active right now, here?"
 * so <MomentChrome> (which renders the eyebrow/badge + drives the tint) and
 * <Footer> (which appends the citation) never disagree. Returns the resolved
 * moment (with eyebrowColor / surfaceTint already resolved to hex) or null.
 */
export function useActiveMoment() {
  const { mode, team, variant } = useTheme();
  const dataMode = useDataMode();
  const location = useLocation();
  const devOverrideId = readMomentOverride(location.search, import.meta.env.DEV);

  return useMemo(() => {
    if (mode !== 'team' || !team) return null;
    const entry = NFL_TEAMS.find((t) => t.abbr === team);
    if (!entry) return null;
    const active = resolveActiveMoments(entry, {
      now: new Date(),
      dataMode,
      route: location.pathname,
      variant,
      devOverrideId,
    });
    return active[0] ?? null;
  }, [mode, team, variant, dataMode, location.pathname, location.search, devOverrideId]);
}
