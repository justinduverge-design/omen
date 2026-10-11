"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "infra");
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");

test("the warehouse backup is chained to a successful ingest, and the ingest follows the New York clock", () => {
  const service = read("warehouse", "schedule", "omen-warehouse-ingest.service");
  const timer = read("warehouse", "schedule", "omen-warehouse-ingest.timer");
  assert.match(service, /^OnSuccess=omen-warehouse-backup\.service$/m);
  assert.match(service, /^OnFailure=omen-warehouse-alert@%n\.service$/m);
  assert.match(timer, /^OnCalendar=\*-\*-\* 07:15:00 America\/New_York$/m);
});

test("the weekly maintenance window is Friday, staggered, reboots only when required, and is verified", () => {
  const timer = read("schedule", "maintenance", "omen-maintenance.timer");
  const script = read("schedule", "maintenance", "omen-maintenance");
  const verify = read("schedule", "maintenance", "omen-maintenance-verify");
  assert.match(timer, /^OnCalendar=Fri \*-\*-\* @SLOT@:00 UTC$/m);
  assert.match(script, /\[ -f \/var\/run\/reboot-required \]/);
  assert.match(script, /BUSY_UNITS/);
  assert.match(script, /systemctl reboot/);
  assert.doesNotMatch(script, /reboot -f|shutdown/);
  assert.match(verify, /reboot-requested/);
  assert.match(verify, /docker ps -a --filter status=exited/);
  assert.match(read("schedule", "TIMERS.md"), /Friday 06:00 UTC/);
});
