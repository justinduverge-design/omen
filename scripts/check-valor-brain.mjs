#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const PROFILE = 'valor-brain/v1';
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'Archive', 'archive', 'graphify-out',
  'dist', 'build', 'coverage', '.next', 'screenshots', 'fixtures',
]);

const error = (path, code, message) => ({ path, code, message });

function scalar(value, lineNumber) {
  const text = value.trim();
  if (text === '[]') return [];
  if (text === '{}') return {};
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return Number(text);
  if (text.startsWith('"') && text.endsWith('"')) {
    try { return JSON.parse(text); } catch { throw new Error(`line ${lineNumber}: invalid quoted string`); }
  }
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1).replace(/''/g, "'");
  return text;
}

export function parseFrontmatterYaml(source) {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error('frontmatter must begin on the first line');
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('frontmatter closing marker is missing');

  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  const tokens = raw.split('\n').flatMap((line, index) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return [];
    if (/\t/.test(line)) throw new Error(`line ${index + 2}: tabs are not allowed`);
    const indent = line.length - line.trimStart().length;
    if (indent % 2 !== 0) throw new Error(`line ${index + 2}: indentation must use two-space steps`);
    return [{ indent, text: line.trim(), line: index + 2 }];
  });

  function parseBlock(start, indent) {
    if (start >= tokens.length || tokens[start].indent < indent) return { value: {}, next: start };
    const sequence = tokens[start].indent === indent && tokens[start].text.startsWith('- ');
    const value = sequence ? [] : {};
    let cursor = start;

    while (cursor < tokens.length) {
      const token = tokens[cursor];
      if (token.indent < indent) break;
      if (token.indent > indent) throw new Error(`line ${token.line}: unexpected indentation`);

      if (sequence) {
        if (!token.text.startsWith('- ')) throw new Error(`line ${token.line}: mixed mapping and sequence`);
        const item = token.text.slice(2).trim();
        if (!item) throw new Error(`line ${token.line}: nested sequence items are not supported in v1`);
        value.push(scalar(item, token.line));
        cursor += 1;
        continue;
      }

      if (token.text.startsWith('- ')) throw new Error(`line ${token.line}: mixed sequence and mapping`);
      const separator = token.text.indexOf(':');
      if (separator <= 0) throw new Error(`line ${token.line}: expected key: value`);
      const key = token.text.slice(0, separator).trim();
      const rest = token.text.slice(separator + 1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`line ${token.line}: invalid key ${key}`);
      if (Object.hasOwn(value, key)) throw new Error(`line ${token.line}: duplicate key ${key}`);

      if (rest) {
        value[key] = scalar(rest, token.line);
        cursor += 1;
        continue;
      }

      const next = tokens[cursor + 1];
      if (!next || next.indent <= indent) throw new Error(`line ${token.line}: ${key} requires a nested value`);
      const nested = parseBlock(cursor + 1, next.indent);
      value[key] = nested.value;
      cursor = nested.next;
    }

    return { value, next: cursor };
  }

  const parsed = parseBlock(0, tokens[0]?.indent ?? 0);
  if (parsed.next !== tokens.length) throw new Error(`line ${tokens[parsed.next].line}: unparsed metadata`);
  return { metadata: parsed.value, body, raw };
}

