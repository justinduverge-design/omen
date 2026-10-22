import XCTest
@testable import Omen

/// Injury designations and trade locks reach the player row in plain words (spec § 9 data gap closed).
final class PlayerStatusTests: XCTestCase {
    func testProviderCodesBecomeWords() {
        XCTAssertEqual(OmenPlayerSummary.injuryWord("Q"), "Questionable")
        XCTAssertEqual(OmenPlayerSummary.injuryWord("OUT"), "Out")
        XCTAssertEqual(OmenPlayerSummary.injuryWord("INJURY_RESERVE"), "Injured reserve")
        XCTAssertEqual(OmenPlayerSummary.injuryWord("Doubtful"), "Doubtful")
        XCTAssertNil(OmenPlayerSummary.injuryWord("ACTIVE"))
        XCTAssertNil(OmenPlayerSummary.injuryWord(nil))
        XCTAssertNil(OmenPlayerSummary.injuryWord(" "))
    }

    func testRosterPlayerCarriesStatusAndLock() throws {
        let json = #"{"player_key":"espn:1","name":"Tony Pollard","position":"RB","team":"TEN","status":"OUT","trade_locked":true}"#
        let player = try JSONDecoder().decode(TradeRosterResponse.Player.self, from: Data(json.utf8))
        let summary = OmenPlayerSummary(player, providerName: "ESPN")
        XCTAssertEqual(summary.injury, "Out")
        XCTAssertTrue(summary.locked)
    }

    func testMissingLockIsNotALock() throws {
        let json = #"{"player_key":"sleeper:2","name":"Puka Nacua","status":null}"#
        let player = try JSONDecoder().decode(TradeRosterResponse.Player.self, from: Data(json.utf8))
        let summary = OmenPlayerSummary(player, providerName: "Sleeper")
        XCTAssertNil(summary.injury)
        XCTAssertFalse(summary.locked)
    }
}
