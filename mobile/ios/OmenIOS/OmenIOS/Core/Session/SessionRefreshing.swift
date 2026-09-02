import Foundation

/// What a refresh attempt concluded.
///
/// The three cases exist because collapsing them to two is precisely the bug this seam was
/// added to fix: **a network failure is not a signed-out user.** Only `.rejected` — the server
/// judging the refresh token and refusing it — is evidence the session is over.
enum SessionRefreshOutcome: Equatable {
    case renewed(Session)
    /// Transport never completed: offline, DNS, TLS, timeout. Session untouched.
    case unavailable
    /// The refresh token itself was refused. The user has to sign in again.
    case rejected
}

/// The seam `SessionManager` uses to renew an access token. Implemented in `App/Api` over
/// `AuthRepository.refresh()`; kept as a protocol here so `Core/Session` does not have to know
/// about GoTrue, and so tests can drive expiry deterministically.
@MainActor
protocol SessionRefreshing: AnyObject {
    func refreshedSession() async -> SessionRefreshOutcome
}

/// A token good for the caller's purposes, or the reason there isn't one.
enum SessionAuthorization: Equatable {
    case token(String)
    /// Transient. The stored session is still believed valid — retry, don't sign out.
    case unavailable
    case needsReauth
}
