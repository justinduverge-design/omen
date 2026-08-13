import Foundation

/// Mirrors Android `core/auth/GoTrueTransport.kt`'s `TransportResult`. The lowest-level view of
/// a GoTrue HTTP call, before any outcome mapping.
enum TransportResult: Equatable {
    case ok
    case sessionTokens(userID: String, accessToken: String, refreshToken: String, expiresInSeconds: Int)
    case httpError(status: Int)
    case networkError
    case malformed
}

enum PasskeyOptionsTransportResult<Options: Equatable>: Equatable {
    case options(Options)
    case httpError(status: Int)
    case networkError
    case malformed
}

enum PasskeyListTransportResult: Equatable {
    case passkeys([PasskeyInfo])
    case httpError(status: Int)
    case networkError
    case malformed
}

/// Mirrors Android `core/auth/GoTrueTransport.kt`. The production implementation is
/// `URLSessionGoTrueTransport` (App layer, needs `URLSession`); this protocol has no framework
/// dependency so it can live in Core and be faked in tests.
///
/// `signInWithIDToken` is generalized over `provider` (rather than a Google-only method) because
/// iOS's primary native mechanism is Apple, not Google — same endpoint
/// (`POST /auth/v1/token?grant_type=id_token`), different `provider` value in the body.
protocol GoTrueTransport {
    func requestEmailOtp(email: String) async -> TransportResult
    func verifyEmailOtp(email: String, code: String) async -> TransportResult
    func signInWithIDToken(provider: String, idToken: String, nonce: String?) async -> TransportResult
    func refresh(refreshToken: String) async -> TransportResult

    // M4-Auth-Providers-v1 §4.2 — provider-agnostic OAuth code exchange.
    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> TransportResult

    // Supabase Auth passkey endpoints. Registration and management require the current user's
    // access token; authentication is a discoverable, signed-out ceremony.
    func startPasskeyAuthentication() async -> PasskeyOptionsTransportResult<PasskeyAuthenticationOptions>
    func verifyPasskeyAuthentication(challengeID: String, assertion: PasskeyResult.Assertion) async -> TransportResult
    func startPasskeyRegistration(accessToken: String) async -> PasskeyOptionsTransportResult<PasskeyRegistrationOptions>
    func verifyPasskeyRegistration(challengeID: String, credential: PasskeyRegistrationResult.Credential, accessToken: String) async -> TransportResult
    func listPasskeys(accessToken: String) async -> PasskeyListTransportResult
    func deletePasskey(id: String, accessToken: String) async -> TransportResult
}
