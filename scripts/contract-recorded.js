"use strict";

/**
 * Recorded-contract tooling: turns the responses captured by scripts/contract-recorder.js into
 * committed fixtures, and infers a first-draft schema from them.
 *
 *   node scripts/contract-recorded.js record          run the suite with the recorder, write fixtures
 *   node scripts/contract-recorded.js infer <name>    print an inferred draft schema for a contract
 *   node scripts/contract-recorded.js check           re-record into a temp dir and compare to fixtures
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const FIXTURES = path.join(ROOT, "test", "contracts", "fixtures");
const REGISTRY = path.join(ROOT, "test", "contracts", "registry.json");

const registry = () => JSON.parse(fs.readFileSync(REGISTRY, "utf8")).contracts;

// ---- normalization ---------------------------------------------------------------------------
const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const REQ = /(omen_req_|req_)\d{8,}/g;
// /trade/find issues a random 16-hex batch token per response, folded into each id as `{token}.{id}`.
const BATCH_TOKEN = /^[0-9a-f]{16}\.(?=find_)/;
const EPOCH_KEYS = new Set(["uptime", "timestamp", "generated_at", "updated_at", "created_at", "as_of", "observed_at", "fresh_until", "issued_at", "received_at"]);

function normalizeValue(value, key) {
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, normalizeValue(value[k], k)]));
  }
  if (typeof value === "string") {
    return value.replace(ISO, "2026-01-01T00:00:00.000Z").replace(UUID, "00000000-0000-4000-8000-000000000000").replace(REQ, "$1FIXTURE").replace(BATCH_TOKEN, "0000000000000000.");
  }
  if (typeof value === "number" && EPOCH_KEYS.has(key)) return 0;
  return value;
}

function variantKey(record) {
  const b = record.body;
  const state = b.state ?? b.status ?? (b.variant !== undefined ? (b.variant || "ineligible") : undefined);
  return String(typeof state === "string" ? state : record.status).replace(/[^a-zA-Z0-9_.-]/g, "_");
}

const size = (r) => JSON.stringify(r.body).length;

// A structural fingerprint: which keys exist, what type each holds, whether it is null. Array length
// and scalar values are ignored. Two responses with the same fingerprint teach a schema the same
// thing, so only one is kept; responses with different fingerprints (a null where another had a
// value, an absent optional key) each earn a fixture, up to MAX_SHAPES per contract variant.
const crypto = require("node:crypto");
const MAX_SHAPES = 12;
function shapeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return [...new Set(v.map((x) => JSON.stringify(shapeOf(x))))].sort().map((x) => JSON.parse(x));
  if (typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shapeOf(v[k])]));
  return typeof v;
}
const shapeHash = (body) => crypto.createHash("sha1").update(JSON.stringify(shapeOf(body))).digest("hex").slice(0, 8);

/**
 * One example per (contract, variant, status, shape). Among examples with the same shape the richest
 * wins, ties broken by serialized text, so the choice does not depend on test ordering. Per variant
 * at most MAX_SHAPES shapes are kept (lowest hashes), again deterministic.
 */
function contractOf(r) {
  const reg = registry();
  const cv = r.body && r.body.contract_version;
  if (cv && reg[cv]) return cv;
  // Unversioned routes are matched by "METHOD /route" (the registry's `route`).
  const here = `${r.method} ${r.route || r.path}`;
  const hit = Object.entries(reg).find(([, v]) => v.route && v.route === here);
  return hit ? hit[0] : null;
}

function pick(records) {
  const groups = new Map();
  for (const r of records) {
    const cv = contractOf(r);
    if (!cv) continue;
    const candidate = { ...r, body: normalizeValue(r.body) };
    const key = `${cv}\u0000${variantKey(r)}\u0000${r.status}\u0000${shapeHash(candidate.body)}`;
    const current = groups.get(key);
    const better = !current || size(candidate) > size(current)
      || (size(candidate) === size(current) && JSON.stringify(candidate) < JSON.stringify(current));
    if (better) groups.set(key, candidate);
  }
  const byVariant = new Map();
  for (const [k, r] of groups) {
    const [cv, variant, status, hash] = k.split("\u0000");
    const vk = `${cv}\u0000${variant}\u0000${status}`;
    if (!byVariant.has(vk)) byVariant.set(vk, []);
    byVariant.get(vk).push({ contract: cv, variant, record: r, hash });
  }
  const out = [];
  for (const list of byVariant.values()) {
    list.sort((a, b) => a.hash.localeCompare(b.hash));
    list.slice(0, MAX_SHAPES).forEach((entry, i) => out.push({ ...entry, index: list.length > 1 ? i : null }));
  }
  return out;
}

