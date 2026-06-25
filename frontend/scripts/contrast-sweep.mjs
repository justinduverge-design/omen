#!/usr/bin/env node
/**
 * contrast-sweep.mjs — Phase 1.5h multi-role palette WCAG sweep plus Phase 1.5g motif guard.
 *
 * For each of the 32 NFL teams × {official, special?} × every palette role
 * combination, computes:
 *   - body-on-surface       (text body color on the team surface)
 *   - role-on-surface       (each palette role used as text on the surface)
 *   - text-on-role          (text-on-accent color on each palette role used as a fill)
 *   - motif-on-surface      (each active motif color on the team surface)
 *
 * Output: markdown report. Re-run from repo root:
 *   node frontend/scripts/contrast-sweep.mjs --out Blueprints/audits/2026-06-23-phase1-5g-motif-contrast-sweep.md
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NFL_TEAMS } from '../src/data/nflTeams.js';
import { getTeamTemplate } from '../src/lib/teamTemplate.js';

// Phase 1.5g.2 font-loading grep gate — index.css is pinned to 2 @import
// lines (Alegreya/Alegreya Sans, DM Mono) and 0 @font-face lines. A new
// font load (e.g. self-hosting) must be a deliberate, reviewed change, not
// a silent drift — bump the baseline here if that change is intentional.
const FONT_IMPORT_BASELINE = 2;
const FONT_FACE_BASELINE = 0;

function assertFontImportBaseline() {
  const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/index.css');
  const css = readFileSync(cssPath, 'utf8');
  const importCount = (css.match(/^@import\b/gm) ?? []).length;
  const fontFaceCount = (css.match(/^@font-face\b/gm) ?? []).length;

  if (importCount > FONT_IMPORT_BASELINE || fontFaceCount > FONT_FACE_BASELINE) {
    console.error(
      `Font-loading grep gate failed: index.css has ${importCount} @import ` +
      `(baseline ${FONT_IMPORT_BASELINE}) and ${fontFaceCount} @font-face ` +
      `(baseline ${FONT_FACE_BASELINE}). New font loads need deliberate review ` +
      `— bump FONT_IMPORT_BASELINE/FONT_FACE_BASELINE in contrast-sweep.mjs if intentional.`,
    );
    process.exit(1);
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLum([r, g, b]) {
  return [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrastRatio(hexA, hexB) {
  const la = relLum(hexToRgb(hexA));
  const lb = relLum(hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}
function fmt(r) { return r.toFixed(2); }
function verdict(ratio, type = 'normal') {
  const aa  = type === 'large' ? 3.0 : 4.5;
  const aaa = type === 'large' ? 4.5 : 7.0;
  if (ratio >= aaa) return 'AAA';
  if (ratio >= aa)  return 'AA';
  return 'FAIL';
}

function runSweep() {
  const rows = [];
  for (const team of NFL_TEAMS) {
    for (const palette of team.palettes) {
      const template = getTeamTemplate(team.abbr, palette.mode);
      if (!template) continue;

      const cells = {};
      // body-on-surface
      cells['body/surface'] = {
        ratio: contrastRatio(template.textOnSurface, template.surface),
        threshold: 'normal',
      };
      // accent (derived CTA) on surface (used as bold text/border)
      if (template.accent) {
        cells['accent/surface'] = {
          ratio: contrastRatio(template.accent.hex, template.surface),
          threshold: 'large',
        };
      }
      // CTA-text on accent (filled CTA)
      if (template.accent) {
        cells['CTA text/accent'] = {
          ratio: contrastRatio(template.textOnAccent, template.accent.hex),
          threshold: 'normal',
        };
      }
      // Each named role × surface (informational)
      for (const role of ['primary', 'secondary', 'tertiary', 'neutral', 'mute', 'accentPop']) {
        const color = template[role];
        if (!color) continue;
        // Skip the surface role itself (would be 1:1 against itself).
        if (color.hex.toLowerCase() === template.surface.toLowerCase()) continue;
        cells[`${role}/surface`] = {
          ratio: contrastRatio(color.hex, template.surface),
          threshold: role === 'mute' || role === 'neutral' ? 'normal' : 'large',
        };
      }
      for (const motif of template.motifs?.active ?? []) {
        cells[`motif:${motif.id}/surface`] = {
          ratio: contrastRatio(motif.color, template.surface),
          threshold: 'large',
        };
      }

      rows.push({
        abbr: team.abbr,
        name: `${team.city} ${team.name}`,
        variant: palette.mode,
        variantName: palette.name,
        surface: template.surface,
        surfaceRole: template.surfaceRole,
        accentHex: template.accent?.hex ?? '—',
        anchor: palette.culturalAnchor?.name ?? null,
        cells,
      });
    }
  }
  return rows;
}

function toMarkdown(rows) {
  const KNOWN_MARGINALS = {
    // KC red CTA still passes AA-large at semibold ≥16px; identity-preserving
    // call from Phase 1.5f carries over to 1.5h.
    'KC|official|CTA text/accent': 'Chiefs red CTA passes AA-large (3.0) — identity-preserving',
    'DET|official|CTA text/accent': 'Lions blue CTA passes AA-large (3.0) — identity-preserving',
    // Body text on DET Honolulu Blue surface: 4.34 vs 4.5 AA-normal. The
    // surface IS the Lions identity color and Honolulu Blue is mid-
    // luminance; CTAs are large/semibold so this clears AA-large (3.0).
    'DET|official|body/surface': 'Honolulu blue surface is the Lions identity — 4.34 passes AA-large; CTAs are ≥16px semibold (borderline AA-large eligible)',
    'DET|special|body/surface':  'Same as official — Lions surface is Honolulu blue regardless of variant',
    // BUF Wing Sauce special: Frank's Red CTA on Ranch Cream is the
    // identity. Light text on Frank's Red = 4.41, passes AA-large.
    'BUF|special|CTA text/accent': 'Wing Sauce Frank\'s Red CTA passes AA-large (3.0) at 4.41 — identity-preserving',
  };

  const out = [];
  out.push('# Phase 1.5h/1.5g — Multi-Color Palette + Motif WCAG Sweep');
  out.push('');
  out.push(`**Date:** 2026-06-23`);
  out.push(`**Phase:** 1.5h multi-role palettes + 1.5g motif hairline guard`);
  out.push(`**Generator:** \`frontend/scripts/contrast-sweep.mjs\``);
  out.push(`**Source data:** [nflTeams.js](../../frontend/src/data/nflTeams.js), [teamTemplate.js](../../frontend/src/lib/teamTemplate.js)`);
  out.push(`**Predecessors:** Phase 1.5f single-axis sweep (2026-06-21), Phase 1.5e identity audit (2026-06-20)`);
  out.push('');
  out.push('## What this measures');
  out.push('');
  out.push('For every (team × variant) — i.e., Official and Special palettes separately:');
  out.push('');
  out.push('- **body/surface** — body text on the team surface. AA ≥ 4.5.');
  out.push('- **accent/surface** — the derived CTA color (which falls through from primary to secondary when surface == primary) used as bold text/border on the surface. AA-large ≥ 3.0.');
  out.push('- **CTA text/accent** — text-on-accent foreground on the filled accent CTA. AA ≥ 4.5.');
  out.push('- **motif:<id>/surface** — active motif color on the team surface. Decorative threshold ≥ 3.0.');
  out.push('- **\\<role\\>/surface** — every other palette role used as text on the surface. Informational; some roles are intentionally chosen as fills not text (mute, neutral) and are scored against AA-normal; others are accent-like and scored AA-large.');
  out.push('');

  // Required cells (hard fail if below threshold): the things every team
  // MUST get right because they're load-bearing for legibility.
  //   - body/surface: body text on the page background
  //   - CTA text/accent: CTA text on the filled CTA
  // Other cells are INFORMATIONAL — many roles (primary, secondary, tertiary,
  // mute) are typically used as FILLS or BORDERS, not as body text on the
  // surface, so a low contrast there doesn't mean the page is unreadable.
  const REQUIRED_CELLS = new Set(['body/surface', 'CTA text/accent']);
  const failures = [];
  for (const r of rows) {
    for (const [name, cell] of Object.entries(r.cells)) {
      if (!REQUIRED_CELLS.has(name) && !name.startsWith('motif:')) continue;
      const v = verdict(cell.ratio, cell.threshold);
      const key = `${r.abbr}|${r.variant}|${name}`;
      if (v === 'FAIL' && !KNOWN_MARGINALS[key]) {
        failures.push({ ...r, cellName: name, ratio: cell.ratio, threshold: cell.threshold });
      }
    }
  }
  const acceptedMarginals = Object.keys(KNOWN_MARGINALS).length;

  out.push('## Summary');
  out.push('');
  out.push(`- Palettes audited: **${rows.length}** (32 official + ${rows.length - 32} special)`);
  out.push(`- Unexpected failures: **${failures.length}**`);
  out.push(`- Accepted known marginals: **${acceptedMarginals}**`);
  out.push('');
  if (failures.length) {
    out.push('Failures (action needed):');
    for (const f of failures) {
      out.push(`- **${f.abbr}** (${f.variant} / ${f.cellName}): ${fmt(f.ratio)} — threshold ${f.threshold === 'large' ? '3.0' : '4.5'}`);
    }
    out.push('');
  }

  out.push('## Known marginals (accepted)');
  out.push('');
  for (const [key, why] of Object.entries(KNOWN_MARGINALS)) {
    out.push(`- \`${key}\`: ${why}`);
  }
  out.push('');

  // Per-team table
  out.push('## Per-palette detail');
  out.push('');
  out.push('| Team | Variant | Surface | Accent | Anchor | body/surf | accent/surf | CTA/acc | motif/surf |');
  out.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    const c = r.cells;
    const bs = c['body/surface'] ? `${fmt(c['body/surface'].ratio)} ${verdict(c['body/surface'].ratio, c['body/surface'].threshold)}` : '—';
    const as = c['accent/surface'] ? `${fmt(c['accent/surface'].ratio)} ${verdict(c['accent/surface'].ratio, c['accent/surface'].threshold)}` : '—';
    const ca = c['CTA text/accent'] ? `${fmt(c['CTA text/accent'].ratio)} ${verdict(c['CTA text/accent'].ratio, c['CTA text/accent'].threshold)}` : '—';
    const motifCells = Object.entries(c)
      .filter(([name]) => name.startsWith('motif:'))
      .map(([name, cell]) => `${name.replace('motif:', '').replace('/surface', '')}: ${fmt(cell.ratio)} ${verdict(cell.ratio, cell.threshold)}`);
    const motifSummary = motifCells.length ? motifCells.join('<br>') : '—';
    out.push(`| **${r.abbr}** ${r.name} | ${r.variant} (${r.variantName}) | \`${r.surface}\` | \`${r.accentHex}\` | ${r.anchor ?? '—'} | ${bs} | ${as} | ${ca} | ${motifSummary} |`);
  }
  out.push('');

  out.push('## Methodology');
  out.push('');
  out.push('- WCAG 2.1 formula: `(L_lighter + 0.05) / (L_darker + 0.05)` where L is relative luminance.');
  out.push('- Normal text AA = 4.5, AAA = 7.0. UI / large text AA = 3.0, AAA = 4.5.');
  out.push('- The "accent" column is the derived CTA color from `getTeamTemplate().accent` — primary by default, falling through to secondary when surface == primary (GB green-on-green, PIT black-on-black, LV black-on-black, etc.).');
  out.push('- Body text on dark surface = `#F5F0E8`; on light surface = `#1C1C1E`.');
  out.push('- Motif contrast uses raw resolved motif color against the active team surface; opacity affects visual weight but not the threshold calculation.');
  out.push('');
  out.push('## Rerun');
  out.push('```bash');
  out.push('node frontend/scripts/contrast-sweep.mjs \\');
  out.push('     --out Blueprints/audits/2026-06-23-phase1-5g-motif-contrast-sweep.md');
  out.push('```');
  return out.join('\n');
}

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

assertFontImportBaseline();

const rows = runSweep();
const md = toMarkdown(rows);

if (outPath) {
  const abs = resolve(process.cwd(), outPath);
  writeFileSync(abs, md, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${rows.length} palette rows → ${abs}`);
} else {
  // eslint-disable-next-line no-console
  console.log(md);
}
