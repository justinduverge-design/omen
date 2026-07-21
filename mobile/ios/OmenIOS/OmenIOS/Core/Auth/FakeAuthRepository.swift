import Foundation

/// Mirrors Android `core/auth/FakeAuthRepository.kt`. Deterministic, network-free double used
/// when Supabase isn't configured (e.g. local/demo builds) and directly in tests. Default happy
/// path accepts OTP code "123456", matching the Android fake.
final class FakeAuthRepository: AuthRepository {
    var validCode = "123456"
    var appleConfigured = true
    var nextRefreshOutcome: AuthOutcome = .needsReauth
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

    func signOut() async {
        signOutCalled = true
    }
}
