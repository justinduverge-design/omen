"use strict";

class TabularReceiptError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "TabularReceiptError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new TabularReceiptError(code, message, options);
}

function text(value, field) {
  if (typeof value !== "string" || !value.trim()) fail("INVALID_CANONICAL_FACT", `${field} must be a non-empty string`);
  return value.trim();
}

function integer(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    fail("INVALID_CANONICAL_FACT", `${field} must be an integer from ${min} through ${max}`);
  }
  return parsed;
}

function observed(value, { missing = "not_reported", parse = (item) => text(item, "observation") } = {}) {
  if (value === null || value === undefined || value === "") return Object.freeze({ state: missing, value: null });
  if (typeof value === "string") {
    const sentinel = value.trim().toLowerCase();
    if (["unknown", "not_reported", "not_covered", "conflicted"].includes(sentinel)) {
      return Object.freeze({ state: sentinel, value: null });
    }
  }
  return Object.freeze({ state: "observed", value: parse(value) });
}

function booleanObservation(value, missing = "not_covered") {
  return observed(value, {
    missing,
    parse(item) {
      if (item === true || item === 1 || item === "1" || item === "true" || item === "TRUE") return true;
      if (item === false || item === 0 || item === "0" || item === "false" || item === "FALSE") return false;
      fail("INVALID_CANONICAL_FACT", "boolean observation must be a recognized boolean flag");
    },
  });
}

function numberObservation(value, field, missing = "not_reported") {
  return observed(value, {
    missing,
    parse(item) {
      const parsed = typeof item === "number" ? item : Number(item);
      if (!Number.isFinite(parsed) || parsed < 0) fail("INVALID_CANONICAL_FACT", `${field} must be a non-negative number`);
      return Object.is(parsed, -0) ? 0 : parsed;
    },
  });
}

function provenance(receipt) {
  return Object.freeze({
    artifact_id: receipt.artifact.sha256,
    receipt_id: receipt.receipt_id,
    source_family: receipt.source.family,
    intended_use: receipt.intended_use,
    source_schema_fingerprint: receipt.schema_fingerprint,
  });
}

async function replayTable({ registry, receiptId, tabularReader, requiredColumns, accepts, receiptErrorCode }) {
  if (!registry || typeof registry.replayReceipt !== "function") fail("ARTIFACT_REGISTRY_REQUIRED", "registry with replayReceipt is required");
  if (!tabularReader || typeof tabularReader.readRows !== "function") fail("TABULAR_READER_REQUIRED", "TabularReader.readRows is required");
  const { receipt, bytes } = await registry.replayReceipt(receiptId);
  if (receipt.artifact_type !== "raw_source" || !accepts(receipt)) {
    fail(receiptErrorCode, "receipt source family and intended use do not match this normalizer");
  }
  const table = await tabularReader.readRows({
    bytes,
    mediaType: receipt.artifact.media_type,
    requiredColumns,
    schemaFingerprint: receipt.schema_fingerprint,
  });
  if (!table || typeof table !== "object" || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
    fail("INVALID_TABULAR_RESULT", "TabularReader must return { columns, rows }");
  }
  const present = new Set(table.columns);
  const missing = requiredColumns.filter((column) => !present.has(column));
  if (missing.length) fail("TABULAR_SCHEMA_MISMATCH", `source is missing required columns: ${missing.join(", ")}`);
  if (table.rows.length !== receipt.row_count) {
    fail("TABULAR_ROW_COUNT_MISMATCH", `receipt declares ${receipt.row_count} rows but TabularReader returned ${table.rows.length}`);
  }
  return { receipt, rows: table.rows, provenance: provenance(receipt) };
}

module.exports = {
  TabularReceiptError,
  booleanObservation,
  fail,
  integer,
  numberObservation,
  observed,
  replayTable,
  text,
};
