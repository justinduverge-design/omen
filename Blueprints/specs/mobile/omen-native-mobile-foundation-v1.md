# Omen Native Mobile Foundation v1

**Status:** Active founder-approved contract  
**Date:** 2026-07-19  
**Scope:** Native iPhone and Android product foundations, shared design/system contracts, screen parity, and delivery sequence.  
**Out of scope:** Web-page migrations, production deployment, Apple/Google account setup, provider credential changes, or recreating the backend.

## Native authority companions

- `Blueprints/specs/mobile/omen-native-design-house-v1.md` — shared Omen visual language plus Apple-native iPhone and Google/Material-native Android expression.
- `Blueprints/specs/mobile/omen-native-delivery-governance-v1.md` — required contract, review, security, accessibility, and evidence gates for native work.
- `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` — first-run, account, provider-connection, and reliability authority.

## 1. Decision

Omen is now planned as two real native applications:

- **iPhone:** SwiftUI
- **Android:** Kotlin + Jetpack Compose

The existing React web app remains a working product and service/API client, but new web UI migrations and web-only primitive expansion are paused. It is not the template that gets wrapped for the stores.

The Node/Express API, Supabase auth/data boundary, platform adapters, recommendation contracts, and demo mode remain shared foundations. Native UI code is written separately for each platform.

## 2. Product standard

Omen must feel like a premium, calm front-office app, not a website inside a phone frame.

Borrow deliberately:

| Source | Borrow | Do not copy |
|---|---|---|
| Apple | native navigation, tactile controls, readable hierarchy, calm motion | sterile default-app sameness |
| Meta | fast, forgiving onboarding and familiar account patterns | social-feed noise or surveillance feel |
| ESPN Fantasy | this-week urgency, timely recovery prompts, action near insight | broadcast clutter and ad density |
| Yahoo Fantasy | command-center clarity, league context, operational usefulness | portal sprawl |
| Sleeper | player fluency, fast discovery, dense-but-legible fantasy controls | cartoon/social-chat energy |
| Omen | decisive recommendation, warm brass/verdigris restraint, evidence after the call | generic SaaS or sportsbook hype |

The rule is not “combine five visual styles.” It is one Omen system with five carefully chosen product behaviors.

## 3. Contract hierarchy

Every mobile feature has three contracts before implementation.

1. **Product contract** — job, success condition, copy, data needed, and allowed states.
2. **Design contract** — hierarchy, tokens, component behavior, accessibility, theme behavior, and platform differences.
3. **API/state contract** — route, auth, request/response, live/mock/stale/empty/error/recovery behavior, and privacy boundary.

A feature is not ready for SwiftUI or Compose merely because it has a web page.

## 4. Shared design-token architecture

Tokens are semantic names, never hard-coded colors in a screen.

| Layer | Example | Can a skin change it? |
|---|---|---|
| Core semantic | text primary, surface, border, focus ring, success, risk | rarely; role meaning stays stable |
| Brand expression | accent, glow, hero lighting, metallic highlight | yes, by approved theme pack |
| Component alias | button primary, card decision, chip position, panel recovery | controlled |
| Campaign/skin | playoff brass, rivalry crimson, draft-night lighting | yes, bounded and temporary |
| Team identity | future team skin | not in MVP; must never replace risk/status meaning |

Initial shipped modes: **Core Omen dark** and **Core Omen light/system**.  
Architecture may support Blackout, Whiteout, Playoff Gold, Rivalry Crimson, and Draft Night later. Do not build those skins before the core screens pass accessibility and parity.

The token contract must be expressed in:
- a human-readable Markdown source of truth,
- SwiftUI token definitions,
- Kotlin/Compose token definitions,
- later, web CSS aliases where web remains maintained.

## 5. Component taxonomy

### Foundation components

These need one behavior contract and separate SwiftUI/Compose implementations:

- Button and IconButton
- Text field, secure field, textarea-equivalent, select/picker
- FormField (label, hint, validation, error)
- Card/surface
- Alert
- Badge and Chip
- SegmentedControl, tabs, radio-card choice
- Modal/sheet, confirmation dialog, drawer/navigation sheet
- Tooltip/help affordance where platform-appropriate
- Table/list row, meter, stepper
- Empty, loading, error, disconnected, stale, and mock states

### Omen compositions

These are product components, not generic primitives:

- DecisionBrief
- OmenRecommendationCard
- TradeResultCard and ShareResultPanel
- PlayerRow, PlayerChip, PlayerCompareCard
- MetricStrip, ConfidenceBar, RiskPanel, SignalList
- PlatformBadge, ConnectionStatusBadge, PlatformConnectionCard, StepGuide
- MarketingHero and CTAGroup

Each contract must name:
- purpose and permitted variants;
- data fields;
- Voice/copy rules;
- required states;
- tap target and VoiceOver/TalkBack behavior;
- theme aliases;
- iOS and Android implementation notes;
- visual evidence required before acceptance.

## 6. Mobile screen map

The native apps use the same product map, not a one-to-one copy of web routes.

| Mobile screen | Current Omen source surface | Primary job |
|---|---|---|
| Welcome and sign-in | Landing/Login | Learn / enter safely |
| Guided onboarding | Onboarding + ConnectLeague | Set up without overwhelm |
| Command Center | Football | Monitor + decide |
| Omen | OmenPage/OmenOfTheWeek | Act on the best move |
| Trade Room | TradeAnalyzer | Compare |
| Draft Room | DraftAssistant | Prepare + decide |
| League | Standings/Ledger | Monitor + review |
| Connections | ConnectLeague/Account | Manage |
| Demo mode | Demo | Evaluate before connecting |

