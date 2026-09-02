import Foundation

extension SessionManager {
    /// Runs an authenticated request with the token lifetime handled for the caller.
    ///
    /// Two halves, both required:
    ///
    /// - **Before** the call, `authorization()` renews a token that is expired or within
    ///   `refreshLeewaySeconds` of it.
    /// - **After** a 401 on a token that looked alive — revoked, rotated, or clock skew —
    ///   forces exactly one refresh and one retry. A second 401 is believed and routed to
    ///   re-auth. One retry, never a loop.
    ///
    /// A transport failure resolves to `.network`, never `.unauthorized`: an offline user is
    /// not a signed-out user, and the call site renders a retry rather than a sign-in wall.
    ///
    /// `operation` must be safe to run twice. Every route this is used with is either a GET or
    /// an idempotent POST carrying its own `request_id`.
    func authorized<T>(
        _ operation: (String) async -> Result<T, OmenApiError>
    ) async -> Result<T, OmenApiError> {
        switch await authorization() {
        case .needsReauth:
            onRefreshFailed()
            return .failure(.unauthorized)
        case .unavailable:
            return .failure(.network)
        case .token(let token):
            let first = await operation(token)
            guard case .failure(.unauthorized) = first else { return first }

            switch await forceRefresh() {
            case .needsReauth:
                onRefreshFailed()
                return .failure(.unauthorized)
            case .unavailable:
                return .failure(.network)
            case .token(let renewed):
                let second = await operation(renewed)
                if case .failure(.unauthorized) = second {
                    // A token minted seconds ago being refused is a real authorization
                    // problem, not a lifetime problem. Believe it.
                    onRefreshFailed()
                }
                return second
            }
        }
    }
}
