import Foundation

/// Mirrors Android `core/auth/SupabaseOAuthProvider.kt`. Provider-agnostic seam over Supabase's
/// `signInWithOAuth` browser handoff (M4-Auth-Providers-v1 §4.1). The concrete
/// `ASWebAuthenticationSession` launcher lives in the App layer because it needs a presentation
/// anchor; this protocol has no framework dependency so it can live in Core and be faked.
///
/// "Provider-agnostic" means adding a future OAuth provider (GitHub, Slack, …) is a config +
/// one-button change on top of this seam — no new protocols, no new state-machine branches.
protocol SupabaseOAuthProvider {

    /// True only when `providerId` is enabled in Supabase Studio for this build.
    func isConfigured(providerId: String) -> Bool

    /// Begin an OAuth ceremony for `providerId`. The implementation:
    ///  1. generates a PKCE `code_verifier` + SHA-256 `code_challenge`,
    ///  2. generates a random `state` (CSRF token) and stashes both server-side of the seam,
    ///  3. opens `ASWebAuthenticationSession` to Supabase's authorize URL,
    ///  4. returns `.launched` on success or a named failure otherwise.
    ///
    /// The deep-link callback is handled out-of-band (`.onOpenURL { }` in `OmenIOSApp`) and
    /// dispatched into the state machine via `AuthEvent.oauthCallbackReceived`.
    func launch(providerId: String) async -> OAuthLaunchResult

    /// Validate an incoming deep-link callback and extract the `code` + `state`. Compares
    /// `state` against the value stashed by `launch` (CSRF defense per brief §2.3). Returns
    /// `.valid` with the exchange inputs on match, or a named rejection on mismatch.
    ///
    /// The returned `codeVerifier` is the PKCE verifier the caller passes to
    /// `AuthRepository.exchangeOAuthCode`.
    func parseCallback(providerId: String, code: String?, state: String?) -> OAuthCallback
}

enum OAuthLaunchResult: Equatable {
    case launched
    case notConfigured
    case unavailable
    case failed
}

enum OAuthCallback: Equatable {
    /// State matched; ready to exchange the code for a session.
    case valid(code: String, codeVerifier: String)
    /// State mismatch (CSRF) or a callback for a provider we didn't launch.
    case mismatch
    /// Missing `code` / `state` parameters, or malformed callback URL.
    case malformed
}

/// Default provider used until the real `ASWebAuthenticationSession` wiring lands. Reports
/// every provider unconfigured so the UI hides OAuth buttons cleanly instead of surfacing
/// broken CTAs.
final class UnconfiguredSupabaseOAuthProvider: SupabaseOAuthProvider {
    func isConfigured(providerId: String) -> Bool { false }
    func launch(providerId: String) async -> OAuthLaunchResult { .notConfigured }
    func parseCallback(providerId: String, code: String?, state: String?) -> OAuthCallback { .malformed }
}