function serialize(v) { return `${JSON.stringify(v, null, 2)}\n`; }

function readRecords(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

function runRecording(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const res = spawnSync("npm", ["test"], {
    cwd: ROOT, encoding: "utf8",
    env: { ...process.env, CONTRACT_RECORD_DIR: dir, NODE_OPTIONS: `--require ${path.join(__dirname, "contract-recorder.js")}` },
    maxBuffer: 1 << 28,
  });
  return res.status === 0;
}

function outputs(dir) {
  const files = new Map();
  // Recorded route responses plus bodies built directly by the pure production builders for states
  // the route tests never reach (contract-synthetic.js).
  const all = [...readRecords(dir), ...require("./contract-synthetic").generate()];
  for (const { contract, variant, record, index } of pick(all)) {
    const statusPart = record.status && !/^\d+$/.test(variant) && record.status !== 200 ? `.${record.status}` : "";
    const name = `${variant}${statusPart}${index == null ? "" : `.shape${index + 1}`}`;
    files.set(path.join(FIXTURES, contract, `${name}.json`), serialize({ http_status: record.status, route: record.route || record.path, body: record.body }));
  }
  return files;
}

/**
 * Committed fixture files that a recording no longer produces (a state or shape vanished). Shared by
 * `check` and `compare`: without it the schema tests keep treating a stale response as covered coverage.
 */
function staleFixtures(producedFiles) {
  const stale = [];
  for (const contract of Object.keys(registry())) {
    const dir = path.join(FIXTURES, contract);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (!producedFiles.has(full)) stale.push(full);
    }
  }
  return stale.sort();
}

// ---- schema inference ------------------------------------------------------------------------
const ENUM_KEYS = new Set(["state", "status", "variant"]);

function typeName(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v === "object" ? "object" : typeof v === "number" ? (Number.isInteger(v) ? "number" : "number") : typeof v;
}

function infer(samples, key = "", depth = 0) {
  const types = [...new Set(samples.map(typeName))].sort();
  // A field only ever observed as null tells us nothing about its real type (a deadline that was
  // never set in any test). Pinning it to null would make the lock forbid ever sending a value.
  const schema = types.length === 1 && types[0] === "null"
    ? { description: "Observed only as null in recorded responses; the real type is not constrained." }
    : { type: types.length === 1 ? types[0] : types };
  const objects = samples.filter((s) => s && typeof s === "object" && !Array.isArray(s));
  if (objects.length) {
    const keys = [...new Set(objects.flatMap(Object.keys))].sort();
    schema.properties = {};
    for (const k of keys) schema.properties[k] = infer(objects.filter((o) => k in o).map((o) => o[k]), k, depth + 1);
    const required = keys.filter((k) => objects.every((o) => k in o));
    if (required.length) schema.required = required;
  }
  const arrays = samples.filter(Array.isArray);
  if (arrays.length) {
    const items = arrays.flat();
    if (items.length) schema.items = infer(items, key, depth + 1);
  }
  const strings = samples.filter((s) => typeof s === "string");
  // Only a TOP-LEVEL state/status/variant is a closed vocabulary. A nested `status` (a player's injury
  // status) is free text and must not be closed over the few values the tests happened to use.
  if (strings.length && depth === 1 && ENUM_KEYS.has(key)) {
    const values = [...new Set(strings)].sort();
    if (values.length <= 12) schema.enum = values.length === samples.length || true ? values : undefined;
  }
  return schema;
}

const OVERRIDES = path.join(ROOT, "test", "contracts", "schema-overrides.json");

