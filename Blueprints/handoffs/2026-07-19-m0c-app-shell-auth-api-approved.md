# Handoff — M0c App-Shell / Auth / API Contract Approved

**Date:** 2026-07-19
**Branch:** `docs/m0c-reconcile` (re-branched off current `main` after the parallel PR #149 collision; original `docs/m0c-app-shell-auth-api-contract` / PR #151 abandoned)
**Agent:** Claude (frontend/spec lane)
**Nature:** Docs/planning/contract only. No app code, native project, deploy, secret, schema, Figma permission, or provider behavior changed.

## What happened

Completed the M0 contract pack. After M0a (PR #148) and M0b (PR #150) merged, wrote and got approval for **M0c** — the native app-shell/auth/API contract that carries the concrete engineering deferred from M0a.

## Deliverable

`Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md` (**Approved**):
- App shell: project shape, native navigation containers, full route/destination table.
- Auth: three mechanisms (native ID-token Apple/Google; system-browser OAuth+PKCE Yahoo; email OTP), Keychain/Keystore session storage, session restore independent of provider sync, in-app account deletion.
- Deep links: `com.slopssaloon.omen://` reverse-DNS scheme (callback `.../auth/callback`); https app links later.
- Safe provider-state API: maps the M0a state machine to backend routes with opaque error codes; flags that the backend does not emit the granular machine yet.
- Idempotency/request-ID rule; demo/reviewer mode; dev/staging/prod environment boundaries; native security invariants.

## Decisions locked (Justin, 2026-07-19)

- URL scheme: **`com.slopssaloon.omen://`** (not bare `omen://`); verified https app links later.
- **F2 pinned (P0)** — resolve before M3.
- Four backend requirements are foundational, routed to the backend lane as **one owner + one shared API/state contract + one acceptance-test matrix, delivered as four small PRs**.

## Files changed

- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md` (new, Approved).
- `Blueprints/handoffs/frontend-to-backend.md` — 4 native backend requirements added (dated section).
- `Direction/current_sprint.md` — M0c ✅; M1 unblocked; M0-BE backend bundle row; F2 pinned P0.
- `Direction/agent_inbox.md` — M1 current next task; M0-BE in parallel.
- `Direction/decision_log.md` — M0c decisions.
- `Blueprints/playbooks/skill-usage-ledger.md` — skill receipt.

## Next steps

1. **Push + PR** for `docs/m0c-app-shell-auth-api-contract` — awaiting Justin's go.
2. **M1** — SwiftUI/Compose foundation-component build briefs from the registry; first: semantic `focus-ring` (non-color) + lock Alegreya.
3. **M0-BE** — backend bundle (F2 first) in `frontend-to-backend.md`, for the backend lane.

## Do-not-treat-as-live

Local branch only until pushed/merged. The 4 backend requirements are contract requirements, **not implemented**. Figma Design House still a stub. A remote branch `docs/native-m0b-ratifications` appeared during an earlier fetch — not created by this session; flag for Justin.
