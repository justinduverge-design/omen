import Foundation

/// Mirrors Android `core/auth/AuthRepository.kt`. `SupabaseAuthRepository` is the production
/// implementation; `FakeAuthRepository` is the deterministic, network-free double used in tests
/// and SwiftUI previews.
protocol AuthRepository {
    func requestEmailOtp(email: String) async -> AuthOutcome
    func verifyEmailOtp(email: String, code: String) async -> AuthOutcome
    func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome
    func refresh() async -> AuthOutcome

    /// Exchange an OAuth authorization `code` (returned via the deep-link callback for
    /// `providerId`) for an Omen session via Supabase. `codeVerifier` is the PKCE verifier the
    /// app stashed before opening the browser (M4-Auth-Providers-v1 §2.4).
    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> AuthOutcome

    /// Ask Supabase for a WebAuthn challenge to feed the platform passkey UI.
    func startPasskeyChallenge() async -> PasskeyChallenge

    /// Verify a passkey `assertion` against Supabase and produce a session. The app never
    /// inspects the assertion contents beyond forwarding them here (brief §4.1).
    func signInWithPasskey(assertion: PasskeyResult.Assertion) async -> AuthOutcome

    /// Register a new passkey `credential` for the currently-authenticated user. Used for
    /// post-sign-in pairing and the Account settings "Add a passkey" action (brief §4.3, §4.4).
    func registerPasskey(credential: PasskeyResult.Assertion) async -> AuthOutcome

    func signOut() async
}

/// Result of `AuthRepository.startPasskeyChallenge`.
enum PasskeyChallenge: Equatable {
    case ok(challenge: String)
    case failed(code: RetryableCode)
}
