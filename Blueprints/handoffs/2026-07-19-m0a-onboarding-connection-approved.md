# Handoff — M0a Onboarding & Connection Contract Approved

**Date:** 2026-07-19
**Branch:** `docs/m0a-onboarding-connection-review` (not pushed / not merged)
**Agent:** Claude (frontend/spec lane)
**Nature:** Docs/planning/evidence only. No app code, native project, deploy, secret, schema, Figma permission, or provider behavior changed.

## What happened

1. Pulled `main` (`b6fca2c → 69c48da`) — the Native Mobile Pivot landed.
2. Ran the Omen kickoff. Auto-pull is suppressed; the pin governs. Held pinned M0b per Justin and worked **M0a** first (M0b was blocked by M0a, M0a by founder review).
3. Connected Figma (`whoami`: Darth Slops, Pro). Found the Design House (`mWjrAKPi4JSIP5lAmGAtB3`) is a **stub** — only `00 — Start Here` exists. Markdown specs are the working source of truth.
4. Reviewed the onboarding/connection contract, ran a sign-in flow audit against current Apple/Google/Supabase/RFC-8252 guidance, folded the fixes in, and Justin **approved** the revised M0a.

## Files changed

- `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` — revised + status **Approved**.
- `Direction/reviews/2026-07-19-m0a-onboarding-connection-contract-review.md` — review memo (R1–R7, disposition table).
- `Direction/reviews/2026-07-19-m0a-signin-flow-audit.md` — sign-in audit + curated reference set.
- `Direction/current_sprint.md` — M0a ✅ approved; M0b + M0c unblocked; M0c scope expanded.
- `Direction/agent_inbox.md` — M0a done; M0b current next task; M0c in parallel.
- `Direction/decision_log.md` — M0a approval + sign-in mechanism + tagline decisions.
- `Blueprints/playbooks/skill-usage-ledger.md` — skill receipt row.

## Decisions locked

- Canonical promise: **"See the move before the league does."**
- Sign-in = **three mechanisms**: native ID-token (Apple/Google), system-browser OAuth+PKCE (Yahoo), email OTP (fallback). SIWA required-if-Google on iOS; Credential Manager on Android; legacy Google SDK banned.
- Store-safety folded in: in-app account deletion (5.1.1), secure token storage, demo = review path.
- **Deferred to M0c:** concrete auth/API/deep-link/PKCE/idempotency/secure-storage spec; Yahoo deep-link return (not built — callback returns to web today); state-machine→backend mapping.
- **F2** (`ready` vs `pending_live_engine`) should be pinned alongside M0c; native must adopt one status truth.

## Next steps

1. **Push + open PR** for `docs/m0a-onboarding-connection-review` — awaiting Justin's go (push/merge is gated).
2. **M0b** (design-system contract → token/component/screen registry) is the current next task; source is Markdown, Figma is a pending cross-reference.
3. **M0c** is unblocked and owns the deferred auth spec; consider pinning F2 with it.

## Do-not-treat-as-live

Local branch only. Nothing pushed, merged, or deployed.
