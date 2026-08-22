# M4-CC-WaiverWatch — iOS render evidence, 2026-08-22

The gap this closes: `M4-CC-WaiverWatch` merged as PR #271 / `e59fe40` and its XCTest run passed,
but **a passing test proves the assertions hold, not that anyone looked at the states.** The
sprint record said so explicitly. These are the states rendered and reviewed.

## What was captured

| File | State | Approved copy asserted |
|---|---|---|
| `ios-17-pro-max-waiver-watch-pending.png` | `.pending` | "Claim pending" / "Omen has identified an opportunity. Claim outcome is not yet known." |
| `ios-17-pro-max-waiver-watch-processed.png` | `.processed` | "Waivers processed" / "Your league's waivers have processed. Review current opportunities." + the "Review Omen's waiver analysis →" link |
| `ios-17-pro-max-waiver-watch-availability-unknown.png` | `.availabilityUnknown` | "Availability needs confirmation" / "Omen cannot confirm availability for this league." |
| `ios-17-pro-max-waiver-watch-no-credible-move.png` | `.noCredibleMove` | "No credible move" / "No waiver move stands out for this roster right now." |
| `ios-17-pro-max-waiver-watch-not-connected.png` | `.notConnected` | "Personalized waiver moves need a league" |
| `ios-17-pro-max-waiver-watch-off-season.png` | `.offSeason` | "Long-horizon waiver context" |

These are the same six honest states asserted by the Android connected test
`OmenCommandCenterScreenTest.everyRequiredHonestWaiverWatchStateRendersItsApprovedMessage`.

## How to reproduce

```bash
xcodebuild build -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/ios CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO
scripts/capture-screenshot-scenario.sh ios waiver-watch.pending out.png "iPhone 17 Pro Max"
```

Then scroll to the Waiver Watch section before capturing — see the limitation below.

## Environment

- Device: iPhone 17 Pro Max simulator, iOS 26.5, 1320×2868.
- Xcode **26.6 (17F113)**, recorded per the "Local substitutes" rule in
  `Blueprints/definition-of-done.md`.
- Screenshot mode: no session, no auth, no network, no provider state. Nothing here can contain a
  real credential, cookie, or league.

## Honest limitations

- **Waiver Watch renders below the fold on every current iPhone**, including the largest. Each
  capture required a scroll after launch. That means these scenarios are **deliberately not added
  to the `native-visual-evidence.yml` matrix**: that workflow captures with no interaction, so a
  matrix row would upload a screenshot of the *top* of the Command Center labelled as Waiver Watch
  evidence — worse than no row at all. Making them CI-capturable needs a scroll anchor on
  `OmenCommandCenterScreen`, which is a change to a shipped screen and out of this item's scope.
- **The `urgent` and `calm` states are not in this set.** The item's `Done when:` names the six
  honest states, which is what the Android test asserts and what these cover. `urgent` is already
  visible in the existing `command-center.demo-connected` captures on both platforms. **`calm` has
  no committed render on either platform** — stated here rather than left for someone to discover.
- These are renders, not an accessibility pass. Waiver Watch has no accessibility-audit test of its
  own; the audit coverage that exists is for contextual help, forced update, and (as of this pass)
  Help + Support.
