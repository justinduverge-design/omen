"use strict";

// B13-HEAL-OUTSIDE-HEARTBEAT: the heartbeat pings from a Pi-only URL file, every 5 minutes, and fails loudly without it.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const DIR = path.join(__dirname, "..", "ops", "command-center");
const SCRIPT = path.join(DIR, "slops-outside-heartbeat");
const src = fs.readFileSync(SCRIPT, "utf8");

test("the ping URL is read from a file on the Pi, never written in the repo", () => {
  assert.doesNotMatch(src.replace(/^#.*$/gm, ""), /https?:\/\//);
  assert.match(src, /url_file=\/etc\/slops-alerting\/outside-heartbeat-url/);
  assert.doesNotMatch(src, /-A |--user-agent|-H /, "the request must carry nothing about us");
});

test("an HTTP error or a hang fails the unit, and the URL never reaches the command line", () => {
  assert.match(src, /curl -K - -fsS --max-time 10 /);
  assert.doesNotMatch(src, /curl [^\n]*"\$\(cat/);
});

test("a missing URL file exits 1 instead of passing quietly", () => {
  const r = spawnSync("sh", [
    "-c",
    src.replace("/etc/slops-alerting/outside-heartbeat-url", "/nonexistent/heartbeat-url"),
  ]);
  assert.equal(r.status, 1);
  assert.match(String(r.stderr), /missing/);
});

test("the timer fires every 5 minutes, matching the monitor's 5-minute period", () => {
  const timer = fs.readFileSync(`${SCRIPT}.timer`, "utf8");
  assert.match(timer, /^OnUnitActiveSec=5min$/m);
  assert.match(
    fs.readFileSync(`${SCRIPT}.service`, "utf8"),
    /^ExecStart=\/usr\/local\/sbin\/slops-outside-heartbeat$/m,
  );
});
