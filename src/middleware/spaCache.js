"use strict";

const SPA_INDEX_CACHE_CONTROL = "no-cache, must-revalidate";
const AASA_CACHE_CONTROL = "public, max-age=300, must-revalidate";

function createAppleAppSiteAssociationSendFileOptions() {
  return { dotfiles: "allow" };
}

function isSpaIndex(filePath = "") {
  const normalizedPath = String(filePath).replaceAll("\\", "/");
  return normalizedPath.split("/").pop().toLowerCase() === "index.html";
}

function isAppleAppSiteAssociation(filePath = "") {
  const normalizedPath = String(filePath).replaceAll("\\", "/");
  return normalizedPath.endsWith("/.well-known/apple-app-site-association");
}

function setSpaIndexCacheHeaders(res) {
  res.setHeader("Cache-Control", SPA_INDEX_CACHE_CONTROL);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function setAppleAppSiteAssociationHeaders(res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", AASA_CACHE_CONTROL);
}

function setSpaStaticCacheHeaders(res, filePath) {
  if (isSpaIndex(filePath)) {
    setSpaIndexCacheHeaders(res);
  } else if (isAppleAppSiteAssociation(filePath)) {
    setAppleAppSiteAssociationHeaders(res);
  }
}

module.exports = {
  AASA_CACHE_CONTROL,
  SPA_INDEX_CACHE_CONTROL,
  createAppleAppSiteAssociationSendFileOptions,
  isAppleAppSiteAssociation,
  isSpaIndex,
  setAppleAppSiteAssociationHeaders,
  setSpaIndexCacheHeaders,
  setSpaStaticCacheHeaders,
};
