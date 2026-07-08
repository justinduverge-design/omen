"use strict";

// chrome.storage.session defaults to TRUSTED_CONTEXTS-only access, which
// excludes content scripts — content-omen.js's read of the payload staged
// by popup.js throws "Access to storage is not allowed from this context"
// without this. Must run from a privileged context (this service worker).
// Session storage's access level does not persist across browser restarts,
// so this needs both onInstalled (dev-mode reload) and onStartup (browser
// relaunch) — plus the unconditional top-level call below, since MV3
// service workers can wake for other reasons too and this is harmless to
// repeat.
function unlockSessionStorageForContentScripts() {
  chrome.storage.session.setAccessLevel({
    accessLevel: chrome.storage.AccessLevel.TRUSTED_AND_UNTRUSTED_CONTEXTS,
  });
}

chrome.runtime.onInstalled.addListener(unlockSessionStorageForContentScripts);
chrome.runtime.onStartup.addListener(unlockSessionStorageForContentScripts);
unlockSessionStorageForContentScripts();
