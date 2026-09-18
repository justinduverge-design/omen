import SwiftUI

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
    @State private var showAccountSheet: Bool = false
    @State private var showConnectSheet: Bool = false
    @State private var showSwitcherSheet: Bool = false
    @State private var selectedTab: CommandCenterTab = .command
    @StateObject private var leagueViewModel: LeagueViewModel
    @StateObject private var tradeViewModel: TradeViewModel

    init(
        userID: String,
        sessionManager: SessionManager,
        authViewModel: AuthViewModel,
        dashboardRepository: DashboardRepository,
        leagueRepository: LeagueRepository,
        movesRepository: MovesRepository,
        waiverRepository: WaiverAnalysisRepository,
        omenDecisionRepository: OmenDecisionRepository,
        connectRepository: ConnectRepository,
        leagueDirectoryRepository: LeagueDirectoryRepository,
        tradeRepository: TradeRepository,
        playerSearchRepository: PlayerSearchRepository
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
            sessionManager: sessionManager
        ))
        _omenDecisionViewModel = StateObject(wrappedValue: OmenDecisionViewModel(
            repository: omenDecisionRepository,
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
                    Task {
                        // Every personalized surface, not just the visible one — a user who
                        // switches on Trade and then taps League must not find the old team
                        // there.
                        await commandCenterViewModel.load(userID: userID)
                        await loadLeagueForSelectedContext()
                        await omenDecisionViewModel.load(userID: userID)
                    }
                },
                onAddLeague: { showConnectSheet = true },
                // Command Center's Context Strip has its own "Switch". Both open this one
                // sheet, so the order and the favourites cannot differ by entry point.
                externalPresentation: $showSwitcherSheet
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)
            content()
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            Group {
                if let failure = commandCenterViewModel.failure {
                    // M5 slice B: an unreadable shell renders an explicit failure surface.
                    // It must NOT silently fall through to the disconnected fixture, which
                    // would state as fact that the user has no leagues.
                    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                        OmenStateSurface(
                            kind: .error,
                            title: "Couldn't reach Omen",
                            message: commandCenterFailureMessage(failure)
                        )
                        OmenButton(
                            title: "Try again",
                            action: { Task { await commandCenterViewModel.load(userID: userID) } },
                            variant: .secondary,
                            size: .md
                        )
                    }
                    .padding(OmenSpacing.step24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .background(OmenColor.bg)
                } else {
                    OmenCommandCenterScreen(
                        state: commandCenterViewModel.commandCenterState,
                        // Passing this is what makes the strip's "Switch" control render
                        // at all — `OmenContextStrip` hides it when `onSwitch` is nil,
                        // which is why a user with a connected league previously had no
                        // way to choose it.
                        onSwitchContext: { showSwitcherSheet = true },
                        onOpenAccount: { showAccountSheet = true },
                        onConnect: { showConnectSheet = true },
                        onOpenOmen: { selectedTab = .omen },
                        onOpenLeague: { selectedTab = .league },
                        carousel: leagueCarouselViewModel,
                        userID: userID,
                        // §10.3: the server names the surfaces a context change invalidates,
                        // and the client re-reads them rather than deciding for itself. The
                        // Omen and League destinations reload lazily on their own `.task`,
                        // so the shell is the one that has to be told.
                        onContextChanged: { _ in
                            Task {
                                await commandCenterViewModel.load(userID: userID)
                                await loadLeagueForSelectedContext()
                                await omenDecisionViewModel.load(userID: userID)
                            }
                        },
                        loadReceipt: { await commandCenterViewModel.loadReceipt(id: $0) }
                    )
                }
            }
            .task { await commandCenterViewModel.load(userID: userID) }
            .tabItem { CommandCenterTab.command.label }
            .tag(CommandCenterTab.command)

            // M5 slice D: the Omen destination now renders the live engine's answer.
            // Previously this picked a fixture — `realDisconnected` for every real
            // signed-in user, regardless of their actual leagues.
            withTeamPicker { OmenDecisionScreen(state: omenDecisionViewModel.briefState) }
            .task {
                omenDecisionViewModel.onConnect = { showConnectSheet = true }
                await omenDecisionViewModel.load(userID: userID)
            }
            .tabItem { CommandCenterTab.omen.label }
            .tag(CommandCenterTab.omen)

            // M5 slice G: the Trade destination now renders `trade-compare.v2`.
            withTeamPicker {
                OmenTradeScreen(
                    state: tradeViewModel.viewState,
                    offer: tradeViewModel.offer,
                    searchState: tradeViewModel.searchState,
                    searchingSide: tradeViewModel.searchingSide,
                    onQueryChanged: { query, side in tradeViewModel.search(query, side: side) },
                    onAdd: { name, side in tradeViewModel.add(name, to: side) },
                    onAddResult: { player, side in tradeViewModel.add(player, to: side) },
                    onRemove: { index, side in tradeViewModel.remove(at: index, from: side) },
                    onCompare: { Task { await tradeViewModel.compare(userID: userID) } },
                    capabilities: tradeViewModel.capabilities
                )
                .task { await tradeViewModel.loadCapabilities() }
            }
            // The league to personalize against comes from the SAME `league-overview.v1` read
            // the League destination uses. Trade never discovers a league on its own, so the
            // two screens can never disagree about which league the user is in.
            .onChange(of: leagueViewModel.viewState) { _, newValue in
                guard case .loaded(let overview) = newValue else { return }
                tradeViewModel.useLeague(platform: overview.platform, leagueId: overview.leagueId)
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
                    onConnect: { showConnectSheet = true }
                )
            }
            .task { await loadLeagueForSelectedContext() }
            .tabItem { CommandCenterTab.league.label }
            .tag(CommandCenterTab.league)
        }
        // The selected tab rendered in iOS system blue while every other element on the same
        // screen used the Omen accent — found on device 2026-09-01. Android's NavigationBar
        // already tinted correctly; only iOS had drifted.
        .tint(OmenColor.accent)
        .sheet(isPresented: $showConnectSheet) {
            NavigationStack {
                ConnectView(
                    repository: connectRepository,
                    sessionManager: sessionManager,
                    onConnected: {
                        showConnectSheet = false
                        // Re-read the shell so the new connection is reflected immediately
                        // rather than waiting for the next cold launch.
                        Task { await commandCenterViewModel.load(userID: userID) }
                    },
                    onDismiss: { showConnectSheet = false }
                )
                .navigationTitle("Connect")
                .navigationBarTitleDisplayMode(.inline)
                // M6-ContextualHelp on the toolbar rather than inside `providerPicker`, so it
                // is still reachable from the error, on-hold, and ESPN-unsupported states —
                // which is exactly where "why can't I connect this?" gets asked.
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        OmenContextualHelpButton(
                            topic: OmenContextualHelpContent.topic(for: .connect),
                            size: .sm
                        )
                    }
                }
            }
        }
        .sheet(isPresented: $showAccountSheet) {
            NavigationStack {
                AccountView(
                    userID: userID,
                    sessionManager: sessionManager,
                    authViewModel: authViewModel,
                    leagueDirectoryRepository: leagueDirectoryRepository
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
                            OmenButton(title: "Done", action: { showAccountSheet = false }, variant: .link, size: .sm)
                        }
                    }
            }
        }
    }

    private func loadLeagueForSelectedContext() async {
        let page = leagueCarouselViewModel.currentPage ?? leagueCarouselViewModel.allPages.first(where: { $0.isActive })
        await leagueViewModel.load(userID: userID, platform: page?.platform, leagueID: page?.leagueID)
    }
}

