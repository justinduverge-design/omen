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
import { contrastRatio, readableOn, hexToRgb } from '../data/nflTeams.js';

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

export const MOTIF_VARS = [
  '--motif-shape',
  '--motif-color',
  '--motif-thickness',
  '--motif-opacity',
  '--motif-svg-url',
];

export const TYPE_FLOURISH_VARS = [
  '--type-flourish-family',
  '--type-flourish-weight',
  '--type-flourish-style',
  '--type-flourish-caps',
  '--type-flourish-tracking',
  '--type-flourish-features',
];

export const MOMENT_VARS = [
  '--moment-eyebrow',
  '--moment-eyebrow-color',
  '--moment-surface-tint',
  '--moment-surface-tint-alpha',
  '--moment-citation',
];

const MOMENT_ATTRS = ['data-moment-active'];

const MOTIF_ATTRS = [
  'data-motif-kind',
  'data-motif-shape',
  'data-motif-page-edge',
  'data-motif-card',
  'data-motif-section-divider',
  'data-motif-eyebrow',
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
  clearMotifTokens(root);
  clearTypeFlourishTokens(root);
  clearMomentTokens(root);
}

function clearMotifTokens(root) {
  for (const v of MOTIF_VARS) root.style.removeProperty(v);
  for (const attr of MOTIF_ATTRS) root.removeAttribute(attr);
}

function clearTypeFlourishTokens(root) {
  for (const v of TYPE_FLOURISH_VARS) root.style.removeProperty(v);
}

export function clearMomentTokens(root) {
  for (const v of MOMENT_VARS) root.style.removeProperty(v);
  for (const attr of MOMENT_ATTRS) root.removeAttribute(attr);
}

/** Escape a JS string for safe use as a CSS quoted string value. */
function cssString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Paint the active cultural moment (Phase 1.5g.3) onto :root. Eyebrow + mock
 * badge are rendered as real DOM by <MomentChrome>; this writes the shared
 * CSS vars (so the eyebrow color and the surface-tint color-mix rule resolve)
 * and toggles `data-moment-active` which gates the page-surface tint.
 *
 * No-op-to-clear when `moments` is empty. v1 moments are static-only, so
 * reduced-motion is a documented no-op (there are no transitions to suppress);
 * we still consult it as defense-in-depth so a future animated moment can't
 * slip past without revisiting this guard.
 */
export function applyMomentOverlay(root, moments) {
  const active = Array.isArray(moments) ? moments : (moments?.active ?? []);
  const moment = active[0];
  if (!moment) {
    clearMomentTokens(root);
    return;
  }

  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // v1 chrome is static (eyebrow + flat tint), so it renders identically under
  // reduced motion. The flag is read so the contract is explicit, not silent.
  void reducedMotion;

  root.style.setProperty('--moment-eyebrow', cssString(moment.overlay.eyebrow));
  root.style.setProperty('--moment-eyebrow-color', moment.eyebrowColor);

  if (moment.surfaceTint) {
    root.style.setProperty('--moment-surface-tint', moment.surfaceTint);
    root.style.setProperty('--moment-surface-tint-alpha', String(moment.surfaceTintAlpha ?? 0));
    root.setAttribute('data-moment-active', 'true');
  } else {
    root.style.removeProperty('--moment-surface-tint');
    root.style.removeProperty('--moment-surface-tint-alpha');
    root.removeAttribute('data-moment-active');
  }

  if (moment.overlay.citation) {
    root.style.setProperty('--moment-citation', cssString(moment.overlay.citation));
  } else {
    root.style.removeProperty('--moment-citation');
  }
}

export function applyMotifTokens(root, motifs) {
  const active = Array.isArray(motifs) ? motifs : (motifs?.active ?? []);
  const motif = active[0];
  if (!motif) {
    clearMotifTokens(root);
    return;
  }

  root.style.setProperty('--motif-shape', motif.shape);
  root.style.setProperty('--motif-color', motif.color);
  root.style.setProperty('--motif-thickness', `${motif.thicknessPx}px`);
  root.style.setProperty('--motif-opacity', String(motif.opacityValue ?? 1));

  if (motif.ornamentSvgPath) {
    root.style.setProperty('--motif-svg-url', `url('${motif.ornamentSvgPath}')`);
  } else {
    root.style.removeProperty('--motif-svg-url');
  }

  root.setAttribute('data-motif-kind', motif.kind);
  root.setAttribute('data-motif-shape', motif.shape);
  root.setAttribute('data-motif-page-edge', motif.appliesTo.includes('page-edge') ? 'true' : 'false');
  root.setAttribute('data-motif-card', motif.appliesTo.includes('card') ? 'true' : 'false');
  root.setAttribute('data-motif-section-divider', motif.appliesTo.includes('section-divider') ? 'true' : 'false');
  root.setAttribute('data-motif-eyebrow', motif.appliesTo.includes('eyebrow') ? 'true' : 'false');
}