/** Completes enums from the server's own constants and pins reviewed corrections (see the file). */
function applyOverrides(name, schema) {
  const all = JSON.parse(fs.readFileSync(OVERRIDES, "utf8")).contracts;
  const rules = all[name] || {};
  for (const [pathSpec, values] of Object.entries(rules)) {
    const parts = pathSpec.split(".");
    let node = schema;
    for (const part of parts) {
      node = part === "*" ? Object.values(node.properties || {})[0] : (node.properties || {})[part];
      if (!node) throw new Error(`override path not found: ${name} ${pathSpec}`);
    }
    if (pathSpec.includes("*")) {
      // apply to every sibling at the wildcard position
      const before = parts.slice(0, parts.indexOf("*"));
      let parent = schema;
      for (const part of before) parent = parent.properties[part];
      for (const child of Object.values(parent.properties)) {
        const leaf = parts.slice(parts.indexOf("*") + 1).reduce((n, part) => n.properties[part], child);
        leaf.enum = values;
      }
    } else {
      node.enum = values;
      if (values.includes(null) && !(Array.isArray(node.type) && node.type.includes("null"))) node.type = ["null", node.type].flat().filter(Boolean);
    }
  }
  return schema;
}

function inferContract(name) {
  const dir = path.join(FIXTURES, name);
  const bodies = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).body);
  const schema = infer(bodies);
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: name,
    title: `${name} (inferred from recorded server responses; review before relying on it)`,
    description: "ADDITIVE ONLY within this version. Extra properties are allowed; removing, renaming or retyping anything listed here is a breaking change and fails the lock.",
    ...schema,
  };
}

module.exports = { staleFixtures, applyOverrides, registry, pick, outputs, runRecording, inferContract, normalizeValue, serialize, FIXTURES };

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === "record") {
    const dir = path.join(os.tmpdir(), "omen-contract-record");
    if (!runRecording(dir)) { console.error("the test suite failed while recording; fixtures not written"); process.exit(1); }
    const out = outputs(dir);
    for (const [file, text] of out) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
    console.log(`wrote ${out.size} recorded fixtures across ${new Set([...out.keys()].map((f) => path.basename(path.dirname(f)))).size} contracts`);
  } else if (cmd === "schemas") {
    const force = process.argv.includes("--force");
    for (const name of Object.keys(registry())) {
      const file = path.join(ROOT, "test", "contracts", "schemas", `${name}.schema.json`);
      if (fs.existsSync(file) && !force) { console.log(`kept ${name}`); continue; }
      fs.writeFileSync(file, `${JSON.stringify(applyOverrides(name, inferContract(name)), null, 2)}\n`);
      console.log(`wrote ${name}`);
    }
  } else if (cmd === "infer") {
    console.log(JSON.stringify(inferContract(process.argv[3]), null, 2));
  } else if (cmd === "compare") {
    // Compare fixtures to a recording made during an ordinary `npm test` run (CI does this so the suite
    // is not run twice): CONTRACT_RECORD_DIR=<dir> NODE_OPTIONS=--require scripts/contract-recorder.js npm test
    const dir = process.argv[3];
    if (!dir || !fs.existsSync(dir)) { console.error("usage: compare <recording dir>"); process.exit(2); }
    let bad = 0;
    const out = outputs(dir);
    for (const [file, text] of out) {
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) { console.error(`fixture out of date or new: ${path.relative(ROOT, file)}`); bad += 1; }
    }
    for (const full of staleFixtures(new Set(out.keys()))) { console.error(`fixture no longer produced: ${path.relative(ROOT, full)}`); bad += 1; }
    console.log(bad ? `${bad} fixture problem(s). Run: node scripts/contract-recorded.js record, and review the diff as an API change.` : `fixtures current (${out.size})`);
    process.exit(bad ? 1 : 0);
  } else if (cmd === "check") {
    const dir = path.join(os.tmpdir(), "omen-contract-record-check");
    if (!runRecording(dir)) { console.error("suite failed while recording"); process.exit(1); }
    let bad = 0;
    const out = outputs(dir);
    for (const [file, text] of out) {
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) { console.error(`fixture out of date or new: ${path.relative(ROOT, file)}`); bad += 1; }
    }
    for (const full of staleFixtures(new Set(out.keys()))) { console.error(`fixture no longer produced: ${path.relative(ROOT, full)}`); bad += 1; }
    process.exit(bad ? 1 : 0);
  } else { console.error("usage: record | schemas | infer <contract> | compare <dir> | check"); process.exit(2); }
}
