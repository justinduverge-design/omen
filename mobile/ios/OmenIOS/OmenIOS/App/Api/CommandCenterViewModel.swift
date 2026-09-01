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

    /// Slice C, second consumer. `nil` keeps the shell-derived default, which is `.loading`
    /// while a standings answer is still expected. Set from the same `league-standings.v1`
    /// payload that fills the context strip — no extra request.
    @Published private(set) var leaguePulse: OmenLeaguePulseState?

    /// The real Matchup Hero. `nil` keeps the shell-derived `.noMatchup`, which is what every
    /// connected user used to see unconditionally — the hero's populated cases existed but had
    /// no real-data path at all.
    @Published private(set) var matchup: OmenMatchupHeroState?

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
            return .from(summary: summary, context: context, ledger: ledger, leaguePulse: leaguePulse, matchup: matchup)
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

        viewState = .loading
        context = nil
        ledger = nil
        leaguePulse = nil
        matchup = nil

        // The shell read goes through the session seam, which renews an expiring token before
        // the call and retries once on a 401. The two follow-ups then reuse the token that
        // read just proved good, rather than each renewing on their own — three concurrent
        // refreshes would race Supabase's refresh-token rotation and sign the user out.
        switch await sessionManager.authorized({ await repository.fetchSummary(accessToken: $0) }) {
        case .success(let summary):
            viewState = .loaded(summary)
            // Both follow-ups run only after the shell is renderable, and they run
            // CONCURRENTLY. They hit different routes, neither reads the
            // other's result, and running them in sequence made the Command Center three
            // serial round trips deep — the standings call is a live provider read and the
            // slowest of the three, so it was holding the Ledger behind it for no reason.
            // Re-read the bearer rather than reusing the one `authorized` sent: if that call
            // renewed mid-flight, the stored token is the live one and the sent one is
            // already retired. This never refreshes again — it was just renewed.
            guard case .token(let accessToken) = await sessionManager.authorization() else { break }
            async let contextTask: Void = {
                // Slice C runs only when the shell says a provider is actually connected —
                // asking a disconnected user's provider for standings is a guaranteed
                // round-trip to an error.
                guard summary.platforms.anyConnected else { return }
                await loadContext(accessToken: accessToken)
            }()
            async let ledgerTask: Void = {
                // Slice E. Skipped entirely when the shell says no usable platform: that
                // user's Ledger is `.notConnected` by definition, and "no entries yet" would
                // be a weaker, slightly wrong answer bought with a pointless round trip.
                guard summary.tools.omenOfTheWeek.status != .needsPlatform else { return }
                await loadLedger(accessToken: accessToken)
            }()
            _ = await (contextTask, ledgerTask)
        case .failure(let error):
            // `authorized` has already forced a refresh, retried once, and routed a genuine
            // authorization failure to re-auth. Nothing left to do but render honestly.
            viewState = .failed(error)
        }
    }

    /// Upgrades the context strip if standings can support one.
    ///
    /// Every failure path here is deliberately silent to the user: the shell is already on
    /// screen and correct, and a provider hiccup must not turn a working Command Center into
    /// an error screen. A failed or empty standings call simply leaves the strip unfilled.
    /// One `league-overview.v1` read fills the context strip, League Pulse, AND the Matchup
    /// Hero. It replaced a `league-standings.v1` read that filled only the strip while the
    /// other two sections were hardwired to states no connected user could escape.
    private func loadContext(accessToken: String) async {
        guard case .success(let overview) = await leagueRepository.fetchOverview(accessToken: accessToken) else {
            // The shell-derived default is `.loading`, which would spin forever if left
            // alone — the original defect in a different costume. A failed read resolves to
            // an explicit resting state.
            leaguePulse = .unavailable
            return
        }
        context = overview.contextStrip
        // `nil` from either mapping means "this payload cannot honestly support the section".
        // League Pulse resolves to `.unavailable` so it always settles; the Matchup Hero stays
        // `nil` so the shell's honest `.noMatchup` reason survives rather than being replaced
        // by a blank hero.
        leaguePulse = overview.leaguePulse ?? .unavailable
        matchup = overview.matchupHero
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
