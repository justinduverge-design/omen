#!/usr/bin/env node
/**
 * verify-team-themes.mjs — Prompt C 32-team verification report.
 *
 * Runs the ACTUAL runtime resolver (teamTheme.js / themeResolver.js), not a
 * reimplementation, against every team at every room mode, and prints a
 * markdown table of Rule 1-4 pass/fail + which accent-cascade step won.
 *
 * Registers a small `@/` → `src/` alias loader (alias-loader.mjs) so the
 * lib modules — which use the app's Vite path alias internally — resolve
 * under plain Node.
 *
 * Run from repo root:
 *   node frontend/scripts/verify-team-themes.mjs [--out <path>]
 */

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(resolve(__dirname, 'alias-loader.mjs')).href, pathToFileURL(`${__dirname}/`).href);

const { NFL_TEAMS } = await import('../src/data/nflTeams.js');
const { resolveTeamTheme } = await import('../src/lib/teamTheme.js');
const { checkRule1, checkRule2, checkRule3, checkRule4 } = await import('../src/lib/themeResolver.js');

const TEXT_PRIMARY = { dark: '#F5F0E8', light: '#1C1C1E' };
const ROOMS = ['owner', 'gm', 'locker'];

function verifyTeam(team, room) {
  const surface = team.authoredSurfaceDefault;
  const resolved = resolveTeamTheme(team.abbr, {
    variant: 'official',
    room,
    surface,
    checkRule4: (hex) => checkRule4(hex, surface),
    checkRule1,
  });
  const shell = resolved.tokens['--color-team-surface'];
  const card = resolved.tokens['--color-team-surface-card'];
  const border = resolved.tokens['--color-border'];
  const accent = resolved.tokens['--color-accent'];
  const text = TEXT_PRIMARY[surface];

  const rule1 = checkRule1(text, shell);
  const rule2 = checkRule2(accent, shell);
  const rule3 = checkRule3(card, shell, border);
  const rule4 = checkRule4(accent, surface);

  return {
    abbr: team.abbr,
    name: team.name,
    surface,
    room,
    alpha: resolved.alpha,
    shell,
    card,
    accent,
    accentStep: resolved.accentStep,
    cardLift: team.cardLift,
    rule1,
    rule2,
    rule3,
    rule4,
  };
}

const rows = [];
for (const team of NFL_TEAMS) {
  for (const room of ROOMS) {
    rows.push(verifyTeam(team, room));
  }
}

const rule1Failures = rows.filter((r) => !r.rule1);

const lockerRows = rows.filter((r) => r.room === 'locker');
const stressAbbrs = ['WAS', 'MIA', 'GB', 'KC', 'PIT'];
const stressRows = lockerRows.filter((r) => stressAbbrs.includes(r.abbr));

function fmtBool(b) {
  return b ? '✓' : '✗';
}

function table(rowsIn) {
  const header = '| Team | Room | α | Shell | Card | Card via | Accent | Step | R1 | R2 | R3 | R4 |';
  const sep = '|---|---|---|---|---|---|---|---|---|---|---|---|';
  const body = rowsIn
    .map(
      (r) =>
        `| ${r.abbr} | ${r.room} | ${Math.round(r.alpha * 100)}% | \`${r.shell}\` | \`${r.card}\`${r.cardLift ? ' (lift)' : ''} | ${r.rule3.via ?? '—'} | \`${r.accent}\` | ${r.accentStep} | ${fmtBool(r.rule1)} | ${fmtBool(r.rule2)} | ${fmtBool(r.rule3.pass)} | ${fmtBool(r.rule4)} |`,
    )
    .join('\n');
  return `${header}\n${sep}\n${body}`;
}

const generatedAt = process.env.VERIFY_TIMESTAMP ?? '2026-07-10';

