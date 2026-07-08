"use strict";

// Omen ESPN Connect — content script, scoped to /account/connect only
// (see manifest.json matches).
//
// Picks up ESPN cookie values staged by popup.js in chrome.storage.session,
// fills them into the real ConnectLeague.jsx form fields, and clears the
// staged values immediately after use (success or failure) so nothing sits
// in storage longer than one fill attempt.

const FIELD_IDS = {
  espn_s2: "espn-s2",
  swid: "espn-swid",
  league_id: "espn-league-id",
};

const POLL_INTERVAL_MS = 150;
const POLL_TIMEOUT_MS = 6000;

// If ESPN is already connected, ConnectLeague.jsx shows a collapsed
// "connected" card with a "Reconnect ESPN" button — the input fields below
// don't exist in the DOM at all until that button is clicked to expand the
// form. Click it up front so fieldsPresent() has something to find.
const RECONNECT_BUTTON_ID = "espn-reconnect-button";

function expandFormIfCollapsed() {
  if (fieldsPresent()) return;
  const reconnectButton = document.getElementById(RECONNECT_BUTTON_ID);
  if (reconnectButton) reconnectButton.click();
}

// React tracks input state via its own value tracker attached to the DOM
// node. Setting `.value` directly leaves that tracker stale, so React's
// controlled-component re-render never fires and the field appears to revert.
// Going through the native setter first, then dispatching a real "input"
// event, is the standard way to make a programmatic fill stick.
function setReactInputValue(input, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  nativeSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function fieldsPresent() {
  return Object.values(FIELD_IDS).every((id) => document.getElementById(id));
}

function fillForm(payload) {
  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const input = document.getElementById(id);
    if (input && payload[key] != null) {
      setReactInputValue(input, payload[key]);
    }
  }
}

// Logs are prefixed and never include payload values (only presence/absence)
// — this is the one place a silent failure here would otherwise be
// indistinguishable from "extension not loaded at all" to anyone debugging
// without direct console access.
const LOG_PREFIX = "[Omen ESPN Connect]";

async function run() {
  let stored;
  try {
    stored = await chrome.storage.session.get("omenEspnFill");
  } catch (err) {
    console.error(`${LOG_PREFIX} could not read staged fill data:`, err.message);
    return;
  }

  const payload = stored?.omenEspnFill;
  if (!payload) {
    console.log(`${LOG_PREFIX} no staged fill data — popup wasn't used on this page load, nothing to do.`);
    return;
  }

  // Clear immediately — this is a one-shot fill, and the staged cookie
  // values should not persist in storage past this attempt either way.
  await chrome.storage.session.remove("omenEspnFill");

  if (payload.diagnostics) {
    console.log(`${LOG_PREFIX} cookie domain diagnostic:`, payload.diagnostics);
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (!fieldsPresent() && Date.now() < deadline) {
    // Cheap and idempotent: no-ops once fields exist, and the reconnect
    // button itself unmounts as soon as the form expands, so this can't
    // double-click. Retried every tick because React may not have mounted
    // the "connected" card yet on the loop's first iteration.
    expandFormIfCollapsed();
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  if (!fieldsPresent()) {
    console.error(`${LOG_PREFIX} gave up after ${POLL_TIMEOUT_MS}ms — the ESPN form fields never appeared on this page.`);
    return;
  }

  fillForm(payload);
  console.log(`${LOG_PREFIX} filled the ESPN connect form. Review and click Connect ESPN to finish.`);
}

run();
