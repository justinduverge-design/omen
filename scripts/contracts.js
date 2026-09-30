#!/usr/bin/env node
"use strict";

/**
 * API contract tooling — S0 of the Omen-call slice (Blueprints/rebuild/omen-call-slice-plan.md).
 *
 *   node scripts/contracts.js fixtures   regenerate golden fixtures from the real server builders
 *   node scripts/contracts.js lock       regenerate the lock from the schemas (a deliberate act)
 *   node scripts/contracts.js check      fail if committed fixtures/lock differ from the code
 *
 * The rule this enforces (Blueprints/specs/omen-decision-engine-v2.md, "Keeping the API from
 * breaking again"): a public contract is ADDITIVE ONLY within a version. The lock records every
 * path in every schema with its type, whether it is required, and its allowed values. A change
 * that removes a path, retypes it, makes a required path optional, or removes an allowed value is
 * a break and fails the tests; a new optional path or a new allowed value is not a break.
 */

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "contract-fixture-key";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "test", "contracts");
const SCHEMA_DIR = path.join(ROOT, "schemas");
const LOCK_DIR = path.join(ROOT, "lock");
const FIXTURE_DIR = path.join(ROOT, "fixtures");

const FIXED = Object.freeze({ request_id: "omen_req_FIXTURE", generated_at: "2026-01-01T00:00:00.000Z" });

// Every state the mock builder can produce for the Omen brief. A state the builder can reach and
// that has no fixture is a gap, so the list is explicit rather than discovered.
// The mock builder cannot produce every state: asking it for yahoo_reauth_required, pending_live_engine
// or sleeper_league_context_missing returns a `success` body. A fixture whose body state differs from
// its name would overclaim coverage, so those are NOT listed here and are tracked as gaps in
// test/contractSchemas.test.js until a live harness can produce them.
const BRIEF_STATES = Object.freeze([
  "success", "empty", "off_season", "platform_disconnected", "espn_reauth_required", "error",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  }
  return value;
}

// Volatile fields are replaced with fixed values of the SAME TYPE, so a fixture stays diffable
// and still proves the type.
function normalize(body) {
  const out = JSON.parse(JSON.stringify(body));
  if (typeof out.request_id === "string") out.request_id = FIXED.request_id;
  if (typeof out.generated_at === "string") out.generated_at = FIXED.generated_at;
  for (const c of out.capabilities || []) {
    if (typeof c.observed_at === "string") c.observed_at = FIXED.generated_at;
    if (typeof c.fresh_until === "string") c.fresh_until = FIXED.generated_at;
  }
  return stable(out);
}

function generateBriefV3Fixtures() {
  const { buildOmenMvpMoveResponse } = require("../src/services/omen");
  const { decisionBriefV3 } = require("../src/services/decisionBriefV2");
  const out = {};
  for (const state of BRIEF_STATES) {
    const built = buildOmenMvpMoveResponse({ use_mock_data: true, mock_state: state });
    const body = normalize(decisionBriefV3(built.body));
    if (body.state !== state) {
      throw new Error(`mock builder returned state "${body.state}" for "${state}"; a fixture must be what its name says`);
    }
    out[state] = { http_status: built.status, body };
  }
  return out;
}

