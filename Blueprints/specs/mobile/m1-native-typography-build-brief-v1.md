# M1 Native Typography Build Brief v1

**Status:** Build input — approved scope, implementation not started
**Date:** 2026-07-19
**Owner:** Native design-system foundation
**Scope:** Shared type-role contract for future SwiftUI and Jetpack Compose foundations.
**Contract sources:** `omen-native-design-system-registry-v1.md` §§2.4, 2.6, 4, 7; `omen-native-mobile-foundation-v1.md` §10a; `omen-native-design-house-v1.md` §§3–5.

## 1. Job and boundary

Lock one readable Omen hierarchy across iPhone and Android: Alegreya Sans for UI/headings/controls, Alegreya for long-form reading, and DM Mono for numeric or code-adjacent values.

This brief defines role tokens and accessibility behavior only. It does not add font files, scaffold native projects, change web typography, create a feature screen, or modify Figma, auth, APIs, providers, or deployment configuration.

## 2. Locked role map

| Role | Family | Baseline | Weight | Intended use |
|---|---|---:|---:|---|
| `display` | Alegreya Sans | 48/56 | 700 | One marketing hero per screen at most. |
| `h1` | Alegreya Sans | 32/40 | 700 | Product-screen title. |
| `h2` | Alegreya Sans | 20/28 | 600 | Card title. |
| `h3` | Alegreya Sans | 16/24 | 600 | Subsection header. |
| `body` | Alegreya | 15/24 | 400 | Explanations and long-form reading. |
| `body-sm` | Alegreya | 13/20 | 400 | Secondary/meta copy. |
| `label` | Alegreya Sans | 12/16 | 500 + 0.05em | Form/control label. |
| `eyebrow` | DM Mono | 12/16 | 500 + 0.12em uppercase | Compact context above a title. |
| `chip` | DM Mono | 11/14 | 500 + 0.10em uppercase | Badge/chip label. |
| `numeric` | DM Mono | contextual | 500 | Scores, tables, structured values, and code-adjacent data. |

Cinzel and Inter are explicitly excluded from native Omen UI. A platform fallback is allowed only when it preserves the role relationship and accessibility behavior; it is not permission to substitute a generic platform type scale for Omen's hierarchy.

## 3. Planned implementation interface

Exact file/module paths wait for M2. M1 implementation must expose roles rather than allowing features to name fonts directly.

| Concern | iOS SwiftUI target | Android Compose target | Rule |
|---|---|---|---|
| Type roles | `OmenTypography.display`, `.h1`, `.body`, etc. | `OmenTheme.typography.display`, `.h1`, `.body`, etc. | Feature modules select a role, never a font name or raw point/sp value. |
| Font registration | app/design-system font bundle configuration | app resource/font-family configuration | Validate the approved family is available before claiming the role is live. |
| Scaling | Dynamic Type-compatible text styles and layout reflow | font-scale-aware `sp` styles and layout reflow | No fixed-size text that disables accessibility scaling. |
| Numeric alignment | tabular-number setting where the platform supports it | tabular-number setting where the platform supports it | Apply only to the `numeric` role where useful. |

The registry spacing scale (`4, 8, 12, 16, 24, 32, 48, 64, 96`) remains separate from typography. A typography role does not authorize arbitrary spacing or screen-local text styles.

## 4. Platform behavior

### iOS

- Map roles to SwiftUI text styles that participate in Dynamic Type; custom fonts must scale through the system's relative-style mechanism.
- Do not truncate a required action, error, status, or decision title at larger accessibility sizes. Reflow or stack the layout.
- Keep VoiceOver labels semantic. Decorative display text must not duplicate the accessible screen title.
- Preserve readable text contrast on opaque fallbacks when Reduce Transparency changes a system-material surface.

### Android

- Map roles to Compose `Typography` entries using font-scale-aware text units; preserve Material 3 semantics and accessibility defaults.
- Do not clamp font scale for layout convenience. Reflow or stack actions, labels, and metric rows.
- Maintain TalkBack semantics independently from visual uppercase/tracking treatment.
- Do not auto-adopt dynamic color if it weakens text/status contrast or Omen's semantic roles.

## 5. Required component coverage

The first M1 foundation implementations use the roles consistently:

- Button and IconButton: `label` or a documented action-label role;
- FormField, TextField, Picker, and errors: `label`, `body-sm`, and `body` as appropriate;
- Card, Alert, state surfaces, and ListRow: `h2`/`h3`, `body`, and `body-sm` by hierarchy;
- Badge, Chip, PlatformBadge, and compact state labels: `chip` or `eyebrow` only when the compact uppercase treatment is readable;
- Meter, MetricStrip, score, and structured values: `numeric` with a readable text label.

## 6. Acceptance evidence for the later implementation PR

1. All ten roles are defined once in each native design system; no screen/feature carries a raw font family or fixed unscaled text size.
2. Compact and large-phone screenshots in dark and light/system demonstrate product title, body copy, label/error, chip, and numeric score hierarchy.
3. iOS Dynamic Type and Android font-scale checks cover default, large, and a high accessibility size with no clipped primary action, error, or recommendation text.
4. VoiceOver/TalkBack results confirm readable labels and state announcements; text styling never removes semantic meaning.
5. The implementation contains no Cinzel or Inter native UI roles and no unauthorized team-theme typography.
6. iOS and Android retain the same role semantics while using their native typography/layout mechanisms; pixel-for-pixel matching is not required.

## 7. Explicit exclusions and dependencies

- **No native project scaffolding or font-file acquisition:** M2 and a separately approved asset/source decision own those actions.
- **No Figma edit:** current Figma component/token pages are pending; this Markdown is the working source of truth.
- **No copy rewrite:** existing approved product copy is unchanged.
- **No provider/auth/API work:** this is presentation foundation only.
- **Dependency:** apply with `m1-focus-ring-build-brief-v1.md`; M1 component implementation must satisfy both token contracts before any feature screen begins.

## 8. Definition of ready

This brief is ready when either platform implementer can register the approved type families, expose the defined role API, and demonstrate accessibility-scale behavior without deciding new typography, copy, or screen architecture.
