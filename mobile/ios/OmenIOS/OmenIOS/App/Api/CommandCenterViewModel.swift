import Foundation

/// M5-Native-API-Client slice B — drives the Command Center from real shell truth.
///
/// Demo is not a load state and never touches the network: `SessionManager.demoUserID`
/// short-circuits straight to the labeled demo fixture, preserving facts-of-record #7
/// (mock data is always labeled, never silently mixed with live).
@MainActor
final class CommandCenterViewModel: ObservableObject {
    enum ViewState: Equatable {
        case loading
        case loaded(DashboardSummary)
        /// Honest failure. `OmenStateSurface` renders this; it never falls back to a fixture,
        /// because showing demo content to a real user during an outage is the exact
        /// mock/live mixing the doctrine forbids.
        case failed(OmenApiError)
        case demo
    }

    @Published private(set) var viewState: ViewState = .loading

    /// Slice C. Populated by a second, slower request after the shell is already on screen.
    /// `nil` means "we have no verified provider identity" — which is also what it stays as
    /// if standings fails, is empty, or names no team belonging to this user.
    @Published private(set) var context: OmenContextStripState?

    /// Slice E. `nil` means "the Ledger request has not produced an answer yet, so keep the
    /// shell-derived default" — the same never-regress rule slice C uses for the context strip.
    @Published private(set) var ledger: OmenLedgerPreviewState?

    private let repository: DashboardRepository
    private let leagueRepository: LeagueRepository
    private let movesRepository: MovesRepository
    private let sessionManager: SessionManager

    init(
        repository: DashboardRepository,
        leagueRepository: LeagueRepository,
        movesRepository: MovesRepository,
        sessionManager: SessionManager
    ) {
        self.repository = repository
        self.leagueRepository = leagueRepository
        self.movesRepository = movesRepository
        self.sessionManager = sessionManager
    }

    /// The Command Center state to render, derived from `viewState`.
    ///
    /// Slice C overlays the verified context strip when — and only when — standings has
    /// produced one. The screen therefore never regresses: it renders fully from shell
    /// truth first, then upgrades in place if the slower provider call succeeds.
    var commandCenterState: OmenCommandCenterState {
        switch viewState {
        case .loading:
            return OmenCommandCenterFixtures.realLoading
        case .demo:
            return OmenCommandCenterFixtures.demoConnected
        case .loaded(let summary):
            return .from(summary: summary, context: context, ledger: ledger)
        case .failed:
            return OmenCommandCenterFixtures.realDisconnected
        }
    }

    /// True when the shell could not be read. The view renders an explicit failure surface
    /// rather than letting `realDisconnected` masquerade as a confirmed "no leagues" answer.
    var failure: OmenApiError? {
        guard case .failed(let error) = viewState else { return nil }
        return error
    }

    func load(userID: String) async {
        guard userID != SessionManager.demoUserID else {
            viewState = .demo
            return
        }

        guard let accessToken = sessionManager.currentSession?.accessToken else {
            viewState = .failed(.unauthorized)
            return
        }

        viewState = .loading
        context = nil
        ledger = nil
        switch await repository.fetchSummary(accessToken: accessToken) {
        case .success(let summary):
            viewState = .loaded(summary)
            // Slice C runs only after the shell is renderable, and only when the shell says
            // a provider is actually connected — asking a disconnected user's provider for
            // standings is a guaranteed round-trip to an error.
            if summary.platforms.anyConnected {
                await loadContext(accessToken: accessToken)
            }
            // Slice E. Skipped entirely when the shell says no usable platform: that user's
            // Ledger is `.notConnected` by definition, and "no entries yet" would be a weaker,
            // slightly wrong answer bought with a pointless round trip.
            if summary.tools.omenOfTheWeek.status != .needsPlatform {
                await loadLedger(accessToken: accessToken)
            }
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            viewState = .failed(error)
        }
    }

    /// Upgrades the context strip if standings can support one.
    ///
    /// Every failure path here is deliberately silent to the user: the shell is already on
    /// screen and correct, and a provider hiccup must not turn a working Command Center into
    /// an error screen. A failed or empty standings call simply leaves the strip unfilled.
    private func loadContext(accessToken: String) async {
        guard case .success(let standings) = await leagueRepository.fetchStandings(accessToken: accessToken) else {
            return
        }
        context = standings.contextStrip
    }

    /// Fills the Ledger section from `moves-history.v1`.
    ///
    /// Unlike the context strip, a failure here is **not** silent. The strip has an honest
    /// resting state — an unfilled strip claims nothing. The Ledger's resting state is "No
    /// Ledger entries yet", which is a positive claim about the user's history, and rendering
    /// it after a failed read would tell a user with a full Ledger that they have none.
    private func loadLedger(accessToken: String) async {
        ledger = .loading
        switch await movesRepository.fetchMoves(accessToken: accessToken) {
        case .success(let history):
            ledger = history.ledgerState
        case .failure(let error):
            // A 401 here is not routed to re-auth: the summary call that just succeeded used
            // the same token, so this is far more likely a route-level problem than a dead
            // session, and tearing down a working shell over it would be the worse failure.
            ledger = .error(Self.ledgerMessage(for: error))
        }
    }

    /// Transport failures only — this route has no in-band contract states to defer to.
    private static func ledgerMessage(for error: OmenApiError) -> String {
        switch error {
        case .network:
            return "Omen couldn't reach the server to load your Ledger. Check your connection."
        case .unauthorized:
            return "Omen couldn't read your Ledger with this session. Sign in again to see it."
        case .server:
            // The status code is deliberately not shown; it tells a user nothing actionable.
            return "Omen is having trouble loading your Ledger. Try again in a moment."
        case .decode:
            return "Your Ledger came back in a format this version of the app couldn't read."
        }
    }
}
