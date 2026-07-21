import XCTest
@testable import Omen

/// Mirrors Android `AccountDeletionTest.kt` (3 tests).
final class AccountDeletionTests: XCTestCase {
    func testConfirmsOnlyExactPhrase() {
        XCTAssertTrue(AccountDeletion.isConfirmed("DELETE MY OMEN DATA"))
    }

    func testRejectsNearMisses() {
        XCTAssertFalse(AccountDeletion.isConfirmed("delete my omen data"))
        XCTAssertFalse(AccountDeletion.isConfirmed(" DELETE MY OMEN DATA "))
        XCTAssertFalse(AccountDeletion.isConfirmed("DELETE MY DATA"))
        XCTAssertFalse(AccountDeletion.isConfirmed(""))
    }

    func testStatusMapping() {
        XCTAssertEqual(mapDeleteStatus(200), .deleted)
        XCTAssertEqual(mapDeleteStatus(400), .invalidConfirmation)
        XCTAssertEqual(mapDeleteStatus(401), .unauthorized)
        XCTAssertEqual(mapDeleteStatus(503), .retryableError(code: .server))
        XCTAssertEqual(mapDeleteStatus(504), .retryableError(code: .timeout))
    }
}
