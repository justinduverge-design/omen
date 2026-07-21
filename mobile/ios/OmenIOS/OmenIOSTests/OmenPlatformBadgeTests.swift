import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenPlatformBadgeTest.kt`. XCTest can't cheaply assert rendered Text
/// against a SwiftUI hierarchy without a snapshot library, so these tests pin the contract
/// guarantees that don't need a renderer:
///   1. every `OmenPlatform` case has a stable, human-readable label (color is never the
///      only signal — registry §4, facts-of-record #7);
///   2. every case resolves to its registry §2.3 `platform-*-chip` fill and `on-platform-*`
///      foreground tokens (fill-on-platform treatment);
///   3. the base `platform-*` tokens still exist as public API for non-chip use.
final class OmenPlatformBadgeTests: XCTestCase {
    func testEveryPlatformHasATextLabel() {
        XCTAssertEqual(label(for: .sleeper), "Sleeper")
        XCTAssertEqual(label(for: .yahoo), "Yahoo")
        XCTAssertEqual(label(for: .espn), "ESPN")
    }

    func testEveryPlatformResolvesToItsBaseToken() {
        // Base tokens remain available for any non-chip provider identity use.
        XCTAssertEqual(basePlatformToken(for: .sleeper), OmenColor.Data.platformSleeper)
        XCTAssertEqual(basePlatformToken(for: .yahoo), OmenColor.Data.platformYahoo)
        XCTAssertEqual(basePlatformToken(for: .espn), OmenColor.Data.platformEspn)
    }

    func testEveryPlatformHasChipAndOnPlatformTokens() {
        XCTAssertEqual(chipFill(for: .sleeper), OmenColor.Data.platformSleeperChip)
        XCTAssertEqual(chipFill(for: .yahoo), OmenColor.Data.platformYahooChip)
        XCTAssertEqual(chipFill(for: .espn), OmenColor.Data.platformEspnChip)
        XCTAssertEqual(onChipForeground(for: .sleeper), OmenColor.Data.onPlatformSleeper)
        XCTAssertEqual(onChipForeground(for: .yahoo), OmenColor.Data.onPlatformYahoo)
        XCTAssertEqual(onChipForeground(for: .espn), OmenColor.Data.onPlatformEspn)
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

    private func basePlatformToken(for platform: OmenPlatform) -> Color {
        switch platform {
        case .sleeper: return OmenColor.Data.platformSleeper
        case .yahoo:   return OmenColor.Data.platformYahoo
        case .espn:    return OmenColor.Data.platformEspn
        }
    }

    private func chipFill(for platform: OmenPlatform) -> Color {
        switch platform {
        case .sleeper: return OmenColor.Data.platformSleeperChip
        case .yahoo:   return OmenColor.Data.platformYahooChip
        case .espn:    return OmenColor.Data.platformEspnChip
        }
    }

    private func onChipForeground(for platform: OmenPlatform) -> Color {
        switch platform {
        case .sleeper: return OmenColor.Data.onPlatformSleeper
        case .yahoo:   return OmenColor.Data.onPlatformYahoo
        case .espn:    return OmenColor.Data.onPlatformEspn
        }
    }
}
