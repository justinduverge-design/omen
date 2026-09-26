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
const requirementsFile = path.resolve(ROOT, 'Blueprints/specs/design/canvas-contract-requirements-v1.json');

function screenName(fileName) {
  return fileName
    .replace(/\.dc\.html$/, '')
    .replace(/-v1\.md$/, '');
}

function files(dir, pattern) {
  if (!fs.existsSync(dir)) throw new Error(`directory not found: ${path.relative(ROOT, dir)}`);
  return fs.readdirSync(dir).filter((name) => pattern.test(name)).sort();
}

function duplicateValues(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))].sort();
}

function readRequirements(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed.screens)) throw new Error('requirements screens must be an array');
  return parsed;
}

export function findCoverage({
  canvasDir: canvas = canvasDir,
  contractsDir: contracts = contractsDir,
  requirementsPath = requirementsFile,
} = {}) {
  const artboards = files(canvas, /\.dc\.html$/).map(screenName);
  const contractFiles = files(contracts, /-v1\.md$/);
  const contractsByName = contractFiles.map(screenName);
  const requirements = readRequirements(requirementsPath);
  const requirementIds = requirements.screens.map((screen) => screen.id);
  const artboardSet = new Set(artboards);
  const contractSet = new Set(contractsByName);
  const requirementSet = new Set(requirementIds);
  const journeyMembers = Object.entries(requirements.journeys || {})
    .flatMap(([journey, ids]) => ids.map((id) => ({ id, journey })));
  const journeyIds = journeyMembers.map(({ id }) => id);
  const invalidScreens = requirements.screens
    .filter((screen) => !screen.id || !screen.family || !screen.journey || !screen.scroll
      || !Array.isArray(screen.states) || screen.states.length === 0
      || !Array.isArray(screen.api_contracts))
    .map((screen) => screen.id || '<missing-id>');
  const journeyMismatches = journeyMembers
    .filter(({ id, journey }) => requirements.screens.find((screen) => screen.id === id)?.journey !== journey)
    .map(({ id }) => id);
  return {
    artboards,
    contracts: contractsByName,
    requirementIds,
    missingContracts: artboards.filter((name) => !contractSet.has(name)),
    orphanContracts: contractsByName.filter((name) => !artboardSet.has(name)),
    missingRequirements: artboards.filter((name) => !requirementSet.has(name)),
    orphanRequirements: requirementIds.filter((name) => !artboardSet.has(name)),
    duplicateRequirementIds: duplicateValues(requirementIds),
    duplicateJourneyMemberships: duplicateValues(journeyIds),
    journeyMismatches: [...new Set(journeyMismatches)].sort(),
    invalidScreens,
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

  const {
    artboards, contracts, requirementIds, missingContracts, orphanContracts, missingRequirements,
    orphanRequirements, duplicateRequirementIds, duplicateJourneyMemberships, journeyMismatches,
    invalidScreens,
  } = coverage;
  const findings = [missingContracts, orphanContracts, missingRequirements, orphanRequirements,
    duplicateRequirementIds, duplicateJourneyMemberships, journeyMismatches, invalidScreens];
  if (findings.every((finding) => finding.length === 0)) {
    console.log(`canvas contract coverage: OK (${artboards.length} artboards, ${contracts.length} contracts, ${requirementIds.length} requirement records).`);
    return;
  }

  console.error('canvas contract coverage: FAIL');
  console.error(`  artboards: ${artboards.length}`);
  console.error(`  contracts: ${contracts.length}`);
  if (missingContracts.length) console.error(`  missing contracts: ${missingContracts.join(', ')}`);
  if (orphanContracts.length) console.error(`  orphan contracts: ${orphanContracts.join(', ')}`);
  if (missingRequirements.length) console.error(`  missing requirements: ${missingRequirements.join(', ')}`);
  if (orphanRequirements.length) console.error(`  orphan requirements: ${orphanRequirements.join(', ')}`);
  if (duplicateRequirementIds.length) console.error(`  duplicate requirement ids: ${duplicateRequirementIds.join(', ')}`);
  if (duplicateJourneyMemberships.length) console.error(`  duplicate journey memberships: ${duplicateJourneyMemberships.join(', ')}`);
  if (journeyMismatches.length) console.error(`  journey mismatches: ${journeyMismatches.join(', ')}`);
  if (invalidScreens.length) console.error(`  incomplete screen metadata: ${invalidScreens.join(', ')}`);
  process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
