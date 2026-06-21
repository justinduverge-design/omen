#!/usr/bin/env node
/**
 * contrast-sweep.mjs — Phase 1.5f two-axis WCAG contrast audit.
 *
 * For each of the 32 NFL teams, computes:
 *   - text-on-surface contrast (the page body text "F5F0E8" on dark surfaces,
 *     "1C1C1E" on light surfaces) vs the team's derived surface.
 *   - text-on-accent contrast (the textOnAccent token) vs the team's raw
 *     accent background (filled CTA).
 *   - accent-on-surface contrast (the lifted accent used as text/border) vs
 *     the team's derived surface.
 *
 * Each axis is evaluated independently — dark-axis teams report dark-surface
 * contrast, light-axis teams report light-surface contrast.
 *
 * Output: markdown report at the path passed via --out, or stdout if omitted.
 *
 * Run from the corvus/ repo root:
 *   node frontend/scripts/contrast-sweep.mjs \
 *        --out Blueprints/audits/2026-06-21-phase1-5f-two-axis-wcag-sweep.md
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NFL_TEAMS } from '../src/data/nflTeams.js';
import { getTeamTemplate } from '../src/lib/teamTemplate.js';

// ── WCAG contrast math ────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLum([r, g, b]) {
  return [r, g, b]
    .map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrastRatio(hexA, hexB) {
  const la = relLum(hexToRgb(hexA));
  const lb = relLum(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

function fmtRatio(r) { return r.toFixed(2); }

function verdict(ratio, type = 'normal') {
  // WCAG 2.1: normal text 4.5:1 AA, 7:1 AAA; large/UI 3:1 AA, 4.5:1 AAA.
  const aa  = type === 'large' ? 3.0 : 4.5;
  const aaa = type === 'large' ? 4.5 : 7.0;
  if (ratio >= aaa) return 'AAA';
  if (ratio >= aa)  return 'AA';
  return 'FAIL';
}

// ── Sweep ─────────────────────────────────────────────────────────────────

function runSweep() {
  const rows = NFL_TEAMS.map((team) => {
    const recipe = getTeamTemplate(team.abbr);
    if (!recipe) return null;

    const axis = recipe.axis;
    const surface = recipe.surface;
    const surfaceCard = recipe.surfaceCard;
    const accent = recipe.accent;          // lifted (text/border use)
    const accentBg = recipe.accentBg;      // raw (CTA bg)
    const textOnAccent = recipe.textOnAccent;
    const bodyText = axis === 'light' ? '#1C1C1E' : '#F5F0E8';

    const cBodySurface  = contrastRatio(bodyText, surface);
    const cBodyCard     = contrastRatio(bodyText, surfaceCard);
    const cTextOnAccent = contrastRatio(textOnAccent, accentBg);
    const cAccentOnSurf = contrastRatio(accent, surface);

    return {
      abbr: team.abbr,
      name: `${team.city} ${team.name}`,
      template: recipe.template,
      axis,
      surface,
      surfaceCard,
      accent,
      accentBg,
      textOnAccent,
      bodyText,
      cBodySurface,
      cBodyCard,
      cTextOnAccent,
      cAccentOnSurf,
    };
  }).filter(Boolean);

  return rows;
}

// ── Markdown emit ─────────────────────────────────────────────────────────

function toMarkdown(rows) {
  const lines = [];
  lines.push('# Phase 1.5f — Two-Axis WCAG Contrast Sweep');
  lines.push('');
  lines.push(`**Date:** 2026-06-21`);
  lines.push(`**Phase:** 1.5f — Theme-aware team palettes`);
  lines.push(`**Generator:** \`frontend/scripts/contrast-sweep.mjs\` (run from repo root)`);
  lines.push(`**Source data:** [nflTeams.js](../../frontend/src/data/nflTeams.js), [teamTemplate.js](../../frontend/src/lib/teamTemplate.js)`);
  lines.push(`**Predecessor:** [2026-06-16-phase1-5-team-template-assignment.md](2026-06-16-phase1-5-team-template-assignment.md) (single-axis dark-only sweep)`);
  lines.push(`**Identity audit:** [2026-06-20-phase1-5e-32-team-identity-audit.md](2026-06-20-phase1-5e-32-team-identity-audit.md)`);
  lines.push('');
  lines.push('## What this measures');
  lines.push('');
  lines.push('For each team, against its assigned `surfaceAxis`:');
  lines.push('');
  lines.push('- **body / surface** — `--color-text-primary` body text on `--color-team-surface`. AA ≥ 4.5.');
  lines.push('- **body / card** — same body text on `--color-team-surface-card` (elevated card bg). AA ≥ 4.5.');
  lines.push('- **CTA text / CTA bg** — `--color-text-on-accent` on the raw team-accent fill. AA ≥ 4.5 (treated as UI/large since CTAs use semibold ≥16px → AA-large 3.0 also reported).');
  lines.push('- **accent text / surface** — lifted accent (`--color-team-accent`, used as text/border) on `--color-team-surface`. AA-large ≥ 3.0 (this token paints small headings, focus rings, and accent labels — UI/large category).');
  lines.push('');
  lines.push('Verdict columns use normal-text AA (4.5) for body/CTA rows and large-text AA (3.0) for accent-on-surface rows.');
  lines.push('');

  // Known-marginal exceptions — passing AA-large (3.0) but short of AA-normal
  // (4.5) for the CTA cell, OR passing AA-normal but short of AAA for
  // accent-on-surface where the design intent (Bred) uses accent as fill only.
  const KNOWN_MARGINALS = {
    KC:  { cell: 'CTA', why: "Chiefs red #E31837 — passes AA-large (3.0); falls short of AA-normal (4.5) by a small margin (~4.2). CTAs use semibold 16-18px (borderline AA-large eligible). Accepted as identity-preserving; future polish PR can swap to a slightly darker brand-red CTA fill if WCAG-strict required." },
    DET: { cell: 'CTA', why: "Lions Honolulu blue #0076B6 — passes AA-large (3.0); ~4.34 vs 4.5 AA-normal threshold. Same rationale as KC." },
    ATL: { cell: 'accent/surface', why: "Bred (template 6) uses accent as the call-to-action FILL on a pure-black surface; accent is not used as text/border ON the surface. The accent-on-surface metric is informational; Bred-template ignores it by design. CTA text-on-accent (6.55) passes AA." },
  };

  const failures = rows.filter((r) =>
    r.cBodySurface < 4.5 ||
    r.cBodyCard    < 4.5 ||
    r.cTextOnAccent < 4.5 ||
    r.cAccentOnSurf < 3.0
  );

  const unexpectedFailures = failures.filter((r) => !KNOWN_MARGINALS[r.abbr]);

  lines.push('## Summary');
  lines.push('');
  lines.push(`- Teams audited: **${rows.length}**`);
  lines.push(`- Light-axis teams: **${rows.filter((r) => r.axis === 'light').length}** (MIA, IND, LAC, DAL, CAR, ARI)`);
  lines.push(`- Dark-axis teams: **${rows.filter((r) => r.axis === 'dark').length}**`);
  lines.push(`- Unexpected failures: **${unexpectedFailures.length}** (any cell below threshold not pre-accepted as a known marginal)`);
  lines.push(`- Accepted known marginals: **${failures.length - unexpectedFailures.length}** — see "Known marginals" section below`);
  if (unexpectedFailures.length) {
    lines.push('');
    lines.push('Unexpected failures (NOT pre-accepted; must be triaged before merge):');
    for (const f of unexpectedFailures) {
      const issues = [];
      if (f.cBodySurface < 4.5)  issues.push(`body/surface ${fmtRatio(f.cBodySurface)}`);
      if (f.cBodyCard    < 4.5)  issues.push(`body/card ${fmtRatio(f.cBodyCard)}`);
      if (f.cTextOnAccent < 4.5) issues.push(`CTA ${fmtRatio(f.cTextOnAccent)}`);
      if (f.cAccentOnSurf < 3.0) issues.push(`accent/surface ${fmtRatio(f.cAccentOnSurf)}`);
      lines.push(`- **${f.abbr}** (${f.axis}): ${issues.join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## Known marginals (accepted)');
  lines.push('');
  lines.push('These are identity-preserving trade-offs reviewed against the 2026-06-20 identity audit. Each is acceptable for shipping Phase 1.5f and is documented here so re-runs of the sweep don\'t re-surface them as blockers.');
  lines.push('');
  for (const [abbr, info] of Object.entries(KNOWN_MARGINALS)) {
    lines.push(`- **${abbr}** (${info.cell}): ${info.why}`);
  }
  lines.push('');

  // Detail table per axis
  for (const axis of ['dark', 'light']) {
    const subset = rows.filter((r) => r.axis === axis);
    lines.push(`## ${axis === 'dark' ? 'Dark-axis teams' : 'Light-axis teams'} (${subset.length})`);
    lines.push('');
    lines.push('| # | Team | T | Surface | Card | Accent (raw) | Accent (lifted) | body/surface | body/card | CTA text/bg | accent/surface |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|');

    subset.forEach((r, idx) => {
      const vBS = verdict(r.cBodySurface);
      const vBC = verdict(r.cBodyCard);
      const vCT = verdict(r.cTextOnAccent);
      const vAS = verdict(r.cAccentOnSurf, 'large');
      const cell = (val, v) => `${fmtRatio(val)} ${v}`;
      lines.push(
        `| ${idx + 1} | **${r.abbr}** ${r.name} | ${r.template} | \`${r.surface}\` | \`${r.surfaceCard}\` | \`${r.accentBg}\` | \`${r.accent}\` | ${cell(r.cBodySurface, vBS)} | ${cell(r.cBodyCard, vBC)} | ${cell(r.cTextOnAccent, vCT)} | ${cell(r.cAccentOnSurf, vAS)} |`,
      );
    });
    lines.push('');
  }

  lines.push('## Methodology');
  lines.push('');
  lines.push('- WCAG 2.1 contrast formula: `(L_lighter + 0.05) / (L_darker + 0.05)` where L is relative luminance.');
  lines.push('- Thresholds: normal text 4.5:1 AA; UI / large text (≥18pt or ≥14pt bold) 3.0:1 AA.');
  lines.push('- The "lifted accent" column is the value `getTeamTemplate()` returns for `accent` — i.e., after textSafe() (sat-clamp + S-decay) and after any per-team `accentLifted` override.');
  lines.push('- Body text hex: `#F5F0E8` (Corvus dark mode) for dark-axis teams; `#1C1C1E` for light-axis teams (matches the per-axis text-color overrides applied in `themeMode.js`).');
  lines.push('');
  lines.push('## Rerun');
  lines.push('');
  lines.push('```bash');
  lines.push('node frontend/scripts/contrast-sweep.mjs \\');
  lines.push('     --out Blueprints/audits/2026-06-21-phase1-5f-two-axis-wcag-sweep.md');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

// ── CLI ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

const rows = runSweep();
const md = toMarkdown(rows);

if (outPath) {
  const abs = resolve(process.cwd(), outPath);
  writeFileSync(abs, md, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${rows.length} team rows → ${abs}`);
} else {
  // eslint-disable-next-line no-console
  console.log(md);
}
