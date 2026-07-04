"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  injectTradeShareMeta,
  isTradeSharePagePath,
} = require("../src/services/tradeShareMeta");

test("isTradeSharePagePath matches public share page UUID routes only", () => {
  const hash = "36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30";

  assert.equal(isTradeSharePagePath(`/trade/share/${hash}`), true);
  assert.equal(isTradeSharePagePath(`/trade/share/${hash}/`), true);
  assert.equal(isTradeSharePagePath("/trade/share/not-a-share-hash"), false);
  assert.equal(isTradeSharePagePath(`/api/trade/share/${hash}`), false);
});

test("injectTradeShareMeta adds escaped OG and Twitter tags for crawlers", () => {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    "<title>Omen</title>",
    "</head>",
    "<body><div id=\"root\"></div></body>",
    "</html>",
  ].join("");

  const rendered = injectTradeShareMeta(html, {
    title: "Omen Trade Share",
    description: "A public Trade Analyzer snapshot.",
    url: "https://slopssaloon.com/trade/share/36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30",
    image: "https://slopssaloon.com/api/trade/share/36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30/og.svg",
  });

  assert.match(rendered, /<title>Omen Trade Share<\/title>/);
  assert.match(rendered, /property="og:title" content="Omen Trade Share"/);
  assert.match(rendered, /property="og:image" content="https:\/\/slopssaloon\.com\/api\/trade\/share\/36f4c8af-7f8d-4f76-9cc2-3cbf5dca9f30\/og\.svg"/);
  assert.match(rendered, /name="twitter:card" content="summary_large_image"/);
});
