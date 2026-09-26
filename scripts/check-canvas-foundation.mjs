#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.resolve(ROOT, file), 'utf8');
const requirements = JSON.parse(read('Blueprints/specs/design/canvas-contract-requirements-v1.json'));

export function checkFoundation() {
  const findings = [];
  const iosSpacing = read('mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenSpacing.swift');
  const androidSpacing = read('mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenSpacing.kt');
  const css = read('design/native-visual-lock-2026-09-13/_shared.css');
  const apiRoutes = read('Blueprints/api-routes.md');
  const expectedSteps = [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64, 96];
  const aliases = ['cardInterior', 'headerToBody', 'bodyToFooter', 'sectionStack', 'heroToFirstSection',
    'fieldToField', 'labelToInput', 'inputToHint', 'chipInteriorVertical',
    'chipInteriorHorizontal', 'inlineGap'];

  for (const step of expectedSteps) {
    if (!new RegExp(`step${step}[^\\n=]*=\\s*${step}(?:\\.dp)?\\b`).test(iosSpacing)) findings.push(`iOS spacing step${step} is missing or wrong`);
    if (!new RegExp(`step${step}[^\\n=]*=\\s*${step}\\.dp\\b`).test(androidSpacing)) findings.push(`Android spacing step${step} is missing or wrong`);
  }
  for (const alias of aliases) {
    if (!new RegExp(`\\b${alias}\\b`).test(iosSpacing)) findings.push(`iOS rhythm alias ${alias} is missing`);
    if (!new RegExp(`\\b${alias}\\b`).test(androidSpacing)) findings.push(`Android rhythm alias ${alias} is missing`);
  }

  const allowedCanvasSpacing = new Set([-15, -1, 1, 2, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 24, 32, 40, 64]);
  for (const declaration of css.matchAll(/(?:padding(?:-[a-z]+)?|margin(?:-[a-z]+)?|gap)\s*:\s*([^;}]+)/g)) {
    for (const value of declaration[1].matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
      const number = Number(value[1]);
      if (!allowedCanvasSpacing.has(number)) findings.push(`undocumented canvas spacing literal ${number}px`);
    }
  }
  const typeRamp = new Set([10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 27, 32, 48]);
  for (const value of css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) {
    if (!typeRamp.has(Number(value[1]))) findings.push(`off-ramp canvas font size ${value[1]}px`);
  }
  const productCss = css.replace(/\/\*[\s\S]*?Annotation overlay[\s\S]*?Identity providers/, '/* annotation block omitted */\n/* Identity providers');
  for (const value of productCss.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    if (!/Wix Madefor|inherit/.test(value[1])) findings.push(`unapproved product canvas font family ${value[1].trim()}`);
  }

  const routeAliases = new Set(['espn-connect.v1', 'active-league.v1']);
  for (const screen of requirements.screens) {
    const contract = read(`Blueprints/specs/design/screen-contracts/${screen.id}-v1.md`);
    const apiField = contract.match(/\| API contract \| ([^|]+) \|/)?.[1]?.trim();
    if (apiField === undefined) findings.push(`${screen.id} has no API contract field`);
    for (const version of screen.api_contracts) {
      if (!apiField?.includes(version)) findings.push(`${screen.id} contract omits ${version}`);
      if (!apiRoutes.includes(version) && !routeAliases.has(version)) findings.push(`${version} is not registered in api-routes.md`);
    }
  }
  return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = checkFoundation();
  if (findings.length) {
    console.error('canvas foundation: FAIL');
    for (const finding of findings) console.error(`  ${finding}`);
    process.exitCode = 1;
  } else {
    console.log(`canvas foundation: OK (${requirements.screens.length} screens; token parity, canvas literals, API versions).`);
  }
}
