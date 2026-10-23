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
    /// The Command Center carousel. Its own view model rather than the switcher's: the two
    /// read the same route for different reasons, cache different things, and must fail
    /// independently — the same reasoning already recorded for `leagueDirectoryRepository`.
    @StateObject private var leagueCarouselViewModel: LeagueCarouselViewModel
    private let connectRepository: ConnectRepository
    /// Account's league list reads the directory through its own view model, apart from the carousel.
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
        _leagueCarouselViewModel = StateObject(wrappedValue: LeagueCarouselViewModel(
            directoryRepository: leagueDirectoryRepository,
            leagueRepository: leagueRepository,
            sessionManager: sessionManager
        ))
        self.leagueDirectoryRepository = leagueDirectoryRepository
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
    @State private var deletingAccount = false
    @State private var omenPath: [OmenRoute] = []
    @State private var leaguePath: [LeagueRoute] = []
    @State private var tradePath: [TradeRoute] = []
    @State private var tradeShowingShare = false
    @State private var tradeShareURL: URL?

    /// The verdict is a sheet over the builder or the offer; closing it keeps the picks.
    private var tradeVerdictShown: Binding<Bool> {
        Binding(
            get: {
                guard case .loaded(let compare) = tradeViewModel.viewState else { return false }
                return OmenTradeAnswer.from(compare, offer: tradeViewModel.offer) != nil
            },
            set: { if !$0 { tradeViewModel.dismissVerdict() } }
        )
    }

    private var tradeProviderName: String { OmenProviderMark.displayName(tradeViewModel.offer.leagueContext?.platform) }

    private var leagueState: OmenLeagueState {
        switch leagueViewModel.viewState {
        case .idle, .loading:
            return OmenLeagueState(phase: .loading)
        case .demo:
            return OmenLeagueState(phase: .noLeague)
        case .failed(let error):
            return OmenLeagueState(phase: .failed(LeagueViewModel.message(for: error)))
        case .loaded(let overview):
            let provider = OmenProviderMark.displayName(overview.platform)
            let waiver = commandCenterViewModel.waiverAnalysis.map { OmenWaiversState(analysis: $0, providerName: provider) }
            return OmenLeagueState(
                overview: overview,
                targets: leagueTradeTargetsViewModel.candidates.map { OmenFindTradeState.Candidate($0, providerName: provider) },
                targetsNote: leagueTradeTargetsViewModel.note,
                waiver: waiver?.headline.map { .init(line: $0, gain: commandCenterViewModel.waiverAnalysis?.bestMove?.improvement) }
            )
        }
    }

    @ViewBuilder
    private var waiversScreen: some View {
        if let analysis = commandCenterViewModel.waiverAnalysis {
            let provider = OmenProviderMark.displayName(leagueCarouselViewModel.activePage?.platform)
            OmenWaiversScreen(
                state: OmenWaiversState(analysis: analysis, providerName: provider),
                onOpenProvider: leagueCarouselViewModel.activePage.flatMap(Self.handoffURL(for:)).map { url in { UIApplication.shared.open(url) } }
            )
        } else {
            OmenStateBlock(kind: .loading, title: "Reading the wire")
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
        }
    }

    private var tradeThreeTeam: some View {
        let vm = tradeViewModel
        let teams = vm.threeTeamTeams
        var rosters: [String: [OmenPlayerSummary]] = [:]
        var destinations: [String: String] = [:]
        for team in teams {
            let players = vm.threeTeamRoster(team.id)?.players ?? []
            rosters[team.id] = players.map { OmenPlayerSummary($0, providerName: tradeProviderName) }
            for player in players {
                if let to = vm.threeTeamDestination(playerKey: player.playerKey ?? player.name, from: team.id) {
                    destinations["\(team.id)|\(player.id)"] = to
                }
            }
        }
        let moves = vm.threeTeamLegs.map { OmenThreeTeamState.Move(id: $0.id.uuidString, players: $0.players.map(\.name), fromID: $0.from, toID: $0.to) }
        let names: (String) -> String = { id in teams.first { $0.id == id }?.name ?? id }
        let phase: OmenThreeTeamState.Phase = {
            switch vm.threeTeamViewState {
            case .idle, .demo: return .building
            case .loading: return .judging
            case .failed(let e): return .failed(TradeViewModel.message(for: e))
            case .loaded(let compare):
                let lines = teams.map { team -> OmenThreeTeamState.Line in
                    let out = vm.threeTeamLegs.filter { $0.from == team.id }
                    let into = vm.threeTeamLegs.filter { $0.to == team.id }
                    let participant = compare.participants.first { $0.teamID == team.id }
                    return .init(
                        id: team.id, name: team.name,
                        sends: out.isEmpty ? nil : out.map { "send \($0.players.map(\.name).joined(separator: ", ")) to \(names($0.to))" }.joined(separator: "; "),
                        gets: into.isEmpty ? nil : into.map { "get \($0.players.map(\.name).joined(separator: ", ")) from \(names($0.from))" }.joined(separator: "; "),
                        net: participant?.netValue
                    )
                }
                let steps = compare.submission.steps.enumerated().map { OmenThreeTeamState.Step(id: $0.offset, text: $0.element, done: vm.threeTeamSubmissionDoneSteps.contains($0.offset)) }
                return .judged(lines: lines, caption: compare.submission.caption, steps: steps)
            }
        }()
        return OmenThreeTeamScreen(
            state: OmenThreeTeamState(
                providerName: tradeProviderName, teams: teams, candidates: vm.partnerPickerCandidates,
                rosters: rosters, destinations: destinations, moves: moves, phase: phase
            ),
            onPickThird: { id in if let team = vm.partnerPickerCandidates.first(where: { $0.id == id }) { vm.addThirdPartner(team) } },
            onRemoveThird: {
                vm.removeThirdPartner()
                tradePath.removeLast()
            },
            onSend: { summary, from, to in
                if let player = vm.threeTeamRoster(from)?.players.first(where: { $0.id == summary.id }) { vm.setThreeTeamDestination(player, from: from, to: to) }
            },
            onOpenPlayer: { tradePath.append(.player($0)) },
            onJudge: { Task { await vm.compareThreeTeam(userID: userID) } },
            onAdjust: { vm.dismissThreeTeamVerdict() },
            onToggleStep: { vm.toggleThreeTeamSubmissionStep($0) },
            onCopyStep: { if let text = vm.copyTextForThreeTeamStep($0) { UIPasteboard.general.string = text } },
            onOpenProvider: leagueCarouselViewModel.activePage.flatMap(Self.handoffURL(for:)).map { url in { UIApplication.shared.open(url) } }
        )
    }

    private var tradeJudge: some View {
        OmenJudgeOfferScreen(
            state: OmenJudgeOfferState(
                send: tradeViewModel.offer.send,
                receive: tradeViewModel.offer.receive,
                partners: tradeViewModel.rosterPartners,
                partnerID: tradeViewModel.selectedPartnerTeamID,
                results: tradeViewModel.suggestions.map { result in
                    OmenJudgeOfferState.Result(
                        id: result.id, name: result.name, position: result.position, team: result.team,
                        owner: tradeOwner(of: result), isCorrection: result.matchType == "fuzzy"
                    )
                },
                searchNote: {
                    switch tradeViewModel.searchState {
                    case .idle, .results: return nil
                    case .searching: return "Looking\u{2026}"
                    case .empty(let q): return "No player named \u{201C}\(q)\u{201D}."
                    case .failed(let e): return TradeViewModel.message(for: e)
                    }
                }(),
                judging: tradeViewModel.viewState == .loading,
                judgeError: { if case .failed(let e) = tradeViewModel.viewState { return TradeViewModel.message(for: e) } else { return nil } }()
            ),
            onQuery: { tradeViewModel.search($0, side: $1) },
            onAdd: { picked, side in
                if let result = tradeViewModel.suggestions.first(where: { $0.id == picked.id }) { tradeViewModel.add(result, to: side) }
            },
            onRemove: { tradeViewModel.remove(at: $0, from: $1) },
            onSwitchPartner: { tradeViewModel.switchPartner(to: $0) },
            onJudge: { Task { await tradeViewModel.compare(userID: userID) } }
        )
        // Rosters name who owns each player and who sent the offer; Judge works without them.
        .task { if userID != SessionManager.demoUserID { await tradeViewModel.loadRoster(userID: userID) } }
    }

    /// "on Gibbs me some Rice", "free agent" only when every roster was read, or nil when Omen can't tell.
    private func tradeOwner(of result: PlayerSearchResult) -> String? {
        guard case .loaded(let rosters) = tradeViewModel.rosterBrowseState, rosters.isAvailable else { return nil }
        // Search ids and roster keys share the provider id; a name match is only the fallback.
        let key = result.name.lowercased()
        let byKey: (TradeRosterResponse.Player) -> Bool = { player in
            guard let k = player.playerKey else { return false }
            return k == result.id || k.hasSuffix(":\(result.id)")
        }
        let byName: (TradeRosterResponse.Player) -> Bool = { $0.name.lowercased() == key }
        if let team = rosters.teams.first(where: { $0.players.contains(where: byKey) })
            ?? rosters.teams.first(where: { $0.players.contains(where: byName) }) {
            return team.id == tradeViewModel.viewerTeamID ? "on your team" : team.teamName.map { "on \($0)" }
        }
        // A team that came back empty (unreadable) could be hiding him: no free-agent claim then.
        return rosters.teams.allSatisfy { !$0.players.isEmpty } ? "free agent" : nil
    }

    @ViewBuilder
    private var tradeBuilder: some View {
        switch tradeViewModel.rosterBrowseState {
        case .idle where { if case .failed = leagueViewModel.viewState { return true } else { return false } }():
            OmenStateBlock(kind: .failed, title: "Omen couldn\u{2019}t read your league", message: "Trades are built from your league\u{2019}s rosters, and that read didn\u{2019}t come back.", actionTitle: "Try again", action: { Task { await loadLeagueForSelectedContext() } })
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
        // The overview loaded but gave the builder no league or team: say so instead of loading forever.
        case .idle where tradeViewModel.offer.leagueContext == nil && { if case .loaded = leagueViewModel.viewState { return true } else { return false } }():
            OmenStateBlock(kind: .notEnoughToGoOn, title: "Pick a team to trade from", message: "Omen read your league but couldn\u{2019}t tell which team is yours. Choose your team, then build a trade.", actionTitle: "Try again", action: { Task { await loadLeagueForSelectedContext() } })
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
        case .idle, .loading:
            OmenStateBlock(kind: .loading, title: "Reading your league\u{2019}s rosters", message: "Your team and every other team, so you can pick from both.")
                .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
                .task(id: tradeViewModel.offer.leagueContext) { await tradeViewModel.loadRoster(userID: userID) }
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
                    onThreeTeam: tradeViewModel.rosterCapability?.threeTeamSupported == true ? { tradePath.append(.threeTeam) } : nil
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
        } else if case .loaded(let rosters) = tradeViewModel.rosterBrowseState,
                  let team = rosters.teams.first(where: { $0.players.contains { $0.id == id } }),
                  let player = team.players.first(where: { $0.id == id }) {
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
        case .waivers:
            waiversScreen
        case .ledger:
            switch commandCenterViewModel.ledgerState {
            case .loading:
                OmenStateBlock(kind: .loading, title: "Reading the Ledger")
                    .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
            case .error(let message):
                OmenStateBlock(kind: .failed, title: "The Ledger didn\u{2019}t load", message: message)
                    .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
            case .notConnected:
                OmenStateBlock(kind: .notEnoughToGoOn, title: "No league connected", message: "Connect a league and Omen starts keeping the record.")
                    .padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top).background(OmenColor.bg)
            case .entries, .empty:
            OmenLedgerScreen(
                state: OmenLedgerState(
                    entries: commandCenterViewModel.ledgerState.entries,
                    record: commandCenterViewModel.ledgerRecord,
                    providerName: deskProviderName,
                    season: commandCenterViewModel.ledgerSeason
                ),
                onOpenCall: { deskPath.append(.receipt($0)) }
            )
            }
        case .account:
            AccountView(
                userID: userID,
                sessionManager: sessionManager,
                leagueDirectoryRepository: leagueDirectoryRepository,
                needsSignIn: Set(deskTeams.filter { $0.status == .reconnect }.map(\.platform)),
                onOpen: { deskPath.append(.accountPage($0)) },
                onConnect: { presentSheet(.connect) },
                onContactSupport: { deskPath.append(.support) },
                onReportProblem: { presentSheet(.report(.account)) }
            )
        case .accountPage(let page):
            switch page {
            case .signIn: OmenSignInScreen(identity: userID, authViewModel: authViewModel)
            case .privacy: OmenPrivacyScreen(onExport: nil, onDelete: { deletingAccount = true })
                .sheet(isPresented: $deletingAccount) { OmenDeleteAccountSheet(sessionManager: sessionManager) }
            case .sources: OmenSourcesScreen()
            case .howCalls: OmenHowCallsScreen()
            }
        case .support:
            OmenReportComposerSheet(
                title: "Contact support",
                screen: .account,
                connectionState: reportConnectionState,
                repository: URLSessionBetaReportRepository(apiBaseURL: environment.apiBaseURL),
                accessToken: sessionManager.currentSession?.accessToken,
                onDismiss: { if !deskPath.isEmpty { deskPath.removeLast() } },
                topic: .question
            )
            .toolbar(.hidden, for: .navigationBar)
        case .receipt(let id):
            if let entry = commandCenterViewModel.ledgerState.entries.first(where: { $0.id == id }) {
                LedgerReceiptView(entry: entry, load: { await commandCenterViewModel.loadReceipt(id: $0) })
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
                    onAccount: { deskPath.append(.account) },
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
                        case .waiver: deskPath.append(.waivers)
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
                // The league overview names the league Trade and the Desk's "Your team" read rosters from. Loaded
                // at launch beside the other reads, not only when the League tab opens: before this, opening Trade
                // first left it with no league and the false "couldn't reach the server" (live walk, 2026-10-22).
                async let league: Void = loadLeagueIfNeeded()
                await commandCenterViewModel.load(userID: userID, scope: pickedLeagueScope)
                _ = await (call, league)
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
                    // The saved argument, else the call on screen now: a destination built before the tap's state
                    // landed showed "no call to argue" beside a live call (live walk, 2026-10-22).
                    if let payload = fullArgumentPayload ?? omenDecisionViewModel.briefState(visibleScope: pickedLeagueScope).payload {
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
                            findRepository: ApiTradeFindRepository(client: OmenApiClient(baseURL: environment.apiBaseURL)),
                            userID: userID,
                            platform: pickedLeagueScope?.platform ?? tradeViewModel.offer.leagueContext?.platform,
                            leagueId: pickedLeagueScope?.leagueID ?? tradeViewModel.offer.leagueContext?.leagueId,
                            fallbackTeamId: loadedOverviewTeamId,
                            onConnectLeague: { presentSheet(.connect) },
                            onOpenInBuilder: { candidate in
                                tradeViewModel.openInBuilder(candidate)
                                // Back from the builder returns to the trade Omen found.
                                tradePath.append(.build)
                            },
                            onOpenPlayer: { tradePath.append(.player($0)) },
                            onDismiss: { tradePath.removeAll() }
                        )
                        .toolbar(.hidden, for: .tabBar)
                    case .build:
                        tradeBuilder.toolbar(.hidden, for: .tabBar)
                    case .threeTeam:
                        tradeThreeTeam.toolbar(.hidden, for: .tabBar)
                    case .judge:
                        tradeJudge.toolbar(.hidden, for: .tabBar)
                    case .player(let id):
                        tradePlayer(id).toolbar(.hidden, for: .tabBar)
                    }
                }
            }
            .sheet(isPresented: tradeVerdictShown, onDismiss: { tradeShowingShare = false; tradeViewModel.dismissShare() }) {
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
                async let league: Void = loadLeagueIfNeeded()
                await tradeViewModel.loadCapabilities()
                await league
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

            NavigationStack(path: $leaguePath) {
                OmenLeagueView(
                    state: leagueState,
                    teamControl: leagueCarouselViewModel.activePage.map { ($0.platform, $0.displayTeamName) },
                    onSwitchTeam: { presentSheet(.switcher) },
                    onRetry: { Task { await leagueViewModel.reload() } },
                    onConnect: { presentSheet(.connect) },
                    onOpenTarget: { id in
                        guard let candidate = leagueTradeTargetsViewModel.candidates.first(where: { $0.id == id }) else { return }
                        tradeViewModel.openInBuilder(candidate)
                        tradePath = [.build]
                        selectedTab = .trade
                    },
                    onOpenWaivers: commandCenterViewModel.waiverAnalysis == nil ? nil : { leaguePath.append(.waivers) }
                )
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(for: LeagueRoute.self) { route in
                    switch route {
                    case .waivers: waiversScreen
                    }
                }
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
        OmenTeamSwitcherSheet(
            teams: deskTeams,
            selectedID: leagueCarouselViewModel.activePage?.id ?? deskSelection.wrappedValue,
            committingID: leagueCarouselViewModel.committingPageID,
            error: leagueCarouselViewModel.selectionError.map { "That switch didn\u{2019}t take. " + commandCenterFailureMessage($0) },
            onSelect: { team in
                guard let page = leagueCarouselViewModel.allPages.first(where: { $0.id == team.id }) else { return }
                // Moving the Rolodex to the team is the switch: the Desk's selection change commits it and
                // reloads, so every tab and the switcher's check agree on one team.
                if let index = leagueCarouselViewModel.pages.firstIndex(where: { $0.id == team.id }),
                   index != leagueCarouselViewModel.selectedIndex {
                    leagueCarouselViewModel.selectedIndex = index
                    presentedSheet = nil
                    return
                }
                Task {
                    if await leagueCarouselViewModel.commit(page) != nil {
                        presentedSheet = nil
                        await reloadAllAfterContextChange()
                    }
                }
            },
            onReconnect: { _ in presentedSheet = nil; DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { presentSheet(.connect) } },
            onConnect: { presentedSheet = nil; DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { presentSheet(.connect) } },
            onAccount: { presentedSheet = nil; selectedTab = .command; deskPath = [.account] },
            onDone: { presentedSheet = nil }
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

    /// Starts the league overview unless it is already loaded or loading.
    private func loadLeagueIfNeeded() async {
        switch leagueViewModel.viewState {
        case .idle, .failed: await loadLeagueForSelectedContext()
        default: return
        }
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
    case report(OmenBetaReportScreen)
    case tradeShareSetup
    case tradeActivity(URL)

    var id: String {
        switch self {
        case .switcher: return "switcher"
        case .connect: return "connect"
        case .report(let screen): return "report-\(screen.rawValue)"
        case .tradeShareSetup: return "trade-share-setup"
        case .tradeActivity(let url): return "trade-activity-\(url.absoluteString)"
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
    case waivers
    case ledger
    case receipt(String)
    case account
    case accountPage(AccountRoute)
    case support
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
