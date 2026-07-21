import Foundation

/// Mirrors Android `core/auth/SupabaseAuthRepository.kt`'s status→outcome mapping rules exactly
/// (behavioral parity, not a line-for-line port — see GitHub issue #159). Depends only on the
/// `GoTrueTransport` protocol and `SecureSessionStore`, not on `URLSession` directly, so it stays
/// testable with a fake transport.
final class SupabaseAuthRepository: AuthRepository {
    private let transport: GoTrueTransport
    private let sessionStore: SecureSessionStore
    private let nowEpochSeconds: () -> Int64

    init(
        transport: GoTrueTransport,
        sessionStore: SecureSessionStore,
        nowEpochSeconds: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970) }
    ) {
        self.transport = transport
        self.sessionStore = sessionStore
        self.nowEpochSeconds = nowEpochSeconds
    }

    func requestEmailOtp(email: String) async -> AuthOutcome {
        switch await transport.requestEmailOtp(email: email) {
        case .ok, .sessionTokens:
            return .otpSent
        case .httpError(let status):
            return .retryableError(code: retryableCode(forStatus: status))
        case .networkError:
            return .retryableError(code: .network)
        case .malformed:
            return .retryableError(code: .unknown)
        }
    }

    func verifyEmailOtp(email: String, code: String) async -> AuthOutcome {
        switch await transport.verifyEmailOtp(email: email, code: code) {
        case .sessionTokens(let userID, let accessToken, let refreshToken, let expiresIn):
            return .success(session: buildSession(userID: userID, accessToken: accessToken, refreshToken: refreshToken, expiresInSeconds: expiresIn))
        case .httpError(let status) where (400...403).contains(status):
            return .invalidCode
        case .httpError(let status):
            return .retryableError(code: retryableCode(forStatus: status))
        case .networkError:
            return .retryableError(code: .network)
        case .ok, .malformed:
            return .retryableError(code: .unknown)
        }
    }

    func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome {
        switch await transport.signInWithIDToken(provider: "apple", idToken: idToken, nonce: rawNonce) {
        case .sessionTokens(let userID, let accessToken, let refreshToken, let expiresIn):
            return .success(session: buildSession(userID: userID, accessToken: accessToken, refreshToken: refreshToken, expiresInSeconds: expiresIn))
        case .httpError(let status) where (400...403).contains(status):
            return .unsupported
        case .httpError(let status):
            return .retryableError(code: retryableCode(forStatus: status))
        case .networkError:
            return .retryableError(code: .network)
        case .ok, .malformed:
            return .retryableError(code: .unknown)
        }
    }

    func refresh() async -> AuthOutcome {
        guard let stored = sessionStore.load() else {
            return .needsReauth
        }
        switch await transport.refresh(refreshToken: stored.refreshToken) {
        case .sessionTokens(let userID, let accessToken, let refreshToken, let expiresIn):
            return .success(session: buildSession(userID: userID, accessToken: accessToken, refreshToken: refreshToken, expiresInSeconds: expiresIn))
        case .networkError:
            return .retryableError(code: .network)
        case .httpError, .ok, .malformed:
            return .needsReauth
        }
    }

    func signOut() async {
        sessionStore.clear()
    }

    private func buildSession(userID: String, accessToken: String, refreshToken: String, expiresInSeconds: Int) -> Session {
        Session(
            userID: userID,
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAtEpochSeconds: nowEpochSeconds() + Int64(expiresInSeconds)
        )
    }
}

private func retryableCode(forStatus status: Int) -> RetryableCode {
    if status == 408 || status == 504 { return .timeout }
    if (500...599).contains(status) { return .server }
    return .unknown
}
