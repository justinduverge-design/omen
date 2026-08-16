# Handoff — 2026-08-16 — P1-ConnectContinueRoute

**Branch:** `claude/p1-connect-continue-route` · **Not pushed, merged, or deployed.**
This session also carried a sprint-queue reconciliation; that is the first commit on the branch and is described at the bottom.

## What was wrong

Finishing onboarding dropped the user on account settings instead of the dashboard, and an established account could be walked back through onboarding by nothing more than opening a different browser.

1. **`handleContinue()` landed on `/account`.** `consumeNextUrl()` fell back to `/account` when `localStorage['omen.auth.next']` was empty — which is the normal case in a real signed-in session, verified live 2026-08-11. `handleSkip()` hardcoded `/football` and was correct, so Skip worked and Continue did not.
2. **Onboarding completion lived only in `localStorage`.** `ProtectedRoute.jsx` gated on `omen.onboarding.done` alone. Cleared storage, a new browser, an incognito window, or a second device re-onboarded a user whose connection `/api/platforms` already knew about.
3. **Found while fixing (1) — a second wrong landing.** `ConnectLeague.jsx:696` stores `/account/connect` as the post-login destination when a signed-out visitor hits the connect page. So on the most common path *into* connect, the stored `next` was the connect page itself, and Continue would have returned the user to the screen they had just completed. Fixing only the default would have left this behind, looking like an intermittent version of the same bug.

## What changed

| File | Change |
|---|---|
| `frontend/src/lib/onboarding.js` | **New.** One record of onboarding state: `isOnboardingDone()`, `markOnboardingDone()`, `hasConnectedPlatform()`, and `syncOnboardingFromServer(fetchPlatforms)` — the fetcher is injected so it tests without a network or a DOM. |
| `frontend/src/lib/nextUrl.js` | `consumeNextUrl(fallback = '/account')` — existing callers unchanged. New `consumeConnectDestination()` defaults to `/football` and maps `/account/connect`, `/onboarding`, and anything `sanitize()` rejects to `/football`. |
| `frontend/src/components/layout/ProtectedRoute.jsx` | The local flag is now a cache in front of the server. When it is absent the gate asks `/api/platforms` once before assuming a new user. |
| `frontend/src/pages/ConnectLeague.jsx` | Both exits use the shared helpers; the inline `localStorage.setItem` is gone. |
| `frontend/src/pages/Onboarding.jsx` | A server-side connection now completes onboarding and leaves for `/football`, instead of parking the user on step 2 of a flow they had already finished. |
| `frontend/src/components/help/HelpButton.jsx` | Reads the shared helper rather than a fourth inline `localStorage` pair. |

**`sanitize()` was not touched** — its origin and path validation is correct, and the item says so. The bug was the default, not the validation.

## Evidence

- **RED first:** `test/connectContinueRoute.test.mjs` failed on the missing `consumeConnectDestination` and `syncOnboardingFromServer` helpers before any source change.
- **GREEN:** 12/12 focused; full `npm test` **549/549** (537 baseline, +12); `npm --prefix frontend run build` clean; `git diff --check` clean.
- **Local substitute for CI:** this item's `Done when:` cites no CI. Backend `node --test` (~5s) plus the frontend build is the recorded substitute; `pr-quality.yml` will run the same two on the PR.
- `test/onboardingConnectionGate.test.js` was updated, not deleted: it pinned `function markOnboardingDone()` *inside* `ConnectLeague.jsx`, and that action moved to the shared lib. The assertion now pins the import. Its intent — both exits mark completion, no redirect loop — is unchanged.

## Costs and limits, stated

- `ProtectedRoute` holds its existing spinner for one `/api/platforms` round-trip when the local flag is absent. Users who have the flag pay nothing.
- It **fails closed.** A network error, an unauthenticated response, or a malformed payload leaves the flag unset and routes to onboarding — never silently past it.
- **Not browser-verified in a signed-in session.** The tests are real behavioral tests of the helpers plus source assertions on the wiring; nobody clicked Continue in a browser against a live account. The routing decision itself is now a pure function with direct coverage, which is why the source assertions are a thinner part of the evidence than they were before this pass.
- Native is unaffected — this is web onboarding only.

## Skills

Used: `slops-tdd` (RED before GREEN). Substituted: `slops-ui-ux-audit` — no visual change shipped, so the audit reduced to a routing/dead-end review, which is what caught defect 3.

**Skill improvement:** the repo's frontend testing convention is `fs.readFileSync` + regex against JSX. That convention is what let this bug live — a grep can prove `consumeNextUrl()` is *called* but never that it returns the right destination. Both real defects here became testable the moment the decision moved into a pure function in `lib/`. Worth codifying: when a frontend fix is a *decision*, extract the decision into `lib/` and test it for real; keep source assertions for wiring only.

## Sprint reconciliation (first commit on this branch)

23 finished items closed out of `Direction/current_sprint.md` into `Direction/sprints_completed.md` → "Sprint-queue reconciliation — 2026-08-16" with exact per-item evidence. Four finished-looking items were deliberately held open with the reason recorded: `M5-Native-API-Client` (slices D–G unstarted), `M4-CC-WaiverWatch` (iOS six-state evidence outstanding), `R3-BUILD-Android` (needs a signed AAB; keystore is founder-generated), and `M4-CC-PlatformsCompact` — which had **merged as `6466a4c` and was still sitting at `READY`**, the fifth recorded instance of this queue advertising shipped work as pullable. It is now `VERIFIED` with its missing Android evidence named. Two missing `LEDGER.md` rows were written, and `Direction/agent_inbox.md` was refreshed.
