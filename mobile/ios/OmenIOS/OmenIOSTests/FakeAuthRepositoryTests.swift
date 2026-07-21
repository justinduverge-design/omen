import XCTest
@testable import Omen

/// Mirrors Android `FakeAuthRepositoryTest.kt` (5 tests).
final class FakeAuthRepositoryTests: XCTestCase {
    func testRequestOtpSucceedsForValidEmail() async {
        let repo = FakeAuthRepository()
        let outcome = await repo.requestEmailOtp(email: "user@example.com")
        XCTAssertEqual(outcome, .otpSent)
    }

    func testVerifyReturnsSuccessForValidCode() async {
        let repo = FakeAuthRepository()
        let outcome = await repo.verifyEmailOtp(email: "user@example.com", code: "123456")
        guard case .success(let session) = outcome else {
            XCTFail("expected success")
            return
        }
        XCTAssertEqual(session.userID, "user@example.com")
    }

    func testVerifyReturnsInvalidForWrongCode() async {
        let repo = FakeAuthRepository()
        let outcome = await repo.verifyEmailOtp(email: "user@example.com", code: "000000")
        XCTAssertEqual(outcome, .invalidCode)
    }

    func testAppleUnsupportedWhenNotConfigured() async {
        let repo = FakeAuthRepository()
        repo.appleConfigured = false
        let outcome = await repo.signInWithAppleIDToken(idToken: "id", rawNonce: "nonce")
        XCTAssertEqual(outcome, .unsupported)
    }

    func testSignOutFlags() async {
        let repo = FakeAuthRepository()
        await repo.signOut()
        XCTAssertTrue(repo.signOutCalled)
    }
}
