import SwiftUI
import UIKit

/// Signed-in tab shell. v1.1 corrective: four permanent tabs per M0c §12.5 approved
/// navigation contract — Command · Omen · Trade · League. Draft is a seasonal
/// destination reached through League and promoted from Command Center during
/// draft-relevant periods; it is NOT a permanent tab. Account is contextual, reached via
/// the Command Center header profile control, NOT a permanent tab.
///
/// The Command tab renders the real signed-in state (never `demoConnected`) unless the
/// user is signed in via `Try Demo`. Screenshot mode is handled by
/// `OmenIOSApp` gating on the launch argument — the shell here is production only.
struct CommandCenterView: View {
    let userID: String
    @ObservedObject var sessionManager: SessionManager
    @ObservedObject var authViewModel: AuthViewModel
    @StateObject private var commandCenterViewModel: CommandCenterViewModel
    @StateObject private var omenDecisionViewModel: OmenDecisionViewModel
    @StateObject private var leagueSwitcherViewModel: LeagueSwitcherViewModel
    /// The Command Center carousel. Its own view model rather than the switcher's: the two
    /// read the same route for different reasons, cache different things, and must fail
    /// independently — the same reasoning already recorded for `leagueDirectoryRepository`.
    @StateObject private var leagueCarouselViewModel: LeagueCarouselViewModel
    private let connectRepository: ConnectRepository
    /// Held as well as consumed into `leagueSwitcherViewModel`: Account's connected-leagues
    /// section needs the same seam, and it owns its own view model rather than sharing the
    /// switcher's — the two read the same route for different reasons and fail independently.
    private let leagueDirectoryRepository: LeagueDirectoryRepository
    @Environment(\.omenEnvironment) private var environment
    /// The command center owns one modal presenter. Independent sheet booleans can all become
    /// true in the same render pass, leaving SwiftUI to reject one presentation and making a
    /// perfectly valid destination (most visibly Build a trade) appear not to open.
    @State private var presentedSheet: CommandCenterSheet?
    /// J4: `TradeShare`, over `POST /api/trade/share`.
    @State private var selectedTab: CommandCenterTab = .command
    @StateObject private var leagueViewModel: LeagueViewModel
    @StateObject private var tradeViewModel: TradeViewModel
    /// League's "Trade targets" section, read from the same `/api/trade/find` scan Trade uses.
    @StateObject private var leagueTradeTargetsViewModel: LeagueTradeTargetsViewModel

    init(
        userID: String,
        sessionManager: SessionManager,
        authViewModel: AuthViewModel,
        dashboardRepository: DashboardRepository,
        leagueRepository: LeagueRepository,
        movesRepository: MovesRepository,
        waiverRepository: WaiverAnalysisRepository,
        quietWeekRepository: QuietWeekRepository,
        omenDecisionRepository: OmenDecisionRepository,
        startSitDetailRepository: StartSitDetailRepository,
        connectRepository: ConnectRepository,
        leagueDirectoryRepository: LeagueDirectoryRepository,
        tradeRepository: TradeRepository,
        playerSearchRepository: PlayerSearchRepository,
        tradeFindRepository: TradeFindRepository
    ) {
        self.connectRepository = connectRepository
        self.userID = userID
        self.sessionManager = sessionManager
        self.authViewModel = authViewModel
        _commandCenterViewModel = StateObject(wrappedValue: CommandCenterViewModel(
            repository: dashboardRepository,
            leagueRepository: leagueRepository,
            movesRepository: movesRepository,
            waiverRepository: waiverRepository,
            quietWeekRepository: quietWeekRepository,
            sessionManager: sessionManager
        ))
        _omenDecisionViewModel = StateObject(wrappedValue: OmenDecisionViewModel(
            repository: omenDecisionRepository,
            startSitRepository: startSitDetailRepository,
            sessionManager: sessionManager
        ))
        _tradeViewModel = StateObject(wrappedValue: TradeViewModel(
            repository: tradeRepository,
            playerSearch: playerSearchRepository,
            sessionManager: sessionManager
        ))
        _leagueViewModel = StateObject(wrappedValue: LeagueViewModel(
            repository: leagueRepository,
            sessionManager: sessionManager
        ))
        _leagueTradeTargetsViewModel = StateObject(wrappedValue: LeagueTradeTargetsViewModel(
            repository: tradeFindRepository,
            sessionManager: sessionManager
        ))
        _leagueSwitcherViewModel = StateObject(wrappedValue: LeagueSwitcherViewModel(
            repository: leagueDirectoryRepository,
            sessionManager: sessionManager
        ))
        _leagueCarouselViewModel = StateObject(wrappedValue: LeagueCarouselViewModel(
            directoryRepository: leagueDirectoryRepository,
            leagueRepository: leagueRepository,
            sessionManager: sessionManager
        ))
        self.leagueDirectoryRepository = leagueDirectoryRepository
    }


