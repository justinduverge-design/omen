import XCTest
@testable import Omen

private final class FakeTransport: GoTrueTransport {
    var otpResult: TransportResult = .ok
    var verifyResult: TransportResult = .ok
    var idTokenResult: TransportResult = .ok
    var refreshResult: TransportResult = .ok
    var oauthResult: TransportResult = .sessionTokens(userID: "u1", accessToken: "a", refreshToken: "r", expiresInSeconds: 3600)
    var passkeyChallengeResult: TransportResult = .challenge("fake-challenge")
    var passkeyVerifyResult: TransportResult = .sessionTokens(userID: "u1", accessToken: "a", refreshToken: "r", expiresInSeconds: 3600)
    var passkeyRegisterResult: TransportResult = .ok

    func requestEmailOtp(email: String) async -> TransportResult { otpResult }
    func verifyEmailOtp(email: String, code: String) async -> TransportResult { verifyResult }
    func signInWithIDToken(provider: String, idToken: String, nonce: String?) async -> TransportResult { idTokenResult }
    func refresh(refreshToken: String) async -> TransportResult { refreshResult }
    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> TransportResult { oauthResult }
    func startPasskeyChallenge() async -> TransportResult { passkeyChallengeResult }
    func verifyPasskeyAssertion(assertion: PasskeyResult.Assertion) async -> TransportResult { passkeyVerifyResult }
    func registerPasskey(credential: PasskeyResult.Assertion) async -> TransportResult { passkeyRegisterResult }
}

private let fakeAssertion = PasskeyResult.Assertion(
    credentialID: "cred-1",
    clientDataJSON: "cdj",
    authenticatorData: "auth",
    signature: "sig",
    userHandle: "u1"
)

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

    // M4-Auth-Providers-v1 §6.2 — OAuth repository

    func testOAuthExchangeHappyPathReturnsSession() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.exchangeOAuthCode(providerId: "discord", code: "c", codeVerifier: "v")

        guard case .success = outcome else { XCTFail("expected success"); return }
    }

    func testOAuthExchange400MapsToCallbackMismatch() async {
        let transport = FakeTransport()
        transport.oauthResult = .httpError(status: 400)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.exchangeOAuthCode(providerId: "discord", code: "c", codeVerifier: "v")

        XCTAssertEqual(outcome, .oauthCallbackMismatch)
    }

    func testOAuthExchange404MapsToProviderNotConfigured() async {
        let transport = FakeTransport()
        transport.oauthResult = .httpError(status: 404)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.exchangeOAuthCode(providerId: "discord", code: "c", codeVerifier: "v")

        XCTAssertEqual(outcome, .oauthProviderNotConfigured)
    }

    func testOAuthExchangeServerErrorIsRetryableServer() async {
        let transport = FakeTransport()
        transport.oauthResult = .httpError(status: 503)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.exchangeOAuthCode(providerId: "discord", code: "c", codeVerifier: "v")

        XCTAssertEqual(outcome, .retryableError(code: .server))
    }

    // M4-Auth-Providers-v1 §6.2 — Passkey repository

    func testPasskeyChallengeOkCarriesChallenge() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.startPasskeyChallenge()

        XCTAssertEqual(outcome, .ok(challenge: "fake-challenge"))
    }

    func testPasskeyChallengeNetworkErrorMapsToRetryableNetwork() async {
        let transport = FakeTransport()
        transport.passkeyChallengeResult = .networkError
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.startPasskeyChallenge()

        XCTAssertEqual(outcome, .failed(code: .network))
    }

    func testPasskeyVerifyHappyPathReturnsSession() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.signInWithPasskey(assertion: fakeAssertion)

        guard case .success = outcome else { XCTFail("expected success"); return }
    }

    func testPasskeyRegisterOkOnActiveSessionReturnsExistingSession() async {
        let transport = FakeTransport()
        let existing = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 500)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore(initial: existing))

        let outcome = await repo.registerPasskey(credential: fakeAssertion)

        guard case .success(let session) = outcome else { XCTFail("expected success"); return }
        XCTAssertEqual(session, existing)
    }

    func testPasskeyRegisterOkWithoutSessionNeedsReauth() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.registerPasskey(credential: fakeAssertion)

        XCTAssertEqual(outcome, .needsReauth)
    }
}
