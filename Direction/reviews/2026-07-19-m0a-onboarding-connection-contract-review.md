# M0a Review — Mobile Onboarding & Connection Contract

**Date:** 2026-07-19
**Reviewer:** Claude (frontend/spec lane)
**Task:** M0a — Onboarding and connection contract (sprint lane E/mobile program)
**Artifact under review:** `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` (Status: *Proposed M0 contract — founder review required*)
**Nature:** Planning and evidence only. No app code, native project, deploy, secret, Figma permission change, or ESPN-mobile-ready claim was made.

---

## 0. Why this ran before M0b

M0b (mobile design-system contract) is blocked by M0a in `Direction/current_sprint.md`, and M0a is blocked by founder review. The agent inbox pinned M0b, but nothing recorded M0a as approved and every mobile spec is still marked *Proposed*. Per Justin's direction, M0b is held and M0a is worked first so the downstream gate is real, not assumed.

---

## 1. Recommendation

**Approve with revisions (R1–R7 below).** The contract is well-scoped, security-honest, and platform-native in the right places. None of the revisions require a redesign — they are reconciliations.

### Update 2026-07-19 — fixes applied (pending Justin review)

All seven revisions have been dispositioned in `omen-mobile-onboarding-connection-contract-v1.md` (revised header). Summary:

| Rev | Disposition | Where |
|---|---|---|
| R1 Welcome copy | **Resolved** — canonical promise "See the move before the league does." | contract §4.1 stands |
| R2 deep-link dependency | **Folded in** + deferred to M0c | contract §4.2 |
| R3 state-machine → backend mapping | **Folded in** + deferred to M0c | contract §6 backend-mapping note |
| R4 idempotency not-yet-guaranteed | **Folded in** as M0c verification | contract §7 |
| R5 F2 status conflict | **Folded in** as cross-ref | contract §4.6 |
| R6 version links | **Folded in** | contract header Companions |
| R7 Figma-stub reality | **Folded in** | contract header note |
| A SIWA required-if-Google | **Folded in** | contract §4.2 |
| B deprecated Google SDK | **Folded in** | contract §4.2 |
| C/D/E three-mechanism + PKCE + OTP | **Folded in** (naming) + concrete spec deferred to M0c | contract §4.2, §5 Yahoo |
| F secure token storage | **Folded in** | contract §7 |
| G in-app account deletion | **Folded in** | contract §10 store-compliance note |
| H demo = review path | **Folded in** | contract §7 |

**Net:** M0a wording is App-Store-safe and internally consistent. The concrete auth/API/deep-link/PKCE/secure-storage/idempotency spec is explicitly assigned to **M0c**. Once Justin approves this revised contract, M0a is done and **M0b unblocks**.

---

## 2. Done-when walkthrough

The sprint defines M0a done when *"Omen sign-in, demo escape hatch, provider state machine, reliability rules, Sleeper/Yahoo proof paths, and ESPN mobile gate are approved or revised."* Each element below is graded **APPROVE** / **APPROVE w/ revision** / **HOLD**.

| Element | Grade | Note |
|---|---|---|
| Omen sign-in | APPROVE w/ R2 | Native-first (Apple / Google Credential Manager) with email/magic-link fallback is correct. Deep-link return is an unbuilt dependency, not a contract flaw. |
| Demo escape hatch | APPROVE | Demo-first Welcome + "always functional without auth or a connected league" matches facts-of-record and app-store reviewer needs. |
| Provider state machine | APPROVE w/ R3 | The user-facing state set is strong; it must be reconciled with what the backend exposes today vs what M0c must add. |
| Reliability rules | APPROVE w/ R4 | Request IDs, idempotent connect/validate, bounded timeouts, local-first render are the right bar; idempotency needs backend confirmation, not assumption. |
| Sleeper proof path | APPROVE | Maps cleanly to existing `POST /api/platforms/sleeper/resolve` → `/connect`. Lowest-risk first native connection. |
| Yahoo proof path | APPROVE w/ R2 | Maps to `GET /api/yahoo/auth` → `/api/yahoo/callback`, but callback currently returns to the **web** Account page, not a mobile deep link. |
| ESPN mobile gate | APPROVE | Research-gated, must-not-block-first-run, no cookie/password entry in a store build. Fully aligned with facts-of-record #6 and the decision log. Item 7 (feasibility memo) stays a separate gate. |

