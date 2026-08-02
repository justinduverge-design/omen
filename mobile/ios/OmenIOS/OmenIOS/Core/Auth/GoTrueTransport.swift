import Foundation

/// Mirrors Android `core/auth/GoTrueTransport.kt`'s `TransportResult`. The lowest-level view of
/// a GoTrue HTTP call, before any outcome mapping.
enum TransportResult: Equatable {
    case ok
    /// 2xx returning a WebAuthn challenge (opaque base64url string). Only produced by
    /// `startPasskeyChallenge`; other endpoints never produce this variant.
    case challenge(String)
    case sessionTokens(userID: String, accessToken: String, refreshToken: String, expiresInSeconds: Int)
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

    // M4-Auth-Providers-v1 §4.2 — WebAuthn challenge issue + assertion verify + registration.
    func startPasskeyChallenge() async -> TransportResult
    func verifyPasskeyAssertion(assertion: PasskeyResult.Assertion) async -> TransportResult
    func registerPasskey(credential: PasskeyResult.Assertion) async -> TransportResult
}
