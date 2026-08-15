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

// ESPN's espn_s2/SWID have been a moving target in this codebase (see the
// unmerged commit 1c2e774 flip-flopping the connect-page guide between
// www.espn.com and fantasy.espn.com) — a stale cookie under one domain
// scope can coexist with a valid one under another and ESPN's server will
// reject the stale value with no indication of *why*. Check every
// candidate domain and log (never display) whether they actually agree,
// so a rejection is diagnosable from the console instead of another guess.
const CANDIDATE_COOKIE_DOMAINS = ["https://www.espn.com", "https://fantasy.espn.com", "https://espn.com"];

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

const ESPN_ORIGIN_PATTERN = "https://*.espn.com/*";

// Safari grants host permissions per site at runtime, where Chrome and Edge grant everything
// in `host_permissions` at install. A denied site therefore looks identical to "not logged in"
// from here, so the two are worth telling apart.
//
// **This was not the cause of the 2026-08-15 iPhone failure** — espn.com was already set to
// Allow and the popup still found nothing. The check is kept because it is correct and cheap,
// not because it fixed that bug. See `getCookieFrom` for the actual suspect.
async function hasEspnAccess() {
  try {
    return await chrome.permissions.contains({ origins: [ESPN_ORIGIN_PATTERN] });
  } catch {
    // Older/edge implementations without the permissions API: assume granted rather than
    // blocking a browser where manifest host permissions are install-time.
    return true;
  }
}

// Safari implements the WebExtension APIs as **promise-returning**. Chrome MV3 supports both
// promises and the legacy callback form. The original code passed a callback only — on Safari
// that can resolve with `undefined` while the real value is delivered through the returned
// promise that nobody awaited, which looks exactly like "no cookie".
//
// Verified on a real iPhone 2026-08-15: espn.com permission set to Allow, signed in to ESPN,
// and the popup still reported no session — so a missing permission was NOT the cause.
//
// Try the promise form first and fall back to the callback form, so both engines work.
// `outcome` records what happened per domain, never the cookie value.
async function getCookieFrom(domainUrl, name) {
  const details = { url: domainUrl, name };

  try {
    const viaPromise = chrome.cookies.get(details);
    if (viaPromise && typeof viaPromise.then === "function") {
      const cookie = await viaPromise;
      return { value: cookie?.value || null, outcome: cookie?.value ? "ok" : "empty(promise)" };
    }
  } catch (error) {
    return { value: null, outcome: `error(promise):${error?.name || "unknown"}` };
  }

  return new Promise((resolve) => {
    try {
      chrome.cookies.get(details, (cookie) => {
        resolve({ value: cookie?.value || null, outcome: cookie?.value ? "ok" : "empty(callback)" });
      });
    } catch (error) {
      resolve({ value: null, outcome: `error(callback):${error?.name || "unknown"}` });
    }
  });
}

// Reads a cookie across every candidate domain and returns both the value
// to use (first domain that has one — www.espn.com preferred, since ESPN's
// login/session issuance is most likely rooted there) and a diagnostic
// summary (which domains had it, whether they agree — never the raw value).
// The popup closes itself immediately after use and isn't a regular
// browser tab, so its own console isn't inspectable after the fact — the
// diagnostic travels in the staged payload instead, for content-omen.js to
// log from a real tab.
async function getCookie(name) {
  const results = await Promise.all(
    CANDIDATE_COOKIE_DOMAINS.map(async (domain) => {
      const read = await getCookieFrom(domain, name);
      return { domain, value: read.value, outcome: read.outcome };
    })
  );

  const present = results.filter((r) => r.value != null);
  const distinctValues = new Set(present.map((r) => r.value));

  return {
    value: present[0]?.value || null,
    diagnostic: {
      foundOn: present.map((r) => r.domain),
      agree: distinctValues.size <= 1,
      distinctValueCount: distinctValues.size,
      // Per-domain outcome, never the value. This is what turns "no session found" from a
      // dead end into something diagnosable without a Mac attached.
      outcomes: results.map((r) => `${r.domain.replace("https://", "")}=${r.outcome}`),
    },
  };
}

function setStatus(message, kind) {
  const status = el("status");
  status.textContent = message;
  status.className = kind || "";
}

async function init() {
  const [espnS2Result, swidResult, tabUrl] = await Promise.all([
    getCookie("espn_s2"),
    getCookie("SWID"),
    getActiveTabUrl(),
  ]);

  if (!espnS2Result.value || !swidResult.value) {
    // Distinguish "we were never allowed to look" from "we looked and found nothing".
    // Telling a signed-in user to sign in is the worst possible message, and it is exactly
    // what this popup did on iOS before the permission check existed.
    if (!(await hasEspnAccess())) {
      el("needsAccess").hidden = false;
      el("grantAccess").addEventListener("click", async () => {
        // Must run from a user gesture; Safari shows its own consent sheet here.
        const granted = await chrome.permissions.request({ origins: [ESPN_ORIGIN_PATTERN] })
          .catch(() => false);
        if (granted) {
          el("needsAccess").hidden = true;
          await init();
        } else {
          const accessStatus = el("accessStatus");
          accessStatus.textContent =
            "Omen still doesn't have access to ESPN. You can also allow it in Safari settings → Extensions.";
          accessStatus.className = "error";
        }
      });
      return;
    }

    el("notLoggedIn").hidden = false;
    // Show what actually happened per domain. No cookie value is ever rendered.
    el("cookieDiagnostic").textContent =
      `espn_s2 → ${espnS2Result.diagnostic.outcomes.join(", ")}` +
      ` · SWID → ${swidResult.diagnostic.outcomes.join(", ")}` +
      ` · cookies API: ${typeof chrome.cookies === "undefined" ? "missing" : "present"}`;
    el("openEspn").addEventListener("click", () => {
      // `/football/` 404s — verified 2026-08-15. `/football/team` is the live entry point.
      chrome.tabs.create({ url: "https://fantasy.espn.com/football/team" });
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
      omenEspnFill: {
        espn_s2: espnS2Result.value,
        swid: swidResult.value,
        league_id: leagueId,
        diagnostics: { espn_s2: espnS2Result.diagnostic, swid: swidResult.diagnostic },
      },
    });
    chrome.tabs.create({ url: OMEN_CONNECT_URL });
    window.close();
  });
}

init().catch(() => setStatus("Something went wrong reading your ESPN session.", "error"));
