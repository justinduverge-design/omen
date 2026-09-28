# Native provider recovery verification

Status: testable verification contract; no device deployment or provider-account mutation was
performed.

This checklist closes the native acceptance-test gap for the two persisted health states in the
provider recovery inventory. It is deliberately endpoint-led: native clients must render the
state returned by the endpoint they called, preserve the last known league context during a
temporary outage, and never manufacture an empty account from a failed read.

## Required scenarios

| Scenario | Fixture/response | Required visible behavior | Forbidden behavior |
| --- | --- | --- | --- |
| Reconnect required | `GET /api/leagues` returns one provider group with `connection_state: reconnect_required` | Provider is identified as needing reconnection and the reconnect/reauthorize action is available | Logging the user out globally, displaying cookies/tokens, or showing the provider as empty/not connected |
| Temporarily unavailable | `GET /api/leagues` returns one provider group with `connection_state: temporarily_unavailable` | Provider remains identifiable, last known league context is retained, and retry is available | Evicting credentials, forcing reauthentication, or replacing the group with an empty account |
| Partial directory failure | One provider group is unavailable while another is connected | Healthy provider groups remain usable and independently rendered | Hiding every provider or treating the failed group as proof that no leagues exist |
| Stale response | A response from an older credential generation arrives after a newer generation | Older response is ignored; current state remains authoritative | Reverting a connected/recovered provider to an older failure state |

## Local verification gates

These gates prove contract and build reachability only; they are not device or production proof.

```sh
node --test test/providerRecoveryContractInventory.test.js \
  test/providerConnectionState.test.js \
  test/nativeProviderRecoveryVerification.test.js
cd mobile/android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj \
  -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:OmenIOSTests
```

If a native toolchain is unavailable, record the gate as unavailable/substituted. A passing
backend test or simulator build must not be reported as physical-device verification. Physical
verification requires fresh captures for both states on iOS and Android, with the expected and
forbidden outcomes above inspected by a human.

## Source of truth

- `Blueprints/handoffs/2026-09-28-provider-recovery-contract-inventory.md`
- `src/services/providerConnectionState.js`
- `src/routes/platforms.js`
- `src/routes/leagues.js`
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/api/LeagueDirectory.kt`

