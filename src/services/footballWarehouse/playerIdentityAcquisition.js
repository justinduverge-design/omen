"use strict";

const {
  ALLOWED_CONTENT_TYPES,
  readBoundedBody,
} = require("./playerWeeklyAcquisition");
const { MAX_SOURCE_BYTES } = require("./playerWeeklySource");
const { PLAYERS_SOURCE_URL } = require("./playerIdentitySource");

function validateExactSourceUrl(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new TypeError("sourceUrl is invalid");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new TypeError("sourceUrl must be HTTPS and contain no credentials");
  }
  if (sourceUrl !== PLAYERS_SOURCE_URL) {
    throw new TypeError("sourceUrl is not the allowlisted players asset");
  }
}

function parseDeclaredLength(headers) {
  const value = headers.get("content-length");
  if (value == null) return null;
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new TypeError("source response has an invalid Content-Length");
  }
  const length = Number(value);
  if (!Number.isSafeInteger(length)) {
    throw new RangeError("source response Content-Length is too large");
  }
  return length;
}

function validateContentType(headers) {
  const value = headers.get("content-type");
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("source response is missing Content-Type");
  }
  const mediaType = value.split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(mediaType)) {
    throw new TypeError(`source response Content-Type is not allowed: ${mediaType}`);
  }
}

function abortError() {
  const error = new Error("source acquisition was aborted");
  error.name = "AbortError";
  return error;
}

async function cancelBody(body, reason) {
  if (!body || typeof body.cancel !== "function") return;
  try {
    await body.cancel(reason);
  } catch {
    // The primary validation or HTTP error remains authoritative.
  }
}

async function acquirePlayerIdentitySource({
  sourceUrl = PLAYERS_SOURCE_URL,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  validateExactSourceUrl(sourceUrl);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (signal != null && !(signal instanceof AbortSignal)) {
    throw new TypeError("signal must be an AbortSignal");
  }
  if (signal?.aborted) throw abortError();

  const response = await fetchImpl(sourceUrl, {
    method: "GET",
    headers: { accept: "text/csv, application/csv;q=0.9, application/octet-stream;q=0.8" },
    redirect: "follow",
    signal,
  });
  if (!response || typeof response.status !== "number" || !response.headers) {
    throw new TypeError("source response is invalid");
  }
  if (response.status < 200 || response.status > 299) {
    const error = new Error(`source request failed with HTTP ${response.status}`);
    await cancelBody(response.body, error);
    throw error;
  }

  let declaredBytes;
  try {
    validateContentType(response.headers);
    declaredBytes = parseDeclaredLength(response.headers);
    if (declaredBytes === 0) throw new TypeError("source response body is empty");
    if (declaredBytes != null && declaredBytes > MAX_SOURCE_BYTES) {
      throw new RangeError(`source response exceeds ${MAX_SOURCE_BYTES} bytes`);
    }
  } catch (error) {
    await cancelBody(response.body, error);
    throw error;
  }

  const raw = await readBoundedBody(response.body, {
    maxBytes: MAX_SOURCE_BYTES,
    signal,
  });
  if (declaredBytes != null && raw.length !== declaredBytes) {
    throw new TypeError(`source response length mismatch: declared ${declaredBytes}, observed ${raw.length}`);
  }
  return { raw, sourceUrl };
}

module.exports = {
  acquirePlayerIdentitySource,
};
