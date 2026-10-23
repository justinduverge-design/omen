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

    /// The at-a-glance fact shown in Command's matchup rail. This is deliberately derived from
    /// the same per-league overview as the full matchup page: the rail cannot have a cheaper,
    /// competing notion of the score. A dash is unknown/not started, never zero.
    struct ScoreSnapshot: Identifiable, Equatable {
        let id: String
        let teamName: String
        let compactTeamName: String
        let scoreText: String
        let phase: String
        let index: Int
    }

    /// What one page's matchup read has produced. `loading` is a real state here — unlike
    /// League Pulse, where a spinner on a resting state was the F-HOT defect — because a
    /// page genuinely is fetching the first time you swipe to it.
    enum PageState: Equatable {
        case loading
        case loaded(OmenMatchupHeroState)
        case unavailable(String)
        /// The session or the provider needs the user to sign in again. Typed, so no screen has to
        /// recognise it from a sentence.
        case needsReauth

        static func == (lhs: PageState, rhs: PageState) -> Bool {
            switch (lhs, rhs) {
            case (.loading, .loading): return true
            case (.needsReauth, .needsReauth): return true
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

    /// Shell-level meaning of the directory state. Feature screens must not infer this from an
    /// optional scope: `nil` while the directory is loading and `nil` after a confirmed empty
    /// directory are opposite facts and therefore require different presentation.
    enum ContextResolution: Equatable {
        case resolving
        case selected(OmenCallScope)
        case confirmedNone
        case failed(OmenApiError)
        case demo
    }

    /// The "All" chip. A sentinel rather than an optional so the filter is one value with
    /// one meaning, and `Picker`-style selection has something concrete to bind to.
    static let allPlatforms = "__all__"

    @Published private(set) var viewState: ViewState = .loading
    @Published private(set) var directory: LeagueDirectory?
    /// Chip order comes from the server's `platforms` order and is not re-sorted here.
    @Published private(set) var availablePlatforms: [String] = []
    @Published var selectedPlatform: String = LeagueCarouselViewModel.allPlatforms {
        didSet {
            clampSelection()
            persistProviderFilter()
        }
    }
    @Published var selectedIndex: Int = 0
    @Published private(set) var pageStates: [String: PageState] = [:]
    /// Set while a rest-on-page selection is being written, so the widget can say the
    /// context is changing rather than appear to have changed already.
    @Published private(set) var committingPageID: String?
    /// Visible recovery for a user-triggered switch that did not verifiably land.
    @Published private(set) var selectionError: OmenApiError?
    /// The page `commit(_:)` last wrote to the server, until the directory re-read confirms it as active.
    ///
    /// The team picker on Omen, Trade and League commits a league BY NAME and deliberately leaves
    /// `selectedIndex` alone, so `currentPage` keeps pointing at the carousel's old resting page. Screens that
    /// reload "for the selected context" must therefore use `activePage`, not `currentPage`, or they re-read the
    /// league the user just left (seen in the iOS Simulator on 2026-10-11: chip said TTO, table showed HBT's league).
    @Published private(set) var committedPage: Page?
    /// The league this view model last wrote to the server (the account-wide selection), for the lifetime of the session.
    private var lastCommittedPageID: String?

    /// Starred teams, in star order. Contract §3.
    @Published private(set) var favorites = LeagueFavorites()

    private let directoryRepository: LeagueDirectoryRepository
    private let leagueRepository: LeagueRepository
    private let sessionManager: SessionManager
    private let preferences: LeagueSwitcherPreferencesStore
    /// Whose favourites and filter are loaded. Held so a sign-out/sign-in on a shared device
    /// cannot leave the previous user's stars on screen.
    private var currentUserID: String?
    /// Suppresses the `selectedPlatform` didSet write while the view model is *restoring* the
    /// stored filter. Persisting during a restore is harmless today, but it would silently
    /// convert "never chose a filter" into "chose All", and that flag is what the contract's
    /// first-open-defaults-to-All rule reads.
    private var isRestoringFilter = false
    /// Guards against a swipe-through: swiping across five pages must not fire five writes.
    private var commitTask: Task<Void, Never>?
    /// One directory read for every surface sharing this view model. SwiftUI may mount several
    /// TabView children at once, and each child legitimately asks for context in its `.task`.
    /// Without coalescing, a later cancelled request can write `.loading` after the successful
    /// request has already resolved, leaving the whole app in placeholders forever.
    private var directoryLoadTask: Task<Void, Never>?

    /// How many pending `selectedIndex` changes this view model made ITSELF, and which the
    /// carousel's `.onChange` must therefore not treat as a user resting on a new page.
    ///
    /// Without this, the carousel is a feedback loop with no brake:
    ///
    ///     .onChange(selectedIndex) -> commitSelection() -> POST /api/leagues/active
    ///       -> reloadDirectoryPreservingPages() -> writes selectedIndex -> .onChange ...
    ///
    /// The only thing that stopped it was `guard !page.isActive`, which holds only if the
    /// re-read directory comes back with that page marked active. When the server did not
    /// report it - or reported a different league as active - the loop ran unbounded. On
    /// 2026-09-05 it emitted 28 requests in nine seconds from one phone, oscillating
    /// between two leagues, and pegged the single-core production API at 99% CPU until it
    /// was restarted by hand.
    ///
    /// A counter rather than a boolean flag, because `.onChange` is delivered
    /// asynchronously: a flag cleared at the end of the reload can easily be false again
    /// by the time the change it caused is finally delivered, which is precisely the race
    /// that makes this class of bug intermittent. Counting the writes and consuming one
    /// per delivery does not depend on when the delivery lands.
    private var programmaticSelections = 0

    /// Moves the pager without arming a commit. Every `selectedIndex` write that is the
    /// view model's own decision rather than the user's must go through here.
    private func selectIndexProgrammatically(_ index: Int) {
        guard selectedIndex != index else { return }
        programmaticSelections += 1
        selectedIndex = index
    }

    init(
        directoryRepository: LeagueDirectoryRepository,
        leagueRepository: LeagueRepository,
        sessionManager: SessionManager,
        preferences: LeagueSwitcherPreferencesStore = UserDefaultsLeagueSwitcherPreferences()
    ) {
        self.directoryRepository = directoryRepository
        self.leagueRepository = leagueRepository
        self.sessionManager = sessionManager
        self.preferences = preferences
    }

    // MARK: - Derived

    /// Every followed league, flattened in the server's provider order.
    ///
    /// `is_followed` is the filter. The server reports every league it discovered and marks
    /// the ones the user chose; when no choice has been stored it marks them all, which is
    /// the honest reading of "the user has not been able to choose yet".
    var allPages: [Page] { Self.ordered(directoryPages, by: favorites) }

    /// The server's own order, before favourites are applied. Kept separate so the sort has an
    /// input that does not change under it, and so a test can prove the sort rather than the fetch.
    private var directoryPages: [Page] {
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

    /// **The one ordering rule, contract §3:** favourites first in the order they were starred,
    /// then everything else in the server's order.
    ///
    /// It is applied to `allPages`, which every surface derives from, so the carousel and the
    /// switcher sheet cannot disagree — the sheet is the carousel opened up. Filtering to one
    /// provider narrows the *input* to this same function rather than selecting a different
    /// rule, which is why "ESPN's favourites at the top of the ESPN list" needs no code of its own.
    ///
    /// A partition, not `sorted(by:)`. Swift's sort is not guaranteed stable, and the non-favourite
    /// tail must keep the server's provider order exactly — a sort that reshuffled ties would
    /// quietly undo the "most leagues first, then alphabetical" rule the server owns.
    /// `nonisolated` because it is pure: inputs in, order out, no view-model state touched.
    /// That is what lets a test assert the rule directly instead of standing up a main-actor
    /// view model and a fake network to observe it second-hand.
    nonisolated static func ordered(_ pages: [Page], by favorites: LeagueFavorites) -> [Page] {
        let starred = pages
            .compactMap { page in favorites.rank(of: page.id).map { (rank: $0, page: page) } }
            .sorted { $0.rank < $1.rank }
            .map(\.page)
        let rest = pages.filter { !favorites.contains($0.id) }
        return starred + rest
    }

    /// The pages actually on screen, after the provider chip.
    var pages: [Page] {
        guard selectedPlatform != Self.allPlatforms else { return allPages }
        return allPages.filter { $0.platform == selectedPlatform }
    }

    var currentPage: Page? {
        pages.indices.contains(selectedIndex) ? pages[selectedIndex] : nil
    }

    /// The league the app is actually on: the one just committed, else the one the server reports active.
    /// Falls back to the carousel's resting page only when neither is known yet.
    var activePage: Page? {
        allPages.first(where: { isCurrent($0) }) ?? currentPage
    }

    var contextResolution: ContextResolution {
        switch viewState {
        case .loading:
            return .resolving
        case .loaded:
            guard let scope = activePage?.omenCallScope else { return .confirmedNone }
            return .selected(scope)
        case .empty:
            return .confirmedNone
        case .failed(let error):
            return .failed(error)
        case .demo:
            return .demo
        }
    }

    /// The id of the ONE league Omen is using right now, or nil when none can be named.
    ///
    /// Order of authority: the league this view model last wrote to the server (the account-wide
    /// selection, and the freshest fact we have), then the directory's top-level `active`
    /// (the server's own answer), and only for an old server that sends neither, the first page the
    /// directory flagged `isActive`.
    ///
    /// `Page.isActive` must not be used to draw a tick, chip, highlight or accessibility label: the
    /// directory sets it for one league per PROVIDER at once, so an ESPN, a Sleeper and a Yahoo
    /// league all read "active" together and the sheet showed several unexplained check marks.
    var currentLeagueID: String? {
        if let id = lastCommittedPageID, allPages.contains(where: { $0.id == id }) { return id }
        if let active = directory?.active, let platform = active.platform, let leagueID = active.leagueID {
            let id = "\(platform):\(leagueID)"
            if allPages.contains(where: { $0.id == id }) { return id }
        }
        return allPages.first(where: { $0.isActive })?.id
    }

    /// True for exactly one page: the league Omen is using now. The only predicate UI may use for
    /// "this is the current league".
    func isCurrent(_ page: Page) -> Bool { page.id == currentLeagueID }

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

    var scoreSnapshots: [ScoreSnapshot] {
        pages.enumerated().map { index, page in
            let score: String
            let phase: String
            switch state(for: page) {
            case .loading:
                score = "\u{2014}"
                phase = "Reading score"
            case .unavailable:
                score = "\u{2014}"
                phase = "Score unavailable"
            case .needsReauth:
                score = "\u{2014}"
                phase = "Sign in again"
            case .loaded(let hero):
                switch hero {
                case .beforeGames(let selectedTeam, _, let startTime, _):
                    score = selectedTeam.scoreText
                    phase = "Starts \(startTime)"
                case .live(let selectedTeam, _, _, _):
                    score = selectedTeam.scoreText
                    phase = "Live"
                case .final(let selectedTeam, _, _, _):
                    score = selectedTeam.scoreText
                    phase = "Final"
                case .noMatchup:
                    score = "\u{2014}"
                    phase = "No matchup"
                }
            }
            return ScoreSnapshot(
                id: page.id,
                teamName: page.displayTeamName,
                compactTeamName: omenCompactTeamLabel(page.displayTeamName),
                scoreText: score,
                phase: phase,
                index: index
            )
        }
    }

    // MARK: - Loading

    func load(userID: String? = nil) async {
        if let directoryLoadTask {
            await directoryLoadTask.value
            return
        }

        // This unstructured task owns the request independently of whichever SwiftUI child
        // happened to ask first. Removing that child must not cancel shared app context.
        let task = Task { [weak self] () -> Void in
            guard let self else { return }
            await self.performLoad(userID: userID)
        }
        directoryLoadTask = task
        await task.value
        directoryLoadTask = nil
    }

    private func performLoad(userID: String?) async {
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
            // Favourites before anything reads `allPages`: they are the primary sort key, so
            // loading them later would order the list once, then reorder it under the user.
            loadFavorites(userID: userID)
            restoreProviderFilter()
            // Open on the league Omen is actually using, not on page one. Landing on a
            // different league than the rest of the screen describes would make the
            // carousel disagree with the Ledger and the Omen call beneath it.
            // Opening on the active league is the view model's decision, not a user swipe,
            // so it must not write that same league straight back to the server.
            //
            // Indexed into `pages`, not `allPages`: `selectedIndex` addresses the *filtered*
            // list. The two were the same list while the filter always started on All, so
            // searching `allPages` was harmless; restoring a stored provider filter makes them
            // differ, and the old lookup would have landed the pager on an unrelated league.
            // Falls back to 0 when the active league is filtered out — the user is looking at
            // one provider, and yanking them to another to chase the active flag would fight them.
            selectIndexProgrammatically(pages.firstIndex(where: { isCurrent($0) }) ?? 0)
            viewState = allPages.isEmpty ? .empty : .loaded
            await loadCurrentPage()
        case .failure(.cancelled) where Task.isCancelled:
            // The awaiting task was cancelled: the load that replaced it resolves the state. A live-task
            // cancel falls through to `.failed`, never an endless spinner.
            break
        case .failure(let error):
            viewState = .failed(error)
        }
    }

    /// Fetches the visible page's matchup if it has not been fetched. Idempotent: a page
    /// already loaded, or already loading, is left alone.
    func loadCurrentPage() async {
        guard let page = currentPage else { return }
        await loadPage(page)
    }

    /// Warms the rest of the matchup rail after the selected league has rendered. It is
    /// intentionally not awaited by the shell's first useful state: scores fill progressively,
    /// and a slow provider cannot delay leagues that already answered.
    func prefetchRemainingPages() async {
        for page in pages where pageStates[page.id] == nil {
            guard !Task.isCancelled else { return }
            await loadPage(page)
        }
    }

    private func loadPage(_ page: Page) async {
        guard pageStates[page.id] == nil else { return }

        pageStates[page.id] = .loading
        guard case .token(let accessToken) = await sessionManager.authorization() else {
            pageStates[page.id] = .needsReauth
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
        case .failure(.cancelled) where Task.isCancelled:
            // The task itself was cancelled (swiped away): clear so the next visit fetches again. A
            // cancel with a live task is the generic `.unavailable` below; nil would read as `.loading`.
            pageStates[page.id] = nil
        case .failure(.unauthorized):
            pageStates[page.id] = .needsReauth
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
        // A selection this view model made itself is not the user resting on a page, and
        // must not be written back to the server. Consuming exactly one queued write per
        // delivery is what breaks the commit -> reload -> commit loop; see
        // `programmaticSelections`.
        if programmaticSelections > 0 {
            programmaticSelections -= 1
            return nil
        }
        commitTask?.cancel()
        guard let page = currentPage else { return nil }
        // The accepted swipe changes context immediately. Publish the target before either the
        // per-page read or the verified server write begins so callers can remove the outgoing
        // league's values and mount the shaped switch placeholder in the same interaction turn.
        committingPageID = page.id
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
        // "Active" here is per PROVIDER: the directory ticks one league for ESPN, one for Sleeper and one for
        // Yahoo at the same time, but the server keeps ONE selected league for the whole account and builds the
        // Omen call, Start/Sit and waivers from it. A league that is already active for its provider is
        // therefore not necessarily the one the server will answer for. Skip the write only when this view model
        // itself already committed this league (nothing to say to the server); otherwise tell the server, which
        // is idempotent. Without this, tapping Yahoo "Puk Around" left the Sleeper call on screen (iOS Simulator,
        // 2026-10-11).
        guard !(page.isActive && lastCommittedPageID == page.id) else { return nil }

        selectionError = nil
        committingPageID = page.id

        let result = await sessionManager.authorized {
            await directoryRepository.selectLeague(
                accessToken: $0,
                platform: page.platform,
                leagueID: page.leagueID,
                teamID: nil
            )
        }

        // A lost RESPONSE is not a failed switch: the server may have applied it. Re-reading the
        // directory tells the truth; guessing either way would leave the chip and the content
        // disagreeing (SIM 2026-10-11). The re-read is the one directory fetch of this switch.
        var verifiedDirectory: LeagueDirectory?
        var outcome = result
        if case .failure(let error) = result, error == .network || error == .cancelled || error == .decode,
           case .success(let loaded) = await fetchDirectoryOnce(),
           loaded.activeID == page.id {
            verifiedDirectory = loaded
            outcome = .success(LeagueSelectionResult.recovered())
        }

        switch outcome {
        case .success(let selection):
            committedPage = page
            lastCommittedPageID = page.id
            // The directory is still re-read rather than flipped locally: the server decides what
            // is active now. But the screens' own re-reads no longer wait behind it. Measured on
            // the founder's iPhone 2026-10-01, `GET /api/leagues` alone took 2.0-3.0 s and ran
            // BEFORE the five surface reads began, so every switch paid for it twice over. The
            // two now overlap. `committingPageID` stays set until the re-read lands, so the chips
            // stay disabled and nothing can start a second switch against a half-updated list.
            pendingDirectoryReload = Task { [weak self] in
                if let verifiedDirectory {
                    self?.applyReloadedDirectory(verifiedDirectory)
                } else {
                    await self?.reloadDirectoryPreservingPages()
                }
                self?.committingPageID = nil
            }
            return selection.refresh
        case .failure(let error):
            // The switch did not verifiably land and the directory does not show it as active; the
            // server's state is unknown rather than known-unchanged. Chip and content both stay where
            // they were, and the caller does not reload, so they cannot disagree with each other.
            committingPageID = nil
            selectionError = error
            return nil
        }
    }

    /// The directory re-read started by the last successful switch. Tests await it; the app does not.
    private(set) var pendingDirectoryReload: Task<Void, Never>?

    private func fetchDirectoryOnce() async -> Result<LeagueDirectory, OmenApiError> {
        await sessionManager.authorized { await directoryRepository.fetchDirectory(accessToken: $0) }
    }

    private func reloadDirectoryPreservingPages() async {
        // A lost directory response leaves the chip following `lastCommittedPageID` and the
        // content following `activePage` (which reads the same id), so the two still agree; the
        // stale directory only costs the provider ticks until the next successful read.
        guard case .success(let loaded) = await fetchDirectoryOnce() else { return }
        applyReloadedDirectory(loaded)
    }

    private func applyReloadedDirectory(_ loaded: LeagueDirectory) {
        let restingID = currentPage?.id
        directory = loaded
        // The server's own answer to "which league is active" is now in `directory`.
        committedPage = nil
        availablePlatforms = loaded.platforms
            .filter { group in group.leagues.contains(where: { $0.isFollowed }) }
            .map(\.platform)
        // A switch can change what the directory reports, so stars are re-pruned here for the
        // same reason they are pruned on load.
        var pruned = favorites
        pruned.pruned(toKnown: Set(directoryPages.map(\.id)))
        if pruned != favorites {
            favorites = pruned
            persistFavorites()
        }
        // Stay on the page the user is looking at, by identity. Keeping the index would
        // move them if the refreshed directory changed the list at all.
        if let restingID, let index = pages.firstIndex(where: { $0.id == restingID }) {
            selectIndexProgrammatically(index)
        }
    }

    // MARK: - Favourites and the remembered filter

    /// Stars or unstars one team, and re-sorts in place.
    ///
    /// Deliberately does **not** switch to that team, dismiss anything, or touch the server:
    /// the star and the row are two targets with two jobs (contract §3), and a star that also
    /// navigated would make the list impossible to curate.
    ///
    /// `selectedIndex` is re-pointed at the page the user is resting on, by identity. Starring
    /// reorders the list under the pager, so keeping the raw index would slide the carousel onto
    /// a different league as a side effect of marking a favourite.
    func toggleFavorite(_ page: Page) {
        let restingID = currentPage?.id
        favorites.toggle(page.id)
        persistFavorites()
        if let restingID, let index = pages.firstIndex(where: { $0.id == restingID }) {
            selectIndexProgrammatically(index)
        }
    }

    func isFavorite(_ page: Page) -> Bool { favorites.contains(page.id) }

    /// Reads this user's stars and drops any for leagues the directory no longer reports.
    ///
    /// The prune is written back immediately rather than only held in memory, so a league the
    /// user disconnected does not keep its star sitting in defaults waiting to reappear if they
    /// ever reconnect it.
    private func loadFavorites(userID: String?) {
        guard let userID else {
            // No identity, no stored preference to attribute. Signed-out and demo both land
            // here, and neither may inherit the last signed-in user's stars.
            currentUserID = nil
            favorites = LeagueFavorites()
            return
        }
        currentUserID = userID
        var loaded = preferences.favorites(userID: userID)
        loaded.pruned(toKnown: Set(directoryPages.map(\.id)))
        favorites = loaded
        preferences.setFavorites(loaded, userID: userID)
    }

    private func persistFavorites() {
        guard let currentUserID else { return }
        preferences.setFavorites(favorites, userID: currentUserID)
    }

    private func persistProviderFilter() {
        guard !isRestoringFilter, let currentUserID else { return }
        preferences.setProviderFilter(selectedPlatform, userID: currentUserID)
    }

    /// Contract §4: the very first open ever lands on **All**, deliberately, to show that Omen
    /// handles every provider the user connected. Every open after that restores what they last
    /// left it on.
    ///
    /// A stored provider that is no longer connected falls back to All rather than to an empty
    /// list — the alternative is opening the switcher onto nothing and making the user work out why.
    private func restoreProviderFilter() {
        guard let currentUserID else { return }
        // Build 12 removed the provider filter control, so a filter saved by an older build would hide teams with
        // no way to clear it. Every team shows; the stored value is overwritten with All.
        _ = preferences.providerFilter(userID: currentUserID)
        let restored = Self.allPlatforms
        isRestoringFilter = true
        selectedPlatform = restored
        isRestoringFilter = false
    }

    /// Keeps `selectedIndex` inside the filtered list after a chip change. Filtering to a
    /// provider with fewer leagues than the current index would otherwise leave the pager
    /// pointing past the end, which renders nothing at all.
    /// Also routed through `selectIndexProgrammatically`: changing the provider chip is
    /// filtering, not choosing. Re-pointing the pager so it lands on something real must
    /// not silently write a different active league to the server as a side effect.
    private func clampSelection() {
        if pages.isEmpty {
            selectIndexProgrammatically(0)
        } else if selectedIndex >= pages.count {
            selectIndexProgrammatically(pages.count - 1)
        }
    }
}
