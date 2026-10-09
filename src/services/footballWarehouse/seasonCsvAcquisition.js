"use strict";

const { readBoundedBody, ALLOWED_CONTENT_TYPES } = require("./playerWeeklyAcquisition");

async function acquireExactSeasonCsv({ season, sourceUrl, expectedUrl, maxBytes, fetchImpl = globalThis.fetch, signal } = {}) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) throw new TypeError("season must be an integer from 1999 through 2100");
  if (sourceUrl !== expectedUrl) throw new TypeError("sourceUrl is not the allowlisted season asset");
  let parsed;
  try { parsed = new URL(sourceUrl); } catch { throw new TypeError("sourceUrl is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new TypeError("sourceUrl must be HTTPS and contain no credentials");
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (signal != null && !(signal instanceof AbortSignal)) throw new TypeError("signal must be an AbortSignal");
  if (signal?.aborted) { const error = new Error("source acquisition was aborted"); error.name = "AbortError"; throw error; }
  const response = await fetchImpl(sourceUrl, { method: "GET", headers: { accept: "text/csv, application/csv;q=0.9, application/octet-stream;q=0.8" }, redirect: "follow", signal });
  if (!response || typeof response.status !== "number" || !response.headers) throw new TypeError("source response is invalid");
  if (response.status < 200 || response.status > 299) { await response.body?.cancel?.(); throw new Error(`source request failed with HTTP ${response.status}`); }
  const mediaType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(mediaType)) { await response.body?.cancel?.(); throw new TypeError("source response Content-Type is not allowed"); }
  const declared = response.headers.get("content-length");
  if (declared != null && !/^(0|[1-9][0-9]*)$/.test(declared)) throw new TypeError("source response has an invalid Content-Length");
  const declaredBytes = declared == null ? null : Number(declared);
  if (declaredBytes === 0) throw new TypeError("source response body is empty");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new TypeError("maxBytes is invalid");
  if (declaredBytes != null && (!Number.isSafeInteger(declaredBytes) || declaredBytes > maxBytes)) { await response.body?.cancel?.(); throw new RangeError(`source response exceeds ${maxBytes} bytes`); }
  const raw = await readBoundedBody(response.body, { maxBytes, signal });
  if (declaredBytes != null && raw.length !== declaredBytes) throw new TypeError(`source response length mismatch: declared ${declaredBytes}, observed ${raw.length}`);
  return { raw, sourceUrl };
}

module.exports = { acquireExactSeasonCsv };
