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

    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> AuthOutcome {
        switch await transport.exchangeOAuthCode(providerId: providerId, code: code, codeVerifier: codeVerifier) {
        case .sessionTokens(let userID, let accessToken, let refreshToken, let expiresIn):
            return .success(session: buildSession(userID: userID, accessToken: accessToken, refreshToken: refreshToken, expiresInSeconds: expiresIn))
        // 400/403 on OAuth exchange means the code is stale/reused (mismatch class); Supabase
        // distinguishes further only in the response body, which by M0c §8 the transport must
        // not expose. 404 means the provider isn't wired.
        case .httpError(let status) where (400...403).contains(status):
            return .oauthCallbackMismatch
        case .httpError(let status) where status == 404:
            return .oauthProviderNotConfigured
        case .httpError(let status):
            return .retryableError(code: retryableCode(forStatus: status))
        case .networkError:
            return .retryableError(code: .network)
        case .ok, .malformed:
            return .retryableError(code: .unknown)
        }
    }

    func startPasskeyAuthentication() async -> PasskeyStartResult<PasskeyAuthenticationOptions> {
        switch await transport.startPasskeyAuthentication() {
        case .options(let options):
            return .ready(options)
        case .httpError(let status):
            return .failed(code: retryableCode(forStatus: status))
        case .networkError:
            return .failed(code: .network)
        case .malformed:
            return .failed(code: .unknown)
        }
    }

    func signInWithPasskey(challengeID: String, assertion: PasskeyResult.Assertion) async -> AuthOutcome {
        switch await transport.verifyPasskeyAuthentication(challengeID: challengeID, assertion: assertion) {
        case .sessionTokens(let userID, let accessToken, let refreshToken, let expiresIn):
            return .success(session: buildSession(userID: userID, accessToken: accessToken, refreshToken: refreshToken, expiresInSeconds: expiresIn))
        case .httpError(let status):
            return .retryableError(code: retryableCode(forStatus: status))
        case .networkError:
            return .retryableError(code: .network)
        case .ok, .malformed:
            return .retryableError(code: .unknown)
        }
    }

    func startPasskeyRegistration() async -> PasskeyStartResult<PasskeyRegistrationOptions> {
        guard let session = sessionStore.load() else { return .needsReauth }
        switch await transport.startPasskeyRegistration(accessToken: session.accessToken) {
        case .options(let options):
            return .ready(options)
        case .httpError(let status) where status == 401 || status == 403:
            return .needsReauth
        case .httpError(let status):
            return .failed(code: retryableCode(forStatus: status))
        case .networkError:
            return .failed(code: .network)
        case .malformed:
            return .failed(code: .unknown)
        }
    }

    func registerPasskey(challengeID: String, credential: PasskeyRegistrationResult.Credential) async -> AuthOutcome {
        guard let session = sessionStore.load() else { return .needsReauth }
        switch await transport.verifyPasskeyRegistration(
            challengeID: challengeID,
            credential: credential,
            accessToken: session.accessToken
        ) {
        // Registration succeeds with 2xx-no-body; the app already has a session, so surface the
        // existing stored one (parity with Android SupabaseAuthRepository).
        case .ok:
            return .success(session: session)
        case .sessionTokens(let userID, let accessToken, let refreshToken, let expiresIn):
            return .success(session: buildSession(userID: userID, accessToken: accessToken, refreshToken: refreshToken, expiresInSeconds: expiresIn))
        case .httpError(let status) where status == 401 || status == 403:
            return .needsReauth
        case .httpError(let status):
            return .retryableError(code: retryableCode(forStatus: status))
        case .networkError:
            return .retryableError(code: .network)
        case .malformed:
            return .retryableError(code: .unknown)
        }
    }

    func listPasskeys() async -> PasskeyListOutcome {
        guard let session = sessionStore.load() else { return .needsReauth }
        switch await transport.listPasskeys(accessToken: session.accessToken) {
        case .passkeys(let passkeys):
            return .success(passkeys)
        case .httpError(let status) where status == 401 || status == 403:
            return .needsReauth
        case .httpError(let status):
            return .failed(code: retryableCode(forStatus: status))
        case .networkError:
            return .failed(code: .network)
        case .malformed:
            return .failed(code: .unknown)
        }
    }

    func deletePasskey(id: String) async -> PasskeyManagementOutcome {
        guard let session = sessionStore.load() else { return .needsReauth }
        switch await transport.deletePasskey(id: id, accessToken: session.accessToken) {
        case .ok:
            return .success
        case .httpError(let status) where status == 401 || status == 403:
            return .needsReauth
        case .httpError(let status):
            return .failed(code: retryableCode(forStatus: status))
        case .networkError:
            return .failed(code: .network)
        case .malformed, .sessionTokens:
            return .failed(code: .unknown)
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
