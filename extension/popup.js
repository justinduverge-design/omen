"use strict";

// Omen ESPN Connect — popup script.
//
// Reads the user's own espn_s2/SWID cookies from this browser (chrome.cookies
// has elevated access that can read HttpOnly cookies, unlike page JS) and
// stages them in chrome.storage.session — never chrome.storage.local, since
// that persists across browser restarts and these are live session secrets.
// content-omen.js picks the staged values up on Omen's connect page and clears
// them immediately after filling the form. Nothing here ever transmits the
// cookie values anywhere except into that form field.

const OMEN_CONNECT_URL = "https://slopssaloon.com/account/connect";
const ESPN_COOKIE_URL = "https://fantasy.espn.com";

function el(id) {
  return document.getElementById(id);
}

function parseLeagueIdFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (!url.hostname.endsWith("espn.com")) return null;
    return url.searchParams.get("leagueId");
  } catch {
    return null;
  }
}

async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url || null;
}

function getCookie(name) {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: ESPN_COOKIE_URL, name }, (cookie) => resolve(cookie?.value || null));
  });
}

function setStatus(message, kind) {
  const status = el("status");
  status.textContent = message;
  status.className = kind || "";
}

async function init() {
  const [espnS2, swid, tabUrl] = await Promise.all([
    getCookie("espn_s2"),
    getCookie("SWID"),
    getActiveTabUrl(),
  ]);

  if (!espnS2 || !swid) {
    el("notLoggedIn").hidden = false;
    el("openEspn").addEventListener("click", () => {
      chrome.tabs.create({ url: "https://fantasy.espn.com/football/" });
    });
    return;
  }

  el("loggedIn").hidden = false;

  const detectedLeagueId = parseLeagueIdFromUrl(tabUrl);
  if (detectedLeagueId) {
    el("leagueId").value = detectedLeagueId;
  }

  el("fillOmen").addEventListener("click", async () => {
    const leagueId = el("leagueId").value.trim();
    if (!leagueId) {
      setStatus("Enter your ESPN League ID first.", "error");
      return;
    }

    el("fillOmen").disabled = true;
    setStatus("Opening Omen…", "");

    await chrome.storage.session.set({
      omenEspnFill: { espn_s2: espnS2, swid, league_id: leagueId },
    });
    chrome.tabs.create({ url: OMEN_CONNECT_URL });
    window.close();
  });
}

init().catch(() => setStatus("Something went wrong reading your ESPN session.", "error"));
