#!/usr/bin/env node
/**
 * A screen can photograph perfectly and be unreachable.
 *
 * `ScreenshotScenarios` mounts a screen directly against in-app fixtures, which is the whole point
 * of it — no session, no network, no real league. The cost of that design is that a scenario is
 * not evidence of a route: a screen referenced *only* by the registry renders in every capture and
 * no user can arrive at it. No visual review asks the question, because there is nothing wrong
 * with the picture.
 *
 * This has now happened three times on Android and been found by hand each time:
 *
 *   2026-09-18  OmenNoLeagueScreen, OmenConnectFailedScreen  — both platforms, found by asking
 *               what production referenced them. iOS was fixed; Android was reported fixed and
 *               was not.
 *   2026-09-19  OmenStartSitScreen — Android, in J3, a journey already closed as complete.
 *
 * Three instances of one defect, each found by remembering to run a grep, is a check. So this is
 * the grep, once, for both platforms, so that "production references every new screen" stops
 * depending on whoever is at the keyboard remembering it.
 *
 *   node scripts/check-screen-reachability.mjs            report; exit 1 on any finding
 *   node scripts/check-screen-reachability.mjs --quiet    findings only
 *
 * Safe to run: reads source files, writes nothing, makes no network call.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quiet = process.argv.includes('--quiet');

/**
 * Only names ending in `Screen`.
 *
 * This is deliberately narrow. A first pass matched every identifier the registry imported and
 * reported ten findings, seven of which were state enums and fixture objects used in type
 * positions — `OmenHelpDestination` is referenced in six production files and was called
 * unreachable because it is never followed by `(`. **A checker that cries wolf gets deleted**,
 * and `scripts/checks/README.md` already says a checker reporting on what it cannot see is worse
 * than no checker. `Screen` is this repo's own naming convention for the thing being checked, so
 * the narrow rule is also the correct one.
 */
const SCREEN = /\b(Omen[A-Za-z0-9]*Screen)\b/g;

const PLATFORMS = [
  {
    name: 'iOS',
    registry: 'mobile/ios/OmenIOS/OmenIOS/App/Screenshot/ScreenshotScenarios.swift',
    sourceDir: 'mobile/ios/OmenIOS/OmenIOS',
    ext: '.swift',
    // A SwiftUI screen's declaration. Anything else mentioning the name is a use.
    isDeclaration: (line, name) =>
      new RegExp(`\\b(struct|class|enum)\\s+${name}\\b`).test(line),
  },
  {
    name: 'Android',
    registry: 'mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/screenshot/ScreenshotScenarios.kt',
    sourceDir: 'mobile/android/app/src/main/kotlin',
    ext: '.kt',
    // A composable's declaration, or the import the registry itself needs.
    isDeclaration: (line, name) =>
      new RegExp(`\\bfun\\s+${name}\\s*\\(`).test(line) || /^\s*import\s/.test(line),
  },
];

function walk(dir, ext, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

const findings = [];
const coverage = [];

for (const platform of PLATFORMS) {
  const registryPath = path.join(ROOT, platform.registry);
  const sourceRoot = path.join(ROOT, platform.sourceDir);

  if (!fs.existsSync(registryPath) || !fs.existsSync(sourceRoot)) {
    // Say so rather than passing. An unrun check is not a passing check.
    coverage.push(`✗ DID NOT RUN  ${platform.name} — ${platform.registry} not found`);
    continue;
  }

  const registrySource = fs.readFileSync(registryPath, 'utf8');
  const screens = [...new Set([...registrySource.matchAll(SCREEN)].map((m) => m[1]))].sort();
  const files = walk(sourceRoot, platform.ext).filter((f) => f !== registryPath);

  for (const screen of screens) {
    const uses = [];
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!new RegExp(`\\b${screen}\\b`).test(line)) return;
        if (platform.isDeclaration(line, screen)) return;
        // A doc comment naming the screen is not a route to it. This is exactly how the three
        // known cases looked: a comment saying "iOS mirror: OmenConnectFailedScreen" beside a
        // definition nothing called.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        uses.push(`${path.relative(ROOT, file)}:${i + 1}`);
      });
    }
    if (uses.length === 0) {
      findings.push({ platform: platform.name, screen, registry: platform.registry });
    }
  }

  coverage.push(`✓ ran      ${platform.name} — ${screens.length} screen(s) in the registry, ${files.length} source file(s) searched`);
}

if (!quiet) {
  console.log('Screen reachability — every screen a screenshot scenario mounts must also be');
  console.log('reachable from production code.\n');
  coverage.forEach((l) => console.log('  ' + l));
  console.log('');
}

if (findings.length === 0) {
  if (!quiet) console.log('No findings: every scenario-mounted screen has a production reference.\n');
} else {
  console.log(`${findings.length} screen(s) are mounted by a screenshot scenario and referenced nowhere else:\n`);
  for (const f of findings) {
    console.log(`  ${f.platform.padEnd(8)} ${f.screen}`);
    console.log(`           referenced only by ${f.registry}`);
  }
  console.log('');
  console.log('A screen in this list photographs correctly and no user can arrive at it.');
  console.log('Wire it into production, or delete it. **Do not invent state to make it');
  console.log('reachable** — forcing a failure screen with a fabricated status is the exact');
  console.log('false claim such a screen usually exists to prevent.\n');
}

if (!quiet) {
  console.log('What this does NOT check:');
  console.log('  · whether the production reference is itself reachable — a call site inside');
  console.log('    dead code still counts here. This finds screens with no route at all.');
  console.log('  · whether the screen renders correctly, or matches its artboard.');
  console.log('  · screens with no screenshot scenario. Those are invisible to this check and');
  console.log('    to the visual evidence workflow alike.');
  console.log('  · names not ending in `Screen`, which is the repo convention it relies on.');
}

process.exit(findings.length === 0 ? 0 : 1);
