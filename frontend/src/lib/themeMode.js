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
  '--color-card-text-secondary',
  '--color-card-text-primary',
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

// Fallback lift target for near-white surfaces (e.g. Dolphins cream, Chiefs
// light default), where mixing further toward white cannot create contrast
// no matter how far the percentage moves — needs a genuinely mid-tone
// target, not just "less white." Every fallback color in this file must
// come from the approved Omen palette (#0A0A0B, #F5F0E8, #A67C2E, #2F7D5B,
// #7E1717) — no invented grays/slates. Omen brass (#A67C2E) is the correct
// choice here: it's the brand's own mid-tone anchor, not a generic neutral.
const LIGHT_SURFACE_CARD_FALLBACK = '#A67C2E';

// WCAG AA minimum for --color-text-secondary against the resolved card
// fill. Hard floor, never traded away for a better score on any other
// axis — see resolveCardFill.
const TEXT_ON_CARD_MIN_RATIO = 4.5;

// ── Global card-fill scoring (founder decision 2026-07-12) ─────────────────
//
// Prior version searched tinted candidates but returned on the FIRST one
// that cleared a fixed 3:1 shell-contrast floor while walking from
// least-tinted to most-tinted. For shells dark/saturated enough to never
// clear that floor (Commanders, Bills, Eagles), this was invisible — the
// search exhausted and fell through to a hardcoded neutral. But for a shell
// bright enough to pass early (Lions: Honolulu Blue), the search stopped at
// the FIRST passing candidate (secondary-text contrast 6.90:1) instead of
// continuing toward darker, more legible candidates the same sweep found
// later (up to 7.57:1 within the old search range; full black reaches
// 8.95:1). "First passing" and "best available" are different targets —
// the old code only ever computed the former. Not a Lions-specific bug: any
// team whose shell is bright enough to pass early was under-scored the same
// way.
//
// New rule: build every candidate along both lift directions (toward cream
// and toward black, full 0–96% sweep — no arbitrary minimum-tint floor),
// plus the brass fallback for near-white surfaces, score ALL of them, and
// return the highest-scoring candidate. Team tint is preserved only when it
// doesn't cost anything on a higher-priority axis — it is the tie-breaker,
// not the goal, and official-palette membership alone is never a reason to
// prefer a candidate (Omen surface quality comes first, team identity
// second).
//
// Scoring priority (highest first, per founder spec):
//   1. secondary text legibility  (--color-text-secondary vs. card)
//   2. primary text legibility    (--color-text-primary vs. card)
//   3. card vs. shell separation  (Rule 3a, floor 3:1)
//   4. border legibility          (Rule 3c, vs. both shell and card)
//   5. team-tint preservation     (tie-breaker only)
//
// Priority is enforced by weighting, not literal lexicographic comparison,
// but the two text-legibility axes (1, 2) are gates, not quality axes:
// once a candidate clears the WCAG floor for a role, it gets full credit
// for that role regardless of how far past the floor it lands. An earlier
// version scored raw contrast ratio (capped at 9) for both text axes, which
// let "very legible" (8.95:1) numerically outscore "adequately legible"
// (4.63:1) by enough to overrule which candidate was actually chosen even
// when the loser was meaningfully better on a role that hadn't cleared its
// own floor yet (Denver: the highest-scoring candidate had primary-text
// contrast of 1.00:1 — invisible — while a less "optimal" secondary-text
// candidate reached 1.93:1 on primary, still failing but far less broken).
// Once a role passes, more headroom on that role must not be able to
// out-vote a still-failing lower-priority role. Shell separation (3) and
// border legibility (4) stay continuous/capped — those are genuine quality
// axes where "more separation" is a real improvement, not just a floor to
// clear (this is exactly what fixed the Lions under-scoring bug: preferring
// more shell contrast, not just enough).
const CARDFILL_SHELL_CAP  = 6;  // shell separation: no extra credit past 6:1 (floor is 3:1)
const CARDFILL_BORDER_CAP = 6;  // border legibility (min of vs-shell/vs-card): same idea

const CARDFILL_SEC_WEIGHT    = 1_000_000;
const CARDFILL_PRIM_WEIGHT   = 10_000;
const CARDFILL_SHELL_WEIGHT  = 100;
const CARDFILL_BORDER_WEIGHT = 1;
const CARDFILL_TINT_WEIGHT   = 0.001;

