import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evalsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultConfigPath = path.join(evalsDirectory, 'slops-prompt-guard.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function renderPrompt(template, variables) {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (match, name) => (
    Object.hasOwn(variables, name) ? variables[name] : ''
  ));
}

async function loadConfig(configPath = defaultConfigPath) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));

  assert(config.schema_version === 1, 'unsupported config schema');
  assert(Array.isArray(config.prompts) && config.prompts.length > 0, 'at least one prompt is required');
  assert(Array.isArray(config.cases) && config.cases.length > 0, 'at least one fixture case is required');
  return config;
}

async function loadPrompts(config) {
  return Promise.all(config.prompts.map(async (relativePath) => {
    const absolutePath = path.join(evalsDirectory, relativePath);
    const template = await readFile(absolutePath, 'utf8');
    assert(template.trim().length > 0, `prompt is empty: ${relativePath}`);
    return { relativePath, template };
  }));
}

function evaluateCase(prompt, fixture) {
  renderPrompt(prompt.template, fixture.vars);
  const output = fixture.output;
  const assertions = fixture.assertions;
  let passed = 0;

  for (const expected of assertions.includes) {
    assert(output.toLowerCase().includes(expected.toLowerCase()), `${fixture.name} / ${prompt.relativePath}: missing ${expected}`);
    passed += 1;
  }
  for (const unexpected of assertions.excludes) {
    assert(!output.toLowerCase().includes(unexpected.toLowerCase()), `${fixture.name} / ${prompt.relativePath}: contained ${unexpected}`);
    passed += 1;
  }
  const words = output.trim().split(/\s+/).filter(Boolean).length;
  assert(words >= assertions.minimum_words, `${fixture.name} / ${prompt.relativePath}: expected at least ${assertions.minimum_words} words`);
  return passed + 1;
}

export async function validatePromptGuard(configPath) {
  const config = await loadConfig(configPath);
  const prompts = await loadPrompts(config);
  for (const fixture of config.cases) {
    assert(typeof fixture.name === 'string' && fixture.name.length > 0, 'fixture name is required');
    assert(fixture.vars && fixture.output && fixture.assertions, `${fixture.name}: vars, output, and assertions are required`);
    for (const prompt of prompts) renderPrompt(prompt.template, fixture.vars);
  }
  return { prompts: prompts.length, cases: config.cases.length };
}

export async function runPromptGuard(configPath) {
  const config = await loadConfig(configPath);
  const prompts = await loadPrompts(config);
  let passed = 0;

  for (const fixture of config.cases) {
    for (const prompt of prompts) passed += evaluateCase(prompt, fixture);
  }

  return {
    prompts: prompts.length,
    cases: config.cases.length,
    assertions: passed,
    passed,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const validateOnly = process.argv.includes('--validate');
  const result = validateOnly ? await validatePromptGuard() : await runPromptGuard();
  console.log(`SLOPS Prompt Guard passed: ${result.prompts} prompts, ${result.cases} cases${validateOnly ? '' : `, ${result.passed} assertions`}.`);
}
