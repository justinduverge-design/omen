import Foundation

/// Production `SessionRefreshing`, over `AuthRepository.refresh()`.
///
/// Its whole job beyond the mapping is **coalescing**. The Command Center fires summary,
/// standings, and moves concurrently; without a shared in-flight task an expired token would
/// start three refresh round trips at once. Supabase rotates the refresh token on every
/// successful refresh, so two of those three would present a token the server had already
/// retired — and a user whose session was perfectly fine would be signed out by their own
/// dashboard loading.
@MainActor
final class AuthRepositorySessionRefresher: SessionRefreshing {
    private let repository: AuthRepository
    private var inFlight: Task<SessionRefreshOutcome, Never>?

    init(repository: AuthRepository) {
        self.repository = repository
    }

    func refreshedSession() async -> SessionRefreshOutcome {
        if let inFlight { return await inFlight.value }

        let task = Task<SessionRefreshOutcome, Never> { [repository] in
            switch await repository.refresh() {
            case .success(let session):
                return .renewed(session)
            case .retryableError:
                // Transport-level only. The refresh token was never judged, so neither is
                // the user — see `SessionRefreshOutcome`.
                return .unavailable
            default:
                return .rejected
            }
        }
        inFlight = task
        let outcome = await task.value
        inFlight = nil
        return outcome
    }
}
