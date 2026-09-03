import XCTest
@testable import Omen

/// Mirrors Android `AccountDeletionTest.kt` (3 tests).
final class AccountDeletionTests: XCTestCase {
    func testConfirmsOnlyExactPhrase() {
        XCTAssertTrue(AccountDeletion.isConfirmed("delete"))
    }

    func testRejectsNearMisses() {
        XCTAssertFalse(AccountDeletion.isConfirmed("delete my omen data"))
        // Trimmed and case-insensitive since 2026-09-03. On a phone, autocapitalize turns "delete"
        // into "Delete" and a stray space is one fat-finger away; failing a user there protects
        // nothing. What still must fail is a different word, or an empty box.
        XCTAssertTrue(AccountDeletion.isConfirmed(" Delete "))
        XCTAssertTrue(AccountDeletion.isConfirmed("DELETE"))
        XCTAssertFalse(AccountDeletion.isConfirmed(""))
        XCTAssertFalse(AccountDeletion.isConfirmed("del"))
        XCTAssertFalse(AccountDeletion.isConfirmed("delete my account"))
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
