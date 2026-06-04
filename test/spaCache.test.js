"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SPA_INDEX_CACHE_CONTROL,
  isSpaIndex,
  setSpaIndexCacheHeaders,
  setSpaStaticCacheHeaders,
} = require("../src/middleware/spaCache");

function fakeResponse() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
  };
}

test("SPA index files are detected case-insensitively", () => {
  assert.equal(isSpaIndex("C:\\app\\frontend\\dist\\index.html"), true);
  assert.equal(isSpaIndex("/app/frontend/dist/INDEX.HTML"), true);
  assert.equal(isSpaIndex("/app/frontend/dist/assets/index-abc123.js"), false);
});

test("SPA index responses force browser revalidation", () => {
  const res = fakeResponse();

  setSpaIndexCacheHeaders(res);

  assert.equal(res.headers["cache-control"], SPA_INDEX_CACHE_CONTROL);
  assert.equal(res.headers.pragma, "no-cache");
  assert.equal(res.headers.expires, "0");
});

test("static SPA cache hook only overrides index.html", () => {
  const indexRes = fakeResponse();
  const assetRes = fakeResponse();

  setSpaStaticCacheHeaders(indexRes, "/app/frontend/dist/index.html");
  setSpaStaticCacheHeaders(assetRes, "/app/frontend/dist/assets/index-abc123.css");

  assert.equal(indexRes.headers["cache-control"], SPA_INDEX_CACHE_CONTROL);
  assert.deepEqual(assetRes.headers, {});
});