---

## 3. Required revisions

### R1 — Reconcile the Welcome promise copy — RESOLVED

The contract §4 uses **"See the move before the league does."** Current shipped web `Landing.jsx` copy (Phase 1.10B, 2026-06-25) is **"See the result before it happens."** A third variant, **"Know the move,"** survives in a stale QA driver assertion (`known_issues.md` line 34).
**Disposition (Justin, 2026-07-19):** the canonical product promise is **"See the move before the league does."** The mobile contract §4.1 wording stands. The shipped web `Landing.jsx` line becomes the one to realign when web work resumes (paused under the native pivot). No new coinage remains.

### R2 — Name the deep-link + Yahoo-callback dependency explicitly

§4.2 and §5 require registered mobile deep links and a deep-link OAuth return (Supabase native deep linking). Today `GET /api/yahoo/callback` redirects to the web Account connect page — there is no mobile deep-link return path. This is real, unbuilt backend/infra scope.
**Disposition needed:** add one line to the contract stating deep-link return is an **M0c app-shell/API dependency, not yet implemented**, so no native auth screen is planned against a return path that does not exist. Keep it out of M0a's "approved and ready" surface.

### R3 — Map the connection state machine to current backend truth

The §6 state machine (`not_started → authorizing → awaiting_return → resolving_account → choosing_league → validating_connection → syncing_initial_context → connected`, plus `canceled / retryable_error / needs_reauth / unsupported_on_mobile`) is a **new, richer** user-facing contract than the backend exposes. Today `GET /api/platforms` returns connection status and `GET /api/dashboard/summary` returns tool gates and `off_season`; neither surfaces this granular machine.
**Disposition needed:** annotate each state as *server-backed today* vs *M0c must add/normalize*. The contract should defer the API shape to M0c (safe provider-state API) rather than imply it already exists.

### R4 — Do not assert idempotency the backend hasn't proven

§7 requires "idempotent connect/validate operations" so double-taps and resumes don't create duplicate connections. This is the correct target, but it is not confirmed that the current web connect endpoints are idempotent.
**Disposition needed:** mark idempotency + request-ID behavior as a **required M0c backend verification**, not an existing guarantee. Pairs naturally with the B2 `request_id` envelope work already on main.

### R5 — Reconcile "connected → Omen ready" with the open F2 status conflict

The success path (§4.6: Connected → Command Center → clear Omen entry) depends on the dashboard status truth, and there is an **unresolved F2 conflict** between `ready` and `pending_live_engine` for connected Sleeper/ESPN users. If mobile adopts "connected implies Omen-ready" before F2 is resolved, native inherits the same ambiguity.
**Disposition needed:** cross-reference F2 in the contract and state that the mobile "connected" → "Omen ready" transition uses whichever single status truth F2 settles on. Consider pinning F2 alongside M0c.

### R6 — Version-link the contract to its companions

The contract cites the foundation and design-house specs by name but not version/date. Governance §3 makes conflicting-authority detection a stop condition.
**Disposition needed:** add explicit `v1 / 2026-07-19` references so a future agent can detect drift.

### R7 — State the Figma reality

The official canvas (`mWjrAKPi4JSIP5lAmGAtB3`) currently contains **only `00 — Start Here`** (an on-brand cover with four authority cards: Vision / System / Build / Prove). The controlled zones the capability canvas describes (`02 Tokens`, `03 Components`, `04 iOS Screens`, `05 Android Screens`, `06 QA & Evidence`) **do not exist yet**. Screenshot evidence captured this session.
**Disposition needed:** note in the contract that onboarding **screen** contracts cannot be Figma-anchored yet; the Markdown specs are the working source of truth until `04 — iOS Screens` / `05 — Android Screens` are populated. This matches Justin's "use the markdowns as documentation/guidance" call.

