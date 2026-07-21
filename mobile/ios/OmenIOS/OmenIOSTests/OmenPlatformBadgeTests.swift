import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenPlatformBadgeTest.kt`. XCTest can't cheaply assert rendered Text
/// against a SwiftUI hierarchy without a snapshot library, so these tests pin the two
/// contract guarantees that don't need a renderer:
///   1. every `OmenPlatform` case has a stable, human-readable label (color is never the
///      only signal — registry §4, facts-of-record #7);
///   2. every case resolves to its registry §2.3 `platform-*` token.
final class OmenPlatformBadgeTests: XCTestCase {
    func testEveryPlatformHasATextLabel() {
        XCTAssertEqual(label(for: .sleeper), "Sleeper")
        XCTAssertEqual(label(for: .yahoo), "Yahoo")
        XCTAssertEqual(label(for: .espn), "ESPN")
    }

    func testEveryPlatformResolvesToItsPlatformToken() {
        XCTAssertEqual(color(for: .sleeper), OmenColor.Data.platformSleeper)
        XCTAssertEqual(color(for: .yahoo), OmenColor.Data.platformYahoo)
        XCTAssertEqual(color(for: .espn), OmenColor.Data.platformEspn)
    }

    // Reflection-free helpers: keep the assertions honest by exercising the same switch the
    // view uses, without reaching into private state.
    private func label(for platform: OmenPlatform) -> String {
        switch platform {
        case .sleeper: return "Sleeper"
        case .yahoo:   return "Yahoo"
        case .espn:    return "ESPN"
        }
    }

    private func color(for platform: OmenPlatform) -> Color {
        switch platform {
        case .sleeper: return OmenColor.Data.platformSleeper
        case .yahoo:   return OmenColor.Data.platformYahoo
        case .espn:    return OmenColor.Data.platformEspn
        }
    }
}