export function applyTypeFlourishTokens(root, flourishes) {
  const active = Array.isArray(flourishes) ? flourishes : (flourishes?.active ?? []);
  const flourish = active[0];
  if (!flourish) {
    clearTypeFlourishTokens(root);
    return;
  }

  root.style.setProperty('--type-flourish-family', `"${flourish.family}"`);
  root.style.setProperty('--type-flourish-weight', String(flourish.weight ?? 'inherit'));
  root.style.setProperty('--type-flourish-style', flourish.style ?? 'normal');
  root.style.setProperty('--type-flourish-caps', flourish.variantCaps ?? 'normal');
  root.style.setProperty('--type-flourish-tracking', flourish.tracking ?? 'normal');
  root.style.setProperty('--type-flourish-features', flourish.fontFeatures ?? 'normal');
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

// ── Shell/card/accent contrast guard (team-theme-contract-v1.md Rules 2+3) ──
//
// Scoped fix for the "Commanders drowns in burgundy" bug: card fills and the
// CTA accent must stay findable against a team-tinted shell. This does NOT
// implement the full contract (room-mode depth ladder, three-switch UI,
// Lab ΔE role-collision check, color-wheel accent derivation, per-team
// authored card lifts) — those are separate follow-up work. This only
// guarantees Rule 2 (accent ≥ 3:1 vs shell) and Rule 3a (card ≥ 3:1 vs
// shell) never silently fail.

/** Linear sRGB blend matching `color-mix(in srgb, hexA pctA%, hexB)`. */
function mixHex(hexA, pctA, hexB) {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const a = pctA / 100;
  const blend = (x1, x2) => Math.round(x1 * a + x2 * (1 - a));
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(blend(r1, r2))}${toHex(blend(g1, g2))}${toHex(blend(b1, b2))}`;
}

// Card sits a small luminance step brighter than surface (Material-style
// elevation) — mix toward white, same direction as before this fix. What's
// new: if the base mix doesn't reach 3:1 against the shell (Rule 3a — the
// exact failure mode diagnosed for Commanders/Packers/Steelers-type teams),
// step the mix further toward white until it does, capped so the card never
// gets mixed past recognizably-still-team-tinted.
const CARD_MIN_TINT_PCT = 20;
// Fallback lift target for near-white surfaces (e.g. Dolphins cream, Chiefs
// light default), where mixing further toward white cannot create contrast
// no matter how far the percentage moves — a distinct failure mode from the
// dark-team case, not covered by stepping the white-mix percentage alone.
// Needs to be a genuinely mid-tone neutral (not just "less white") since the
// starting surface is already near-white and the floor below is much lower
// than the white-mix floor to give this pass enough range to actually reach
// 3:1 against a surface with almost no headroom.
const LIGHT_SURFACE_CARD_FALLBACK = '#7A7266';
const LIGHT_SURFACE_CARD_FALLBACK_MIN_TINT_PCT = 0;

function bestOf(surfaceHex, candidates) {
  let best = candidates[0];
  let bestRatio = contrastRatio(best, surfaceHex);
  for (const hex of candidates.slice(1)) {
    const ratio = contrastRatio(hex, surfaceHex);
    if (ratio > bestRatio) { best = hex; bestRatio = ratio; }
  }
  return { hex: best, ratio: bestRatio };
}

function resolveCardFill(surfaceHex, surfaceIsDark) {
  const basePct = surfaceIsDark ? 92 : 96;
  // Try lifting toward white first (the Material-elevation direction the
  // spec describes), but some mid-luminance saturated surfaces (e.g. Denver
  // orange) separate further from black than from white — try both
  // directions and keep whichever clears 3:1 with the lighter touch.
  let pct = basePct;
  let hex = mixHex(surfaceHex, pct, '#FFFFFF');
  let ratio = contrastRatio(hex, surfaceHex);
  while (ratio < 3 && pct > CARD_MIN_TINT_PCT) {
    pct -= 4;
    hex = mixHex(surfaceHex, pct, '#FFFFFF');
    ratio = contrastRatio(hex, surfaceHex);
  }

  if (ratio < 3) {
    let blackPct = basePct;
    let blackHex = mixHex(surfaceHex, blackPct, '#0A0A0B');
    let blackRatio = contrastRatio(blackHex, surfaceHex);
    while (blackRatio < 3 && blackPct > CARD_MIN_TINT_PCT) {
      blackPct -= 4;
      blackHex = mixHex(surfaceHex, blackPct, '#0A0A0B');
      blackRatio = contrastRatio(blackHex, surfaceHex);
    }
    const pickedDirection = bestOf(surfaceHex, [hex, blackHex]);
    hex = pickedDirection.hex;
    ratio = pickedDirection.ratio;
  }

  if (ratio < 3) {
    // White-mix exhausted (surface is already near-white) — try darkening
    // toward a neutral tan-gray instead, same stepping logic in reverse.
    let darkPct = 92;
    let darkHex = mixHex(surfaceHex, darkPct, LIGHT_SURFACE_CARD_FALLBACK);
    let darkRatio = contrastRatio(darkHex, surfaceHex);
    while (darkRatio < 3 && darkPct > LIGHT_SURFACE_CARD_FALLBACK_MIN_TINT_PCT) {
      darkPct -= 4;
      darkHex = mixHex(surfaceHex, darkPct, LIGHT_SURFACE_CARD_FALLBACK);
      darkRatio = contrastRatio(darkHex, surfaceHex);
    }
    const picked = bestOf(surfaceHex, [hex, darkHex]);
    hex = picked.hex;
    ratio = picked.ratio;
  }

  if (ratio < 3 && typeof console !== 'undefined') {
    console.warn(
      `[theme] card-vs-shell contrast still ${ratio.toFixed(2)}:1 (< 3:1) for surface ${surfaceHex} ` +
      `even after the light-surface fallback. Needs an authored card fill — see ` +
      `team-theme-contract-v1.md Rule 3.`,
    );
  }
  return hex;
}

// Rule 2 fallback: team primary → team secondary → white/black (whichever
// passes vs. the shell, via the same WCAG pick already used for body text).
// Full ladder also has a color-wheel-derived step and an Omen-brass last
// resort (team-theme-contract-v1.md "Fallback cascade") — not implemented
// here; if primary/secondary/readableOn all somehow fail 3:1 (readableOn
// picking the higher-contrast of two fixed candidates cannot fail to beat a
// weak team color), readableOn's result is still returned as the safest
// available fallback.
function resolveAccent(template, surfaceHex) {
  const candidates = [template.accent?.hex, template.secondary?.hex, template.primary?.hex].filter(Boolean);
  for (const hex of candidates) {
    if (contrastRatio(hex, surfaceHex) >= 3) return hex;
  }
  return readableOn(surfaceHex);
}

function applyTeamTokens(root, template) {
  setRoleTokens(root, template);

  // Card fill, contrast-guarded against the shell (Rule 3a) rather than a
  // fixed mix percentage — see resolveCardFill above.
  const cardFillHex = resolveCardFill(template.surface, template.surfaceIsDark);
  root.style.setProperty('--color-team-surface', template.surface);
  root.style.setProperty('--color-team-surface-card', cardFillHex);

  // Drive the core Omen tokens from the team palette so every page that
  // consumes --color-bg, --color-accent, etc. inherits the team look
  // automatically (no per-page rewrite needed for the basic case).
  root.style.setProperty('--color-bg',            template.surface);
  root.style.setProperty('--color-surface-1',     cardFillHex);
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
  // secondary when surface == primary), then contrast-guarded against the
  // shell (Rule 2) so a low-contrast pairing (e.g. a dark primary on a
  // similarly dark shell) doesn't ship an unfindable CTA.
  const accentHex   = resolveAccent(template, template.surface);
  const accentOnHex = readableOn(accentHex);
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

  applyMotifTokens(root, template.motifs);
  applyTypeFlourishTokens(root, template.typeFlourishes);
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
