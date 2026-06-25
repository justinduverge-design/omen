/**
 * culturalMoments.js — Phase 1.5g.3 cultural-moment resolver.
 *
 * A cultural moment paints a bounded-calendar eyebrow (+ optional surface tint
 * + footer citation) on chrome routes. Spec:
 * `Blueprints/specs/team-motif-grammar.md` §CulturalMoment + §Activation rules.
 *
 * Hard discipline (in priority order):
 *   1. Fail closed — if dataMode is anything other than 'mock' (incl. null /
 *      undefined), render NOTHING. Moments never paint over live fantasy data.
 *   2. Scope — a moment only renders on routes whose scope tokens it declares.
 *      'omen' and 'trade' are never valid scope tokens (validator-enforced),
 *      so recommendation surfaces never get moment chrome.
 *   3. Activation — date-range / date-list / manual-flag decides if the moment
 *      is "in season". A DEV-only `?moment=<id>` override bypasses ONLY this
 *      step (still respects fail-closed + scope) for visual QA.
 *   4. Palette resolution — eyebrow/tint colors are palette ROLES, resolved to
 *      hex against the ACTIVE variant. A missing role suppresses the moment
 *      (graceful no-op, mirroring resolveMotifs).
 */

import { getTeamPalette } from '../data/nflTeams.js';

// Which scope tokens a given pathname satisfies. A moment renders when its
// `scope` array intersects this set. 'app' = the authenticated app home
// (the /football dashboard). Recommendation surfaces (/omen, /trade) and
// inert public routes resolve to an empty set → never any moment chrome.
const ROUTE_SCOPES = {
  '/football': ['app', 'football'],
  '/account': ['account'],
  '/account/appearance': ['account'],
  '/ledger': ['ledger'],
  '/standings': ['standings'],
  '/draft': ['draft'],
};

// Per `Blueprints/specs/page-system.md` Motif/Moment posture: only these
// routes may carry the surface tint. Everywhere else in scope the moment is
// eyebrow-only (preview/standings surfaces stay neutral so swatches and W-L
// columns aren't muddied). Exact-match so /account tints but
// /account/appearance does not.
const TINT_ROUTES = new Set(['/account', '/football', '/ledger']);

export function routeAllowsTint(pathname) {
  return TINT_ROUTES.has(pathname);
}

export function scopesForRoute(pathname) {
  if (!pathname) return [];
  // Exact match first, then longest-prefix (e.g. /account/appearance before
  // /account). Keeps nested routes from leaking the parent's scope wrongly.
  if (ROUTE_SCOPES[pathname]) return ROUTE_SCOPES[pathname];
  const match = Object.keys(ROUTE_SCOPES)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_SCOPES[match] : [];
}

function pad2(n) { return String(n).padStart(2, '0'); }

function localMonthDay(now) {
  return `${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function localYmd(now) {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Inclusive MM-DD window. Does not wrap the year boundary in v1. */
function inDateRange(monthDay, startMonthDay, endMonthDay) {
  return monthDay >= startMonthDay && monthDay <= endMonthDay;
}

function readManualFlags(storageKey) {
  try {
    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey)) || '{}';
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function isActivated(moment, now) {
  const a = moment.activation;
  if (!a) return false;
  if (a.rule === 'date-range') {
    return inDateRange(localMonthDay(now), a.startMonthDay, a.endMonthDay);
  }
  if (a.rule === 'date-list') {
    const today = localYmd(now);
    return Array.isArray(a.dates) && a.dates.includes(today);
  }
  if (a.rule === 'manual-flag') {
    return readManualFlags(a.storageKey)[moment.id] === true;
  }
  return false;
}

/**
 * Resolve the moments that should render right now for a team on a route.
 * Returns at most one moment in v1 (first match wins); the array shape keeps
 * the door open for multi-window moments later without a signature change.
 *
 * @param {object} team - team entry from nflTeams.js (reads team.culturalMoments)
 * @param {object} opts
 * @param {Date}   opts.now        - defaults to new Date()
 * @param {string} opts.dataMode   - 'mock' | 'live' | null (fail-closed)
 * @param {string} opts.route      - current pathname
 * @param {string} opts.variant    - 'official' | 'special' (palette for color resolution)
 * @param {string|null} opts.devOverrideId - DEV-only forced moment id (bypasses activation only)
 */
export function resolveActiveMoments(team, opts = {}) {
  const {
    now = new Date(),
    dataMode = null,
    route = '',
    variant = 'official',
    devOverrideId = null,
  } = opts;

  // 1. Fail closed — never paint over live (or unknown) data.
  if (dataMode !== 'mock') return [];

  const source = Array.isArray(team?.culturalMoments) ? team.culturalMoments : [];
  if (source.length === 0) return [];

  const routeScopes = new Set(scopesForRoute(route));
  if (routeScopes.size === 0) return [];

  const palette = getTeamPalette(team.abbr, variant);
  if (!palette?.byRole) return [];

  const active = [];
  for (const moment of source) {
    // 2. Scope
    if (!moment.scope.some((s) => routeScopes.has(s))) continue;

    // 3. Activation (DEV override bypasses only this gate)
    const forced = devOverrideId && devOverrideId === moment.id;
    if (!forced && !isActivated(moment, now)) continue;

    // 4. Palette resolution (suppress on missing role — graceful no-op)
    const eyebrowColor = palette.byRole[moment.overlay.eyebrowColorRole];
    if (!eyebrowColor?.hex) continue;

    let surfaceTint = null;
    if (moment.overlay.surfaceTintRole != null && routeAllowsTint(route)) {
      const tint = palette.byRole[moment.overlay.surfaceTintRole];
      // Declared a tint but the role is absent on this variant: drop the tint,
      // keep the eyebrow (graceful) rather than suppressing the whole moment.
      if (tint?.hex) surfaceTint = tint.hex;
    }

    active.push({
      ...moment,
      eyebrowColor: eyebrowColor.hex,
      eyebrowColorName: eyebrowColor.name,
      surfaceTint,
      surfaceTintAlpha: surfaceTint ? (moment.overlay.surfaceTintAlpha ?? 0) : 0,
    });

    break; // v1: one moment at a time
  }

  return active;
}

/** Read the DEV-only `?moment=<id>` override from a search string. */
export function readMomentOverride(search, isDev) {
  if (!isDev || !search) return null;
  try {
    return new URLSearchParams(search).get('moment');
  } catch {
    return null;
  }
}
