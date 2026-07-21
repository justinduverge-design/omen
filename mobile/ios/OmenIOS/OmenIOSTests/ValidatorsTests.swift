import XCTest
@testable import Omen

/// Mirrors Android `ValidatorsTest.kt` (5 tests).
final class ValidatorsTests: XCTestCase {
    func testAcceptsWellFormedEmail() {
        XCTAssertTrue(EmailValidator.isValid("user@example.com"))
    }

    func testRejectsMalformedEmail() {
        XCTAssertFalse(EmailValidator.isValid("not-an-email"))
        XCTAssertFalse(EmailValidator.isValid("user@"))
        XCTAssertFalse(EmailValidator.isValid("@example.com"))
        XCTAssertFalse(EmailValidator.isValid(""))
    }

    func testNormalizesEmail() {
        XCTAssertEqual(EmailValidator.normalize("  User@Example.com  "), "user@example.com")
    }

    func testAcceptsSixDigitCode() {
        XCTAssertTrue(OtpCodeValidator.isValid("123456"))
    }

    func testRejectsBadCodes() {
        XCTAssertFalse(OtpCodeValidator.isValid("12345"))
        XCTAssertFalse(OtpCodeValidator.isValid("1234567"))
        XCTAssertFalse(OtpCodeValidator.isValid("12a456"))
        XCTAssertFalse(OtpCodeValidator.isValid(""))
    }
}
