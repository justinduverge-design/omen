"use strict";

const MAX_SOURCE_BYTES = 256 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "application/gzip",
  "application/octet-stream",
  "application/x-gzip",
]);

const sourceUrlForSeason = (season) =>
  `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`;

function validateSeason(season) {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    throw new TypeError("season must be an integer from 1999 through 2100");
  }
}

function abortError() {
  const error = new Error("play-by-play acquisition was aborted");
  error.name = "AbortError";
  return error;
}

async function cancelBody(body, reason) {
  try { await body?.cancel?.(reason); } catch {}
}

async function readBoundedBody(body, { signal, maxBytes = MAX_SOURCE_BYTES } = {}) {
  if (!body || typeof body.getReader !== "function") throw new TypeError("source response has no readable body");
  const reader = body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      if (signal?.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new TypeError("source response emitted a non-byte chunk");
      size += value.byteLength;
      if (size > maxBytes) throw new RangeError(`source response exceeds ${maxBytes} bytes`);
      if (value.byteLength) chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
    }
  } catch (error) {
    try { await reader.cancel(error); } catch {}
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (size === 0) throw new TypeError("source response body is empty");
  return Buffer.concat(chunks, size);
}

async function acquirePlayByPlaySource({
  season,
  sourceUrl = sourceUrlForSeason(season),
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  validateSeason(season);
  if (sourceUrl !== sourceUrlForSeason(season)) throw new TypeError("sourceUrl is not the allowlisted season asset");
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new TypeError("sourceUrl is invalid");
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (signal != null && !(signal instanceof AbortSignal)) throw new TypeError("signal must be an AbortSignal");
  if (signal?.aborted) throw abortError();

  const response = await fetchImpl(sourceUrl, {
    method: "GET",
    headers: { accept: "application/gzip, application/octet-stream;q=0.9" },
    redirect: "follow",
    signal,
  });
  if (!response || typeof response.status !== "number" || !response.headers) throw new TypeError("source response is invalid");
  if (response.status < 200 || response.status > 299) {
    const error = new Error(`source request failed with HTTP ${response.status}`);
    await cancelBody(response.body, error);
    throw error;
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    const error = new TypeError("source response Content-Type is not allowed");
    await cancelBody(response.body, error);
    throw error;
  }
  const declaredText = response.headers.get("content-length");
  let declared = null;
  try {
    if (declaredText != null) {
      if (!/^(0|[1-9][0-9]*)$/.test(declaredText)) throw new TypeError("source response has an invalid Content-Length");
      declared = Number(declaredText);
      if (!Number.isSafeInteger(declared)) throw new RangeError("source response Content-Length is too large");
      if (declared === 0) throw new TypeError("source response body is empty");
      if (declared > MAX_SOURCE_BYTES) throw new RangeError(`source response exceeds ${MAX_SOURCE_BYTES} bytes`);
    }
  } catch (error) {
    await cancelBody(response.body, error);
    throw error;
  }
  const raw = await readBoundedBody(response.body, { signal });
  if (declared != null && raw.length !== declared) throw new TypeError("source response length mismatch");
  return { raw, sourceUrl };
}

module.exports = { acquirePlayByPlaySource, readBoundedBody, sourceUrlForSeason, MAX_SOURCE_BYTES };
