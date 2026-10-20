# Production-path retirement audit — 2026-10-14

## Decision

Omen gets one production implementation per platform and customer journey. When a replacement earns
production status, the replaced screen/state/route is deleted from the shipping target. A recovery
path may retry, reconnect, change providers or fail honestly; it may not resurrect the retired UI.

Code may remain only when it is one of these explicitly named boundaries:

1. **data compatibility** — decoding a still-supported older server payload into the current model;
2. **URL/API compatibility** — a redirect or typed retirement response for an external caller;
3. **rollback evidence** — documentation or an artifact outside the shipping application target;
4. **another platform's current implementation** — only until that platform has a proven replacement.

Words such as `fallback`, `legacy`, `old` and `compat` are not themselves defects. A deterministic
copy fallback or old-payload decoder can be correct. The defect is a second reachable customer
experience for the same journey.

## Trigger

The founder asked why Rhody could encounter an old-style ESPN path when the current native path was
already known. Source inspection showed that Build 11 did launch the current in-app MyDisney sheet,
but repeated unreadable-session failures deliberately transitioned into the retired desktop-helper
screen. This was not stale binary provenance. It was stale behavior kept reachable inside the current
binary.

The same pattern existed on Android: native ESPN WebView connect was available, while repeated
failure could still transition to `UnsupportedOnMobile` and desktop-helper copy.

## Removed from shipping native code

### iPhone

- `ConnectState.unsupportedOnMobile`
- `ConnectState.checkingEspnConnection`
- `/espn-connect` native destination and `espnSetupURL`
- `Open ESPN setup` / `I connected ESPN` UI
- desktop-helper step list and read-back action
- repeated-session-failure transition into the retired handoff
- obsolete tests whose acceptance criterion was reaching that handoff

Repeated ESPN session failures now remain a typed native retryable error. The user can retry the
current ESPN sign-in or choose another provider; Omen does not quietly change the connection method.

### Android

- `ConnectState.UnsupportedOnMobile`
- repeated-session-failure transition into desktop-helper copy
- `SIGN_IN_FELL_BACK`
- the production rendering branch for unsupported native providers

Android's native ESPN flow remains paused as a release target, but its source now obeys the same
single-path rule.

## Retained deliberately

- The public `/espn-connect` website and extension documentation remain separate web tools. They are
  not linked or rendered by the native production connection state machines.
- Manual ESPN League ID entry remains inside the current native sign-in sheet after bounded automatic
  discovery fails. It does not change login mechanisms and uses the same in-memory native ESPN
  session, so it is recovery within one path rather than a second path.
- `OmenDecision` legacy-signal decoding and `OmenTradeCall` older-envelope decoding remain data
  compatibility shims. They produce the current screens and do not expose older UI.
- The retired optimizer endpoint returns an explicit typed retirement response. It does not render
  an older implementation.
- Demo Mode remains required for App Review and is explicitly labeled, not a fallback pretending to
  be live data.

## Enforcement

`npm run native:retired-paths:check` scans the shipping iOS and Android Connect source trees and fails
if retired native state names or desktop-helper phrases return. It intentionally does not scan the
public web guide.

`node scripts/check-screen-reachability.mjs` still passes for both native clients, but its limitation
matters: it proves scenario-mounted screens have production references, not that every production
reference is reachable or that two production implementations do not coexist. The new retirement
gate covers this known connection-path case; future journey replacements must add their retired
identifiers/copy to the same manifest as part of deletion.

## Verification

- iOS `ConnectFlowTests` and `OmenContextualHelpTests`: pass after the deletion.
- Native retired-path gate: pass across iOS and Android shipping Connect sources.
- Android `EspnConnectFlowTest` and `YahooConnectFlowTest`: pass; focused Gradle build succeeded.
- No provider call, tester inspection, production mutation, phone install, push, merge or store action
  is part of this source change.

## Next app-wide work

This audit establishes the rule and removes the proven connection duplicate; it does not claim every
historical screen in Omen has already been classified. Apply the same inspection in bounded slices:

1. Trade entry: retire the generic default composition after the canvas-aligned Type/Build surface is
   production-ready; do not keep both as competing front doors.
2. League: inventory exposed controls against their actual handlers and delete fixture-only promises.
3. Omen/Command/Ledger: distinguish old-payload decoders from duplicate screens; preserve the former,
   delete or isolate the latter.
4. Screenshot registry: add a reverse reachability check so production screens without scenarios are
   visible, and add a call-graph-aware check so a dead production reference cannot satisfy the gate.
5. Compatibility registry: every remaining shim names its owner, consumer, removal condition and test.

