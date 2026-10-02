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

// A literal backslash-n in a line comment parses fine but swallows the code after it:
// `// note.\n    await work();` never runs `work()`. This hid the season-accolade update in the
// retired League Office worker and an ESPN actuals fix in #466. `node --check` cannot see it.
// Outside strings, `\n` in code is already a syntax error, so line comments are the only gap.
const REGEX_KEYWORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "instanceof", "yield", "await"]);

function literalNewlinesInLineComments(source) {
  const hits = [];
  let i = 0;
  let line = 1;
  let prev = ""; // last significant code character, to tell regex literals from division
  const templateDepth = []; // brace depth at each `${` so `}` can resume the template
  let braceDepth = 0;

  const skipQuoted = (quote) => {
    i += 1;
    while (i < source.length && source[i] !== quote) {
      if (source[i] === "\\") i += 1;
      else if (source[i] === "\n") line += 1;
      i += 1;
    }
    i += 1;
  };
  const skipTemplate = () => {
    while (i < source.length) {
      const ch = source[i];
      if (ch === "\\") { i += 2; continue; }
      if (ch === "\n") line += 1;
      if (ch === "`") { i += 1; return; }
      if (ch === "$" && source[i + 1] === "{") {
        i += 2;
        templateDepth.push(braceDepth);
        braceDepth += 1;
        return;
      }
      i += 1;
    }
  };

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "\n") { line += 1; i += 1; continue; }
    if (/\s/.test(ch)) { i += 1; continue; }
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const comment = source.slice(i, end === -1 ? source.length : end);
      if (/\\n(?: {2,}|\t)\S/.test(comment)) hits.push({ line, comment: comment.trim() });
      i = end === -1 ? source.length : end;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const block = source.slice(i, end === -1 ? source.length : end + 2);
      line += (block.match(/\n/g) || []).length;
      i += block.length;
      continue;
    }
    if (ch === "'" || ch === '"') { skipQuoted(ch); prev = "a"; continue; }
    if (ch === "`") { i += 1; skipTemplate(); prev = "a"; continue; }
    const prevWord = /[\w$]+$/.exec(source.slice(Math.max(0, i - 12), i).trimEnd())?.[0];
    const afterKeyword = /[\w$]/.test(prev) && REGEX_KEYWORDS.has(prevWord);
    if (ch === "/" && (prev === "" || afterKeyword || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev))) {
      // Regex literal.
      i += 1;
      let inClass = false;
      while (i < source.length && source[i] !== "\n") {
        if (source[i] === "\\") i += 1;
        else if (source[i] === "[") inClass = true;
        else if (source[i] === "]") inClass = false;
        else if (source[i] === "/" && !inClass) break;
        i += 1;
      }
      i += 1;
      prev = "a";
      continue;
    }
    if (ch === "{") braceDepth += 1;
    if (ch === "}") {
      braceDepth -= 1;
      if (templateDepth.length && templateDepth[templateDepth.length - 1] === braceDepth) {
        templateDepth.pop();
        i += 1;
        skipTemplate();
        prev = "a";
        continue;
      }
    }
    prev = ch;
    i += 1;
  }
  return hits;
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

  const fine = [
    'const a = "line one\\n  line two";',
    "const b = 'x\\n  y'; // trailing comment",
    "const c = `tpl ${\"\\n  z\"} // not a comment \\n  q`;",
    "const d = /\\/\\/ x\\n  y/.test(s);",
    "function q() { return /['\"]/; }",
    "const r = 'after keyword regex'; // still fine",
    "/* block \\n  text */",
    "// a comment that mentions \\n at the end\\n",
  ].join("\n");
  assert.deepEqual(literalNewlinesInLineComments(fine), []);

  // A regex after `return` must not be read as division, or its quote opens a fake string
  // that hides the next real comment.
  const afterReturn = "function q() { return /['\"]/; }\n// note.\\n  await work();\n";
  assert.deepEqual(literalNewlinesInLineComments(afterReturn).map((h) => h.line), [2]);
});