Navigation should be native:
- iOS: tab bar for primary destinations, navigation stacks inside each area, sheets for short focused tasks.
- Android: Compose navigation with bottom navigation for the same primary destinations and platform-native back behavior.
- No desktop-style tab bucket, hover dependency, or deep onboarding maze.

## 7. Onboarding contract

Onboarding must feel sharp, not exhausting.

1. Let a new person see a clear demo before asking for platform access.
2. Explain Omen in one sentence: recommendation first, evidence second.
3. Ask only for the account detail required at the current step.
4. Let users defer league connection and return later.
5. Make connection recovery clear and safe; never surface ESPN cookie values.
6. End on a useful first screen, not a generic success screen.

Success measure: a new user understands what Omen does and can reach a useful surface without being forced through a long form.

## 8. Mobile safety and app-store boundaries

- The mobile app is free under the current product decision.
- ESPN is a scoped mobile decision, not a default copy of web behavior. No direct cookie-entry UI ships in an app-store build until the approved mobile connection approach is documented and tested.
- Demo mode must be available for App Store and Play reviewers without real credentials.
- Live, mock, stale, empty, disconnected, recovery, and off-season states must be visibly distinct.
- API calls use the existing canonical contracts; native apps do not invent competing recommendation routes.
- No secret, token, credential, or provider cookie is stored in view state, logs, screenshots, or analytics payloads.

## 9. Modular code shape

Create separate projects when implementation begins:

```
mobile/
  contracts/                 # versioned screen/component/API contract docs
  ios/OmenIOS/               # SwiftUI app
    App/
    DesignSystem/
    Features/
    Core/
  android/                   # Kotlin/Compose app
    app/
    core/
    feature/
```

Within each native app:
- `DesignSystem` / `core:designsystem`: tokens and foundation components
- `Features` / `feature:*`: screen modules own their UI and feature view models
- `Core` / `core:network, auth, models`: API client, Supabase session handling, shared state logic
- feature modules may consume the design system, but must not define shadow tokens or local copies of primitives.

Do not attempt shared UI code between SwiftUI and Compose. Share contracts and API models; preserve native platform quality.

## 10. Native delivery sequence

### M0 — contract pack
Create and approve:
- native product/screen map;
- token and theme contract;
- component registry;
- mobile API/auth/state matrix;
- onboarding and navigation flow;
- App Store/Play compliance decision for ESPN.

### M1 — design-system foundation
Build token layers plus the smallest foundation-component set in SwiftUI and Compose. M1 adds the semantic focus-ring token and platform mappings: visible outline plus focus/selection behavior, never color alone. No feature screen until Button, FormField, Card, state surfaces, navigation, focus behavior, and theme behavior are proven.

### M2 — app shells
Create iOS and Android app projects, Supabase session boundary, demo mode, navigation shell, and release-safe configuration separation.

### M3 — vertical slice
Build the same end-to-end native slice in both apps:
Welcome → Demo → Sign in → Command Center → Omen mock/recovery states.

### M4 — decision tools
Add Trade Room, Draft Room, League, and Connections one feature at a time with contract parity tests.

### M5 — skins and visual elevation
Only after core screens and accessibility pass: introduce approved Omen-owned theme packs. Team skins remain a separate future decision.

## 10a. Ratified M0b/M1 decisions — 2026-07-19

- **Focus:** M1 adds a semantic `focus-ring` token. It must provide a visible outline and platform-appropriate focus/selection behavior; brass alone is not sufficient.
- **Typography:** Alegreya Sans (UI/headings/controls), Alegreya (long-form reading), and DM Mono (numeric/code-adjacent values) are locked. Cinzel and Inter are not native Omen typography.
- **Theming:** no team-color tokens or team skins ship in the phone MVP. Semantic status roles remain stable; team skins are a later founder decision.
- **Sequence:** M0b is inventory and rules only. Per-component SwiftUI/Compose build briefs belong in M1.

## 11. Current pause and allowed work

**Paused**
- New web page migrations.
- New web-only primitives.
- Marketing/public-front-door redesign.
- Treating the web page layout as the native layout.

**Allowed because mobile depends on it**
- Canonical backend/API contract work.
- Safe server-side fixes and tests.
- Existing web production maintenance and security fixes.
- Native contracts, native projects, mobile design system, and mobile implementation.

## 12. Definition of done for mobile work

Every mobile PR must state:
1. Contract version and owning feature.
2. iOS and Android parity status.
3. State coverage: live/mock/stale/empty/error/disconnected/recovery/off-season as applicable.
4. Accessibility evidence: VoiceOver/TalkBack labels, focus order, text scaling, contrast, and touch targets.
5. Theme/token usage with no raw screen-level color literals.
6. API/auth/privacy evidence.
7. Device evidence for a compact and large phone.
8. Whether it changes app-store/provider scope.

## 13. Founder decisions still required

- exact ESPN mobile connection method and whether it is deferred from v1;
- App Store and Google Play account/release ownership;
- whether iPad is v1 or post-phone launch;
- whether Android ships with feature parity or follows iOS by one milestone;
- approval of the mobile visual contract before full screen construction.