/**
 * 1.0 once `ratio` clears `floor` — no bonus for exceeding it, because
 * legibility is a gate, not something to keep optimizing once satisfied.
 * Below the floor, scaled 0..~1 so failing candidates still rank against
 * each other (closer to the floor is better) without a failing candidate
 * ever outscoring one that actually passes.
 */
function axisPassScore(ratio, floor) {
  return ratio >= floor ? 1 : ratio / floor;
}

/** 0 (fully neutral) to 100 (unmixed team surface) — tie-breaker only. */
function tintPreservation(candidateHex, surfaceHex) {
  const [r1, g1, b1] = hexToRgb(candidateHex);
  const [r2, g2, b2] = hexToRgb(surfaceHex);
  const maxDist = Math.sqrt(3 * 255 * 255);
  const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return 100 * (1 - dist / maxDist);
}

/**
 * Best of the app's two fixed secondary-text hexes against `hex` — the
 * secondary-text equivalent of `readableOn` (which does the same job for
 * the two primary-text anchors). Neither of these is team-tinted (deny
 * list, team-theme-contract-v1.md); this only chooses which of the two
 * fixed options fits a given surface.
 */
function readableSecondaryOn(hex) {
  return contrastRatio('#AEAEB2', hex) >= contrastRatio('#4A5158', hex)
    ? '#AEAEB2'
    : '#4A5158';
}

/**
 * Card-scoped text pair for `candidateHex`, resolved independently of the
 * shell's own text colors (see the card/shell token split below). Picking
 * per-candidate — not reusing the shell's fixed pair — is what makes light
 * Omen-neutral cards a real option for saturated dark shells (Bills,
 * Commanders, Eagles): under the old fixed-per-shell text color, a light
 * card was excluded before scoring ever ran, because the shell's light-grey
 * secondary text is illegible on any light surface. Resolving text per
 * candidate removes that blanket exclusion and lets light cards compete on
 * their actual merits.
 */
function cardTextPair(candidateHex) {
  return { secondary: readableSecondaryOn(candidateHex), primary: readableOn(candidateHex) };
}

function scoreCardCandidate(candidateHex, surfaceHex, template) {
  const { secondary: textSecondaryHex, primary: textPrimaryHex } = cardTextPair(candidateHex);
  const secRatio = contrastRatio(textSecondaryHex, candidateHex);
  const primRatio = contrastRatio(textPrimaryHex, candidateHex);
  const shellRatio = contrastRatio(candidateHex, surfaceHex);
  const borderHex = resolveBorder(surfaceHex, candidateHex, template, { silent: true });
  const borderRatio = Math.min(
    contrastRatio(borderHex, surfaceHex),
    contrastRatio(borderHex, candidateHex),
  );
  const tint = tintPreservation(candidateHex, surfaceHex);

  const score =
    axisPassScore(secRatio, TEXT_ON_CARD_MIN_RATIO) * CARDFILL_SEC_WEIGHT +
    axisPassScore(primRatio, TEXT_ON_CARD_MIN_RATIO) * CARDFILL_PRIM_WEIGHT +
    Math.min(shellRatio, CARDFILL_SHELL_CAP) * CARDFILL_SHELL_WEIGHT +
    Math.min(borderRatio, CARDFILL_BORDER_CAP) * CARDFILL_BORDER_WEIGHT +
    tint * CARDFILL_TINT_WEIGHT;

  return {
    hex: candidateHex, score, secRatio, primRatio, shellRatio, borderRatio, tint,
    textSecondaryHex, textPrimaryHex,
  };
}

function buildCardCandidates(surfaceHex) {
  const hexes = new Set();
  for (const liftHex of ['#F5F0E8', '#0A0A0B']) {
    for (let pct = 96; pct >= 0; pct -= 4) {
      hexes.add(mixHex(surfaceHex, pct, liftHex));
    }
  }
  for (let pct = 92; pct >= 0; pct -= 4) {
    hexes.add(mixHex(surfaceHex, pct, LIGHT_SURFACE_CARD_FALLBACK));
  }
  hexes.add('#0A0A0B');
  hexes.add('#F5F0E8');
  hexes.add(LIGHT_SURFACE_CARD_FALLBACK);
  return Array.from(hexes);
}

