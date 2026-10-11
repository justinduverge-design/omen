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
  assert.match(timer, /OnCalendar=\*-\*-\* 07:15:00 America\/New_York/);
  assert.match(timer, /Persistent=true/);
});

function runAlert(arg, urlFileContents) {
  const os = require("node:os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kuma-"));
  const calls = path.join(dir, "calls");
  fs.writeFileSync(path.join(dir, "curl"), `#!/bin/sh\nprintf '%s\\n' "$@" >> "${calls}"\n`, { mode: 0o755 });
  const urlFile = path.join(dir, "url");
  if (urlFileContents != null) fs.writeFileSync(urlFile, urlFileContents);
  const script = fs.readFileSync(path.join(DIR, "omen-warehouse-alert"), "utf8").replace("/etc/omen-warehouse/kuma-push-url", urlFile);
  fs.writeFileSync(path.join(dir, "alert"), script, { mode: 0o755 });
  const out = execFileSync("sh", [path.join(dir, "alert"), arg], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}` }, stdio: ["ignore", "pipe", "pipe"] }).toString();
  return { out, calls: fs.existsSync(calls) ? fs.readFileSync(calls, "utf8") : "" };
}

test("success and failure report to the Kuma push monitor; the push URL is never printed", () => {
  const url = "http://100.98.81.0:3001/api/push/TOKEN123?status=up&msg=OK&ping=\n";
  const up = runAlert("up", url);
  assert.match(up.calls, /http:\/\/100\.98\.81\.0:3001\/api\/push\/TOKEN123\?status=up&msg=ingest%20succeeded/);
  assert.equal(up.out.includes("TOKEN123"), false);
  const down = runAlert("omen-warehouse-ingest.service", url);
  assert.match(down.calls, /\/api\/push\/TOKEN123\?status=down&msg=warehouse%20ingest%20failed/);
  assert.equal(runAlert("up", null).calls, "", "no URL file: nothing sent, no failure");
  assert.equal(runAlert("up", "https://example.com/not-kuma").calls, "", "a non-push URL is refused");
});

test("a good ingest is never failed by the heartbeat", () => {
  const run = fs.readFileSync(path.join(DIR, "omen-warehouse-run-current-season"), "utf8");
  assert.match(run, /\/usr\/local\/sbin\/omen-warehouse-alert up \|\| true/);
  assert.doesNotMatch(run, /exec docker compose/, "the heartbeat must run after compose returns");
});
