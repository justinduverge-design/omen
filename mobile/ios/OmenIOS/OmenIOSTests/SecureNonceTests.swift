import XCTest
@testable import Omen

final class SecureNonceTests: XCTestCase {
    func testGeneratedNoncesHaveExpectedShapeAndAreUnique() {
        let allowedCharacters = Set("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonces = (0..<50).map { _ in SecureNonce.generate() }

        XCTAssertEqual(Set(nonces).count, 50)
        for nonce in nonces {
            XCTAssertEqual(nonce.count, 32)
            XCTAssertTrue(Set(nonce).isSubset(of: allowedCharacters))
        }
    }
}