---

## 4. What is genuinely strong (approve as-is)

- **Honest primary outcome.** Defining success as one of four honest outcomes (connected / paused-resumable / demo reached / recovery explained) rather than "account created" is the right product framing.
- **Security posture.** No ESPN password implication, no cookie/token in view state / logs / screenshots / analytics — consistent with facts-of-record #6 and the whole native governance stack.
- **No-endless-spinner rule.** Every waiting state must say what is happening and offer a safe next action; cancellation is normal, not an error. This is the correct reliability bar.
- **Provider matrix realism.** Sleeper first, Yahoo after OAuth proof, ESPN feasibility-gated — matches the actual backend surface (`api-routes.md`) and current provider fragility (`known_issues.md`).
- **Acceptance test matrix (§9).** Fresh/existing/expired session, cancel/deny/callback-failure/backgrounding, network-failure classes, no-league/multi-league, accessibility, and the no-secret-in-artifacts check are comprehensive and should carry into M3/M4 verification unchanged.

---

## 5. Downstream effect on the mobile program

- **M0b (design-system contract):** stays blocked until M0a is approved. R1 (copy) and R7 (Figma reality) feed directly into M0b's token/component/screen registry, so resolving them first is efficient.
- **M0c (app-shell/API contract):** inherits R2 (deep links), R3 (provider-state API), R4 (idempotency/request IDs), and R5 (status truth / F2). Recommend M0c explicitly own these four.
- **Item 7 (ESPN feasibility memo)** and **item 8 (demo/reviewer contract)** in the contract's §10 remain separate deliverables and are not part of M0a approval.

---

## 6. Evidence

- Read gate satisfied: foundation, design-house, delivery-governance, agent-capabilities-canvas, onboarding-connection-contract, and the delivery-workflow playbook.
- Backend grounding: `Blueprints/api-routes.md` (platform/connect/dashboard routes), `Direction/context.md` Current Build Truth, `Direction/facts-of-record.md`, `Direction/known_issues.md` (F2, welcome-copy drift).
- Figma: `whoami` confirmed access (Darth Slops, Pro); `get_metadata` on file `mWjrAKPi4JSIP5lAmGAtB3` returned a single page `00 — Start Here`; screenshot of node `2:2` captured (control-room cover, four authority cards).
- No code, production, secret, Figma permission, or provider behavior was touched.

---

## 7. Skill receipt

| Skill | Used | Result |
|---|---|---|
| `slops-repo-inspector` | Yes | Read gate + backend route grounding; established Figma-stub truth. |
| `planning-pass` | Yes | Held M0b, sequenced M0a-first, mapped downstream M0b/M0c effects. |
| `slops-context-markdown` | Yes | Review memo authored in house style. |
| `workflow-tree-spec` | Partial | Used to sanity-check the §6 state machine against backend states; full tree deferred to M0c where the API shape is decided. |
| `security-privacy-evidence` | Light | Confirmed no cookie/token exposure surface; deep security pass belongs to M0c. |
| `slops-ux-copy` | N/A here | R1 flags the copy conflict but resolving the canonical promise is a separate dispositioned task. |
| `slops-tdd` / `slops-quality-baseline` / `slops-code-review` / `slops-mobile-smoke` | N/A | No app code or running app in a contract review. |

**Skill improvement:** the native read gate (AGENTS.md) lists six sources but not `Blueprints/api-routes.md`, yet grounding the provider state machine required it. Recommend adding "current backend route truth (`api-routes.md`)" to the native read gate for any onboarding/connection/provider task.

---

## 8. Decision requested from Justin

1. Approve M0a **with R1–R7 dispositioned**, or return specific revisions.
2. Confirm whether R2–R5 are formally reassigned to **M0c**.
3. Confirm the canonical Welcome promise (R1) so web and native stop diverging.
4. On approval, M0b is unblocked and the pinned registry task resumes with the Markdown specs as source and Figma as the pending cross-reference.