function fixtureFile(contract, state) {
  return path.join(FIXTURE_DIR, contract, `${state}.json`);
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeFixtures() {
  const fixtures = generateBriefV3Fixtures();
  fs.mkdirSync(path.join(FIXTURE_DIR, "omen-decision-brief.v3"), { recursive: true });
  for (const [state, fx] of Object.entries(fixtures)) {
    fs.writeFileSync(fixtureFile("omen-decision-brief.v3", state), serialize(fx));
  }
  return Object.keys(fixtures);
}

/**
 * Flattens a schema into the entries the lock records. `$ref` is resolved, and the `then` branch of
 * a conditional is recorded under the condition it depends on (`[state=success]`), because "the
 * recommendation is required when the state is success" is exactly what a screen relies on.
 */
function flattenSchema(schema) {
  const entries = {};
  const defs = schema.definitions || {};
  const seen = new Set();

  const resolve = (node) => {
    if (node && node.$ref) {
      const name = node.$ref.replace("#/definitions/", "");
      return { name, node: defs[name] };
    }
    return { name: null, node };
  };

  const typeOf = (node) => {
    if (!node) return "any";
    if (node.const !== undefined) return `const:${JSON.stringify(node.const)}`;
    if (node.enum) return "enum";
    if (node.oneOf) return node.oneOf.map((n) => typeOf(resolve(n).node)).sort().join("|");
    const t = node.type;
    return Array.isArray(t) ? [...t].sort().join("|") : t || (node.properties ? "object" : "any");
  };

  const record = (p, node, required, condition) => {
    const key = condition ? `[${condition}]${p}` : p;
    entries[key] = {
      type: typeOf(node),
      required,
      ...(node && node.enum ? { values: [...node.enum].map((v) => JSON.stringify(v)).sort() } : {}),
    };
  };

  const walk = (rawNode, p, required, condition, guard = "") => {
    const { name, node } = resolve(rawNode);
    if (!node) return;
    const cycleKey = `${guard}|${p}|${name}`;
    if (name && seen.has(cycleKey)) return;
    if (name) seen.add(cycleKey);
    if (p) record(p, node, required, condition);

    const reqSet = new Set(node.required || []);
    for (const [prop, sub] of Object.entries(node.properties || {})) {
      walk(sub, p ? `${p}.${prop}` : prop, reqSet.has(prop), condition, guard);
    }
    if (node.items) walk(node.items, `${p}[]`, true, condition, guard);
    if (node.additionalProperties && typeof node.additionalProperties === "object") {
      walk(node.additionalProperties, `${p}.*`, false, condition, guard);
    }
    for (const branch of node.oneOf || []) {
      const b = resolve(branch).node;
      if (b && b.type !== "null") walk(branch, p, required, condition, guard);
    }
    for (const rule of node.allOf || []) {
      const cond = rule.if && rule.if.properties
        ? Object.entries(rule.if.properties).map(([k, v]) => (v.const !== undefined ? `${k}=${v.const}` : v.enum ? `${k}=${v.enum.join("|")}` : `${k}:${v.type}`)).join(",")
        : null;
      if (rule.then) {
        const thenNode = rule.then;
        for (const req of thenNode.required || []) {
          const full = p ? `${p}.${req}` : req;
          entries[`[${cond}]${full}`] = { type: "conditional-required", required: true };
        }
        for (const [prop, sub] of Object.entries(thenNode.properties || {})) {
          const subPath = p ? `${p}.${prop}` : prop;
          const subResolved = resolve(sub).node || {};
          for (const req of subResolved.required || []) {
            entries[`[${cond}]${subPath}.${req}`] = { type: "conditional-required", required: true };
          }
          for (const [inner, innerNode] of Object.entries(subResolved.properties || {})) {
            for (const req of (resolve(innerNode).node || {}).required || []) {
              entries[`[${cond}]${subPath}.${inner}.${req}`] = { type: "conditional-required", required: true };
            }
          }
        }
      } else if (rule.if === undefined) {
        walk(rule, p, required, condition, guard);
      }
    }
  };

  walk(schema, "", true, null);
  return stable(entries);
}

/**
 * Compares the current schema's entries to the committed lock. Returns the list of BREAKS:
 * removed paths, retyped paths, a required path made optional, allowed values removed.
 * Additions are not breaks.
 */
function compareToLock(lockEntries, currentEntries) {
  const breaks = [];
  for (const [key, was] of Object.entries(lockEntries)) {
    const now = currentEntries[key];
    if (!now) { breaks.push(`removed: ${key}`); continue; }
    if (now.type !== was.type) breaks.push(`retyped: ${key} (${was.type} -> ${now.type})`);
    if (was.required && !now.required) breaks.push(`no longer required: ${key}`);
    for (const value of was.values || []) {
      if (!(now.values || []).includes(value)) breaks.push(`value removed: ${key} ${value}`);
    }
  }
  return breaks;
}

/** Every contract under S0 protection: the brief (built here) plus everything in registry.json. */
function allContracts() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry.json"), "utf8")).contracts;
  return ["omen-decision-brief.v3", ...Object.keys(registry)].filter((v, i, a) => a.indexOf(v) === i).sort();
}

function readSchema(contract) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, `${contract}.schema.json`), "utf8"));
}

function lockFile(contract) {
  return path.join(LOCK_DIR, `${contract}.lock.json`);
}

/**
 * Writes or UPDATES a lock. A lock that already exists is a baseline: this refuses to touch it if the
 * schema now breaks it (removal, retype, loosening, removed value) unless --accept-breaking is
 * passed, and otherwise only ADDS the new paths, never rewriting an existing entry. Regenerating a
 * baseline to make a failing test pass is the act the lock exists to prevent.
 */
function writeLock(contract, { acceptBreaking = false } = {}) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  const current = flattenSchema(readSchema(contract));
  let entries = current;
  if (fs.existsSync(lockFile(contract)) && !acceptBreaking) {
    const baseline = readLock(contract);
    const breaks = compareToLock(baseline, current);
    if (breaks.length) {
      throw new Error(`${contract}: the schema BREAKS its lock:\n  ${breaks.join("\n  ")}\nA breaking change needs a new contract version. (--accept-breaking overrides, and should be rare and reviewed.)`);
    }
    entries = stable({ ...current, ...baseline });
  }
  fs.writeFileSync(lockFile(contract), serialize({ contract, note: "Generated by scripts/contracts.js lock. Regenerating this file to make a test pass is the act it exists to prevent: a removal, retype or loosening here is a breaking change and needs a new contract version.", entries }));
  return Object.keys(entries).length;
}

function readLock(contract) {
  return JSON.parse(fs.readFileSync(lockFile(contract), "utf8")).entries;
}

module.exports = {
  BRIEF_STATES, generateBriefV3Fixtures, writeFixtures, fixtureFile, flattenSchema, compareToLock,
  readSchema, writeLock, readLock, normalize, serialize, allContracts, ROOT,
};

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === "fixtures") {
    console.log(`wrote fixtures: ${writeFixtures().join(", ")}`);
  } else if (cmd === "lock") {
    const acceptBreaking = process.argv.includes("--accept-breaking");
    for (const name of allContracts()) {
      try { console.log(`${name}: lock with ${writeLock(name, { acceptBreaking })} entries`); }
      catch (err) { console.error(err.message); process.exit(1); }
    }
  } else if (cmd === "check") {
    let bad = 0;
    const fresh = generateBriefV3Fixtures();
    for (const [state, fx] of Object.entries(fresh)) {
      const file = fixtureFile("omen-decision-brief.v3", state);
      const committed = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
      if (committed !== serialize(fx)) { console.error(`fixture out of date: ${state}`); bad += 1; }
    }
    for (const name of allContracts()) {
      const breaks = compareToLock(readLock(name), flattenSchema(readSchema(name)));
      for (const b of breaks) { console.error(`BREAKING ${name}: ${b}`); bad += 1; }
    }
    process.exit(bad ? 1 : 0);
  } else {
    console.error("usage: node scripts/contracts.js fixtures|lock|check");
    process.exit(2);
  }
}
