"use strict";

// B13-HEAL-PARTS-LIST: hardware alerts link to the parts list, and the parts list names the alerts it serves.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const DISPATCHER = fs.readFileSync(path.join(ROOT, "ops/command-center/slops-alert-dispatcher"), "utf8");
const PARTS = fs.readFileSync(path.join(ROOT, "ops/pi-fleet/PARTS.md"), "utf8");
const NAMES = ["under-voltage", "ssd-missing", "booted-from-sd"];

// Run the dispatcher's own parts_url and with_parts lines, nothing else from the script.
function withParts(message) {
  const start = DISPATCHER.indexOf("parts_url=");
  const end = DISPATCHER.indexOf("\n}\n", start) + 3;
  return execFileSync("sh", ["-c", `${DISPATCHER.slice(start, end)}with_parts "$1"`, "sh", message], { encoding: "utf8" });
}

for (const name of NAMES) {
  test(`an alert line with ${name} gets the parts link`, () => {
    const out = withParts(`SLOPS ALERT: CRITICAL state change\nresult=WARNING check=steward-${name} reason=x`);
    assert.match(out, /\nParts to buy: https:\/\/github\.com\/.+\/ops\/pi-fleet\/PARTS\.md$/);
  });
}

test("a name in reason text alone does not add the link", () => {
  const msg = "SLOPS ALERT: CRITICAL state change\nresult=DOWN check=steward-unreachable reason=under-voltage-suspected";
  assert.equal(withParts(msg), msg);
});

test("other alerts are sent unchanged", () => {
  const msg = "SLOPS ALERT: CRITICAL state change\nresult=DOWN check=steward-unreachable reason=y";
  assert.equal(withParts(msg), msg);
});

test("the link is added to the message, not the signature", () => {
  assert.match(DISPATCHER, /send "\$\(with_parts "SLOPS ALERT: CRITICAL state change\n\$sig"\)"/);
  assert.match(DISPATCHER, /printf '%s\\n' "\$sig" > "\$state"/);
});

test("the parts list covers every alert name and every Pi", () => {
  for (const name of NAMES) assert.ok(PARTS.includes(`\`${name}\``), name);
  for (const pi of ["Command Center", "Steward", "Sentinel"]) assert.ok(PARTS.includes(pi), pi);
  for (const part of ["Power supply", "SSD", "microSD", "cable"]) assert.ok(PARTS.includes(part), part);
  for (const store of ["Amazon", "Best Buy", "Staples", "Walmart", "Target"]) assert.ok(PARTS.includes(store), store);
});
