#!/usr/bin/env node
/**
 * The two native color token files must hold identical values.
 *
 * `OmenColor.swift` and `OmenColor.kt` are hand-maintained twins. Nothing generates one from
 * the other and nothing compiles them together, so a value changed on one platform and not
 * the other is invisible to every test either platform runs — it surfaces as "light mode
 * looks different on Android", weeks later, on the founder's device.
 *
 * This parses the literal hexes out of both files and diffs them by token name. It is a
 * lockstep check only: whether a value is *correct* (AA ratios, control-boundary floors) is
 * `OmenColorContrastTest`'s job, and whether it matches the spec is the registry's.
 *
 * Tokens present on only one platform are reported separately from tokens that disagree —
 * a feature that exists on one platform (today: `platinum`, the iOS team-switcher favourite
 * star) is a legitimate absence, not a drift. Add it to KNOWN_SINGLE_PLATFORM with a reason.
 *
 * Usage: node scripts/check-token-parity.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SWIFT = path.join(ROOT, 'mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenColor.swift');
const KOTLIN = path.join(
  ROOT,
  'mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenColor.kt',
);

/** token -> why it legitimately lives on one platform only. */
const KNOWN_SINGLE_PLATFORM = {
  platinum: 'iOS-only: the team-switcher favourite star has no Android counterpart yet.',
};

// Swift writes alpha as a separate `alpha:` argument; Kotlin bakes it into an 8-digit
// literal (`0xCCBAE6FD`). Both reduce to the same six RGB digits, which is what this compares
// — alpha divergence is out of scope and would need the Swift argument parsed too.
const norm = (hex) => {
  const h = hex.toUpperCase().replace(/^0X/, '');
  return h.length === 8 ? h.slice(2) : h;
};

function parseSwift(src) {
  const out = {};
  // static let bg = dynamic(dark: 0x0A0A0B, light: 0xFAFAF9)
  const dyn = /static let (\w+) = dynamic\(dark: (0x[0-9A-Fa-f]{6}), light: (0x[0-9A-Fa-f]{6})/g;
  // static let demoTextSecondary = invariant(0xBAE6FD, alpha: 0.8)
  // static let riskHigh = invariant(0x7E1717)
  const inv = /static let (\w+) = invariant\((0x[0-9A-Fa-f]{6})/g;
  // static let focusRing = accent — a derived alias, not a literal.
  const alias = /static let (\w+) = (\w+)$/gm;
  for (const [, name, dark, light] of src.matchAll(dyn)) {
    out[name] = { dark: norm(dark), light: norm(light) };
  }
  for (const [, name, hex] of src.matchAll(inv)) {
    out[name] = { dark: norm(hex), light: norm(hex) };
  }
  // Resolve one level of aliasing so a token Swift derives (`focusRing = accent`) and Kotlin
  // spells out as a literal still compares, rather than reading as a missing token.
  for (const [, name, target] of src.matchAll(alias)) {
    if (out[target] && !out[name]) out[name] = { ...out[target] };
  }
  return out;
}

/** Pulls `name = Color(0xFFRRGGBB),` pairs out of one named val block. */
function parseKotlinBlock(src, blockName) {
  const start = src.indexOf(blockName);
  if (start === -1) throw new Error(`could not find ${blockName} in OmenColor.kt`);
  const open = src.indexOf('(', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = src.slice(open, end);
  const out = {};
  for (const [, name, hex] of body.matchAll(/(\w+)\s*=\s*Color\((0x[0-9A-Fa-f]{8})\)/g)) {
    out[name] = norm(hex);
  }
  return out;
}

function parseKotlin(src) {
  const darkCore = parseKotlinBlock(src, 'val OmenDarkColors = OmenColorScheme');
  const lightCore = parseKotlinBlock(src, 'val OmenLightColors = OmenColorScheme');
  const darkData = parseKotlinBlock(src, 'private val darkDataSemantics = OmenDataSemanticColors');
  // lightDataSemantics is a `.copy(...)` of the dark one; overrides layer on top.
  const lightCopy = parseKotlinBlock(src, 'private val lightDataSemantics = darkDataSemantics.copy');
  const lightData = { ...darkData, ...lightCopy };

  const out = {};
  const dark = { ...darkCore, ...darkData };
  const light = { ...lightCore, ...lightData };
  for (const name of new Set([...Object.keys(dark), ...Object.keys(light)])) {
    if (dark[name] && light[name]) out[name] = { dark: dark[name], light: light[name] };
  }
  return out;
}

const swift = parseSwift(fs.readFileSync(SWIFT, 'utf8'));
const kotlin = parseKotlin(fs.readFileSync(KOTLIN, 'utf8'));

const drift = [];
const onlyOne = [];

for (const name of new Set([...Object.keys(swift), ...Object.keys(kotlin)])) {
  const a = swift[name];
  const b = kotlin[name];
  if (!a || !b) {
    if (KNOWN_SINGLE_PLATFORM[name]) continue;
    onlyOne.push(`${name}: present on ${a ? 'iOS' : 'Android'} only`);
    continue;
  }
  for (const theme of ['dark', 'light']) {
    if (a[theme] !== b[theme]) {
      drift.push(`${name}.${theme}: iOS #${a[theme]} vs Android #${b[theme]}`);
    }
  }
}

const parsed = Object.keys(swift).length;
if (parsed < 30) {
  console.error(`token parity: only parsed ${parsed} iOS tokens — the parser has gone stale.`);
  process.exit(1);
}

if (drift.length === 0 && onlyOne.length === 0) {
  console.log(`token parity: OK (${parsed} iOS tokens, ${Object.keys(kotlin).length} Android).`);
  process.exit(0);
}

if (drift.length) {
  console.error('token parity: values disagree between platforms\n  ' + drift.join('\n  '));
}
if (onlyOne.length) {
  console.error(
    '\ntoken parity: token missing on one platform\n  ' +
      onlyOne.join('\n  ') +
      '\n\n  If the absence is deliberate, add it to KNOWN_SINGLE_PLATFORM with a reason.',
  );
}
process.exit(1);
