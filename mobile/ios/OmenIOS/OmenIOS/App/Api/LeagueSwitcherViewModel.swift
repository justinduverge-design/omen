import Foundation

/// Drives the approved team/league switcher sheet (visual briefs §10.2/§10.3).
@MainActor
final class LeagueSwitcherViewModel: ObservableObject {
    enum ViewState: Equatable {
        case loading
        case loaded(LeagueDirectory)
        /// Honest failure. §10.3 forbids a dead selector, and the doctrine forbids
        /// falling back to a fixture — showing demo leagues to a real user is exactly
        /// the mock/live mixing facts-of-record #7 rules out.
        case failed(OmenApiError)
    }

    @Published private(set) var viewState: ViewState = .loading
    /// Non-nil only while a selection is in flight, so the sheet can show which row is
    /// being applied without disabling the whole list.
    @Published private(set) var selectingLeagueID: String?
    /// Set when a selection fails. The row stays where it was — §10.3 requires that a
    /// failed switch never leaves a stale context looking current.
    @Published private(set) var selectionError: OmenApiError?

    private let repository: LeagueDirectoryRepository
    private let sessionManager: SessionManager

    init(repository: LeagueDirectoryRepository, sessionManager: SessionManager) {
        self.repository = repository
        self.sessionManager = sessionManager
    }

    func load() async {
        viewState = .loading
        guard let token = sessionManager.currentSession?.accessToken else {
            viewState = .failed(.unauthorized)
            return
        }
        switch await repository.fetchDirectory(accessToken: token) {
        case .success(let directory): viewState = .loaded(directory)
        case .failure(let error): viewState = .failed(error)
        }
    }

    /// Applies a selection. Returns the surfaces §10.3 says the caller must refresh, or
    /// `nil` when the switch did not take — the caller must not refresh on a failure,
    /// because re-reading for the old context and calling it new is the stale-context
    /// failure the contract names.
    @discardableResult
    func select(platform: String, leagueID: String, teamID: String?) async -> [String]? {
        selectionError = nil
        selectingLeagueID = leagueID
        defer { selectingLeagueID = nil }

        guard let token = sessionManager.currentSession?.accessToken else {
            selectionError = .unauthorized
            return nil
        }

        let result = await repository.selectLeague(
            accessToken: token, platform: platform, leagueID: leagueID, teamID: teamID
        )

        switch result {
        case .success(let selection):
            // Re-read rather than mutating the local copy: the server decides what
            // `is_active` and `selection_persistence` now are, and a locally-invented
            // active flag is how a switcher starts lying about what it switched.
            await load()
            return selection.refresh
        case .failure(let error):
            selectionError = error
            return nil
        }
    }
}
