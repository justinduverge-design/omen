# M1-P P2 — TextField, FormField + Picker — 2026-07-20

## Scope

Completed the shared native field-control foundation slice on
`claude/m1p-p2-designsystem-tokens`. It adds TextField/FormField/Picker in Android Compose and
iOS SwiftUI without migrating any auth or feature screen, changing APIs/providers, adding a
token, Figma pattern, dependency, signing setting, or release behavior.

## Delivered

- Android: token-backed `OmenTextField` (text/email/number/password, sm/md/lg, error/disabled),
  `OmenFormField` (label/hint/error/success) and Material 3 exposed-dropdown `OmenPicker`.
- iOS: native `TextField`/`SecureField`, generic form wrapper, and native `Picker` foundation
  with the same contract-level variants/states; added Xcode Sources references.
- Android debug gallery gained default, error, success, disabled, and picker examples.
- Android device tests cover text update, error announcement, disabled behavior, and picker
  selection in addition to the pre-existing Button/IconButton coverage.

## Verification

- RED observed: the new Android device test failed before components existed (after setting the
  Studio JBR in the shell; the initial shell lacked `JAVA_HOME`).
- GREEN: `:core:designsystem:connectedDebugAndroidTest` — 10/10 passed on Medium_Phone Android
  17; `:core:designsystem:testDebugUnitTest` — 18/18 passed; `:app:assembleDebug` passed.
- iOS unsigned macOS simulator CI `29788913948` — **passed**, `Build OmenIOS (simulator,
  unsigned)` in 32 seconds. Only annotation: unrelated `actions/checkout@v4` Node.js 20
  deprecation.
- `git diff --check` clean before commit; code commit `fe18fda` pushed.

## Limitation and next gate

The gallery compiles and the Android device tests ran, but a direct gallery screenshot was not
captured in this shell because the Studio-managed ADB path was unavailable to CLI discovery.
No visual screenshot is claimed. iOS has compilation evidence only, not device/VoiceOver evidence.

Next recommended P2 work: split Card/Badge/Chip/Modal/State-surfaces into small approved-registry
slices; do not create a feature-local clone or unapproved composition.
