import XCTest
@testable import Omen

private final class FakeTransport: GoTrueTransport {
    var otpResult: TransportResult = .ok
    var verifyResult: TransportResult = .ok
    var idTokenResult: TransportResult = .ok
    var refreshResult: TransportResult = .ok

    func requestEmailOtp(email: String) async -> TransportResult { otpResult }
    func verifyEmailOtp(email: String, code: String) async -> TransportResult { verifyResult }
    func signInWithIDToken(provider: String, idToken: String, nonce: String?) async -> TransportResult { idTokenResult }
    func refresh(refreshToken: String) async -> TransportResult { refreshResult }
}

/// Mirrors Android `SupabaseAuthRepositoryTest.kt` (9 tests). `appleClientErrorIsUnsupported`
/// replaces the Android suite's `googleClientErrorIsUnsupported` — same status-mapping rule
/// (400..403 -> `.unsupported`), Apple instead of Google.
final class SupabaseAuthRepositoryTests: XCTestCase {
    func testOtpOkMapsToOtpSent() async {
        let transport = FakeTransport()
        transport.otpResult = .ok
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.requestEmailOtp(email: "user@example.com")

        XCTAssertEqual(outcome, .otpSent)
    }

    func testOtpNetworkErrorIsRetryableNetwork() async {
        let transport = FakeTransport()
        transport.otpResult = .networkError
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.requestEmailOtp(email: "user@example.com")

        XCTAssertEqual(outcome, .retryableError(code: .network))
    }

    func testVerifySessionComputesExpiryFromClock() async {
        let transport = FakeTransport()
        transport.verifyResult = .sessionTokens(userID: "u1", accessToken: "a", refreshToken: "r", expiresInSeconds: 3600)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })

        let outcome = await repo.verifyEmailOtp(email: "user@example.com", code: "123456")

        guard case .success(let session) = outcome else {
            XCTFail("expected success")
            return
        }
        XCTAssertEqual(session.expiresAtEpochSeconds, 4_600)
    }

    func testVerifyBadCodeStatusMapsToInvalidCode() async {
        let transport = FakeTransport()
        transport.verifyResult = .httpError(status: 401)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.verifyEmailOtp(email: "user@example.com", code: "000000")

        XCTAssertEqual(outcome, .invalidCode)
    }

    func testVerifyServerErrorIsRetryableServer() async {
        let transport = FakeTransport()
        transport.verifyResult = .httpError(status: 500)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.verifyEmailOtp(email: "user@example.com", code: "000000")

        XCTAssertEqual(outcome, .retryableError(code: .server))
    }

    func testAppleClientErrorIsUnsupported() async {
        let transport = FakeTransport()
        transport.idTokenResult = .httpError(status: 400)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.signInWithAppleIDToken(idToken: "id", rawNonce: "nonce")

        XCTAssertEqual(outcome, .unsupported)
    }

    func testRefreshWithoutStoredTokenNeedsReauth() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.refresh()

        XCTAssertEqual(outcome, .needsReauth)
    }

    func testRefreshWithStoredTokenSucceeds() async {
        let transport = FakeTransport()
        transport.refreshResult = .sessionTokens(userID: "u1", accessToken: "a2", refreshToken: "r2", expiresInSeconds: 3600)
        let existing = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 1_000)
        let repo = SupabaseAuthRepository(
            transport: transport,
            sessionStore: InMemorySecureSessionStore(initial: existing),
            nowEpochSeconds: { 2_000 }
        )

        let outcome = await repo.refresh()

        guard case .success(let session) = outcome else {
            XCTFail("expected success")
            return
        }
        XCTAssertEqual(session.accessToken, "a2")
    }

    func testRefreshHttpErrorNeedsReauth() async {
        let transport = FakeTransport()
        transport.refreshResult = .httpError(status: 401)
        let existing = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 1_000)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore(initial: existing))

        let outcome = await repo.refresh()

        XCTAssertEqual(outcome, .needsReauth)
    }
}
