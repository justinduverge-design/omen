"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const acorn = require("acorn");

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

// A literal backslash-n in a line comment parses fine but swallows the code after it:
// `// note.\n    await work();` never runs `work()`. This hid the season-accolade update in the
// retired League Office worker and an ESPN actuals fix in #466. `node --check` cannot see it.
// acorn reports every comment exactly, so strings, templates and regex literals cannot fool it.
// A comment is flagged when turning its `\n` into a real newline leaves code that still parses:
// hidden code does, prose that merely mentions `\n` ("ends with \n here") does not.
function parseJavaScript(source, onComment) {
  const options = { ecmaVersion: "latest", allowHashBang: true, locations: true, onComment };
  try {
    return acorn.parse(source, { ...options, sourceType: "script" });
  } catch {
    if (Array.isArray(onComment)) onComment.length = 0;
    return acorn.parse(source, { ...options, sourceType: "module" });
  }
}

function parses(source) {
  try {
    parseJavaScript(source);
    return true;
  } catch {
    return false;
  }
}

function literalNewlinesInLineComments(source) {
  const comments = [];
  parseJavaScript(source, comments);
  return comments
    .filter((c) => c.type === "Line" && /\\n\s*\S/.test(c.value))
    .filter((c) => {
      const comment = source.slice(c.start, c.end);
      const unfolded = source.slice(0, c.start) + comment.replace(/\\n/g, "\n") + source.slice(c.end);
      return parses(unfolded);
    })
    .map((c) => ({ line: c.loc.start.line, comment: `//${c.value}`.trim() }));
}

test("no line comment contains a literal \\n that swallows the code after it", () => {
  const failures = [];
  for (const filePath of collectJavaScriptFiles(srcDir)) {
    for (const hit of literalNewlinesInLineComments(fs.readFileSync(filePath, "utf8"))) {
      failures.push(`${path.relative(root, filePath)}:${hit.line}  ${hit.comment}`);
    }
  }
  assert.equal(failures.join("\n"), "");
});

test("the literal-\\n guard catches the shape it exists for and ignores strings", () => {
  const bad = "async function f() {\n  // note.\\n  await work();\n}\n";
  assert.deepEqual(literalNewlinesInLineComments(bad).map((h) => h.line), [2]);

  // One space of indentation, or none, is enough to hide the code (Codex P3 on #515).
  assert.deepEqual(literalNewlinesInLineComments("// note.\\n work();\n").map((h) => h.line), [1]);
  assert.deepEqual(literalNewlinesInLineComments("// note.\\nwork();\n").map((h) => h.line), [1]);

  // A regex whose quote could open a fake string must not hide a later comment (Codex P2 on #515).
  for (const lead of ["function q() { return /['\"]/; }", "if (ok) /[\"]/.test(value);"]) {
    const src = `${lead}\n// note.\\n  work();\n`;
    assert.deepEqual(literalNewlinesInLineComments(src).map((h) => h.line), [2], lead);
  }

  const fine = [
    'const a = "line one\\n  line two";',
    "const b = 'x\\n  y'; // trailing comment",
    "const c = `tpl ${\"\\n  z\"} // not a comment \\n  q`;",
    "const d = /\\/\\/ x\\n  y/.test(s);",
    "/* block \\n  text */",
    "// a comment that mentions \\n at the end\\n",
  ].join("\n");
  assert.deepEqual(literalNewlinesInLineComments(fine), []);
});