    /// Wraps a destination in the team picker.
    ///
    /// Omen, Trade and League each answer a question about one league, so each gets the row
    /// that changes which one. Command Center does not — its carousel already IS the picker,
    /// and two of them on one screen would be a control competing with itself.
    ///
    /// Reloading is driven from `refresh`, which the server supplies: the picker returns the
    /// surfaces a context change invalidated, and this reloads exactly those rather than
    /// deciding for itself which screens went stale.
    @ViewBuilder
    private func withTeamPicker<Content: View>(
        @ViewBuilder _ content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            OmenTeamPicker(
                viewModel: leagueCarouselViewModel,
                userID: userID,
                onContextChanged: { _ in
                    // Every personalized surface, not just the visible one — a user who
                    // switches on Trade and then taps League must not find the old team
                    // there. Concurrent: see `reloadAllAfterContextChange`.
                    Task { await reloadAllAfterContextChange() }
                },
                onAddLeague: { presentSheet(.connect) },
                // This picker owns its pinned Switch button locally. Cross-screen switch
                // affordances route to the shell's one presenter below; binding every off-tab
                // picker to the same Boolean created competing SwiftUI presentation anchors.
                externalPresentation: nil
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)
            content()
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    /// The user's own team id from the League destination's matchup, when that read landed.
    /// Only a fallback for a directory that left the team blank.
    private var loadedOverviewTeamId: String? {
        guard case .loaded(let overview) = leagueViewModel.viewState else { return nil }
        // The overview can still be the previous league's while the picked league's loads; its team is not
        // this league's team.
        if let picked = pickedLeagueScope, !picked.names(platform: overview.platform, leagueID: overview.leagueId) {
            return nil
        }
        return overview.matchup.you?.teamId
    }


    // MARK: - Desk (foundation v1)

    @State private var deskPath: [DeskRoute] = []
    @State private var omenPath: [OmenRoute] = []
    @State private var tradePath: [TradeRoute] = []
    @State private var tradeShowingShare = false
    @State private var tradeShareURL: URL?

    /// The verdict is a sheet over the builder or the offer; closing it keeps the picks.
    private var tradeVerdictShown: Binding<Bool> {
        Binding(
            get: {
                // Judge an offer still draws its own answer until it is rebuilt; no second verdict over it.
                guard tradePath.last != .judge, case .loaded(let compare) = tradeViewModel.viewState else { return false }
                return OmenTradeAnswer.from(compare, offer: tradeViewModel.offer) != nil
            },
            set: { if !$0 { tradeViewModel.dismissVerdict() } }
        )
    }

    private var tradeProviderName: String { OmenProviderMark.displayName(tradeViewModel.offer.leagueContext?.platform) }

    @ViewBuilder
    private var tradeBuilder: some View {
        switch tradeViewModel.rosterBrowseState {
        case .idle, .loading:
            OmenStateBlock(kind: .loading, title: "Reading your league\u{2019}s rosters", message: "Your team and every other team, so you can pick from both.")
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
                .task { await tradeViewModel.loadRoster(userID: userID) }
        case .demo:
            OmenStateBlock(kind: .notEnoughToGoOn, title: "Building a trade needs your league", message: "Demo mode has no real rosters. Connect ESPN, Yahoo or Sleeper to build from your own team.", actionTitle: "Connect a league", action: { presentSheet(.connect) })
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
        case .failed(let error):
            OmenStateBlock(kind: .failed, title: "Omen couldn\u{2019}t load the rosters", message: TradeViewModel.message(for: error), actionTitle: "Try again", action: { Task { await tradeViewModel.loadRoster(userID: userID, force: true) } })
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
        case .loaded(let response):
            if !response.isAvailable || tradeViewModel.viewerRoster == nil {
                OmenStateBlock(kind: .notEnoughToGoOn, title: "Omen can\u{2019}t see the other teams yet", message: response.unavailableSentence, actionTitle: "Judge an offer instead", action: { tradePath = [.judge] })
                    .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
            } else {
                OmenTradeBuilderScreen(
                    state: OmenTradeBuilderState(
                        mine: (tradeViewModel.viewerRoster?.players ?? []).map { OmenPlayerSummary($0, providerName: tradeProviderName) },
                        theirs: (tradeViewModel.partnerRoster?.players ?? []).map { OmenPlayerSummary($0, providerName: tradeProviderName) },
                        partners: tradeViewModel.rosterPartners,
                        partnerID: tradeViewModel.selectedPartnerTeamID,
                        send: tradeViewModel.offer.send,
                        receive: tradeViewModel.offer.receive,
                        judging: tradeViewModel.viewState == .loading,
                        judgeError: { if case .failed(let e) = tradeViewModel.viewState { return TradeViewModel.message(for: e) } else { return nil } }()
                    ),
                    onToggle: { summary, side in
                        let roster = side == .send ? tradeViewModel.viewerRoster : tradeViewModel.partnerRoster
                        if let player = roster?.players.first(where: { $0.id == summary.id }) { tradeViewModel.toggleFromRoster(player, side: side) }
                    },
                    onRemove: { tradeViewModel.remove(at: $0, from: $1) },
                    onSwitchPartner: { tradeViewModel.switchPartner(to: $0) },
                    onOpenPlayer: { tradePath.append(.player($0)) },
                    onJudge: { Task { await tradeViewModel.compare(userID: userID) } },
                    onThreeTeam: tradeViewModel.rosterCapability?.threeTeamSupported == true ? {
                        tradePath.append(.threeTeam)
                        tradeViewModel.openPartnerPicker()
                        if tradeViewModel.isPartnerPickerPresented { presentSheet(.tradePartnerPicker) }
                    } : nil
                )
                .toolbar {
                    if !tradeViewModel.offer.send.isEmpty || !tradeViewModel.offer.receive.isEmpty {
                        ToolbarItem(placement: .topBarTrailing) {
                            OmenBarTextButton(title: "Clear", tone: OmenColor.textSecondary) { tradeViewModel.clearOffer() }
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func tradePlayer(_ id: String) -> some View {
        if let player = tradeViewModel.viewerRoster?.players.first(where: { $0.id == id }) {
            OmenPlayerScreen(page: OmenPlayerPage(player, ownerLabel: "Your team", providerName: tradeProviderName))
        } else if let team = tradeViewModel.partnerRoster, let player = team.players.first(where: { $0.id == id }) {
            OmenPlayerScreen(page: OmenPlayerPage(player, ownerLabel: team.teamName, providerName: tradeProviderName))
        } else {
            OmenStateBlock(kind: .notEnoughToGoOn, title: "This player isn\u{2019}t on the rosters Omen just read", message: "Go back to see the current rosters.")
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
        }
    }
    @State private var fullArgumentPayload: OmenDecisionBriefPayload?

    /// The league on the provider's own site, where the user makes the move. Nil when the provider has
    /// no stable league address.
    static func handoffURL(for page: LeagueCarouselViewModel.Page) -> URL? {
        let id = page.leagueID.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? page.leagueID
        switch page.platform.lowercased() {
        case "espn": return URL(string: "https://fantasy.espn.com/football/team?leagueId=\(id)")
        case "sleeper": return URL(string: "https://sleeper.com/leagues/\(id)")
        case "yahoo": return URL(string: "https://football.fantasysports.yahoo.com/f1/\(id)")
        default: return nil
        }
    }

    private var deskPhase: OmenDeskView.Phase {
        switch leagueCarouselViewModel.contextResolution {
        case .resolving: return .loading
        case .failed(let error): return .failed(message: commandCenterFailureMessage(error))
        case .confirmedNone: return .noLeague
        case .selected, .demo:
            if let failure = commandCenterViewModel.failure { return .failed(message: commandCenterFailureMessage(failure)) }
            return leagueCarouselViewModel.pages.isEmpty ? .loading : .ready
        }
    }

    private var deskTeams: [OmenTeamCardModel] {
        leagueCarouselViewModel.pages.map { OmenTeamCardModel(page: $0, state: leagueCarouselViewModel.state(for: $0)) }
    }

    /// The Rolodex's front card is the carousel's selected page; settling a card moves the selection,
    /// and the carousel commits it as the team every tab reasons about.
    private var deskSelection: Binding<String?> {
        Binding(
            get: {
                let pages = leagueCarouselViewModel.pages
                return pages.indices.contains(leagueCarouselViewModel.selectedIndex) ? pages[leagueCarouselViewModel.selectedIndex].id : pages.first?.id
            },
            set: { id in
                if let index = leagueCarouselViewModel.pages.firstIndex(where: { $0.id == id }) {
                    leagueCarouselViewModel.selectedIndex = index
                }
            }
        )
    }

    private var deskMove: OmenDeskMovePreview? {
        if let quiet = commandCenterViewModel.quietWeekState {
            return OmenDeskMovePreview(headline: quiet.headline, reason: quiet.body, band: quiet.band, isHold: true)
        }
        if case .read(let preview) = OmenDeskMovePreview.section(from: omenDecisionViewModel.briefState(visibleScope: pickedLeagueScope)) {
            return preview
        }
        return nil
    }

    private var deskNeeds: [OmenDeskView.Need] {
        var needs: [OmenDeskView.Need] = []
        if case .read(let waiver) = commandCenterViewModel.deskState(railCount: 0, railIndex: 0)?.waiver {
            let title = waiver.dropName.map { "Add \(waiver.addName), drop \($0)" } ?? "Add \(waiver.addName)"
            needs.append(.init(id: "waiver", kind: .waiver, title: title, detail: waiver.reasoning))
        }
        for team in deskTeams where team.status == .reconnect {
            needs.append(.init(id: "reconnect-\(team.id)", kind: .reconnect, title: "Sign in to \(OmenProviderMark.displayName(team.platform)) again", detail: team.leagueName))
        }
        return needs
    }

    private var deskProviderName: String {
        OmenProviderMark.displayName(tradeViewModel.offer.leagueContext?.platform)
    }

    @ViewBuilder
    private func deskDestination(_ route: DeskRoute) -> some View {
        switch route {
        case .player(let id):
            if let player = tradeViewModel.viewerRoster?.players.first(where: { $0.id == id }) {
                OmenPlayerScreen(
                    page: OmenPlayerPage(player, ownerLabel: "Your team", providerName: deskProviderName),
                    tradeTitle: "Shop \(player.name) in a trade",
                    onTrade: {
                        if !tradeViewModel.isInOffer(player, side: .send) { tradeViewModel.toggleFromRoster(player, side: .send) }
                        tradePath = [.build]
                        selectedTab = .trade
                    }
                )
            } else {
                OmenStateBlock(kind: .notEnoughToGoOn, title: "This player isn\u{2019}t on the roster Omen just read", message: "Rosters change after trades and waivers. Go back to see the current team.")
                    .padding(OmenSpacing.step20)
                    .frame(maxHeight: .infinity, alignment: .top)
                    .background(OmenColor.bg)
            }
        case .ledger:
            OmenLedgerScreen(
                state: {
                    var state = OmenLedgerState.from(entries: commandCenterViewModel.ledgerState.entries)
                    state.headline = commandCenterViewModel.ledgerHeadline
                    return state
                }(),
                onOpenAccount: { presentSheet(.account) },
                onOpenCall: { call in deskPath.append(.receipt(call.id)) }
            )
        case .receipt(let id):
            if let entry = commandCenterViewModel.ledgerState.entries.first(where: { $0.id == id }) {
                LedgerReceiptView(entry: entry, load: { await commandCenterViewModel.loadReceipt(id: $0) }, onOpenAccount: { presentSheet(.account) })
            } else {
                OmenStateBlock(kind: .notEnoughToGoOn, title: "This call isn\u{2019}t in the Ledger Omen just read", message: "Go back to see the current Ledger.")
                    .padding(OmenSpacing.step20)
                    .frame(maxHeight: .infinity, alignment: .top)
                    .background(OmenColor.bg)
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $deskPath) {
                OmenDeskView(
                    phase: deskPhase,
                    weekLabel: commandCenterViewModel.deskState(railCount: leagueCarouselViewModel.pages.count, railIndex: leagueCarouselViewModel.selectedIndex)?.weekLabel,
                    teams: deskTeams,
                    selectedTeamID: deskSelection,
                    move: deskMove,
                    needs: deskNeeds,
                    team: (tradeViewModel.viewerRoster?.players ?? []).map { OmenPlayerSummary($0, providerName: deskProviderName) }
                        .sorted { ($0.omenPoints ?? $0.providerPoints ?? -1) > ($1.omenPoints ?? $1.providerPoints ?? -1) },
                    teamProvider: deskProviderName,
                    ledgerLine: commandCenterViewModel.ledgerHeadline,
                    isDemo: userID == SessionManager.demoUserID,
                    switchingTo: leagueCarouselViewModel.committingPageID.flatMap { id in
                        leagueCarouselViewModel.pages.first { $0.id == id }?.displayTeamName
                    },
                    switchError: leagueCarouselViewModel.selectionError.map(commandCenterFailureMessage),
                    onRetrySwitch: {
                        Task {
                            if await leagueCarouselViewModel.commitSelection() != nil { await reloadAllAfterContextChange() }
                        }
                    },
                    onAccount: { presentSheet(.account) },
                    onRetry: {
                        Task {
                            await leagueCarouselViewModel.load(userID: userID)
                            await commandCenterViewModel.load(userID: userID, scope: pickedLeagueScope)
                        }
                    },
                    onConnect: { presentSheet(.connect) },
                    onOpenMove: { selectedTab = .omen },
                    onNeed: { need in
                        switch need.kind {
                        case .waiver: selectedTab = .league
                        case .reconnect: presentSheet(.connect)
                        }
                    },
                    onReconnect: { _ in presentSheet(.connect) },
                    onOpenPlayer: { deskPath.append(.player($0)) },
                    onOpenLedger: commandCenterViewModel.ledgerState.entries.isEmpty ? nil : { deskPath.append(.ledger) }
                )
                .navigationTitle("Desk")
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(for: DeskRoute.self) { route in deskDestination(route) }
            }
            .onChange(of: leagueCarouselViewModel.selectedIndex) { _, _ in
                // Pushed screens belong to the team they were opened for.
                deskPath = []
                Task {
                    if await leagueCarouselViewModel.commitSelection() != nil {
                        await reloadAllAfterContextChange()
                    }
                }
            }
            // "Your team" comes from the same roster read Trade uses (cached five minutes).
            .task(id: tradeViewModel.offer.leagueContext) {
                guard userID != SessionManager.demoUserID else { return }
                await tradeViewModel.loadRoster(userID: userID)
            }
            .task {
                // Resolve context before making a personalized read. An unscoped dashboard
                // request is not a useful head start: it can return another league or a false
                // empty state, then immediately require a second request once the directory lands.
                await leagueCarouselViewModel.load(userID: userID)
                // The desk previews this week's move, so the call starts here, beside the desk's
                // own reads, rather than waiting for the Omen tab to be opened.
                // Only when the held call is not already for this league, so returning to the desk
                // does not re-ask (and flicker the preview).
                async let call: Void = pickedLeagueScope == nil
                    ? omenDecisionViewModel.load(userID: userID, scope: nil)
                    : omenDecisionViewModel.loadIfLeagueChanged(userID: userID, scope: pickedLeagueScope)
                await commandCenterViewModel.load(userID: userID, scope: pickedLeagueScope)
                await call
            }
            .tabItem { CommandCenterTab.command.label }
            .tag(CommandCenterTab.command)

            // M5 slice D: the Omen destination now renders the live engine's answer.
            // Previously this picked a fixture — `realDisconnected` for every real
            // signed-in user, regardless of their actual leagues.
            NavigationStack(path: $omenPath) {
                OmenCallView(
                    state: omenDecisionViewModel.briefState(visibleScope: pickedLeagueScope),
                    startSit: omenDecisionViewModel.startSitDetail,
                    weekLabel: commandCenterViewModel.weekLabel,
                    // Omen hands the move over: it opens the league on the provider's own site.
                    providerName: leagueCarouselViewModel.activePage.flatMap { Self.handoffURL(for: $0) == nil ? nil : OmenProviderMark.displayName($0.platform) },
                    teamControl: leagueCarouselViewModel.activePage.map { ($0.platform, $0.displayTeamName) },
                    onSwitchTeam: { presentSheet(.switcher) },
                    onMakeMove: leagueCarouselViewModel.activePage.flatMap(Self.handoffURL(for:)).map { url in { UIApplication.shared.open(url) } },
                    onRetryStartSit: { Task { await omenDecisionViewModel.load(userID: userID, scope: pickedLeagueScope) } },
                    onOpenFullArgument: {
                        // The argument is the one on screen when tapped; a later reload never blanks it.
                        fullArgumentPayload = omenDecisionViewModel.briefState(visibleScope: pickedLeagueScope).payload
                        omenPath.append(.fullArgument)
                    },
                    onReport: { presentSheet(.report(.omen)) },
                    onReviewTrade: { reviewTradeCall($0) },
                    onFindOtherTrades: { findOtherTrades() }
                )
                .navigationTitle("Omen")
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(for: OmenRoute.self) { _ in
                    if let payload = fullArgumentPayload {
                        OmenFullArgumentScreen(payload: payload)
                    } else {
                        OmenStateBlock(kind: .notEnoughToGoOn, title: "There\u{2019}s no call to argue yet", message: "Go back once Omen has made this week\u{2019}s call.")
                            .padding(OmenSpacing.step20)
                            .frame(maxHeight: .infinity, alignment: .top)
                            .background(OmenColor.bg)
                    }
                }
            }
            .task {
                omenDecisionViewModel.onConnect = { presentSheet(.connect) }
                await omenDecisionViewModel.load(userID: userID, scope: pickedLeagueScope)
            }
            // The picker can change the league without this tab's own `.task` running again, and the
            // directory can arrive after the first call went out unscoped. Either way the Omen call must be
            // for the league on screen, never the one before it. A no-op when a reload already covers it.
            // Keyed on the scope itself, not `currentLeagueID`: an old server that reports no active league leaves
            // that nil while `activePage` falls back to the resting page, and the tab must still follow.
            .onChange(of: pickedLeagueScope) { _, _ in
                Task { await omenDecisionViewModel.loadIfLeagueChanged(userID: userID, scope: pickedLeagueScope) }
            }
            .tabItem { CommandCenterTab.omen.label }
            .tag(CommandCenterTab.omen)

            // M5 slice G: the Trade destination now renders `trade-compare.v2`.
            //
            // J4: once the server has answered, the answer is J4's screen rather than the
            // builder's inline verdict. `OmenTradeAnswer.from` picks `TradeVerdict` or
            // `TradeNeedsContext` off `verdict_state` — the same seat in the journey, in the two
            // states the contract returns it in. `TradeBuild`/`TradeRoster` (real opponent
            // rosters, `GET /api/trade/roster`) and `TradeShare` (`POST /api/trade/share`) route
            // independently below, since neither is "the answer" — see `OmenTradeAnswer`'s
            // header for why they route separately rather than through it.
            //
            // `dismissVerdict` keeps the offer. A user who reads "you give up too much" wants to
            // change one player, not retype the deal.
            NavigationStack(path: $tradePath) {
                OmenTradeChooserView(
                    teamControl: leagueCarouselViewModel.activePage.map { ($0.platform, $0.displayTeamName) },
                    onSwitchTeam: { presentSheet(.switcher) },
                    onFind: { tradePath.append(.find) },
                    onBuild: { tradePath.append(.build) },
                    onJudge: { tradePath.append(.judge) }
                )
                .navigationTitle("Trade")
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(for: TradeRoute.self) { route in
                    switch route {
                    case .find:
                            TradeFindFlowView(
                                directoryRepository: leagueDirectoryRepository,
                                sessionManager: sessionManager,
                                apiBaseURL: environment.apiBaseURL,
                                userID: userID,
                                platform: pickedLeagueScope?.platform ?? tradeViewModel.offer.leagueContext?.platform,
                                leagueId: pickedLeagueScope?.leagueID ?? tradeViewModel.offer.leagueContext?.leagueId,
                                fallbackTeamId: loadedOverviewTeamId,
                                onOpenAccount: { presentSheet(.account) },
                                onConnectLeague: { presentSheet(.connect) },
                                onDismiss: { tradePath.removeAll() }
                            )
                    case .build:
                        tradeBuilder.toolbar(.hidden, for: .tabBar)
                    case .threeTeam:
                        // Three-team still runs on the old build screen until its own rebuild (ledger).
                        OmenTradeBuildScreen(
                            state: tradeViewModel.rosterBuildState,
                            onOpenAccount: { presentSheet(.account) },
                            onSelectPartner: { tradeViewModel.selectPartnerTeam($0) },
                            onPrimaryAction: {
                                if case .loaded = tradeViewModel.threeTeamViewState { tradeViewModel.dismissThreeTeamVerdict() }
                                else { Task { await tradeViewModel.compareThreeTeam(userID: userID) } }
                            },
                            onOpenPartnerPicker: {
                                tradeViewModel.openPartnerPicker()
                                if tradeViewModel.isPartnerPickerPresented { presentSheet(.tradePartnerPicker) }
                            },
                            onRemoveThirdPartner: { tradeViewModel.removeThirdPartner() },
                            onToggleSubmissionStepDone: { tradeViewModel.toggleThreeTeamSubmissionStep($0) },
                            onCopySubmissionStep: { if let text = tradeViewModel.copyTextForThreeTeamStep($0) { UIPasteboard.general.string = text } }
                        )
                        .toolbar(.hidden, for: .tabBar)
                    case .judge:
                            OmenTradeScreen(
                                state: tradeViewModel.viewState,
                                offer: tradeViewModel.offer,
                                searchState: tradeViewModel.searchState,
                                searchingSide: tradeViewModel.searchingSide,
                                onQueryChanged: { query, side in tradeViewModel.search(query, side: side) },
                                onAddResult: { player, side in tradeViewModel.add(player, to: side) },
                                onRemove: { index, side in tradeViewModel.remove(at: index, from: side) },
                                onCompare: { Task { await tradeViewModel.compare(userID: userID) } },
                                capabilities: tradeViewModel.capabilities,
                                prefill: tradeViewModel.prefill
                            )
                            .omenScreenReady("trade-judge")
                    case .player(let id):
                        tradePlayer(id).toolbar(.hidden, for: .tabBar)
                    }
                }
            }
            .sheet(isPresented: tradeVerdictShown, onDismiss: { tradeShowingShare = false }) {
                if tradeShowingShare, let state = tradeViewModel.shareScreenState {
                    OmenTradeShareSheet(
                        state: state,
                        onToggle: { tradeViewModel.toggleShareInclusion($0) },
                        onShare: {
                            Task {
                                if tradeViewModel.sharedURL(baseURL: environment.apiBaseURL) == nil { await tradeViewModel.share(userID: userID) }
                                if let url = tradeViewModel.sharedURL(baseURL: environment.apiBaseURL) {
                                    tradeShareURL = url
                                }
                            }
                        },
                        onCopy: { if let text = tradeViewModel.copyShareText() { UIPasteboard.general.string = text } },
                        onDone: { tradeShowingShare = false }
                    )
                    .sheet(isPresented: Binding(get: { tradeShareURL != nil }, set: { if !$0 { tradeShareURL = nil } })) {
                        if let url = tradeShareURL { OmenActivityView(items: [url]) }
                    }
                } else if case .loaded(let compare) = tradeViewModel.viewState,
                   let answer = OmenTradeAnswer.from(compare, offer: tradeViewModel.offer) {
                    OmenTradeVerdictSheet(
                        kind: { switch answer { case .verdict(let v): .verdict(v); case .needsContext(let n): .needsContext(n) } }(),
                        providerName: leagueCarouselViewModel.activePage.flatMap { Self.handoffURL(for: $0) == nil ? nil : OmenProviderMark.displayName($0.platform) },
                        onAdjust: { tradeViewModel.dismissVerdict() },
                        onOpenProvider: leagueCarouselViewModel.activePage.flatMap(Self.handoffURL(for:)).map { url in { UIApplication.shared.open(url) } },
                        onShare: { tradeShowingShare = true },
                        onConnect: {
                            // One sheet at a time: close the verdict, then open Connect.
                            tradeViewModel.dismissVerdict()
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { presentSheet(.connect) }
                        }
                    )
                }
            }
            .task {
                // Demo is the reviewer's network-free door: it never calls the API.
                guard userID != SessionManager.demoUserID else { return }
                await tradeViewModel.loadCapabilities()
            }
            // The league to personalize against comes from the SAME `league-overview.v1` read
            // the League destination uses. Trade never discovers a league on its own, so the
            // two screens can never disagree about which league the user is in.
            .onChange(of: leagueViewModel.viewState, initial: true) { _, newValue in
                guard case .loaded(let overview) = newValue else {
                    // Loading and failure are context boundaries too. Clear the previous
                    // league immediately so its opponents cannot remain visible under the
                    // newly selected league while that read is unresolved.
                    tradeViewModel.useLeague(platform: nil, leagueId: nil, viewerTeamId: nil)
                    return
                }
                syncTradeLeague(overview)
            }
            .onChange(of: leagueCarouselViewModel.directory) { _, _ in
                // Directory and overview are independent reads. If the overview wins the
                // race during a bye, apply the authoritative team identity when the
                // directory arrives instead of waiting for another weekly matchup.
                guard case .loaded(let overview) = leagueViewModel.viewState else { return }
                syncTradeLeague(overview)
            }
            .tabItem { CommandCenterTab.trade.label }
            .tag(CommandCenterTab.trade)

            // M5 slice F: the League destination now renders `league-overview.v1`. It
            // replaced an honest "landing next" placeholder, which was correct while the
            // screen contract was unratified and is no longer.
            withTeamPicker {
                OmenLeagueScreen(
                    state: leagueViewModel.viewState,
                    onRetry: { Task { await leagueViewModel.reload() } },
                    onConnect: { presentSheet(.connect) },
                    // E017 carries both controls, and `OmenScreenShell` renders the account
                    // one only when this is non-nil. Without it the League destination — and
                    // the wire sheet it presents, which inherits this same closure — were the
                    // only signed-in surfaces with no route to the account. Every sibling tab
                    // already passed it.
                    onOpenAccount: { presentSheet(.account) },
                    // The wire comes from the SAME `waiver-analysis.v1` read Command Center
                    // already makes, for the reason Trade takes its league from the League
                    // destination's read: two surfaces that fetch the wire separately can
                    // disagree about it on screen.
                    //
                    // Nil until that read lands, which removes the section link rather than
                    // opening an empty sheet.
                    wire: commandCenterViewModel.waiverAnalysis.map {
                        OmenScoutWireState.from(analysis: $0, weekLabel: leagueViewModel.wireWeekLabel)
                    },
                    tradeTargets: leagueTradeTargetsViewModel.section,
                    waiverSummary: commandCenterViewModel.waiverAnalysis?.scoutSummary
                        ?? OmenLeagueScreen.waiverUnread
                )
                .omenScreenReady("league")
            }
            .task { await loadLeagueForSelectedContext() }
            .tabItem { CommandCenterTab.league.label }
            .tag(CommandCenterTab.league)
        }
        // The selected tab rendered in iOS system blue while every other element on the same
        // screen used the Omen accent — found on device 2026-09-01. Android's NavigationBar
        // already tinted correctly; only iOS had drifted.
        .tint(OmenColor.accent)
        .sheet(item: $presentedSheet, onDismiss: {
            tradeViewModel.dismissPartnerPicker()
            if tradeViewModel.shareScreenState != nil { tradeViewModel.dismissShare() }
        }) { sheet in
            commandCenterSheet(sheet)
        }
    }

    /// One Apple system-sheet presenter for every context-strip / screen-shell switch action.
    ///
    /// Before this lived here, the shared Boolean was passed to the Omen, Trade and League tab
    /// pickers simultaneously. Command itself has no picker, so a Command tap depended on one of
    /// three off-tab views winning SwiftUI's presentation race. That is the device-visible
    /// "nothing happened until I tapped something else" failure this ownership removes.
    private var shellSwitcherSheet: some View {
        OmenTeamPicker(
            viewModel: leagueCarouselViewModel,
            userID: userID,
            onContextChanged: { _ in
                Task { await reloadAllAfterContextChange() }
            },
            onAddLeague: { presentSheet(.connect) },
            externalPresentation: switcherPresentedBinding
        )
        .switcherSheet
    }

    private var switcherPresentedBinding: Binding<Bool> {
        Binding(
            get: {
                if case .switcher = presentedSheet { return true }
                return false
            },
            set: { isPresented in
                if isPresented { presentSheet(.switcher) }
                else if case .switcher = presentedSheet { presentedSheet = nil }
            }
        )
    }

    @ViewBuilder
    private func commandCenterSheet(_ sheet: CommandCenterSheet) -> some View {
        switch sheet {
        case .switcher:
            shellSwitcherSheet
        case .connect:
            NavigationStack {
                ConnectView(
                    repository: connectRepository,
                    sessionManager: sessionManager,
                    onConnected: {
                        presentedSheet = nil
                        Task {
                            await leagueCarouselViewModel.load(userID: userID)
                            await reloadAllAfterContextChange()
                        }
                    },
                    onDismiss: { presentedSheet = nil }
                )
                .navigationTitle("Connect")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        OmenContextualHelpButton(
                            topic: OmenContextualHelpContent.topic(for: .connect),
                            size: .sm
                        )
                    }
                }
            }
        case .account:
            NavigationStack {
                AccountView(
                    userID: userID,
                    sessionManager: sessionManager,
                    authViewModel: authViewModel,
                    leagueDirectoryRepository: leagueDirectoryRepository,
                    onReportProblem: { presentSheet(.report(.account)) }
                )
                .navigationTitle("Account")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        OmenContextualHelpButton(
                            topic: OmenContextualHelpContent.topic(for: .account),
                            size: .sm
                        )
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        OmenButton(title: "Done", action: { presentedSheet = nil }, variant: .link, size: .sm)
                    }
                }
            }
        case .report(let screen):
            OmenReportComposerSheet(
                screen: screen,
                connectionState: reportConnectionState,
                repository: URLSessionBetaReportRepository(apiBaseURL: environment.apiBaseURL),
                accessToken: sessionManager.currentSession?.accessToken,
                onDismiss: { presentedSheet = nil }
            )
        case .tradeShareSetup:
            if let state = tradeViewModel.shareScreenState {
                NavigationStack {
                    OmenTradeShareSheet(
                        state: state,
                        onToggle: { tradeViewModel.toggleShareInclusion($0) },
                        onShare: {
                            Task {
                                if let url = tradeViewModel.sharedURL(baseURL: environment.apiBaseURL) {
                                    presentTradeShare(url)
                                    return
                                }
                                await tradeViewModel.share(userID: userID)
                                if let url = tradeViewModel.sharedURL(baseURL: environment.apiBaseURL) {
                                    presentTradeShare(url)
                                }
                            }
                        },
                        onCopy: {
                            if let text = tradeViewModel.copyShareText() { UIPasteboard.general.string = text }
                        },
                        onDone: { presentedSheet = nil }
                    )
                    .omenScreenReady("trade-share")
                }
            }
        case .tradeActivity(let url):
            OmenActivityView(items: [url])
        case .tradePartnerPicker:
            TradePartnerPicker(
                candidates: tradeViewModel.partnerPickerCandidates,
                leagueName: nil,
                onSelect: {
                    tradeViewModel.addThirdPartner($0)
                    presentedSheet = nil
                },
                onDismiss: {
                    tradeViewModel.dismissPartnerPicker()
                    presentedSheet = nil
                }
            )
        }
    }

    private func presentSheet(_ sheet: CommandCenterSheet) {
        guard presentedSheet != nil else {
            presentedSheet = sheet
            return
        }
        // UIKit must finish dismissing the current controller before SwiftUI asks it to host
        // the replacement. One state value means a second sheet can never race the first.
        presentedSheet = nil
        DispatchQueue.main.async {
            presentedSheet = sheet
        }
    }

    /// The one provider fact a report carries, and the reason it is derived here rather than in
    /// the composer: the shell already knows which league is active and the composer must not
    /// go looking. It resolves to a `provider:state` pair or to `none` — never to a league id,
    /// a team, or anything a provider returned.
    private var reportConnectionState: OmenBetaReportConnectionState {
        let page = leagueCarouselViewModel.currentPage
            ?? leagueCarouselViewModel.allPages.first(where: { $0.isActive })
        guard let platform = page?.platform,
              let provider = OmenBetaReportConnectionState.Provider(rawValue: platform)
        else {
            return .none
        }
        return OmenBetaReportConnectionState(provider: provider, state: .connected)
    }

    private func presentTradeShare(_ url: URL) {
        presentSheet(.tradeActivity(url))
    }

    /// Reloads every personalized surface after a context (league) change.
    ///
    /// The three reads are independent, so they run concurrently. They used to run one after another
    /// (Command, then League, then the Omen engine), which made a switch cost the SUM of all three —
    /// measured on 2026-10-11 at about 7.5 s end to end, most of it spent on tabs the user was not
    /// looking at. Each load still resets its own state first, so no surface shows the previous
    /// team's numbers (§10.3); only the waiting overlaps.
    private func reloadAllAfterContextChange() async {
        let scope = pickedLeagueScope
        omenDecisionViewModel.expect(scope: scope)
        async let command: Void = commandCenterViewModel.load(userID: userID, scope: scope)
        async let league: Void = loadLeagueForSelectedContext()
        async let omen: Void = omenDecisionViewModel.load(userID: userID, scope: scope)
        _ = await (command, league, omen)
    }

    /// "Review this trade" on the Omen tab: the Trade tab opens with the call's swap filled in, in the league
    /// the call was made for, and Omen checks it. The call's own league wins; the picker fills in when the
    /// server named none.
    private func reviewTradeCall(_ call: OmenTradeCall) {
        var call = call
        if call.scope == nil { call.scope = pickedLeagueScope }
        // Refused (no known league, or not reviewable): stay on the call rather than open a Trade tab that
        // would compare these players in some other league.
        guard tradeViewModel.applyPrefill(from: call) else { return }
        // "Check it in the builder": the call's players are in the trays and the verdict opens over them.
        tradePath = [.build]
        selectedTab = .trade
        Task { await tradeViewModel.compare(userID: userID) }
    }

    /// "Find other trades" on the Omen tab: open the Trade tab's Find mode.
    private func findOtherTrades() {
        tradePath = [.find]
        selectedTab = .trade
    }

    /// The league the app is on, named for personalized requests. Nil until the directory has loaded, in
    /// which case the server uses the account's selected league, as it always did.
    private var pickedLeagueScope: OmenCallScope? {
        leagueCarouselViewModel.activePage?.omenCallScope
    }

    private func loadLeagueForSelectedContext() async {
        let page = leagueCarouselViewModel.activePage
        await leagueViewModel.load(userID: userID, platform: page?.platform, leagueID: page?.leagueID)
    }

    private func syncTradeLeague(_ overview: LeagueOverview) {
        let directoryTeamID = overview.leagueId.flatMap { leagueID in
            leagueCarouselViewModel.directory?.teamID(platform: overview.platform, leagueID: leagueID)
        }
        tradeViewModel.useLeague(
            platform: overview.platform,
            leagueId: overview.leagueId,
            viewerTeamId: directoryTeamID ?? overview.matchup.you?.teamId
        )
        // The League tab's trade targets come from the same scan, for the same league and team.
        if userID != SessionManager.demoUserID,
           let leagueId = overview.leagueId,
           let teamId = directoryTeamID ?? overview.matchup.you?.teamId, !teamId.isEmpty {
            Task {
                await leagueTradeTargetsViewModel.load(
                    platform: overview.platform, leagueId: leagueId, teamId: teamId, week: overview.week
                )
            }
        }
    }
}

/// The permanent 4-tab navigation contract.
///
/// **Title and icon live here and nowhere else.** They used to be written twice — once in this
/// file and once in `ScreenshotScenarios.FauxShell` — which is how the screenshot harness came
/// to advertise Trade and League as "landing next" for a day after the real screens shipped
/// (`F-VET-B01`). Two copies of a list drift; one copy cannot.
private enum CommandCenterSheet: Identifiable {
    case switcher
    case connect
    case account
    case report(OmenBetaReportScreen)
    case tradeShareSetup
    case tradeActivity(URL)
    case tradePartnerPicker

    var id: String {
        switch self {
        case .switcher: return "switcher"
        case .connect: return "connect"
        case .account: return "account"
        case .report(let screen): return "report-\(screen.rawValue)"
        case .tradeShareSetup: return "trade-share-setup"
        case .tradeActivity(let url): return "trade-activity-\(url.absoluteString)"
        case .tradePartnerPicker: return "trade-partner-picker"
        }
    }
}

private struct OmenActivityView: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

enum CommandCenterTab: String, Hashable, CaseIterable {
    case command, omen, trade, league

    var title: String {
        switch self {
        // "Desk" since the whole-app canvas (2026-10-19). The case keeps its raw value so stored
        // selections and screenshot scenarios stay valid.
        case .command: return "Desk"
        case .omen: return "Omen"
        case .trade: return "Trade"
        case .league: return "League"
        }
    }

    /// The canvas's stroke icons, as their nearest SF Symbols.
    var systemImage: String {
        switch self {
        case .command: return "menubar.rectangle"
        case .omen: return "scope"
        case .trade: return "arrow.left.arrow.right"
        case .league: return "chart.bar"
        }
    }

    var label: some View { Label(title, systemImage: systemImage) }
}

/// Pushed screens on the Omen tab (navigation map).
enum OmenRoute: Hashable { case fullArgument }

/// Pushed screens on the Desk tab (navigation map).
enum DeskRoute: Hashable {
    case player(String)
    case ledger
    case receipt(String)
}

/// User-facing copy for a shell read failure. Deliberately says what the user can do and
/// never surfaces a token, URL, or provider identifier — `OmenApiError` carries only a
/// status code, so there is nothing sensitive to leak here by construction.
private func commandCenterFailureMessage(_ error: OmenApiError) -> String {
    switch error {
    case .cancelled:
        return "That was interrupted. Try again."
    case .network:
        return "We couldn't reach Omen. Check your connection and try again."
    case .unauthorized:
        return "Your session expired. Sign in again to see your leagues."
    case .server(let status):
        return "Omen had a problem on our side (error \(status)). Try again in a moment."
    case .decode:
        return "Omen sent something this version of the app couldn't read. Updating the app may fix it."
    }
}

/// Demo fixtures use deliberately generic player names. `omen-store-review-notes-v1.md` tells App
/// Review that "Player names are generic ('Sample QB Starter') specifically so that demo output can
/// never be mistaken for real fantasy advice" — until 2026-09-01 that claim was false on this very
/// fixture, which shipped Christian McCaffrey and Ken Walker III. Do not reintroduce real player
/// names or NFL team abbreviations here: the reviewer notes are a statement to Apple, and this
/// fixture is the thing that has to make it true.
enum OmenDecisionFixtures {

    /// J3's deterministic nominal receipt. This is a successful server-shaped decision,
    /// not demo mode: the journey needs to prove the shipped success composition without
    /// borrowing a real account, player, provider response, or credential.
    static let journeyNominalPayload = OmenDecisionBriefPayload(
        verdict: "Start Sample WR1 over Sample WR2",
        callType: "start_sit",
        move: "Move Sample WR1 into the flex slot before kickoff.",
        impact: "+3.8 projected",
        confidenceBand: .confident,
        confidenceDrivers: [
            "The roster and projection reads agree on the stronger option.",
            "The usage gap stayed stable across the latest provider update."
        ],
        risk: .low,
        riskReasons: ["Both players remain active in the latest read."],
        explanation: ["Sample WR1 has the stronger projection and the steadier route share."],
        metrics: [],
        signals: [
            OmenSignalItem(label: "Roster", source: .live,
                           detail: "The selected league roster was read successfully.",
                           kind: .verified, used: true),
            OmenSignalItem(label: "Projections", source: .live,
                           detail: "Current-week projections favor Sample WR1.",
                           kind: .projection, used: true),
            OmenSignalItem(label: "Start sit inference", source: .live,
                           detail: "The lineup model used both available players.",
                           kind: .inference, used: true)
        ],
        alternatives: [
            OmenDecisionBriefAlternative(
                name: "Sample WR3",
                position: .wr,
                team: "Sample Team",
                meta: "Lower projected floor"
            )
        ],
        readComparison: OmenReadComparison(
            authority: .omenLeads,
            providerLabel: "ESPN",
            providerPoints: 13.7,
            omenPoints: 17.5,
            position: "WR",
            scoringFamily: "ppr",
            sampleSize: 65,
            weeks: 2,
            evaluatedAt: "2026-10-15T12:00:00Z",
            omenMAE: 4.2,
            providerMAE: 4.8,
            crosswindGap: 3.8,
            crosswindThreshold: 3.5,
            portents: ["Target share +1.2", "Route participation +0.8"]
        )
    )

    static let journeyNominal: OmenDecisionBriefState = .success(journeyNominalPayload)

    /// The **degraded** `omen_mvp` capture — the scenario `capability-expression-v1.md` requires
    /// of every profile, and the only one under which this screen's honesty is visible at all.
    ///
    /// Every other scenario in this file is a success or a disconnected state. A screen can
    /// satisfy the entire capability contract and no existing capture would show it, because
    /// nothing was ever missing in any of them. This one deliberately carries all three of the
    /// renderable classes at once:
    ///
    /// - `Roster` — `live`, **used**: evidence that moved the call.
    /// - `Matchup Dvp` — `live`, **not used**: resolved, and it did not decide anything. It must
    ///   not carry evidence styling, because a source is not evidence until an engine marks it
    ///   used (`shared-decision-context.v1`).
    /// - `Weather` — **unavailable**: named rather than omitted. A factor silently dropped reads
    ///   as a factor that did not matter.
    ///
    /// The fourth class, `not_requested`, is deliberately absent from this fixture: it is filtered
    /// before mapping and must never reach a screen, so there is nothing here for it to render as.
    ///
    /// Player names are generic for the same reason the demo fixtures' are — a capture that
    /// escapes into a deck must not read as real fantasy advice.
    static let journeyDegradedPayload = OmenDecisionBriefPayload(
        verdict: "Start Sample WR1 over Sample WR2",
        callType: "start_sit",
        move: "Sample WR2 draws the tougher shadow corner this week.",
        confidenceBand: .leaning,
        confidenceDrivers: ["Target share held above 25% in three of the last four."],
        risk: .low,
        riskReasons: [],
        explanation: ["Sample WR1's routes-run share is the stable half of this call."],
        metrics: [],
        signals: [
            OmenSignalItem(label: "Roster", source: .live,
                           detail: "Live roster read for the selected league.",
                           kind: .verified, used: true),
            OmenSignalItem(label: "Matchup Dvp", source: .live,
                           detail: "Read, but it did not move this call.",
                           kind: .projection, used: false),
            OmenSignalItem(label: "Weather", source: .unavailable,
                           detail: "Omen could not read kickoff weather for this game.",
                           kind: .limitation, used: false)
        ],
        alternatives: [],
        readComparison: OmenReadComparison(
            authority: .unresolvedLowSample,
            providerLabel: "Yahoo",
            providerPoints: 14.1,
            omenPoints: 15.3,
            position: "WR",
            scoringFamily: "ppr",
            sampleSize: 31,
            weeks: 1,
            evaluatedAt: "2026-10-15T12:00:00Z",
            omenMAE: nil,
            providerMAE: nil,
            crosswindGap: nil,
            crosswindThreshold: nil,
            portents: []
        )
    )

    static let degraded: OmenDecisionBriefState = .success(journeyDegradedPayload)

    static let demo: OmenDecisionBriefState = .demo(OmenDecisionBriefPayload(
        verdict: "Start Sample RB1", move: "Bench Sample RB2 for the RB1 slot.",
        impact: "+4.1 projected over your bench.", confidence: 72, risk: .low,
        riskReasons: ["Full practice Friday."], explanation: ["The matchup and usage signals favor Sample RB1 this week."],
        metrics: [OmenMetricItem(label: "Projected", value: "22.4", delta: "+4.1", deltaDirection: .positive)],
        signals: [OmenSignalItem(label: "Demo roster snapshot", source: .mock)],
        alternatives: [OmenDecisionBriefAlternative(name: "Sample RB2", position: .rb, team: "Demo", meta: "Limited practice")]
    ))
    static let realDisconnected: OmenDecisionBriefState = .disconnected(connect: nil)
}
