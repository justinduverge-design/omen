"use strict";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeHtmlAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizePath(pathname = "") {
  return String(pathname).split("?")[0].replace(/\/+$/, "");
}

function tradeShareHashFromPath(pathname = "") {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/^\/trade\/share\/([^/]+)$/i);
  if (!match) return null;
  return UUID_V4_RE.test(match[1]) ? match[1] : null;
}

function isTradeSharePagePath(pathname = "") {
  return Boolean(tradeShareHashFromPath(pathname));
}

function firstForwardedValue(value) {
  return String(value || "").split(",")[0].trim();
}

function publicOriginFromRequest(req) {
  const protocol = firstForwardedValue(req.get?.("x-forwarded-proto")) || req.protocol || "https";
  const host = firstForwardedValue(req.get?.("x-forwarded-host")) || req.get?.("host") || "slopssaloon.com";
  return `${protocol}://${host}`;
}

function buildTradeShareMeta({ origin, hash }) {
  const cleanOrigin = String(origin || "").replace(/\/+$/, "");
  const url = `${cleanOrigin}/trade/share/${hash}`;
  const image = `${cleanOrigin}/api/trade/share/${hash}/og.svg`;

  return {
    title: "Omen Trade Share",
    description: "A public Trade Analyzer snapshot from Omen.",
    url,
    image,
  };
}

function buildTradeShareMetaForRequest(req, hash = tradeShareHashFromPath(req.path)) {
  return buildTradeShareMeta({
    origin: publicOriginFromRequest(req),
    hash,
  });
}

function metaTag(name, value, property = false) {
  const attr = property ? "property" : "name";
  return `<meta ${attr}="${escapeHtmlAttribute(name)}" content="${escapeHtmlAttribute(value)}" />`;
}

function renderMetaTags(meta) {
  return [
    metaTag("description", meta.description),
    metaTag("og:type", "website", true),
    metaTag("og:title", meta.title, true),
    metaTag("og:description", meta.description, true),
    metaTag("og:url", meta.url, true),
    metaTag("og:image", meta.image, true),
    metaTag("og:image:type", "image/svg+xml", true),
    metaTag("og:image:width", "1200", true),
    metaTag("og:image:height", "630", true),
    metaTag("twitter:card", "summary_large_image"),
    metaTag("twitter:title", meta.title),
    metaTag("twitter:description", meta.description),
    metaTag("twitter:image", meta.image),
  ].join("\n    ");
}

function injectTradeShareMeta(html, meta) {
  const safeTitle = `<title>${escapeHtmlText(meta.title)}</title>`;
  const block = `${safeTitle}\n    ${renderMetaTags(meta)}`;

  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, block);
  }

  return html.replace(/<\/head>/i, `    ${block}\n  </head>`);
}

module.exports = {
  buildTradeShareMeta,
  buildTradeShareMetaForRequest,
  injectTradeShareMeta,
  isTradeSharePagePath,
  tradeShareHashFromPath,
};
