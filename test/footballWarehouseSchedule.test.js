"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");

const DIR = path.join(__dirname, "..", "infra", "warehouse", "schedule");
const seasonOn = (today) => execFileSync("sh", [path.join(DIR, "omen-warehouse-run-current-season"), "--print-season"],
  { env: { ...process.env, OMEN_WAREHOUSE_TODAY: today } }).toString().trim();

test("the daily ingest picks the NFL season: September on is new, January through August is last season", () => {
  assert.equal(seasonOn("2026-10-09"), "2026");
  assert.equal(seasonOn("2026-09-01"), "2026");
  assert.equal(seasonOn("2027-02-08"), "2026", "playoffs belong to the season that started in September");
  assert.equal(seasonOn("2027-08-31"), "2026", "off-season re-reads last season");
});

test("the daily ingest runs the release-pinned image, never recreates the database, and alerts on failure", () => {
  const run = fs.readFileSync(path.join(DIR, "omen-warehouse-run-current-season"), "utf8");
  assert.match(run, /--no-deps/);
  assert.match(run, /omen-warehouse-ingest@sha256:\?{64}\)/, "only a digest-pinned worker image is accepted");
  assert.match(run, /ingest --season "\$season"/);
  const service = fs.readFileSync(path.join(DIR, "omen-warehouse-ingest.service"), "utf8");
  assert.match(service, /OnFailure=omen-warehouse-alert@%n\.service/);
  const timer = fs.readFileSync(path.join(DIR, "omen-warehouse-ingest.timer"), "utf8");
  assert.match(timer, /OnCalendar=\*-\*-\* 11:15:00 UTC/);
  assert.match(timer, /Persistent=true/);
});

test("the failure alert never prints the webhook and sends no job output", () => {
  const alert = fs.readFileSync(path.join(DIR, "omen-warehouse-alert"), "utf8");
  assert.doesNotMatch(alert, /echo[^\n]*webhook_file\)/);
  assert.doesNotMatch(alert, /journalctl -u [^"]*\|/, "no log content is piped into the message");
  assert.match(alert, /--data-binary @- "\$\(cat "\$webhook_file"\)"/);
});