/// The permanent 4-tab navigation contract.
///
/// **Title and icon live here and nowhere else.** They used to be written twice — once in this
/// file and once in `ScreenshotScenarios.FauxShell` — which is how the screenshot harness came
/// to advertise Trade and League as "landing next" for a day after the real screens shipped
/// (`F-VET-B01`). Two copies of a list drift; one copy cannot.
enum CommandCenterTab: String, Hashable, CaseIterable {
    case command, omen, trade, league

    var title: String {
        switch self {
        case .command: return "Command"
        case .omen: return "Omen"
        case .trade: return "Trade"
        case .league: return "League"
        }
    }

    var systemImage: String {
        switch self {
        case .command: return "sparkles"
        case .omen: return "bolt.fill"
        case .trade: return "arrow.left.arrow.right"
        case .league: return "person.3.fill"
        }
    }

    var label: some View { Label(title, systemImage: systemImage) }
}

/// User-facing copy for a shell read failure. Deliberately says what the user can do and
/// never surfaces a token, URL, or provider identifier — `OmenApiError` carries only a
/// status code, so there is nothing sensitive to leak here by construction.
private func commandCenterFailureMessage(_ error: OmenApiError) -> String {
    switch error {
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

/// M4 Omen destination assembly. State selection stays here; DecisionBrief owns its states.
/// The Omen destination — `U1`, built against `Blueprints/specs/design/screen-contracts/
/// OmenCall-v1.md` and `design/native-visual-lock-2026-09-13/OmenCall.dc.html`.
///
/// **Omen decides or declines to decide.** The experience contract is explicit that this screen
/// never ranks candidates — other destinations explore, this one commits — so there is no list
/// affordance here and `alternatives` is deliberately not rendered.
///
/// `.success` is laid out here because the artboard specifies this screen's composition.
/// **Every other state still belongs to `OmenDecisionBrief`**, which owns all nine of them and is
/// exercised state-by-state in the design-system gallery; duplicating them here would create a
/// second set to keep honest, which is the failure `demo-mode-pre-empty-state` warns about.
struct OmenDecisionScreen: View {
    let state: OmenDecisionBriefState
    /// Rendered as the header eyebrow (E015). Absent when the caller does not know the week —
    /// a screen that names a week it was not told is a claim about the schedule.
    var weekLabel: String?
    /// Fills the primary action (E055). Without it the action cannot name where the move goes,
    /// so it is not offered: a button that says "make this move" somewhere unspecified is worse
    /// than no button.
    var providerName: String?
    var onMakeMove: (() -> Void)?
    var onDecline: (() -> Void)?
    var onOpenFullArgument: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                header
                scopeLine
                if case .success(let payload) = state {
                    callCard(payload)
                    actions(payload)
                    footerLine
                } else {
                    // Every non-success state, unchanged and owned by the brief.
                    OmenDecisionBrief(state: state)
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                if let weekLabel {
                    Text(weekLabel)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.accent)
                }
                Text("Omen")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            // Kept although the artboard shows an account avatar in this slot. M6-ContextualHelp
            // shipped it, confidence/risk/"why is this empty" are the three things people ask
            // here, and deleting a shipped affordance to match a picture is not a fix. Recorded
            // as an open conflict in the drift report rather than resolved silently.
            OmenContextualHelpButton(topic: OmenContextualHelpContent.topic(for: .omen))
        }
    }

    /// E018–E021. `1 of 3` and `Locked Tue 3:00` are **deliberately absent**: no call index and
    /// no lock time exist in `omen-decision-brief.v3`, and a client-computed lock time is a claim
    /// about the provider's schedule Omen cannot stand behind — wrong in exactly the weeks it
    /// matters. "One per team" is a true product statement (fact-of-record #16) and stays.
    private var scopeLine: some View {
        Text("Call · one per team")
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(OmenColor.textTertiary)
    }

    private func callCard(_ payload: OmenDecisionBriefPayload) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
            if let callType = payload.callType, !callType.isEmpty {
                Text(Self.callTypeLabel(callType))
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
            Text(payload.verdict)
                .omenTextStyle(OmenTypography.call)
                .foregroundStyle(OmenColor.textPrimary)
            Text(payload.explanation.first ?? payload.move)
                .omenTextStyle(OmenTypography.name)
                .foregroundStyle(OmenColor.textSecondary)

            // E026–E028. Band and risk sit together; the band is a rule and a word, never a
            // number and never a meter.
            HStack(spacing: OmenSpacing.step14) {
                if let band = payload.confidenceBand {
                    OmenConfidenceBandLabel(band: band)
                }
                OmenRiskLabel(level: payload.risk, reason: payload.riskReasons.first)
                Spacer(minLength: 0)
            }

            if !payload.confidenceUnavailableReason.isEmpty, payload.confidenceBand == nil {
                ForEach(payload.confidenceUnavailableReason, id: \.self) { reason in
                    Text(reason)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }
            }

            factsRow(payload)

            OmenEvidenceDisclosure(
                rows: payload.signals.prefix(3).map { ($0.label, $0.detail ?? "") },
                onOpenFullArgument: onOpenFullArgument
            )
        }
        .padding(OmenSpacing.step14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(OmenColor.surface2)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(OmenColor.borderSubtle, lineWidth: 1))
        )
    }

    /// E029–E041, and the capability expression for profile `omen_mvp`.
    ///
    /// The chips are not chosen here — each is one input from the decision receipt, rendered in
    /// its class per `capability-expression-v1.md`. `not_requested` never arrives: it is filtered
    /// before mapping, because a source Omen never asked for is not one it failed to read.
    private func factsRow(_ payload: OmenDecisionBriefPayload) -> some View {
        let facts = payload.signals.filter { $0.source == .unavailable || $0.used == true }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: OmenSpacing.step8) {
                ForEach(facts) { signal in
                    OmenFactChip(
                        label: signal.label,
                        icon: Self.icon(for: signal.label),
                        unread: signal.source == .unavailable
                    )
                }
            }
        }
    }

    private func actions(_ payload: OmenDecisionBriefPayload) -> some View {
        VStack(spacing: OmenSpacing.step8) {
            if let providerName, let onMakeMove {
                // `submission: handoff_only`. This never claims the offer was sent — it hands the
                // user to the provider, which is the only thing Omen can honestly promise.
                OmenButton(title: "Make this move in \(providerName)", action: onMakeMove, variant: .primary, size: .lg)
            }
            if let onDecline {
                OmenButton(title: "Not this week", action: onDecline, variant: .secondary, size: .lg)
            }
        }
    }

    private var footerLine: some View {
        Text("Every call lands in the Ledger whether you take it or not.")
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textSecondary)
            .padding(.top, OmenSpacing.step10)
    }

    /// "start_sit" -> "Start / sit". Server vocabulary, rendered as words.
    private static func callTypeLabel(_ raw: String) -> String {
        let words = raw.split(whereSeparator: { $0 == "_" || $0 == "-" }).map(String.init)
        guard let first = words.first else { return raw }
        return ([first.capitalized] + words.dropFirst()).joined(separator: " / ")
    }

    /// The artboard draws a factor-specific symbol per chip. The API's capability vocabulary is
    /// open-ended, so a symbol is used only where the name genuinely maps to one; anything else
    /// gets the unread-source mark when it is unread, and no invented glyph when it is not.
    /// Recorded as a contract-vs-vocabulary gap rather than papered over with a default icon.
    private static func icon(for label: String) -> OmenEvidenceIcon? {
        let key = label.lowercased()
        if key.contains("weather") || key.contains("wind") { return .wind }
        if key.contains("travel") || key.contains("zone") || key.contains("schedule") { return .travelZones }
        if key.contains("rest") || key.contains("days") { return .restClock }
        // No symbol rather than a wrong one. Falling back to `.unreadSource` put the
        // "could not read" mark on inputs Omen HAD read and used — the first build of this
        // screen shipped a used Roster chip wearing the unread glyph, which is a false claim
        // made by an icon. An absent symbol says nothing; the wrong symbol says something untrue.
        return nil
    }
}

/// Demo fixtures use deliberately generic player names. `omen-store-review-notes-v1.md` tells App
/// Review that "Player names are generic ('Sample QB Starter') specifically so that demo output can
/// never be mistaken for real fantasy advice" — until 2026-09-01 that claim was false on this very
/// fixture, which shipped Christian McCaffrey and Ken Walker III. Do not reintroduce real player
/// names or NFL team abbreviations here: the reviewer notes are a statement to Apple, and this
/// fixture is the thing that has to make it true.
enum OmenDecisionFixtures {

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
    static let degraded: OmenDecisionBriefState = .success(OmenDecisionBriefPayload(
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
        alternatives: []
    ))

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
