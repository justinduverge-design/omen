import Foundation

/// Drives the Command Center league carousel — the widget that replaced a switcher button
/// the user had to go find.
///
/// The old shape was two disconnected things: a context strip saying which league you were
/// on, and a modal sheet you opened to change it. A user with five leagues had to open the
/// sheet, read a list, tap, wait, and read the screen again to learn anything about any
/// league but one. The carousel collapses that: each league is a page, you swipe, and the
/// page you rest on becomes the league Omen is talking about.
///
/// Two rules from the founder, encoded here so iOS and Android cannot drift:
///
///   1. **Provider order is by league count, most first; ties alphabetical.** Three ESPN,
///      one Yahoo, one Sleeper puts ESPN first, then Sleeper before Yahoo. The server
///      already sorts `platforms` this way and this type does not re-sort it — one
///      authority, not two implementations of the same rule.
///   2. **A provider filter, plus All.** With All on, the swipe runs through every league in
///      that same order.
///
/// Each page loads its own `league-overview.v1`. Pages are loaded lazily and cached, so
/// swiping back to a league you already saw is instant and costs no provider call.
@MainActor
final class LeagueCarouselViewModel: ObservableObject {
    /// One page. Identity is platform + league, never the index — an index-keyed page would
    /// swap its contents under the user when the filter changes the list length.
    struct Page: Identifiable, Equatable {
        let platform: String
        let leagueID: String
        let leagueName: String?
        let teamName: String?
        let isActive: Bool

        var id: String { "\(platform):\(leagueID)" }

        /// ESPN routinely omits a league name even on a healthy connection, so the id is
        /// the fallback rather than a blank or an invented label.
        var displayLeagueName: String {
            leagueName?.isEmpty == false ? leagueName! : "League \(leagueID)"
        }

        var displayTeamName: String { teamName?.isEmpty == false ? teamName! : "Your team" }
    }

    /// What one page's matchup read has produced. `loading` is a real state here — unlike
    /// League Pulse, where a spinner on a resting state was the F-HOT defect — because a
    /// page genuinely is fetching the first time you swipe to it.
    enum PageState: Equatable {
        case loading
        case loaded(OmenMatchupHeroState)
        case unavailable(String)

        static func == (lhs: PageState, rhs: PageState) -> Bool {
            switch (lhs, rhs) {
            case (.loading, .loading): return true
            case (.unavailable(let l), .unavailable(let r)): return l == r
            case (.loaded, .loaded): return true
            default: return false
            }
        }
    }

    enum ViewState: Equatable {
        case loading
        case loaded
        case failed(OmenApiError)
        /// Demo runs one mock league and never touches the network, matching every other
        /// view model in this folder (facts-of-record #7).
        case demo
        /// Signed in, nothing connected. Distinct from `failed`: an honest "you have no
        /// leagues" must never be an error surface.
        case empty
    }

    /// The "All" chip. A sentinel rather than an optional so the filter is one value with
    /// one meaning, and `Picker`-style selection has something concrete to bind to.
    static let allPlatforms = "__all__"

    @Published private(set) var viewState: ViewState = .loading
    @Published private(set) var directory: LeagueDirectory?
    /// Chip order comes from the server's `platforms` order and is not re-sorted here.
    @Published private(set) var availablePlatforms: [String] = []
    @Published var selectedPlatform: String = LeagueCarouselViewModel.allPlatforms {
        didSet { clampSelection() }
    }
    @Published var selectedIndex: Int = 0
    @Published private(set) var pageStates: [String: PageState] = [:]
    /// Set while a rest-on-page selection is being written, so the widget can say the
    /// context is changing rather than appear to have changed already.
    @Published private(set) var committingPageID: String?

    private let directoryRepository: LeagueDirectoryRepository
    private let leagueRepository: LeagueRepository
    private let sessionManager: SessionManager
    /// Guards against a swipe-through: swiping across five pages must not fire five writes.
    private var commitTask: Task<Void, Never>?

    init(
        directoryRepository: LeagueDirectoryRepository,
        leagueRepository: LeagueRepository,
        sessionManager: SessionManager
    ) {
        self.directoryRepository = directoryRepository
        self.leagueRepository = leagueRepository
        self.sessionManager = sessionManager
    }

    // MARK: - Derived

    /// Every followed league, flattened in the server's provider order.
    ///
    /// `is_followed` is the filter. The server reports every league it discovered and marks
    /// the ones the user chose; when no choice has been stored it marks them all, which is
    /// the honest reading of "the user has not been able to choose yet".
    var allPages: [Page] {
        (directory?.platforms ?? []).flatMap { group in
            group.leagues
                .filter { $0.isFollowed }
                .map {
                    Page(
                        platform: group.platform,
                        leagueID: $0.leagueID,
                        leagueName: $0.leagueName,
                        teamName: $0.teamName,
                        isActive: $0.isActive
                    )
                }
        }
    }

    /// The pages actually on screen, after the provider chip.
    var pages: [Page] {
        guard selectedPlatform != Self.allPlatforms else { return allPages }
        return allPages.filter { $0.platform == selectedPlatform }
    }

    var currentPage: Page? {
        pages.indices.contains(selectedIndex) ? pages[selectedIndex] : nil
    }

    /// The chip row: All first, then providers in the server's order. Only providers that
    /// actually have a followed league get a chip — a chip that filters to nothing is a
    /// control that can only disappoint.
    var chips: [String] {
        availablePlatforms.isEmpty ? [] : [Self.allPlatforms] + availablePlatforms
    }

    /// True once the directory has produced something to filter. Keeps the chip row — Add
    /// League included — off the loading, failed and empty screens, where each of those states
    /// already carries its own single, clearer action.
    var hasLoadedLeagues: Bool {
        if case .loaded = viewState { return true }
        return false
    }

