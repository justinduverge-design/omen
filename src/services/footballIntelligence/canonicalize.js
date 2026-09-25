"use strict";

const crypto = require("node:crypto");

function canonicalize(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw integrityError("Canonical values must contain only finite numbers");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] === undefined) throw integrityError(`Canonical value has undefined property: ${key}`);
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  throw integrityError(`Unsupported canonical value type: ${typeof value}`);
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function hashCanonical(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function integrityError(message) {
  const error = new TypeError(message);
  error.code = "FOOTBALL_INTELLIGENCE_INVALID";
  return error;
}

module.exports = { canonicalize, hashCanonical, stableStringify };
