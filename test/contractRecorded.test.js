"use strict";

/**
 * Contract tests for every contract in test/contracts/registry.json (S0).
 *
 * The fixtures come from the real server: recorded from the route tests (scripts/contract-recorder.js)
 * or built by the pure production builders (scripts/contract-synthetic.js). The schemas were inferred
 * from them and reviewed; their `enum`s for `state`/`status` were completed from the server's own
 * constants where the tests do not reach every value.
 *
 * What these prove, per contract: every fixture validates; the schema can REJECT (removing or
 * retyping any required top-level field fails); additive change passes; the lock still holds; and
 * every enum value that has no fixture is named below, not silently untested.
 *
 * What they do NOT prove: that a value the tests never produced is shaped the way the schema says
 * (only fixtures and builders are checked, not live traffic); that required fields are required in
 * every real situation (required = present in every recorded variant, which is a floor, not a proof);
 * or that any client renders it (iOS: OmenContractFixtureTests).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Ajv = require("ajv");
const contracts = require("../scripts/contracts");

const ROOT = path.join(__dirname, "contracts");
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry.json"), "utf8")).contracts;
const ajv = new Ajv({ allErrors: true, strict: false });

const clone = (v) => JSON.parse(JSON.stringify(v));
const fixtureFiles = (name) => fs.readdirSync(path.join(ROOT, "fixtures", name)).filter((f) => f.endsWith(".json")).sort();
const fixtures = (name) => fixtureFiles(name).map((f) => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", name, f), "utf8")) }));

// Enum values that have no fixture, per contract. A new schema enum value without a fixture or an
// entry here fails. Each entry is a real gap, not an exemption.
const UNCOVERED = {
  "start-sit-detail.v1": { state: ["games_started", "incomplete_data"] },
  "start-sit-detail.v2": { state: ["games_started", "incomplete_data"] },
  "waiver-analysis.v1": {},
  "move-detail.v1": {},
};

function enumFields(schema) {
  const out = {};
  for (const [key, prop] of Object.entries(schema.properties || {})) {
    if (prop.enum && (key === "state" || key === "status" || key === "variant")) out[key] = prop.enum;
  }
  return out;
}

// One example value per JSON type, used to retype a field to a type it does NOT declare.
const EXAMPLES = [["string", "x"], ["number", 12345], ["boolean", true], ["object", { x: 1 }], ["array", [1]]];
const declares = (declared, type) => declared.includes(type) || (type === "number" && declared.includes("integer"));

for (const name of Object.keys(registry)) {
  const schema = contracts.readSchema(name);
  const validate = ajv.compile(schema);
  const cases = fixtures(name);
  const explain = () => JSON.stringify(validate.errors, null, 1).slice(0, 500);

  test(`${name}: has fixtures and they carry this contract_version${registry[name].unversioned ? " (none: unversioned route)" : ""}`, () => {
    assert.ok(cases.length >= 1, "no fixtures");
    for (const c of cases) {
      if (registry[name].unversioned) assert.equal(c.body.contract_version, undefined, `${c.file} now sends a contract_version: update the registry`);
      else assert.equal(c.body.contract_version, name, c.file);
    }
  });

  test(`${name}: every fixture validates`, () => {
    for (const c of cases) assert.ok(validate(c.body), `${c.file}: ${explain()}`);
  });

  test(`${name}: the schema can reject (removing or retyping a required field fails)`, () => {
    const required = schema.required || [];
    const sample = cases.find((c) => required.every((k) => k in c.body)) || cases[0];
    for (const key of required) {
      if (key === "contract_version") continue;
      const removed = clone(sample.body);
      delete removed[key];
      assert.equal(validate(removed), false, `removing required "${key}" must fail`);

      const prop = schema.properties[key] || {};
      const declared = Array.isArray(prop.type) ? prop.type : prop.type ? [prop.type] : null;
      if (!declared || declared.includes("null")) continue;
      const wrong = EXAMPLES.find(([t]) => !declares(declared, t));
      if (wrong) {
        const retyped = clone(sample.body);
        retyped[key] = wrong[1];
        assert.equal(validate(retyped), false, `retyping "${key}" (declared ${declared.join("|")}) to ${wrong[0]} must fail`);
      }
    }
  });

  test(`${name}: additive change validates (an unknown extra field)`, () => {
    const body = clone(cases[0].body);
    body.brand_new_field_for_a_future_release = { anything: true };
    assert.ok(validate(body), explain());
  });

  test(`${name}: the lock holds, and the guard catches a removed path`, () => {
    const lock = contracts.readLock(name);
    const now = contracts.flattenSchema(schema);
    assert.deepEqual(contracts.compareToLock(lock, now), []);
    const victim = Object.keys(now).find((k) => !k.startsWith("["));
    if (victim) {
      const broken = clone(now);
      delete broken[victim];
      assert.ok(contracts.compareToLock(lock, broken).length > 0, "removing a path must be reported");
    }
  });

  test(`${name}: every enum value without a fixture is named in this file`, () => {
    const fields = enumFields(schema);
    for (const [field, values] of Object.entries(fields)) {
      const seen = new Set(cases.map((c) => c.body[field] ?? null));
      const missing = values.filter((v) => !seen.has(v)).sort();
      const expected = ((UNCOVERED[name] || {})[field] || []).slice().sort();
      assert.deepEqual(missing, expected, `${name}.${field}: values with no fixture`);
    }
  });
}

test("no fixture contains a credential, cookie value or token (facts-of-record #6)", () => {
  const FORBIDDEN = [/espn_s2\s*[:=]\s*["']?[A-Za-z0-9%]{20,}/i, /swid\s*[:=]\s*["']?\{[0-9A-F-]{36}\}/i, /Bearer\s+[A-Za-z0-9._-]{20,}/, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, /sb_(secret|publishable)_[A-Za-z0-9_-]+/, /sk-[A-Za-z0-9]{20,}/];
  const dir = path.join(ROOT, "fixtures");
  for (const contract of fs.readdirSync(dir)) {
    for (const file of fs.readdirSync(path.join(dir, contract))) {
      const text = fs.readFileSync(path.join(dir, contract, file), "utf8");
      for (const pattern of FORBIDDEN) assert.equal(pattern.test(text), false, `${contract}/${file} matches ${pattern}`);
    }
  }
});

test("the registry and the requirements file agree (known differences are documented)", () => {
  const req = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Blueprints", "specs", "design", "canvas-contract-requirements-v1.json"), "utf8"));
  const required = new Set(req.screens.flatMap((s) => s.api_contracts));
  // Differences that are real and recorded, not silently tolerated:
  //  - active-league.v1: the server sends league-active-selection.v1 (registry note).
  //  - espn-connect.v1 is in the registry as an unversioned route.
  //  - omen-decision-brief.v3 is protected by test/contractSchemas.test.js.
  //  - trade-capabilities/trade-share etc. are in the registry.
  const known = new Set(["active-league.v1", "omen-decision-brief.v3"]);
  const missing = [...required].filter((c) => !registry[c] && !known.has(c)).sort();
  assert.deepEqual(missing, [], "a contract the screens depend on has no S0 protection");
});
