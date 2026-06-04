"use strict";

const path = require("path");

const SPA_INDEX_CACHE_CONTROL = "no-cache, must-revalidate";

function isSpaIndex(filePath = "") {
  return path.basename(filePath).toLowerCase() === "index.html";
}

function setSpaIndexCacheHeaders(res) {
  res.setHeader("Cache-Control", SPA_INDEX_CACHE_CONTROL);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function setSpaStaticCacheHeaders(res, filePath) {
  if (isSpaIndex(filePath)) {
    setSpaIndexCacheHeaders(res);
  }
}

module.exports = {
  SPA_INDEX_CACHE_CONTROL,
  isSpaIndex,
  setSpaIndexCacheHeaders,
  setSpaStaticCacheHeaders,
};
