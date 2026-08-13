import XCTest
@testable import Omen

private final class FakeTransport: GoTrueTransport {
    var otpResult: TransportResult = .ok
    var verifyResult: TransportResult = .ok
    var idTokenResult: TransportResult = .ok
    var refreshResult: TransportResult = .ok
    var oauthResult: TransportResult = .sessionTokens(userID: "u1", accessToken: "a", refreshToken: "r", expiresInSeconds: 3600)
    var passkeyAuthenticationResult: PasskeyOptionsTransportResult<PasskeyAuthenticationOptions> = .options(
        PasskeyAuthenticationOptions(
            challengeID: "challenge-id",
            relyingPartyID: "example.com",
            challenge: Data("challenge".utf8),
            userVerification: "preferred"
        )
    )
    var passkeyRegistrationResult: PasskeyOptionsTransportResult<PasskeyRegistrationOptions> = .options(
        PasskeyRegistrationOptions(
            challengeID: "registration-id",
            relyingPartyID: "example.com",
            challenge: Data("challenge".utf8),
            userID: Data("u1".utf8),
            userName: "u1",
            displayName: "User One",
            userVerification: "preferred"
        )
    )
    var passkeyVerifyResult: TransportResult = .sessionTokens(userID: "u1", accessToken: "a", refreshToken: "r", expiresInSeconds: 3600)
    var passkeyRegisterResult: TransportResult = .ok
    var passkeyListResult: PasskeyListTransportResult = .passkeys([])
    var passkeyDeleteResult: TransportResult = .ok

    func requestEmailOtp(email: String) async -> TransportResult { otpResult }
    func verifyEmailOtp(email: String, code: String) async -> TransportResult { verifyResult }
    func signInWithIDToken(provider: String, idToken: String, nonce: String?) async -> TransportResult { idTokenResult }
    func refresh(refreshToken: String) async -> TransportResult { refreshResult }
    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> TransportResult { oauthResult }
    func startPasskeyAuthentication() async -> PasskeyOptionsTransportResult<PasskeyAuthenticationOptions> { passkeyAuthenticationResult }
    func verifyPasskeyAuthentication(challengeID: String, assertion: PasskeyResult.Assertion) async -> TransportResult { passkeyVerifyResult }
    func startPasskeyRegistration(accessToken: String) async -> PasskeyOptionsTransportResult<PasskeyRegistrationOptions> { passkeyRegistrationResult }
    func verifyPasskeyRegistration(challengeID: String, credential: PasskeyRegistrationResult.Credential, accessToken: String) async -> TransportResult { passkeyRegisterResult }
    func listPasskeys(accessToken: String) async -> PasskeyListTransportResult { passkeyListResult }
    func deletePasskey(id: String, accessToken: String) async -> TransportResult { passkeyDeleteResult }
}

private let fakeAssertion = PasskeyResult.Assertion(
    credentialID: "cred-1",
    clientDataJSON: "cdj",
    authenticatorData: "auth",
    signature: "sig",
    userHandle: "u1"
)

private let fakeRegistrationCredential = PasskeyRegistrationResult.Credential(
    credentialID: "cred-1",
    clientDataJSON: "cdj",
    attestationObject: "attestation"
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

    func testPasskeyAuthenticationStartCarriesServerOptions() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.startPasskeyAuthentication()

        guard case .ready(let options) = outcome else { XCTFail("expected options"); return }
        XCTAssertEqual(options.relyingPartyID, "example.com")
        XCTAssertEqual(options.challengeID, "challenge-id")
    }

    func testPasskeyAuthenticationNetworkErrorMapsToRetryableNetwork() async {
        let transport = FakeTransport()
        transport.passkeyAuthenticationResult = .networkError
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.startPasskeyAuthentication()

        XCTAssertEqual(outcome, .failed(code: .network))
    }

    func testPasskeyVerifyHappyPathReturnsSession() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.signInWithPasskey(challengeID: "challenge-id", assertion: fakeAssertion)

        guard case .success = outcome else { XCTFail("expected success"); return }
    }

    func testPasskeyRegisterOkOnActiveSessionReturnsExistingSession() async {
        let transport = FakeTransport()
        let existing = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 500)
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore(initial: existing))

        let outcome = await repo.registerPasskey(
            challengeID: "registration-id",
            credential: fakeRegistrationCredential
        )

        guard case .success(let session) = outcome else { XCTFail("expected success"); return }
        XCTAssertEqual(session, existing)
    }

    func testPasskeyRegisterUnauthorizedNeedsReauth() async {
        let transport = FakeTransport()
        transport.passkeyRegisterResult = .httpError(status: 401)
        let existing = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 500)
        let repo = SupabaseAuthRepository(
            transport: transport,
            sessionStore: InMemorySecureSessionStore(initial: existing)
        )

        let outcome = await repo.registerPasskey(
            challengeID: "registration-id",
            credential: fakeRegistrationCredential
        )

        XCTAssertEqual(outcome, .needsReauth)
    }

    func testPasskeyListWithoutSessionNeedsReauth() async {
        let repo = SupabaseAuthRepository(
            transport: FakeTransport(),
            sessionStore: InMemorySecureSessionStore()
        )

        let outcome = await repo.listPasskeys()
        XCTAssertEqual(outcome, .needsReauth)
    }

    func testPasskeyDeleteSuccessMapsToManagementSuccess() async {
        let existing = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 500)
        let repo = SupabaseAuthRepository(
            transport: FakeTransport(),
            sessionStore: InMemorySecureSessionStore(initial: existing)
        )

        let outcome = await repo.deletePasskey(id: "00000000-0000-0000-0000-000000000001")
        XCTAssertEqual(outcome, .success)
    }

    func testPasskeyRegisterOkWithoutSessionNeedsReauth() async {
        let transport = FakeTransport()
        let repo = SupabaseAuthRepository(transport: transport, sessionStore: InMemorySecureSessionStore())

        let outcome = await repo.registerPasskey(
            challengeID: "registration-id",
            credential: fakeRegistrationCredential
        )

        XCTAssertEqual(outcome, .needsReauth)
    }
}
