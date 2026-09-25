#!/usr/bin/env node
/**
 * The visual-lock canvas and screen-contract directory are a paired build input.
 * Every artboard needs exactly one contract, and every contract needs an artboard.
 *
 * Usage: node scripts/check-canvas-contract-coverage.mjs [canvas-dir] [contracts-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canvasDir = path.resolve(ROOT, process.argv[2] || 'design/native-visual-lock-2026-09-13');
const contractsDir = path.resolve(ROOT, process.argv[3] || 'Blueprints/specs/design/screen-contracts');

function screenName(fileName) {
  return fileName
    .replace(/\.dc\.html$/, '')
    .replace(/-v1\.md$/, '');
}

function files(dir, pattern) {
  if (!fs.existsSync(dir)) throw new Error(`directory not found: ${path.relative(ROOT, dir)}`);
  return fs.readdirSync(dir).filter((name) => pattern.test(name)).sort();
}

export function findCoverage({ canvasDir: canvas = canvasDir, contractsDir: contracts = contractsDir } = {}) {
  const artboards = files(canvas, /\.dc\.html$/).map(screenName);
  const contractFiles = files(contracts, /-v1\.md$/);
  const contractsByName = contractFiles.map(screenName);
  const artboardSet = new Set(artboards);
  const contractSet = new Set(contractsByName);
  return {
    artboards,
    contracts: contractsByName,
    missingContracts: artboards.filter((name) => !contractSet.has(name)),
    orphanContracts: contractsByName.filter((name) => !artboardSet.has(name)),
  };
}

function main() {
  let coverage;
  try {
    coverage = findCoverage();
  } catch (error) {
    console.error(`canvas contract coverage: DID NOT RUN — ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const { artboards, contracts, missingContracts, orphanContracts } = coverage;
  if (!missingContracts.length && !orphanContracts.length) {
    console.log(`canvas contract coverage: OK (${artboards.length} artboards, ${contracts.length} contracts).`);
    return;
  }

  console.error('canvas contract coverage: FAIL');
  console.error(`  artboards: ${artboards.length}`);
  console.error(`  contracts: ${contracts.length}`);
  if (missingContracts.length) console.error(`  missing contracts: ${missingContracts.join(', ')}`);
  if (orphanContracts.length) console.error(`  orphan contracts: ${orphanContracts.join(', ')}`);
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