/**
 * Resolves the card fill AND its own card-scoped text pair (see the
 * card/shell token split above `cardTextPair`). Returns
 * `{ hex, textSecondaryHex, textPrimaryHex }` — callers write the text pair
 * to `--color-card-text-secondary`/`-primary`, decoupled from the shell's
 * own (unchanged) `--color-text-secondary`/`-primary`. `surfaceIsDark` is
 * no longer used to pre-select a fixed text color (that's the whole point
 * of the split) but stays in the signature since callers already have it
 * and future tie-breaking may want it.
 */
function resolveCardFill(surfaceHex, _surfaceIsDark, template) {
  const candidates = buildCardCandidates(surfaceHex);
  const scored = candidates.map((hex) => scoreCardCandidate(hex, surfaceHex, template));

  // Hard floor: never ship a candidate under the WCAG AA minimum for EITHER
  // text role that actually renders on the card. With per-candidate text
  // resolution this floor is almost always clearable (each candidate picks
  // whichever of the two fixed secondary/primary anchors fits it), so this
  // remains a true, rare ceiling rather than the routine exclusion it used
  // to be under a single shell-fixed text color.
  const bothLegible = scored.filter(
    (c) => c.secRatio >= TEXT_ON_CARD_MIN_RATIO && c.primRatio >= TEXT_ON_CARD_MIN_RATIO,
  );
  const secOnlyLegible = scored.filter((c) => c.secRatio >= TEXT_ON_CARD_MIN_RATIO);
  const pool = bothLegible.length > 0 ? bothLegible : secOnlyLegible.length > 0 ? secOnlyLegible : scored;

  if (bothLegible.length === 0 && typeof console !== 'undefined') {
    const best = pool.reduce((a, b) => (Math.min(b.secRatio, b.primRatio) > Math.min(a.secRatio, a.primRatio) ? b : a));
    console.warn(
      `[theme] surface ${surfaceHex}: no card-fill candidate reaches ${TEXT_ON_CARD_MIN_RATIO}:1 for both ` +
      `secondary and primary text even with per-candidate text resolution (best candidate reaches ` +
      `sec=${best.secRatio.toFixed(2)}:1, prim=${best.primRatio.toFixed(2)}:1). Returning the most legible ` +
      `candidate found — a genuine ceiling for the app's two fixed text-color pairs against this specific hue.`,
    );
  }

  const best = pool.reduce((a, b) => (b.score > a.score ? b : a));
  return { hex: best.hex, textSecondaryHex: best.textSecondaryHex, textPrimaryHex: best.textPrimaryHex };
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

// ── Border/panel-definition guard (team-theme-contract-v1.md Rule 3c) ──────
//
// Follow-up to the card-fill guard above. That fix made text on the card
// legible, but never touched --color-border, which was still a fixed
// `color-mix(primary 26%, neutral 74%)` formula computed independently of
// both the shell and the resolved card fill. Audited all 32 teams: 15 have
// a border under 1.5:1 against BOTH the shell and the card (functionally
// invisible), and none reach a real 3:1 anywhere. Once cards started
// falling back to a darker neutral (the previous fix), the shell-to-card
// luminance gap shrank and panels started relying entirely on this
// never-verified border to read as separated — which it structurally
// couldn't do. This is the actual source of the "flatter" feeling: not a
// font problem, a border-was-never-contrast-checked problem.
const BORDER_MIN_RATIO = 3;
// Mixing target for the "team tint can't carry the border" case. Not a
// generic mid-gray — every color here must come from the approved Omen
// palette (#0A0A0B, #F5F0E8, #A67C2E, #2F7D5B, #7E1717). Omen brass
// (#A67C2E) is the brand's own mid-tone anchor, so a border that falls back
// to it reads as an intentional Omen accent, not a slate-gray escape hatch.
// Used for both dark and light shells — its own mid-luminance gives it
// headroom to separate from either extreme when mixed toward white/black.
const BORDER_NEUTRAL = '#A67C2E';

/**
 * Border must be >=3:1 against BOTH the shell and the resolved card (Rule
 * 3c: differentiation for cards that can't get there via fill alone comes
 * from the border). Tries team-primary-tinted first (identity carries into
 * the border even when the card itself went neutral), falls back to a
 * plain neutral border if team tint can't hit both floors.
 */
function resolveBorder(surfaceHex, cardHex, template, { silent = false } = {}) {
  const teamHex = template.primary?.hex ?? template.accent?.hex;
  const neutralTarget = BORDER_NEUTRAL;

  function passes(hex) {
    return contrastRatio(hex, surfaceHex) >= BORDER_MIN_RATIO && contrastRatio(hex, cardHex) >= BORDER_MIN_RATIO;
  }
  // Score by the weaker of the two ratios — a candidate that's great vs.
  // shell but weak vs. card is no better than the reverse; optimize the
  // floor, not one side.
  function score(hex) {
    return Math.min(contrastRatio(hex, surfaceHex), contrastRatio(hex, cardHex));
  }

  let best = neutralTarget;
  let bestScore = score(neutralTarget);

  if (teamHex) {
    for (let pct = 55; pct >= 0; pct -= 5) {
      const hex = mixHex(teamHex, pct, neutralTarget);
      if (passes(hex)) return hex;
      const s = score(hex);
      if (s > bestScore) { best = hex; bestScore = s; }
    }
  }
  // Second-pass lift stays inside the palette: try both cream and black
  // (not just the "expected" direction for the shell's darkness) — a
  // mid-luminance saturated shell (e.g. Denver orange) can need the
  // opposite-of-obvious direction to actually separate, same reasoning as
  // the card-fill resolver's own both-directions search.
  for (const liftHex of ['#F5F0E8', '#0A0A0B']) {
    for (let pct = 100; pct >= 0; pct -= 5) {
      const hex = mixHex(neutralTarget, pct, liftHex);
      if (passes(hex)) return hex;
      const s = score(hex);
      if (s > bestScore) { best = hex; bestScore = s; }
    }
  }
  // No candidate inside the approved palette hits >=3:1 against both shell
  // and card simultaneously — a real ceiling for this specific shell (e.g.
  // Denver: pure cream, the lightest of the 5 approved colors, tops out at
  // 2.97:1 against the shell — provably the best any in-palette color can
  // do, not a search failure). Return the best-scoring candidate found
  // across the whole sweep rather than the raw, unmixed neutral -- "closest
  // to passing" is materially better than "didn't even try."
  if (!silent && typeof console !== 'undefined') {
    console.warn(
      `[theme] border cannot reach ${BORDER_MIN_RATIO}:1 against both shell (${surfaceHex}) and card (${cardHex}) ` +
      `using only the approved palette. Best in-palette candidate (${best}) scores ${bestScore.toFixed(2)}:1 on its ` +
      `weaker side — this shell/card pairing needs an authored border or a documented palette exception.`,
    );
  }
  return best;
}

function applyTeamTokens(root, template) {
  setRoleTokens(root, template);

  // Card fill, contrast-guarded against the shell (Rule 3a) rather than a
  // fixed mix percentage — see resolveCardFill above. Card and shell now
  // resolve independent text-color pairs (founder decision 2026-07-12,
  // card/shell token split): --color-text-secondary/-primary stay fixed to
  // the shell as before, and --color-card-text-secondary/-primary carry
  // whatever pair is actually legible on the resolved card. Card.jsx scopes
  // the card tokens back onto --color-text-secondary/-primary for its own
  // DOM subtree (CSS custom-property cascade, not a per-page migration),
  // so every existing `var(--color-text-secondary)` reference already
  // written inside a <Card> picks up the correct value automatically. This
  // is what makes light Omen-neutral cards viable for saturated dark
  // shells (Bills, Commanders, Eagles): the old single shared text color
  // excluded light cards before scoring ever ran, because the shell's
  // fixed light-grey secondary text is illegible on any light surface.
  const { hex: cardFillHex, textSecondaryHex: cardTextSecondary, textPrimaryHex: cardTextPrimary } =
    resolveCardFill(template.surface, template.surfaceIsDark, template);
  root.style.setProperty('--color-team-surface', template.surface);
  root.style.setProperty('--color-team-surface-card', cardFillHex);
  root.style.setProperty('--color-card-text-secondary', cardTextSecondary);
  root.style.setProperty('--color-card-text-primary', cardTextPrimary);

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
  const borderHex = resolveBorder(template.surface, cardFillHex, template);
  root.style.setProperty('--color-border', borderHex);
  root.style.setProperty(
    '--color-border-subtle',
    `color-mix(in srgb, ${borderHex} 55%, ${cardFillHex} 45%)`,
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
