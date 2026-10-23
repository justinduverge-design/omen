import XCTest
@testable import Omen

/// Every player badge's number must be readable on its team colour (foundation v1 § 7: 4.5:1 text).
final class NFLTeamColorContrastTests: XCTestCase {
    func testEveryTeamPairClearsTextContrast() {
        XCTAssertEqual(OmenNFLTeamColors.pairs.count, 32)
        for (team, pair) in OmenNFLTeamColors.pairs {
            let ratio = OmenNFLTeamColors.contrast(pair.fill, pair.text)
            XCTAssertGreaterThanOrEqual(ratio, 4.5, "\(team) badge text is \(String(format: "%.2f", ratio)):1")
        }
    }

    func testProviderAliasesResolve() {
        XCTAssertEqual(OmenNFLTeamColors.pair(for: "jac"), OmenNFLTeamColors.pairs["JAX"])
        XCTAssertEqual(OmenNFLTeamColors.pair(for: "WSH"), OmenNFLTeamColors.pairs["WAS"])
        XCTAssertNil(OmenNFLTeamColors.pair(for: "FA"))
        XCTAssertNil(OmenNFLTeamColors.pair(for: nil))
    }
}
