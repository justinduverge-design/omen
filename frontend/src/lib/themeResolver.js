/**
 * themeResolver.js — team-theme-contract-v1.md "three switches" resolver
 * (Prompt B).
 *
 * Switch A — Accent source: 'omen' | 'team'
 * Switch B — Surface mode:  'dark' | 'light' | 'auto' (auto = team's authored default)
 * Switch C — Team:          NFL abbr | null
 *
 * Reads persisted prefs via themeMode.js's getThemeAccentSource() /
 * getThemeSurfaceMode() — the real, independently-persisted switch state
 * that /account/appearance (Prompt E) writes to directly.
 *
 * Room mode ('owner' | 'gm' | 'locker') is read from `data-room` on <html>,
 * which pages don't set yet (Prompt D wires that up per page). Defaults to
 * 'locker' — the deepest tint and the bucket most pages belong to per
 * team-theme-contract-v1.md's Room Mode ladder, so an unset room reads as
 * the common case rather than silently under-tinting.
 */

import {
  getThemeAccentSource,
  getThemeSurfaceMode,
  getThemeTeam,
  getThemeVariant,
  subscribeTheme,
} from '@/lib/themeMode.js';
import { NFL_TEAMS } from '@/data/nflTeams.js';
import { resolveTeamTheme, TEAM_THEME_VARS } from '@/lib/teamTheme.js';
import { wcagContrast, deltaE_CIELAB } from '@/lib/contrastMath.js';

// Role tokens Rule 4 protects — team-theme-contract-v1.md §Contrast
// enforcement Rule 4. Per-theme because --color-omen differs light/dark;
// --color-risk-high is identical in both (see frontend/src/index.css).
const OMEN_HEX_BY_SURFACE = { dark: '#2F7D5B', light: '#1A5C3E' };
const RISK_HIGH_HEX = '#7E1717';
const RULE4_MIN_DELTA_E = 20;

/** Rule 1 — text on shell must clear 4.5:1 (WCAG AA text). */
export function checkRule1(textHex, shellHex) {
  return wcagContrast(textHex, shellHex) >= 4.5;
}

/** Rule 2 — accent on shell must clear 3:1 (WCAG AA non-text UI). */
export function checkRule2(accentHex, shellHex) {
  return wcagContrast(accentHex, shellHex) >= 3;
}

/**
 * Rule 3 — card must be visibly distinct from shell via at least one of
 * 3a (luminance ≥3:1), 3b (hue ΔE ≥15), or 3c (border ≥3:1 vs both).
 * Returns which path(s) satisfied it so the verification report can cite one.
 */
export function checkRule3(cardHex, shellHex, borderHex = null) {
  const luminanceOk = wcagContrast(cardHex, shellHex) >= 3;
  const hueOk = deltaE_CIELAB(cardHex, shellHex) >= 15;
  const borderOk = borderHex
    ? wcagContrast(borderHex, shellHex) >= 3 && wcagContrast(borderHex, cardHex) >= 3
    : false;
  const via = luminanceOk ? '3a' : hueOk ? '3b' : borderOk ? '3c' : null;
  return { pass: luminanceOk || hueOk || borderOk, via, luminanceOk, hueOk, borderOk };
}

/** Rule 4 — accent must sit ≥20 ΔE from --color-omen AND --color-risk-high. */
export function checkRule4(candidateHex, surface = 'dark') {
  const omenHex = OMEN_HEX_BY_SURFACE[surface] ?? OMEN_HEX_BY_SURFACE.dark;
  return (
    deltaE_CIELAB(candidateHex, omenHex) >= RULE4_MIN_DELTA_E &&
    deltaE_CIELAB(candidateHex, RISK_HIGH_HEX) >= RULE4_MIN_DELTA_E
  );
}

function resolveSurface(surfaceMode, teamAbbr, accentSource) {
  if (surfaceMode === 'dark' || surfaceMode === 'light') return surfaceMode;
  // 'auto' — team's authored default; if accent source is Omen, auto
  // resolves to dark regardless of team (team-theme-contract-v1.md §Switch B).
  if (accentSource !== 'team') return 'dark';
  const team = teamAbbr ? NFL_TEAMS.find((t) => t.abbr === teamAbbr) : null;
  return team?.authoredSurfaceDefault ?? 'dark';
}

function resolveRoom(root) {
  const room = root.dataset.room;
  return room === 'owner' || room === 'gm' || room === 'locker' ? room : 'locker';
}

function clearTeamOverrides(root) {
  for (const v of TEAM_THEME_VARS) root.style.removeProperty(v);
}

// The pre-Prompt-B team-apply path (themeMode.js's applyTeamTokens, still
// invoked internally by setThemeMode/setThemeTeam/setThemeVariant for its
// motif/moment/type-flourish side effects) sets --color-text-primary/
// -secondary/-tertiary per team — a deny-list violation under this contract.
// Both code paths run on every theme-mode change (that legacy call fires
// first, this resolver runs second via the same notify() subscription), so
// clearing these here guarantees text always falls back to the data-theme
// dark/light CSS block regardless of what the legacy path left behind.
const DENIED_TEXT_VARS = ['--color-text-primary', '--color-text-secondary', '--color-text-tertiary'];
function clearDeniedTextOverrides(root) {
  for (const v of DENIED_TEXT_VARS) root.style.removeProperty(v);
}

/**
 * Resolve the three switches from persisted prefs, apply `data-theme`,
 * `data-accent-source`, `data-team` and the computed token overrides to
 * `<html>`, and return the resolved state for consumers (e.g. ThemeProvider,
 * the future /account/appearance rebuild).
 *
 * Idempotent; safe to call repeatedly (theme-mode changes, room changes).
 */
export function resolveTheme() {
  const root = document.documentElement;
  const teamAbbr = getThemeTeam();
  const variant = getThemeVariant();

  const accentSource = getThemeAccentSource();
  const surfaceMode = getThemeSurfaceMode();
  const surface = resolveSurface(surfaceMode, teamAbbr, accentSource);
  const room = resolveRoom(root);

  root.setAttribute('data-theme', surface);
  root.setAttribute('data-accent-source', accentSource);
  if (teamAbbr) root.setAttribute('data-team', teamAbbr);
  else root.removeAttribute('data-team');

  if (accentSource !== 'team' || !teamAbbr) {
    clearTeamOverrides(root);
    clearDeniedTextOverrides(root);
    return { accentSource, surfaceMode, surface, room, team: null };
  }

  const resolved = resolveTeamTheme(teamAbbr, {
    variant,
    room,
    surface,
    checkRule4: (hex) => checkRule4(hex, surface),
    checkRule1: (textHex, shellHex) => checkRule1(textHex, shellHex),
  });
  if (!resolved) {
    clearTeamOverrides(root);
    clearDeniedTextOverrides(root);
    return { accentSource, surfaceMode, surface, room, team: null };
  }

  for (const [prop, value] of Object.entries(resolved.tokens)) {
    root.style.setProperty(prop, value);
  }
  clearDeniedTextOverrides(root);

  return {
    accentSource,
    surfaceMode,
    surface,
    room,
    team: resolved.team,
    tokens: resolved.tokens,
    accentStep: resolved.accentStep,
  };
}

/** Re-run the resolver whenever theme-mode prefs change in this tab. */
export function watchTheme() {
  resolveTheme();
  return subscribeTheme(resolveTheme);
}
