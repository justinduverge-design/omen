#!/usr/bin/env node
/**
 * STANDARDS rule 1 (card F): every script opens with what it does and why it exists.
 * In 2026-10 about one script in four had no header, so a reader (or an agent) had to
 * read the code to learn what it was for. This fails CI on any script under scripts/ or
 * ops/ whose first real line is not a comment.
 *
 * A script is a tracked .js/.mjs/.cjs/.py/.sh file, or an extensionless file starting
 * with "#!". Before the comment it may have a shebang, blank lines, "use strict",
 * `set -…`, `umask` and imports. The --help block card E put directly under the shebang
 * of the ops/ scripts opens with a comment and says what the script does, so it counts.
 */
"use strict";
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const DIRS = ["scripts", "ops"];
const SCRIPT_EXT = /\.(js|mjs|cjs|py|sh)$/;
const PREAMBLE = /^(#!|\s*$|["']use strict["'];?$|set -|umask |import |from \S+ import |const .*require\()/;
const COMMENT = /^\s*(#|\/\/|\/\*|"""|''')/;

function hasHeader(text) {
  const lines = text.split("\n");
  let index = 0;
  while (index < lines.length && PREAMBLE.test(lines[index])) index += 1;
  return COMMENT.test(lines[index] || "");
}

function isScript(file, text) {
  return SCRIPT_EXT.test(file) || (!path.extname(file) && text.startsWith("#!"));
}

function missingHeaders(root = ROOT) {
  const files = execFileSync("git", ["ls-files", "-z", ...DIRS], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  return files.filter((file) => {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    return isScript(file, text) && !hasHeader(text);
  });
}

if (require.main === module) {
  const missing = missingHeaders();
  if (missing.length) {
    for (const file of missing) console.error(`::error file=${file}::no header comment saying what it does and why`);
    console.error(`${missing.length} script(s) lack a header (STANDARDS rule 1).`);
    process.exitCode = 1;
  } else {
    console.log("Every script under scripts/ and ops/ opens with a header.");
  }
}

module.exports = { hasHeader, isScript, missingHeaders };
