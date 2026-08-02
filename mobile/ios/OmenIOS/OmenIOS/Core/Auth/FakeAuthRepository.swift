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
    var nextPasskeyChallenge: PasskeyChallenge? = nil
    var nextPasskeySignInOutcome: AuthOutcome? = nil
    var nextPasskeyRegisterOutcome: AuthOutcome? = nil
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

    func startPasskeyChallenge() async -> PasskeyChallenge {
        if let challenge = nextPasskeyChallenge { return challenge }
        return passkeyConfigured ? .ok(challenge: "fake-challenge") : .failed(code: .unknown)
    }

    func signInWithPasskey(assertion: PasskeyResult.Assertion) async -> AuthOutcome {
        if let outcome = nextPasskeySignInOutcome { return outcome }
        return .success(session: sessionFactory("passkey:\(assertion.credentialID)"))
    }

    func registerPasskey(credential: PasskeyResult.Assertion) async -> AuthOutcome {
        if let outcome = nextPasskeyRegisterOutcome { return outcome }
        return .success(session: sessionFactory("passkey-register:\(credential.credentialID)"))
    }

    func signOut() async {
        signOutCalled = true
    }
}
