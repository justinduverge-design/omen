# Omen Native Delivery Governance v1

**Status:** Proposed active operating contract  
**Date:** 2026-07-19  
**Purpose:** Give future agents the tools, direction, oversight, guardrails, and security boundaries needed to build native Omen without product drift.

## 1. What this governs

This document governs native iOS and Android planning, design, code, testing, review, and release readiness.

It does not authorize:
- Apple/Google account actions;
- deployment;
- secrets or provider credential changes;
- Supabase schema changes;
- ESPN connection mechanics;
- use of paid third-party services.

## 2. The delivery chain

```
Founder direction
  → Design House + screen contract
  → API/state/security contract
  → Figma approval
  → small native implementation PR
  → device + accessibility evidence
  → code/security/design review
  → founder approval
  → release gate
```

No step may silently replace an earlier contract.

## 3. Required sources of truth

| Need | Authority |
|---|---|
| Product posture and native direction | `omen-native-mobile-foundation-v1.md` |
| Visual language and platform expression | `omen-native-design-house-v1.md` |
| First-run and provider flow | `omen-mobile-onboarding-connection-contract-v1.md` |
| Current work selection | `Direction/agent_inbox.md` and `Direction/current_sprint.md` |
| Backend route truth | `Blueprints/api-routes.md` and current route tests |
| Security/provider constraints | `Direction/facts-of-record.md`, decision log, and security handoffs |
| Visual screen anatomy | approved Figma component/screen library in [Omen Native Design House](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3) |
| Agent authority and tool boundaries | `omen-native-agent-capabilities-canvas-v1.md` |

If an artifact conflicts with a newer approved authority, stop and flag the conflict.

## 4. Native task gate

Every task must declare:
- iOS, Android, or shared contract scope;
- linked feature/screen/component contract;
- exact files/modules allowed;
- states covered;
- API/auth/provider dependency;
- design reference/Figma node;
- tests and device evidence required;
- security/privacy review need;
- explicit do-not-touch boundaries.

No “make this screen better” task is actionable without those details.

## 5. Non-negotiable review gates

### Design gate

- Uses approved tokens and components.
- Native platform behavior is appropriate.
- No copied competitor layout or branding.
- No raw colors or arbitrary component variants.
- Compact and large-phone visual evidence supplied.

### Functional gate

- Success, cancel, retry, empty, stale, disconnected, recovery, and error states work.
- No indefinite loading state.
- Navigation/back/resume behavior is tested.
- API contract is versioned and honored.

### Security gate

- Secrets, cookies, OAuth tokens, and sensitive provider values never enter logs, UI, screenshots, crash reports, or analytics.
- Authentication is native and return-to-app flows are verified.
- Provider support is not claimed before real-device proof.
- Demo/reviewer mode is safe and separate from user data.

### Accessibility gate

- VoiceOver/TalkBack labels and focus order work.
- Dynamic Type/font scale and contrast are checked.
- Touch targets and error messages are usable.
- Reduce-motion behavior is respected.

### Release gate

- Founder approves the native experience.
- Store-review/demo path works without a real league.
- Privacy disclosures and provider scope agree with runtime.
- Release evidence names device, build, app version, state coverage, and rollback path.

## 6. Roles, without fake bureaucracy

- **Founder:** chooses product scope, visual direction, provider and release decisions.
- **Design steward:** protects the Design House, Figma library, tokens, component/screen contracts, and visual review quality.
- **iOS implementer:** builds SwiftUI with Apple-native behavior.
- **Android implementer:** builds Compose with Android-native behavior.
- **Backend/security implementer:** maintains stable APIs, auth, provider boundaries, and safe observability.
- **QA/reviewer:** tests real device flows, connectivity failures, accessibility, and state honesty.

One agent may fill several roles on a small task, but the review questions do not disappear.

## 7. M0 contract sequence

1. Onboarding and provider connection reliability.
2. Omen account/auth + deep-link contract.
3. Mobile design house, token, and component registry.
4. Native navigation/app-shell contract.
5. Sleeper proof of connection.
6. Yahoo OAuth proof of connection.
7. ESPN mobile feasibility/security/store policy decision.
8. Demo/reviewer mode contract.
9. First approved Figma component library and onboarding screens.

Only then:
- scaffold SwiftUI and Compose projects;
- build the vertical slice;
- add decision tools one at a time.

## 8. Required outputs for future agents

Every closeout must write:
- files changed;
- contract/Figma references;
- iOS and Android parity status;
- device and accessibility evidence;
- state matrix tested;
- security/privacy result;
- known limitations;
- whether a new contract, component, or token is needed;
- branch/PR/merge/deploy status.

## 9. Access enforcement

The capability/canvas contract defines the least-privilege policy. Before agents receive access, the founder or administrator must match it with GitHub branch protection, protected deployment environments, Figma role-based sharing, isolated secrets, and founder-controlled store accounts. Policy alone is not technical access control.

## 10. The protection principle

The goal is not to restrict agents for the sake of it. The goal is to let them move quickly inside a clear field:

- the vision tells them what “good” looks like;
- the contracts tell them what must be true;
- the tokens/components tell them what to reuse;
- the test gates tell them how to prove it;
- the security boundaries keep a beautiful app from becoming an unsafe one.


---

## Amendment — 2026-08-31: screen artifact of record

**Decision:** an **approved Claude Design canvas is a valid screen artifact of record** for native
feature code, alongside an approved Figma screen. **Figma remains authoritative for vector assets**
— logo, lockup, icon set, team marks.

**Why:** the founder is the approval bottleneck on every layout revision, and translating each
revision into Figma bought nothing when Figma's real advantage here is vector authoring, which AI
tooling does poorly and Figma does well.

**What does not change:** native feature code still follows an **approved** screen. This amendment
changes which artifact can carry that approval; it does not remove the requirement, and it does not
authorize starting feature code from a sketch nobody signed off.

**Authority:** `Direction/facts-of-record.md` #20;
`Blueprints/specs/mobile/omen-app-pages-workshop-v1.md` Part 3.