    func state(for page: Page) -> PageState {
        pageStates[page.id] ?? .loading
    }

    // MARK: - Loading

    func load(userID: String? = nil) async {
        guard userID != SessionManager.demoUserID else {
            viewState = .demo
            return
        }

        viewState = .loading
        switch await sessionManager.authorized({ await directoryRepository.fetchDirectory(accessToken: $0) }) {
        case .success(let loaded):
            directory = loaded
            availablePlatforms = loaded.platforms
                .filter { group in group.leagues.contains(where: { $0.isFollowed }) }
                .map(\.platform)
            // Open on the league Omen is actually using, not on page one. Landing on a
            // different league than the rest of the screen describes would make the
            // carousel disagree with the Ledger and the Omen call beneath it.
            selectedIndex = allPages.firstIndex(where: { $0.isActive }) ?? 0
            viewState = allPages.isEmpty ? .empty : .loaded
            await loadCurrentPage()
        case .failure(let error):
            viewState = .failed(error)
        }
    }

    /// Fetches the visible page's matchup if it has not been fetched. Idempotent: a page
    /// already loaded, or already loading, is left alone.
    func loadCurrentPage() async {
        guard let page = currentPage else { return }
        guard pageStates[page.id] == nil else { return }

        pageStates[page.id] = .loading
        guard case .token(let accessToken) = await sessionManager.authorization() else {
            pageStates[page.id] = .unavailable("Sign in again to read this league.")
            return
        }

        let result = await leagueRepository.fetchOverview(
            accessToken: accessToken,
            platform: page.platform,
            leagueID: page.leagueID
        )

        switch result {
        case .success(let overview):
            // `nil` means the payload cannot honestly support a hero — no matchup, or a
            // section the provider failed. An explicit reason beats a blank card.
            pageStates[page.id] = overview.matchupHero.map(PageState.loaded)
                ?? .loaded(.noMatchup(reason: Self.noMatchupReason(overview)))
        case .failure:
            pageStates[page.id] = .unavailable(
                "Omen couldn't read this league's week just now. Swipe back to try again."
            )
        }
    }

    private static func noMatchupReason(_ overview: LeagueOverview) -> String {
        switch overview.matchup.status {
        case .noMatchup: return "No matchup scheduled for this league this week."
        case .unavailable: return "This league's provider didn't return a matchup."
        default: return "No matchup to show for this league yet."
        }
    }

    /// Called when a swipe settles. Makes the rested-on league the one Omen uses.
    ///
    /// Debounced, and a no-op on the league that is already active. Without both, dragging
    /// across a five-league carousel would fire five verified provider writes to land on the
    /// same place a single write reaches.
    ///
    /// Returns the surfaces §10.3 says the caller must refresh, or `nil` when nothing was
    /// written — the caller must not refresh on a failure, because re-reading for the old
    /// context and calling it new is exactly the stale-context failure the contract names.
    @discardableResult
    func commitSelection() async -> [String]? {
        commitTask?.cancel()
        guard let page = currentPage else { return nil }
        // The carousel shows the page it is committing, so its matchup has to be in flight
        // before the write. The picker has no such page and skips this.
        await loadCurrentPage()
        return await commit(page)
    }

    /// Makes one named league the active one, without touching `selectedIndex`.
    ///
    /// The team picker on Omen, Trade and League calls this: those screens have no pager, so
    /// they pick a league by name rather than by resting on it. Sharing the commit with the
    /// carousel is the point — two implementations of "make this active" would eventually
    /// disagree about what happens on failure, and the failure path is the one that matters.
    ///
    /// A no-op on the league that is already active, so a tap on the current chip costs
    /// nothing and dragging across a five-league carousel does not fire five verified provider
    /// writes to land where one reaches.
    ///
    /// Returns the surfaces §10.3 says the caller must refresh, or `nil` when nothing was
    /// written — the caller must not refresh on a failure, because re-reading for the old
    /// context and calling it new is exactly the stale-context failure the contract names.
    @discardableResult
    func commit(_ page: Page) async -> [String]? {
        guard !page.isActive else { return nil }

        committingPageID = page.id
        defer { committingPageID = nil }

        let result = await sessionManager.authorized {
            await directoryRepository.selectLeague(
                accessToken: $0,
                platform: page.platform,
                leagueID: page.leagueID,
                teamID: nil
            )
        }

        switch result {
        case .success(let selection):
            // Re-read the directory rather than flipping `isActive` locally: the server
            // decides what is active now, and a locally-invented active flag is how a
            // switcher starts lying about what it switched. Page caches survive, so this
            // costs no provider matchup calls.
            await reloadDirectoryPreservingPages()
            return selection.refresh
        case .failure:
            return nil
        }
    }

    private func reloadDirectoryPreservingPages() async {
        guard case .success(let loaded) = await sessionManager.authorized({
            await directoryRepository.fetchDirectory(accessToken: $0)
        }) else { return }

        let restingID = currentPage?.id
        directory = loaded
        availablePlatforms = loaded.platforms
            .filter { group in group.leagues.contains(where: { $0.isFollowed }) }
            .map(\.platform)
        // Stay on the page the user is looking at, by identity. Keeping the index would
        // move them if the refreshed directory changed the list at all.
        if let restingID, let index = pages.firstIndex(where: { $0.id == restingID }) {
            selectedIndex = index
        }
    }

    /// Keeps `selectedIndex` inside the filtered list after a chip change. Filtering to a
    /// provider with fewer leagues than the current index would otherwise leave the pager
    /// pointing past the end, which renders nothing at all.
    private func clampSelection() {
        if pages.isEmpty {
            selectedIndex = 0
        } else if selectedIndex >= pages.count {
            selectedIndex = pages.count - 1
        }
    }
}