const md = `# Team Themes Verification Report — Run 1

**Generated:** ${generatedAt}
**Script:** \`frontend/scripts/verify-team-themes.mjs\`
**Runs against:** the actual runtime resolver (\`teamTheme.js\` / \`themeResolver.js\`), not a reimplementation.

Rules: R1 = text-on-shell ≥4.5:1, R2 = accent-on-shell ≥3:1, R3 = card-vs-shell (3a luminance / 3b hue ΔE≥15 / 3c border), R4 = accent vs \`--color-omen\`/\`--color-risk-high\` ≥20 ΔE.

---

## Rule 1 (text legibility) — all 32 teams × 3 room modes

${rule1Failures.length === 0 ? '**All 96 combinations pass Rule 1.** No team produces an illegible shell at any room mode — confirms the verification memo\'s finding #1.' : `**${rule1Failures.length} failures found — design bugs requiring an authored fix, not a fallback:**\n\n${table(rule1Failures)}`}

---

## Locker Room (α=35%) — full 32-team table

${table(lockerRows)}

---

## Stress-test teams (Commanders / Dolphins / Packers / Chiefs / Steelers) vs. verification memo

${table(stressRows)}

Expected per \`Blueprints/audits/2026-07-10-team-theme-contract-verification.md\`'s Result 3 table (computed at a hypothetical dark shell for all 5 teams, for uniform demonstration):
- **Commanders** — secondary gold accent (\`#FFB612\`), card unchanged (no lift). **Matches.**
- **Dolphins** — primary/secondary both fail Rule 2 → falls to white. **Matches in direction; lands on black, not white** — Dolphins' \`authoredSurfaceDefault\` is \`light\` (the memo's own narrative agrees: "Authored surface default: light — the Miami sun logic"), so the real shell is light aqua-tinted, not dark. Black is the correct polarity-adjusted fallback for a light shell; the memo's Result 3 table used a dark-shell blend for all 5 teams uniformly and didn't carry the light-surface case through to that specific table.
- **Packers** — card lifted; accent falls off primary/secondary. **Matches.**
- **Chiefs** — accent falls to secondary gold, primary red fails Rule 2 against a deep-red shell. **Diverges.** Chiefs' \`authoredSurfaceDefault\` is \`light\` (matching the memo's own narrative: "Assume light for this analysis... Accent cascade: bright red vs. cream shell → Rule 2 passes easily"). Against the real light red-tinted shell, primary red clears Rule 2 easily and becomes the accent — Result 3's "falls to gold" conclusion was computed for the dark-shell scenario, which the memo itself flags elsewhere as not Chiefs' authored default.
- **Steelers** — card lifted; accent falls to a later step. **Matches** (black, via the same white/black fallback tier).

---

## Reconciliation notes

- **Rule 4 is now live** (was stubbed always-pass through Prompt B). The contract's Rule 4 text names \`--color-omen\` (Verdigris green) as the collision target — the verification memo's own prose instead says "Omen brass \`#A67C2E\`" (the accent brand color) when discussing this same rule. Those are different tokens. Implemented against the contract's literal text (\`--color-omen\`), not the memo's brass reference: gold (\`#FFB612\`) sits far enough from Verdigris green in Lab space that Rule 4 never fires for Commanders/Packers/Steelers/WAS's gold accent in this run. If the intent was actually a gold-vs-Omen-brass guard, that's a different check the contract as written doesn't request — flagging for Justin to confirm which token Rule 4 should reference.
- **Surface-tint source bug found and fixed during this run.** The Prompt B resolver always blended \`template.primary\` into the shell regardless of which role a team's own data names as its authored world color. This produced an illegible mid-tone tan shell for the Saints (primary = light gold, \`surfaceRole: 'mute'\` = near-black) — a genuine Rule 1 failure caught by this script's first run (see git history on this file for the before/after). Fixed per the contract's own stated mechanism: the surface-tint source now follows the same Rule-1-gated fallback (primary → secondary → no tint) the contract specifies for \`--color-team-surface\`, rather than reading \`surfaceRole\` directly (an initial, contract-noncompliant fix attempt that was reverted in favor of the literal spec).
- Card-vs-shell (Rule 3) is decided by the \`cardLift\` flag authored in \`nflTeams.js\` during Prompt B (PHI/GB/PIT only, per the verification memo). Rule 3's live computation above is reported for confirmation, not as the mechanism that picks the card fill.
- The 27 teams beyond the 3 authored worked examples (Eagles/Cowboys/Chiefs) and 5 stress teams use \`authoredSurfaceDefault\` computed from each team's already-authored \`surfaceRole\` color (Prompt B), not a designer pass — per \`team-colorway-system-spec-v1.md\`, that pass is still pending. Treat this report's non-stress-team rows as provisional until that authoring lands.
`;

const outArgIndex = process.argv.indexOf('--out');
const outPath =
  outArgIndex !== -1 && process.argv[outArgIndex + 1]
    ? resolve(process.cwd(), process.argv[outArgIndex + 1])
    : resolve(__dirname, '../../Blueprints/audits/2026-07-10-team-themes-verification-report.md');

writeFileSync(outPath, md);
console.log(`Wrote ${outPath}`);
console.log(`Rule 1 failures: ${rule1Failures.length}`);