function actualType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value === 'object' ? 'object' : typeof value;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateAgainstSchema(value, schema, path = '$') {
  const errors = [];
  const add = (code, message, at = path) => errors.push(error(at, code, message));
  const type = actualType(value);

  if (schema.type && type !== schema.type) {
    add('type', `expected ${schema.type}, received ${type}`);
    return errors;
  }
  if (schema.const !== undefined && !sameValue(value, schema.const)) add('const', `must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some(candidate => sameValue(value, candidate))) add('enum', `must be one of ${schema.enum.join(', ')}`);

  if (type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) add('minLength', `must contain at least ${schema.minLength} character(s)`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) add('pattern', `must match ${schema.pattern}`);
    if (schema.format === 'date') {
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
      if (!valid) add('format', 'must be an ISO calendar date (YYYY-MM-DD)');
    }
  }

  if (type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) add('minItems', `must contain at least ${schema.minItems} item(s)`);
    if (schema.uniqueItems) {
      const unique = new Set(value.map(item => JSON.stringify(item)));
      if (unique.size !== value.length) add('uniqueItems', 'must not contain duplicates');
    }
    if (schema.items) value.forEach((item, index) => errors.push(...validateAgainstSchema(item, schema.items, `${path}[${index}]`)));
  }

  if (type === 'object') {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) add('minProperties', `must contain at least ${schema.minProperties} property`);
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(error(`${path}.${required}`, 'required', 'is required'));
    }

    const properties = schema.properties ?? {};
    const patterns = Object.entries(schema.patternProperties ?? {}).map(([pattern, rule]) => [new RegExp(pattern), rule]);
    for (const key of keys) {
      const rules = [];
      if (properties[key]) rules.push(properties[key]);
      for (const [pattern, rule] of patterns) if (pattern.test(key)) rules.push(rule);
      if (!rules.length && schema.additionalProperties === false) {
        errors.push(error(`${path}.${key}`, 'additionalProperties', 'is not allowed'));
        continue;
      }
      for (const rule of rules) errors.push(...validateAgainstSchema(value[key], rule, `${path}.${key}`));
    }
  }

  return errors;
}

export async function loadSchema(pathOrUrl) {
  const source = await readFile(pathOrUrl, 'utf8');
  return JSON.parse(source);
}

function bodyErrors(body) {
  const errors = [];
  const h1 = body.match(/^# .+$/gm) ?? [];
  if (h1.length !== 1) errors.push(error('$body', 'h1-count', 'must contain exactly one H1'));
  if (!/^## Compiled truth\s*$/m.test(body)) errors.push(error('$body', 'missing-compiled-truth', 'must contain ## Compiled truth'));
  if (!/^## Append-only timeline\s*$/m.test(body)) {
    errors.push(error('$body', 'missing-append-only-timeline', 'must contain ## Append-only timeline'));
  } else if (!/^- \*\*\d{4}-\d{2}-\d{2}:\*\*/m.test(body)) {
    errors.push(error('$body', 'missing-timeline-entry', 'append-only timeline must contain a dated entry'));
  }
  return errors;
}

function optsIn(source) {
  const head = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!head.startsWith('---\n')) return false;
  const end = head.indexOf('\n---\n', 4);
  if (end < 0) return false;
  return /^metadata_profile:\s*['"]?valor-brain\/v1['"]?\s*$/m.test(head.slice(4, end));
}

export async function validateValorBrainFile(file, schema) {
  const source = await readFile(file, 'utf8');
  if (!optsIn(source)) return { optedIn: false, metadata: null, errors: [] };

  try {
    const parsed = parseFrontmatterYaml(source);
    return {
      optedIn: true,
      metadata: parsed.metadata,
      errors: [...validateAgainstSchema(parsed.metadata, schema), ...bodyErrors(parsed.body)],
    };
  } catch (cause) {
    return { optedIn: true, metadata: null, errors: [error('$', 'parse', cause.message)] };
  }
}

async function markdownFiles(root, out = []) {
  let entries = [];
  try { entries = await readdir(root, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await markdownFiles(full, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

export async function scanValorBrainTree(root, options = {}) {
  const resolvedRoot = resolve(root);
  const schemaPath = options.schemaPath ?? join(resolvedRoot, 'Blueprints', 'specs', 'valor-brain-page.schema.json');
  const schema = await loadSchema(schemaPath);
  const files = (await markdownFiles(resolvedRoot)).sort();
  const records = [];
  const pageIds = new Map();
  const failures = [];

  for (const file of files) {
    const result = await validateValorBrainFile(file, schema);
    if (!result.optedIn) continue;
    const record = {
      path: relative(resolvedRoot, file).replaceAll('\\', '/'),
      metadata: result.metadata,
      errors: [...result.errors],
    };
    records.push(record);

    const pageId = result.metadata?.page_id;
    if (!pageId) continue;
    const matches = pageIds.get(pageId) ?? [];
    matches.push(record);
    pageIds.set(pageId, matches);
  }

  for (const [pageId, matches] of pageIds) {
    if (matches.length < 2) continue;
    const paths = matches.map(match => match.path).join(', ');
    for (const match of matches) {
      match.errors.push(error('$.page_id', 'duplicate-page-id', `page_id ${pageId} is also declared in: ${paths}`));
    }
  }

  for (const record of records) {
    if (record.errors.length) failures.push({ path: record.path, errors: record.errors });
  }

  return {
    profile: PROFILE,
    scanned: records.length,
    valid: records.length - failures.length,
    invalid: failures.length,
    files: failures,
  };
}

async function runCli() {
  const root = resolve(process.argv.find(arg => arg.startsWith('--root='))?.slice(7) ?? '.');
  const schemaPath = process.argv.find(arg => arg.startsWith('--schema='))?.slice(9);
  const json = process.argv.includes('--json');
  const result = await scanValorBrainTree(root, { schemaPath });

  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    for (const file of result.files) {
      console.log(`INVALID ${file.path}`);
      for (const issue of file.errors) console.log(`  ${issue.path} [${issue.code}] ${issue.message}`);
    }
    console.log(`Valor Brain ${result.profile}: ${result.valid}/${result.scanned} valid, ${result.invalid} invalid`);
  }
  process.exitCode = result.invalid ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli().catch(cause => {
    console.error(`Valor Brain validator failed: ${cause.message}`);
    process.exitCode = 2;
  });
}
