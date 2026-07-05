"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

test("login page uses the transparent Omen lockup asset", () => {
  const login = read("frontend", "src", "pages", "Login.jsx");

  assert.match(login, /src="\/omen-horizontal-lockup-transparent\.png"/);
  assert.match(login, /alt="Omen"/);
  assert.doesNotMatch(login, /<p[^>]+>\s*OMEN\s*<\/p>/);
});
