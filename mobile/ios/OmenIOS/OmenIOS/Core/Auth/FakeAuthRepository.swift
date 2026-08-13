import Foundation

/// Mirrors Android `core/auth/FakeAuthRepository.kt`. Deterministic, network-free double used
/// when Supabase isn't configured (e.g. local/demo builds) and directly in tests. Default happy
/// path accepts OTP code "123456", matching the Android fake.
final class FakeAuthRepository: AuthRepository {
    var validCode = "123456"
    var appleConfigured = true
    var oauthConfiguredProviders: Set<String> = ["discord"]
    var passkeyConfigured = true
    var nextRefreshOutcome: AuthOutcome = .needsReauth
    var nextOAuthExchangeOutcome: AuthOutcome? = nil
    var nextPasskeyAuthenticationStart: PasskeyStartResult<PasskeyAuthenticationOptions>? = nil
    var nextPasskeyRegistrationStart: PasskeyStartResult<PasskeyRegistrationOptions>? = nil
    var nextPasskeySignInOutcome: AuthOutcome? = nil
    var nextPasskeyRegisterOutcome: AuthOutcome? = nil
    var passkeys: [PasskeyInfo] = []
    private(set) var signOutCalled = false

    private let sessionFactory: (String) -> Session

    init(sessionFactory: @escaping (String) -> Session = { email in
        Session(
            userID: email,
            accessToken: "fake-access-token",
            refreshToken: "fake-refresh-token",
            expiresAtEpochSeconds: Int64(Date().timeIntervalSince1970) + 3600
        )
    }) {
        self.sessionFactory = sessionFactory
    }

    func requestEmailOtp(email: String) async -> AuthOutcome {
        guard EmailValidator.isValid(email) else {
            return .retryableError(code: .unknown)
        }
        return .otpSent
    }

    func verifyEmailOtp(email: String, code: String) async -> AuthOutcome {
        guard code == validCode else {
            return .invalidCode
        }
        return .success(session: sessionFactory(EmailValidator.normalize(email)))
    }

    func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome {
        guard appleConfigured else {
            return .unsupported
        }
        return .success(session: sessionFactory("apple-user"))
    }

    func refresh() async -> AuthOutcome {
        nextRefreshOutcome
    }

    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> AuthOutcome {
        if let outcome = nextOAuthExchangeOutcome { return outcome }
        guard oauthConfiguredProviders.contains(providerId) else {
            return .oauthProviderNotConfigured
        }
        return .success(session: sessionFactory("oauth:\(providerId)"))
    }

    func startPasskeyAuthentication() async -> PasskeyStartResult<PasskeyAuthenticationOptions> {
        if let start = nextPasskeyAuthenticationStart { return start }
        return passkeyConfigured
            ? .ready(PasskeyAuthenticationOptions(
                challengeID: "fake-auth-challenge-id",
                relyingPartyID: "example.invalid",
                challenge: Data("fake-challenge".utf8),
                userVerification: "preferred"
            ))
            : .failed(code: .unknown)
    }

    func signInWithPasskey(challengeID: String, assertion: PasskeyResult.Assertion) async -> AuthOutcome {
        if let outcome = nextPasskeySignInOutcome { return outcome }
        return .success(session: sessionFactory("passkey:\(assertion.credentialID)"))
    }

    func startPasskeyRegistration() async -> PasskeyStartResult<PasskeyRegistrationOptions> {
        if let start = nextPasskeyRegistrationStart { return start }
        return passkeyConfigured
            ? .ready(PasskeyRegistrationOptions(
                challengeID: "fake-registration-challenge-id",
                relyingPartyID: "example.invalid",
                challenge: Data("fake-challenge".utf8),
                userID: Data("fake-user".utf8),
                userName: "fake-user",
                displayName: "Fake User",
                userVerification: "preferred"
            ))
            : .failed(code: .unknown)
    }

    func registerPasskey(challengeID: String, credential: PasskeyRegistrationResult.Credential) async -> AuthOutcome {
        if let outcome = nextPasskeyRegisterOutcome { return outcome }
        return .success(session: sessionFactory("passkey-register:\(credential.credentialID)"))
    }

    func listPasskeys() async -> PasskeyListOutcome {
        .success(passkeys)
    }

    func deletePasskey(id: String) async -> PasskeyManagementOutcome {
        passkeys.removeAll { $0.id == id }
        return .success
    }

    func signOut() async {
        signOutCalled = true
    }
}
