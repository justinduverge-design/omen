"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  acquirePlayerIdentitySource,
} = require("../src/services/footballWarehouse/playerIdentityAcquisition");
const { PLAYERS_SOURCE_URL } = require("../src/services/footballWarehouse/playerIdentitySource");
const { MAX_SOURCE_BYTES } = require("../src/services/footballWarehouse/playerWeeklySource");

function stream(chunks, { onCancel } = {}) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
    cancel(reason) {
      onCancel?.(reason);
    },
  });
}

function response({
  status = 200,
  type = "text/csv; charset=utf-8",
  length,
  body = stream([Buffer.from("gsis_id,display_name\n00-1,Player\n")]),
} = {}) {
  const headers = new Headers();
  if (type != null) headers.set("content-type", type);
  if (length != null) headers.set("content-length", String(length));
  return { status, headers, body };
}

test("requests only the exact players asset and returns its exact bytes", async () => {
  const expected = Buffer.from([0xef, 0xbb, 0xbf, 0x67, 0x73, 0x69, 0x73, 0x0a]);
  const calls = [];
  const result = await acquirePlayerIdentitySource({
    fetchImpl: async (...args) => {
      calls.push(args);
      return response({
        type: "APPLICATION/OCTET-STREAM",
        length: expected.length,
        body: stream([expected.subarray(0, 3), expected.subarray(3)]),
      });
    },
  });

  assert.equal(result.sourceUrl, PLAYERS_SOURCE_URL);
  assert.deepEqual(result.raw, expected);
  assert.equal(Buffer.isBuffer(result.raw), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], PLAYERS_SOURCE_URL);
  assert.deepEqual(calls[0][1], {
    method: "GET",
    headers: { accept: "text/csv, application/csv;q=0.9, application/octet-stream;q=0.8" },
    redirect: "follow",
    signal: undefined,
  });
});

test("rejects alternate, insecure and credential-bearing URLs before fetch", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return response(); };
  for (const sourceUrl of [
    PLAYERS_SOURCE_URL.replace("https:", "http:"),
    PLAYERS_SOURCE_URL.replace("https://", "https://user:secret@"),
    PLAYERS_SOURCE_URL.replace("players.csv", "players-2026.csv"),
    `${PLAYERS_SOURCE_URL}?download=1`,
  ]) {
    await assert.rejects(
      acquirePlayerIdentitySource({ sourceUrl, fetchImpl }),
      /HTTPS and contain no credentials|not the allowlisted players asset/,
    );
  }
  assert.equal(calls, 0);
});

test("rejects non-2xx responses and cancels their bodies", async () => {
  let cancelled = false;
  await assert.rejects(
    acquirePlayerIdentitySource({
      fetchImpl: async () => response({
        status: 503,
        body: stream([Buffer.from("upstream detail")], { onCancel: () => { cancelled = true; } }),
      }),
    }),
    /HTTP 503/,
  );
  assert.equal(cancelled, true);
});

test("requires an allowlisted Content-Type and cancels rejected bodies", async () => {
  for (const type of [null, "application/json", "text/html; charset=utf-8"]) {
    let cancelled = false;
    await assert.rejects(
      acquirePlayerIdentitySource({
        fetchImpl: async () => response({
          type,
          body: stream([Buffer.from("rejected")], { onCancel: () => { cancelled = true; } }),
        }),
      }),
      /Content-Type/,
    );
    assert.equal(cancelled, true);
  }
});

test("rejects invalid, empty and oversized declared lengths before reading", async () => {
  for (const length of ["-1", "1.5", "3, 3", "9007199254740992"]) {
    await assert.rejects(
      acquirePlayerIdentitySource({ fetchImpl: async () => response({ length }) }),
      /Content-Length/,
    );
  }
  await assert.rejects(
    acquirePlayerIdentitySource({ fetchImpl: async () => response({ length: 0 }) }),
    /body is empty/,
  );

  let cancelled = false;
  await assert.rejects(
    acquirePlayerIdentitySource({
      fetchImpl: async () => response({
        length: MAX_SOURCE_BYTES + 1,
        body: stream([Buffer.from("never read")], { onCancel: () => { cancelled = true; } }),
      }),
    }),
    new RegExp(`exceeds ${MAX_SOURCE_BYTES} bytes`),
  );
  assert.equal(cancelled, true);
});

test("enforces the observed-byte cap and cancels the active reader", async () => {
  let cancelled = false;
  let sent = false;
  const body = new ReadableStream({
    pull(controller) {
      if (sent) return;
      sent = true;
      controller.enqueue(Buffer.alloc(MAX_SOURCE_BYTES + 1));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    acquirePlayerIdentitySource({ fetchImpl: async () => response({ body }) }),
    new RegExp(`exceeds ${MAX_SOURCE_BYTES} bytes`),
  );
  assert.equal(cancelled, true);
});

test("rejects empty, missing, non-byte and declared-length-mismatched bodies", async () => {
  await assert.rejects(
    acquirePlayerIdentitySource({ fetchImpl: async () => response({ body: stream([]) }) }),
    /body is empty/,
  );
  await assert.rejects(
    acquirePlayerIdentitySource({ fetchImpl: async () => response({ body: null }) }),
    /no readable body/,
  );
  await assert.rejects(
    acquirePlayerIdentitySource({ fetchImpl: async () => response({ body: stream(["not bytes"]) }) }),
    /non-byte chunk/,
  );
  await assert.rejects(
    acquirePlayerIdentitySource({
      fetchImpl: async () => response({ length: 99, body: stream([Buffer.from("short")]) }),
    }),
    /length mismatch: declared 99, observed 5/,
  );
});

test("passes through AbortSignal and stops an already-aborted request before fetch", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    acquirePlayerIdentitySource({
      signal: controller.signal,
      fetchImpl: async () => { calls += 1; return response(); },
    }),
    { name: "AbortError" },
  );
  assert.equal(calls, 0);
});
