"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

test("PlatformConnections.jsx hides ESPN row in app-store builds, even during recovery", () => {
  const src = read("frontend", "src", "components", "platforms", "PlatformConnections.jsx");

  assert.match(src, /const APP_STORE_BUILD = import\.meta\.env\.VITE_APP_STORE_BUILD === 'true';/);
  assert.match(src, /const showEspnRow = !APP_STORE_BUILD && \(ESPN_ENABLED \|\| espnRecovery\);/);
  assert.match(src, /useState\(!APP_STORE_BUILD && espnRecovery \? 'espn' : null\);/);
});

test("ConnectLeague.jsx replaces ESPN cookie entry with the desktop extension guide in app-store builds", () => {
  const src = read("frontend", "src", "pages", "ConnectLeague.jsx");

  const cardMatch = src.match(/function EspnCard\([\s\S]*?\n\}/);
  assert.ok(cardMatch, "EspnCard component not found");
  const card = cardMatch[0];

  // Broadened 2026-08-15: the guide now also serves phone-sized viewports, because a phone
  // cannot complete ESPN connect at all — the cookies are HttpOnly and no mobile browser we
  // can reach exposes them. The app-store build must still take this path, and must still
  // take it before the ESPN_ENABLED bypass, which is what this test exists to protect.
  const appStoreIdx = card.search(/if \(APP_STORE_BUILD(?: \|\| isMobileViewport)?\) return <MobileEspnCard \/>;/);
  const connectedIdx = card.indexOf("if (!ESPN_ENABLED && !connected) return null;");

  assert.match(src, /const ESPN_EXTENSION_GUIDE_URL = '\/espn-connect';/);
  assert.match(src, /function MobileEspnCard\(\)/);
  assert.match(src, /Open ESPN setup guide/);
  assert.notStrictEqual(appStoreIdx, -1, "APP_STORE_BUILD mobile extension guide missing from EspnCard");
  assert.notStrictEqual(connectedIdx, -1, "existing ESPN_ENABLED/connected gate missing from EspnCard");
  assert.ok(
    appStoreIdx < connectedIdx,
    "APP_STORE_BUILD check must run before the ESPN_ENABLED/connected bypass",
  );
  // A phone must never be shown the cookie-paste form: its steps require developer tools,
  // which no mobile browser has. Safari Web Extensions cannot read HttpOnly cookies at all.
  assert.match(card, /isMobileViewport/, "phone-sized viewports must also get the desktop guide");
  assert.match(src, /function useIsMobileViewport\(/, "viewport hook missing");
});

test("Yahoo and Sleeper connect are untouched by the app-store kill switch", () => {
  const connectLeague = read("frontend", "src", "pages", "ConnectLeague.jsx");
  const platformConnections = read("frontend", "src", "components", "platforms", "PlatformConnections.jsx");

  assert.doesNotMatch(
    connectLeague.match(/function YahooCard\([\s\S]*?\n\}/)?.[0] ?? "",
    /APP_STORE_BUILD/,
  );
  assert.doesNotMatch(
    connectLeague.match(/function SleeperCard\([\s\S]*?\n\}/)?.[0] ?? "",
    /APP_STORE_BUILD/,
  );
  assert.match(platformConnections, /yahoo:\s*\{\s*connected:\s*false,\s*platform:\s*'yahoo'\s*\}/);
});

test("env docs document VITE_APP_STORE_BUILD", () => {
  const envExample = read(".env.example");
  const envInventory = read("deploy", "hostinger", "ENV-INVENTORY.md");

  assert.match(envExample, /VITE_APP_STORE_BUILD=/);
  assert.match(envInventory, /`VITE_APP_STORE_BUILD`/);
});
