# Omen ESPN Connect (browser extension)

Reads your own `espn_s2`/`SWID` ESPN Fantasy cookies from this browser and fills them into Omen's existing "Connect ESPN" form at `/account/connect`. It never sends those values anywhere except into that form — no external server, no analytics, no logging.

## How it works

1. Log into `fantasy.espn.com` in this browser as normal, and open your team page (so the extension can detect your league ID from the URL).
2. Click the extension icon. It reads `espn_s2`/`SWID` via the browser's `cookies` API (which can read these even though they're `HttpOnly` — that's why a plain webpage script can't do this, but an extension with the `cookies` permission can) and shows the detected league ID.
3. Click "Fill into Omen". It stages the values in `chrome.storage.session` (cleared when the browser closes — not permanent storage) and opens Omen's connect page.
4. Omen's connect page picks the staged values up, fills the form, and immediately clears the staged copy. You still click Omen's own "Connect" button — the extension only fills the form, it doesn't submit anything on your behalf.

## Install it

**Published and public on the Chrome Web Store and on Microsoft Edge Add-ons** (confirmed by the founder, 2026-08-15). Most users should install it from their browser's store rather than loading it unpacked.

> **Store listing URLs still need to be pasted in here.** This section previously read "not yet published to a store," which was false by the time anyone read it. Leaving the links out is a smaller error than leaving that sentence in, but it is still a gap — add both URLs on the next touch.

This extension is the practical ESPN connection path, so where it is published matters beyond this file: it is also the honest answer for ESPN users in the native apps, which cannot ask for cookies directly (see `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §5 — ESPN is research-gated on native).

### Load it locally (development only)

Chrome / Edge:
1. Go to `chrome://extensions` (or `edge://extensions`).
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select this `extension/` folder.

Firefox:
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and select `manifest.json` in this folder. (Temporary only — resets on browser restart. A `manifest_version: 3` Firefox build would need a separate packaging pass if this goes to the Firefox Add-ons store.)

## Known gaps (not blocking, tracked for follow-up)

- No icons yet — the toolbar will show a default puzzle-piece icon. Real icon art is a `slops-image-prompt` follow-up, not a functional blocker.
- Hardcoded to production (`https://slopssaloon.com`) plus `localhost:5173` for local dev. No settings UI to point it elsewhere.
- No automated test coverage — this repo's test tooling is Node-native (`node:test`) with no DOM/browser test harness, and adding one (e.g. jsdom) touches `package.json`, which needs explicit approval. Verified by code review against the real `ConnectLeague.jsx` field ids (`espn-s2`, `espn-swid`, `espn-league-id`) instead; needs a real hands-on "load unpacked" pass against a live ESPN + Omen session before considering this done.
- Does not attempt to detect `espn_team_id` — the connect form doesn't collect it either (it's optional server-side), so nothing is lost here.
