# J2, J4, J5, J6 and native chrome close-out

**Date:** 2026-09-20  
**Branch:** `opus5/j2-j4-j5-j6`  
**Base:** `c36b2b8c` (`origin/claude/j3-first-call`)

## Landed

- J2 “the desk”: CommandCenter, SwitchSheet, SwitchLoading, CommandQuiet and CommandQuietStraight.
- J4 “settling an argument”: TradeBuild, TradeRoster, TradeVerdict, TradeNeedsContext and TradeShare.
- J5 “the scout's nest”: LeagueTable, LeagueWaiver, LeagueDegraded, LeagueNoRosters, WaiverNoMove and WaiverNotDetermined.
- J6 “the receipts”: Ledger and LedgerDetail, plus explicit degraded artboards for both.
- Chrome: Account, Privacy & data, deletion phrase gate, ReportPill, report composer, received and not-saved states.

All listed surfaces exist on iOS and Android. Journey screens have paired nominal/degraded scenario
keys and journey interaction coverage. Chrome has one scenario per genuine state rather than an
invented seventh journey. Production references were checked separately from screenshot registration.

## Evidence

The four ordered journey sheets contain 52 inspected frames. Chrome contains 18 more inspected
frames and a byte/hash manifest:

- `Solutions/deliverables/native-runs/2026-09-20-j2-the-desk/`
- `Solutions/deliverables/native-runs/2026-09-20-j4-settling-an-argument/`
- `Solutions/deliverables/native-runs/2026-09-20-j5-the-scouts-nest/`
- `Solutions/deliverables/native-runs/2026-09-20-j6-the-receipts/`
- `Solutions/deliverables/native-runs/2026-09-20-chrome/`

Chrome interaction audit: 13/13 iOS UI tests passed. Android app verification after chrome: 200
unit tests, 0 failures, plus `:app:assembleDebug`. The combined iOS run executed 495 unit tests
(one optional HTTP-only spike skipped) and 94 UI tests. Its one real failure was the Account file's
two raw SwiftUI buttons; after replacing them with `OmenButton`, the focused primitive suite passed
2/2. Two existing accessibility audits still record expected failures for app-wide Dynamic Type
recognition and Command Center contrast; they are not reported as clean or silently removed.

## Defects found by inspection and interaction

- Shared iOS icon controls laid out at 44pt but exposed only the glyph as the hit region; the shared
  primitive now claims its full content shape.
- Two J4 controls were narrower than 44pt; both axes are now floored.
- D11's first implementation measured content and viewport at the same level and could only return
  zero. The repaired probe was sanity-checked with injected height and comma-formatted four-digit
  measurements.
- Android's initial chrome capture omitted all provider badges even though it built; the real badges
  now render in each connected-league row.
- The initial Android ReportPill evidence frame mounted the component over an empty field. The final
  scenario mounts the real Command fixture below the real overlay and places it above the bottom nav.
- Android Account used the 32sp heading role and Material's default list metrics, producing inflated
  rows and a header that did not match iOS. It now uses the 22sp screen-title role, compact token-backed
  rows, and the required contextual-help control. Privacy now carries the same export/provider boundary
  and explicit danger hierarchy as iOS; report outcomes use signal/risk cards rather than loose text.
- Android's first composer implicitly accepted disclosure. Sending now requires an explicit
  “I understand what this sends” action; the payload starts with acceptance false.
- `win` and raw issue timestamps could leak through Ledger receipts. Both platforms now map the
  closed outcome vocabulary and render issue time in the named zone.

## Report boundary

The beta-report client body is closed to nine fields: screen, app version, build, OS version, device
model, provider connection state, at most five scrubbed error codes, user note and disclosure
acceptance. No open dictionary exists. `503 report_storage_unavailable` is rendered as not saved;
`201` says received and carries only the returned reference. The review-only storage SQL was not
applied, and this work does not claim storage exists.

## Remaining known product gaps

- TradeBuild, TradeRoster and TradeShare still need native client reads/actions that do not exist in
  the current contracts; they must not be made “reachable” with fabricated rosters or inert sharing.
- CommandQuiet needs the `quiet-week.v1` client slice before it can be selected honestly in production.
- Android ConnectFailed still needs the structured provider diagnostic promoted through its failure
  model. StartSit reachability is carried from J3. These are reflected by the reachability checker;
  an unclosed count is not reported as green.
- `move-detail.v2` still does not carry historical band, risk or reasoning. Receipt screens leave
  those fields absent rather than borrowing the current brief.
- `BE-OmenBriefFalsifier` remains open: `what_could_change_this` is not in the Omen brief.
- `Brand/brand-system.md` still contains the retired numeric-confidence example; flagged, not edited.

## Procedure receipt

The work followed the native canvas-to-code, native simulation/capture and repository testing
procedures. The available `run-slops-saloon` skill was consulted for evidence discipline, but its
browser-driving route is not a substitute for SwiftUI/Compose capture. Visual inspection was done
frame-by-frame after the parallel implementation work landed. The Android emulator's system UI wedged
behind an ANR during recapture; the capture guard correctly refused nine frames. A cold host-GPU boot,
fresh APK install, and second batch produced nine nonblank frames; each timestamp/hash was refreshed
and each replacement was opened individually. No deploy, store upload, production mutation, provider
credential read, or SQL application occurred.
