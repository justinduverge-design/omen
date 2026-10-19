import XCTest
@testable import Omen

/// Contract coverage for the reusable platform strip, independent of Command fixtures.
final class OmenPlatformCompactStripTests: XCTestCase {
    func testLastSyncRendersOnlyWhenConnected() {
        let connected = OmenPlatformRowState(platform: .sleeper, status: .connected, lastSyncText: "4m ago")
        XCTAssertEqual(connected.resolvedLastSyncText, "4m ago")
        for status in [OmenConnectionStatus.disconnected, .needsReauth, .error, .pending, .recovering] {
            let row = OmenPlatformRowState(platform: .yahoo, status: status, lastSyncText: "4m ago")
            XCTAssertNil(row.resolvedLastSyncText, "\(status) must suppress last sync")
        }
    }

    func testAccessibilityLabelCombinesPlatformStatusAndSyncIntoOneElement() {
        let row = OmenPlatformRowState(platform: .sleeper, status: .connected, lastSyncText: "4m ago")
        XCTAssertEqual(row.accessibilityLabel, "Sleeper, Connected, last sync 4m ago")
        let reauth = OmenPlatformRowState(platform: .yahoo, status: .needsReauth, lastSyncText: "2h ago")
        XCTAssertEqual(reauth.accessibilityLabel, "Yahoo, Reauth needed")
    }

    func testStatusTextComesFromTheSharedEnumNotASecondVocabulary() {
        XCTAssertEqual(omenConnectionStatusLabel(.needsReauth), "Reauth needed")
        XCTAssertEqual(omenConnectionStatusLabel(.connected), "Connected")
    }
}
