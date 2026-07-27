# M4 Help + Support — Native Contract v1

**Status:** Proposed composition — not approved for native implementation
**Owner:** Product / Design House
**Created:** 2026-07-27
**Decision gate:** Founder/design-steward approval of the Figma proposal, then platform implementation planning

## 1. Purpose and boundary

Omen needs two related but distinct ways to help a person:

1. **Contextual Help** explains the current Omen concept, state, or next step without taking the person away from their work.
2. **Help + Support** is a calm destination for Help Center guidance, voluntary feedback, and a safe path to report a problem.

This contract is native-only. It defines information architecture, content safety, accessibility, and platform behavior; it does **not** create a support inbox, ticket API, telemetry event, native source change, or provider connection path. The responsive web `HelpButton` is content inventory only and is not a mobile layout source.

## 2. User jobs and entry points

| User job | Entry | Destination | Exit |
| --- | --- | --- | --- |
| Understand a label, recommendation state, or unavailable capability | A nearby `What is this?`/info affordance using the existing Tooltip/Help primitive | Short contextual explanation; optionally one safe “Learn more” route | Dismiss and return to the exact prior state |
| Find setup or product guidance | Account → **Support & Help Improve Omen** → Help Center | Native Help + Support sheet/page with grouped guidance | Back/dismiss returns to Account |
| Report a problem or share a voluntary idea | Account → **Support & Help Improve Omen** | Named feedback choice with a clear privacy note | Confirm only after the person reviews what they chose to share |
| Get help while offline or signed out | Same contextual/account entries | Honest offline/no-account explanation and safe next action | Dismiss, retry later, or sign in/connect where relevant |

Contextual Help must never become an unsolicited modal, block a decision, or impersonate live provider support. Account remains the durable home for Help Center, feedback, and reporting a problem.

## 3. Proposed composition: Help + Support

The proposed Design House composition is **Help + Support**, assembled from the approved registry contracts rather than introduced as a new primitive:

- `Tooltip/Help` for short, local explanation.
- `IconButton` or labeled `ListRow` for an intentional entry point.
- Native `Modal/Sheet` for the Help + Support destination.
- `ListRow` for grouped Help Center, feedback, and report-a-problem choices.
- `Button` only where a state has an explicit safe action.
- `State surfaces` for offline, no-account, unavailable, and recovery states.

It uses the existing semantic roles: `color/surface-1`/`color/surface-2`, `color/border`, `color/text-primary`, `color/text-secondary`, `color/accent`, and `color/focus-ring`; the existing spacing scale; and the approved text styles. No provider brand color, team color, hard-coded color, new token, or decorative motion is allowed.

### Anatomy

1. A truthful title: **Help + Support**.
2. A one-sentence contextual description when launched from a page; omit it from Account when it adds no value.
3. A **Help Center** group with plain-language topics relevant to the current state where available.
4. A **Help Improve Omen** group containing **Give feedback**, **Share a feature idea**, and **Something is not working**.
5. A small privacy note before any feedback path: app version/screen attachment can be opt-in; selected league, roster, credentials, cookies, tokens, raw provider errors, and hidden session data are never attached automatically.
6. A state surface when no network, no signed-in account, or support submission is unavailable.

### States

| State | Required behavior |
| --- | --- |
| Default | Help Center and voluntary feedback choices are visible; no prompt or urgency language. |
| Contextual | Names the relevant concept/state and preserves the originating page on dismiss. |
| No account | General Help Center remains available where bundled; account-specific support explains that sign-in is required without exposing identity/provider data. |
| Offline | Explain that contact/feedback cannot be sent now; provide Retry only when a real retry path exists. Do not queue silently or claim delivery. |
| Submission unavailable | Name the limitation and offer a safe alternative only when it actually exists. |
| Provider recovery | Help remains usable; no raw HTTP/provider error, credential, cookie, OAuth token, or internal sync detail is shown. |

## 4. Native expression

The information architecture, wording intent, and state truth are shared. The presentation is platform-native:

- **iOS:** `NavigationStack` destination from Account; contextual destination uses the appropriate `.sheet` or `.popover` based on content length and platform convention. Swipe/back dismissal must restore the originating screen and focus.
- **Android:** Account navigation destination; contextual destination uses `ModalBottomSheet` or Material tooltip based on content length. System Back dismisses the topmost help surface before leaving the originating screen.

Compact widths and large text must reflow rather than truncate. A contextual surface that needs more than a short explanation routes to the durable Help Center instead of becoming a dense tooltip.

## 5. Accessibility and privacy acceptance criteria

- Every entry has a descriptive VoiceOver/TalkBack label and purpose; icon-only entries include an accessible name.
- Touch targets meet the existing 44 pt iOS / 48 dp Android rule, and visible focus uses `color/focus-ring` plus native focus behavior.
- Reading order is title, optional context, Help Center choices, Help Improve Omen choices, privacy note, then state/action.
- Dynamic Type and Android font scaling keep headings, labels, and actions readable without clipped or overlapping controls.
- Reduced-motion and reduce-transparency modes use native static presentation; no looping, flashing, or celebratory motion.
- Feedback/support never auto-attaches credentials, cookies, OAuth values, raw errors, selected league/roster data, or hidden session values. Attachments, if later supported, are opt-in and reviewable.

## 6. Approval and implementation gates

Before implementation:

1. Add a clearly labelled **PROPOSAL — Help + Support** composition card to `03 — Components` in the Design House, showing purpose, anatomy, states, tokens, accessibility, platform expression, and sources.
2. Add proposed iOS and Android placement references after the composition card is reviewed; do not treat them as approved screens.
3. Obtain recorded founder/design-steward approval of the Figma nodes and this contract.
4. Only then create native implementation tasks. Those tasks must specify the real support/feedback submission authority (if any), payload allowlist, consent/review behavior, tests, and platform evidence.

### Exact implementation file boundary after approval

The approved implementation may change only the following native-app files, plus new feature/test files named here:

| Platform | Existing host | New feature surface | Test/evidence seam |
| --- | --- | --- | --- |
| Android | `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt` — Account sheet host only | `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/help/OmenHelpSupportScreen.kt` | `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/screenshot/ScreenshotScenarios.kt` and a focused `mobile/android/app/src/test/.../feature/help/` test |
| iOS | `mobile/ios/OmenIOS/OmenIOS/App/Auth/AccountView.swift` — Account list/navigation entry only | `mobile/ios/OmenIOS/OmenIOS/App/Help/OmenHelpSupportView.swift` | a focused `mobile/ios/OmenIOS/OmenIOSTests/OmenHelpSupportViewTests.swift` plus the existing screenshot-scenario seam if supported |

No existing auth repository, provider connector, environment file, secrets/configuration, transport, persistence, store, analytics, or backend route is an authorized implementation target. If real feedback delivery is later approved, it requires a separate backend/security contract rather than expanding this native UI task.

## Sources

- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` — Tooltip/Help, Modal/Sheet, ListRow, state surfaces, semantic tokens.
- `Blueprints/specs/mobile/omen-mobile-visual-briefs-v1.md` §12 — Account and “Support & Help Improve Omen”; provider/error safety and native accessibility expectations.
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md` — Account and feedback boundary, cross-page states, secure client behavior.
- `frontend/src/components/HelpButton.jsx` — web content inventory only; not a native layout or behavior authority.
