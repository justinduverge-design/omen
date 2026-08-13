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

    /// Ask Supabase for discoverable WebAuthn options to feed the platform passkey UI.
    func startPasskeyAuthentication() async -> PasskeyStartResult<PasskeyAuthenticationOptions>

    /// Verify a passkey `assertion` against Supabase and produce a session. The app never
    /// inspects the assertion contents beyond forwarding them here (brief §4.1).
    func signInWithPasskey(challengeID: String, assertion: PasskeyResult.Assertion) async -> AuthOutcome

    /// Register a new passkey `credential` for the currently-authenticated user. Used for
    /// post-sign-in pairing and the Account settings "Add a passkey" action (brief §4.3, §4.4).
    func startPasskeyRegistration() async -> PasskeyStartResult<PasskeyRegistrationOptions>
    func registerPasskey(challengeID: String, credential: PasskeyRegistrationResult.Credential) async -> AuthOutcome

    /// Account-settings management uses public passkey metadata only.
    func listPasskeys() async -> PasskeyListOutcome
    func deletePasskey(id: String) async -> PasskeyManagementOutcome

    func signOut() async
}

enum PasskeyStartResult<Options: Equatable>: Equatable {
    case ready(Options)
    case failed(code: RetryableCode)
    case needsReauth
}

enum PasskeyListOutcome: Equatable {
    case success([PasskeyInfo])
    case failed(code: RetryableCode)
    case needsReauth
}

enum PasskeyManagementOutcome: Equatable {
    case success
    case failed(code: RetryableCode)
    case needsReauth
}
