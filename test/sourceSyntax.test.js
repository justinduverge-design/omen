"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");

function collectJavaScriptFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith(".js")) return [fullPath];
    return [];
  });
}

test("all backend source files parse as JavaScript", () => {
  const failures = [];

  for (const filePath of collectJavaScriptFiles(srcDir)) {
    const result = spawnSync(process.execPath, ["--check", filePath], {
      encoding: "utf8",
    });

    if (result.status !== 0) {
      failures.push(`${path.relative(root, filePath)}\n${result.stderr || result.stdout}`);
    }
  }

  assert.equal(failures.join("\n\n"), "");
});
