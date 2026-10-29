"use strict";

// Shared flag parsing for the Node scripts in scripts/: a thin layer over
// node:util parseArgs (STANDARDS rules 4 and 5), so no script hand-rolls a loop.
// util.parseArgs silently keeps the last of a repeated option and accepts an
// empty value; our scripts refuse both, so this adds those two checks. Every
// refusal is a CliArgsError carrying the offending argument, so each script can
// keep its own wording.

const util = require("node:util");

class CliArgsError extends Error {
  constructor(reason, argument) {
    super(`${reason}: ${argument}`);
    this.name = "CliArgsError";
    this.reason = reason; // "unknown" | "missing-value" | "duplicate" | "empty-value" | "positional"
    this.argument = argument;
  }
}

const REASONS = {
  ERR_PARSE_ARGS_UNKNOWN_OPTION: "unknown",
  ERR_PARSE_ARGS_INVALID_OPTION_VALUE: "missing-value",
  ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL: "positional",
};

function parseCliArgs(args, options, { allowPositionals = false } = {}) {
  let parsed;
  try {
    parsed = util.parseArgs({ args, options, strict: true, allowPositionals, tokens: true });
  } catch (error) {
    const reason = REASONS[error.code];
    if (!reason) throw error;
    // Node names the argument in single quotes, e.g. "Unknown option '--x'".
    const argument = /'([^' ]+)/.exec(error.message)?.[1] || "(missing)";
    throw new CliArgsError(reason, argument);
  }
  const seen = new Set();
  for (const token of parsed.tokens) {
    if (token.kind !== "option") continue;
    if (seen.has(token.name)) throw new CliArgsError("duplicate", token.rawName);
    seen.add(token.name);
    if (token.value === "") throw new CliArgsError("empty-value", token.rawName);
  }
  return { values: { ...parsed.values }, positionals: parsed.positionals };
}

module.exports = { CliArgsError, parseCliArgs };
