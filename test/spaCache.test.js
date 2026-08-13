"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AASA_CACHE_CONTROL,
  SPA_INDEX_CACHE_CONTROL,
  createAppleAppSiteAssociationSendFileOptions,
  isAppleAppSiteAssociation,
  isSpaIndex,
  setAppleAppSiteAssociationHeaders,
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

test("AASA file is detected across path separators", () => {
  assert.equal(isAppleAppSiteAssociation("/app/frontend/dist/.well-known/apple-app-site-association"), true);
  assert.equal(isAppleAppSiteAssociation("C:\\app\\frontend\\dist\\.well-known\\apple-app-site-association"), true);
  assert.equal(isAppleAppSiteAssociation("/app/frontend/dist/apple-app-site-association.json"), false);
});

test("AASA responses use JSON and short cache headers", () => {
  const res = fakeResponse();

  setAppleAppSiteAssociationHeaders(res);

  assert.equal(res.headers["content-type"], "application/json");
  assert.equal(res.headers["cache-control"], AASA_CACHE_CONTROL);
});

test("explicit AASA delivery allows the dot-prefixed directory", () => {
  const firstOptions = createAppleAppSiteAssociationSendFileOptions();
  const secondOptions = createAppleAppSiteAssociationSendFileOptions();

  assert.equal(firstOptions.dotfiles, "allow");
  assert.notEqual(firstOptions, secondOptions);
});

test("static fallback gives the AASA file the same headers", () => {
  const res = fakeResponse();

  setSpaStaticCacheHeaders(res, "/app/frontend/dist/.well-known/apple-app-site-association");

  assert.equal(res.headers["content-type"], "application/json");
  assert.equal(res.headers["cache-control"], AASA_CACHE_CONTROL);
});
