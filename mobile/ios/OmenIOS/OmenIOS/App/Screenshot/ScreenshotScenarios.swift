import SwiftUI

/// Reusable screenshot-mode registry for the native-visual-evidence CI workflow. The app
/// reads the launch argument `OMEN_SCREENSHOT_SCENARIO` on startup — if the value matches
/// an entry here, the app mounts *only* that scenario against fully deterministic in-app
/// fixtures (no session/auth, no network, no fabricated provider state) and the workflow
/// captures a screenshot.
///
/// Adding a scenario for a future M4 screen means adding one entry to `entries` and one
/// matrix row to `.github/workflows/native-visual-evidence.yml`. Naming rule mirrors
/// Android: `<screen-slug>.<state-slug>`, kebab-case, dot-separated, lowercase.
enum ScreenshotScenarios {
    static let launchArgumentKey = "OMEN_SCREENSHOT_SCENARIO"

    /// Every declared scenario. Add rows here to extend the workflow matrix.
    static let entries: [String: ScreenshotScenario] = [
        "onboarding.sign-in": ScreenshotScenario(
            label: "Onboarding — sign in first",
            content: { AnyView(OnboardingAuthScreenshotHost(kind: .signIn)) }
        ),
        "onboarding.email-code": ScreenshotScenario(
            label: "Onboarding — email code",
            content: { AnyView(OnboardingAuthScreenshotHost(kind: .emailCode)) }
        ),
        "onboarding.connect-league": ScreenshotScenario(
            label: "Onboarding — connect your league",
            content: { AnyView(OnboardingConnectScreenshotHost()) }
        ),
        "command-center.demo-connected": ScreenshotScenario(
            label: "Command Center — demo/mock connected",
            content: { AnyView(FauxShell(scenarioKey: "command-center.demo-connected")) }
        ),
        "command-center.disconnected": ScreenshotScenario(
            label: "Command Center — real user, disconnected",
            content: { AnyView(FauxShell(scenarioKey: "command-center.disconnected")) }
        ),
        // `M5` slices F and G. Added 2026-08-30 with `F-VET-B03`: the two newest screens in
        // the product had no scenario at all, so nothing — not the harness, not an
        // accessibility audit, not any UI test — could reach them without a real account.
        "trade.verdict": ScreenshotScenario(
            label: "Trade — personalized verdict",
            content: { AnyView(FauxShell(scenarioKey: "trade.verdict", initialTab: .trade)) }
        ),
        "trade.empty": ScreenshotScenario(
            label: "Trade — no offer entered yet",
            content: { AnyView(FauxShell(scenarioKey: "trade.empty", initialTab: .trade)) }
        ),
        "league.loaded": ScreenshotScenario(
            label: "League — live matchup, standings, empty activity",
            content: { AnyView(FauxShell(scenarioKey: "league.loaded", initialTab: .league)) }
        ),
        "league.matchup-unavailable": ScreenshotScenario(
            label: "League — matchup unavailable beside live standings",
            content: { AnyView(FauxShell(scenarioKey: "league.matchup-unavailable", initialTab: .league)) }
        ),
        "omen.demo": ScreenshotScenario(
            label: "Omen — demo/mock decision",
            content: { AnyView(FauxShell(scenarioKey: "omen.demo")) }
        ),
        "omen.disconnected": ScreenshotScenario(
            label: "Omen — real user, disconnected",
            content: { AnyView(FauxShell(scenarioKey: "omen.disconnected")) }
        ),
        "switcher.team-sheet": ScreenshotScenario(
            label: "Team switcher — pinned bar and the sheet, one favourite starred",
            content: { AnyView(TeamSwitcherScreenshotHost()) }
        ),
        // §10.2 switcher. Rendered against a deterministic in-app stub rather than a live
        // account, so the states are capturable without credentials — including the ones a
        // real account would rarely show on demand (an unreadable directory, an empty one).
        "league-switcher.loaded": ScreenshotScenario(
            label: "League switcher — leagues across platforms",
            content: { AnyView(LeagueSwitcherScreenshotHost(kind: .loaded)) }
        ),
        "league-switcher.empty": ScreenshotScenario(
            label: "League switcher — nothing connected",
            content: { AnyView(LeagueSwitcherScreenshotHost(kind: .empty)) }
        ),
        "league-switcher.failed": ScreenshotScenario(
            label: "League switcher — directory unreadable",
            content: { AnyView(LeagueSwitcherScreenshotHost(kind: .failed)) }
        ),
        "help-support.available": ScreenshotScenario(
            label: "Help + Support — available",
            content: { AnyView(OmenHelpSupportView(contextDescription: "Need help with your current Omen flow? Start with a topic below.")) }
        ),
        "help-support.no-account": ScreenshotScenario(
            label: "Help + Support — no account",
            content: { AnyView(OmenHelpSupportView(state: .noAccount)) }
        ),
        "help-support.offline": ScreenshotScenario(
            label: "Help + Support — offline",
            content: { AnyView(OmenHelpSupportView(state: .offline)) }
        ),
        "help-support.submission-unavailable": ScreenshotScenario(
            label: "Help + Support — feedback unavailable",
            content: { AnyView(OmenHelpSupportView(state: .submissionUnavailable)) }
        ),
        "help-support.provider-recovery": ScreenshotScenario(
            label: "Help + Support — provider recovery",
            content: { AnyView(OmenHelpSupportView(state: .providerRecovery)) }
        ),
        // M4-CC-WaiverWatch. One scenario per registered honest state so each can be rendered
        // and reviewed on its own. The composition is NOT re-implemented here — every entry
        // mounts the real `OmenCommandCenterScreen` and varies only `waiverWatch`, mirroring
        // the Android connected test that asserts the same six states.
        //
        // Base fixture is chosen for coherence, not convenience: `not-connected` uses the
        // disconnected fixture because "your waiver moves need a league" beside a selected
        // demo league would be a state the product never produces. The other five imply a
        // usable league, so they sit on the demo-connected fixture.
        //
        // Waiver Watch renders below the fold on every current iPhone, so capturing these
        // requires scrolling the screen — see `scripts/capture-screenshot-scenario.sh`.
        "waiver-watch.pending": ScreenshotScenario(
            label: "Waiver Watch — claim pending",
            content: { AnyView(waiverWatch(.pending)) }
        ),
        "waiver-watch.processed": ScreenshotScenario(
            label: "Waiver Watch — waivers processed",
            content: { AnyView(waiverWatch(.processed)) }
        ),
        "waiver-watch.availability-unknown": ScreenshotScenario(
            label: "Waiver Watch — availability needs confirmation",
            content: { AnyView(waiverWatch(.availabilityUnknown)) }
        ),
        "waiver-watch.no-credible-move": ScreenshotScenario(
            label: "Waiver Watch — no credible move",
            content: { AnyView(waiverWatch(.noCredibleMove)) }
        ),
        "waiver-watch.not-connected": ScreenshotScenario(
            label: "Waiver Watch — no connected league",
            content: { AnyView(waiverWatch(.notConnected, base: OmenCommandCenterFixtures.realDisconnected)) }
        ),
        "waiver-watch.off-season": ScreenshotScenario(
            label: "Waiver Watch — off-season",
            content: { AnyView(waiverWatch(.offSeason)) }
        ),
        // M6-ContextualHelp. The sheet body is captured directly rather than through a tap:
        // screenshot mode has no interaction, and the content is what needs proving.
        "contextual-help.command-center": ScreenshotScenario(
            label: "Contextual help — Command Center",
            content: { AnyView(contextualHelp(.commandCenter)) }
        ),
        "contextual-help.omen": ScreenshotScenario(
            label: "Contextual help — Omen of the Week",
            content: { AnyView(contextualHelp(.omen)) }
        ),
        "contextual-help.connect": ScreenshotScenario(
            label: "Contextual help — Connect a league (native provider truth)",
            content: { AnyView(contextualHelp(.connect)) }
        ),
        "contextual-help.account": ScreenshotScenario(
            label: "Contextual help — Account",
            content: { AnyView(contextualHelp(.account)) }
        ),
        // O7 forced-update gate. Captured directly rather than through the real gate:
        // screenshot mode has no network, and the blocking composition is what needs
        // proving. The version is a fixture, not a real minimum.
        "forced-update.blocked": ScreenshotScenario(
            label: "Forced update — build below minimum",
            content: {
                AnyView(
                    ForcedUpdateView(
                        minimumVersion: "1.2.0",
                        // Fixture URL so the evidence and the accessibility audit cover the
                        // button state. The real build ships this nil until the listing exists.
                        storeURL: URL(string: "https://apps.apple.com/app/id0000000000"),
                        onUpdate: {}
                    )
                )
            }
        ),
        // The state that actually ships today: no App Store listing yet, so `storeURL` is nil
        // and no button is drawn. Captured because it is the live configuration, not an edge case.
        "forced-update.no-store-link": ScreenshotScenario(
            label: "Forced update — below minimum, no store listing yet",
            content: {
                AnyView(ForcedUpdateView(minimumVersion: "1.2.0", storeURL: nil, onUpdate: {}))
            }
        ),
    ]

    /// Rebuilds `base` with one field replaced. `OmenCommandCenterState` is a `let`-only
    /// struct with no `copy`, so the swap is spelled out rather than mutated in place.
    private static func waiverWatch(
        _ state: OmenWaiverWatchState,
        base: OmenCommandCenterState = OmenCommandCenterFixtures.demoConnected
    ) -> some View {
        ScreenshotScenarioHost.commandCenter(
            OmenCommandCenterState(
                greeting: base.greeting,
                context: base.context,
                platforms: base.platforms,
                matchup: base.matchup,
                waiverWatch: state,
                ledger: base.ledger,
                leaguePulse: base.leaguePulse
            )
        )
    }

    private static func contextualHelp(_ destination: OmenHelpDestination) -> some View {
        OmenContextualHelpSheet(
            topic: OmenContextualHelpContent.topic(for: destination),
            onDismiss: {}
        )
    }

    /// Read the launch-argument value that names the current scenario, if any.
    static func active(from environment: [String: String], arguments: [String]) -> String? {
        if let fromEnv = environment[launchArgumentKey], !fromEnv.isEmpty { return fromEnv }
        // xcrun simctl launch --console -OMEN_SCREENSHOT_SCENARIO <value> puts it as
        // adjacent argv pairs (`-<key> <value>`).
        if let flagIndex = arguments.firstIndex(of: "-\(launchArgumentKey)"),
           arguments.indices.contains(flagIndex + 1) {
            return arguments[flagIndex + 1]
        }
        return nil
    }

    static func isKnown(_ key: String?) -> Bool {
        guard let key else { return false }
        return entries[key] != nil
    }
}

struct ScreenshotScenario {
    let label: String
    let content: () -> AnyView
}

/// Screenshot-mode host — deterministic shell mirroring the signed-in TabView so
/// screenshots include the permanent 4-tab bottom navigation. No session, no network.
struct ScreenshotScenarioHost: View {
    let scenarioKey: String

    var body: some View {
        ScreenshotScenarios.entries[scenarioKey]?.content()
    }

    /// Mounts the real Command Center in the deterministic tab shell against an explicit
    /// state. Used by scenarios that vary one section rather than selecting a whole fixture.
    static func commandCenter(_ state: OmenCommandCenterState) -> some View {
        FauxShell(commandStateOverride: state)
    }
}

private struct OnboardingAuthScreenshotHost: View {
    enum Kind { case signIn, emailCode }

    let kind: Kind
    @StateObject private var viewModel: AuthViewModel

    init(kind: Kind) {
        self.kind = kind
        _viewModel = StateObject(wrappedValue: Self.makeViewModel())
    }

    var body: some View {
        SignInView(
            viewModel: viewModel,
            demoModeEnabled: true,
            onTryDemo: {}
        )
        .task {
            guard kind == .emailCode, viewModel.emailField.isEmpty else { return }
            viewModel.emailField = "justin@slopssaloon.com"
            viewModel.submitEmail()
            for _ in 0..<20 {
                try? await Task.sleep(nanoseconds: 100_000_000)
                viewModel.clearOtpResendCooldownForTesting()
                if case .awaitingOtp = viewModel.flowState {
                    break
                }
            }
            viewModel.otpField = "417"
        }
    }

    private static func makeViewModel() -> AuthViewModel {
        AuthViewModel(
            repository: FakeAuthRepository(),
            appleProvider: ScreenshotAppleIDTokenProvider(),
            oauthProvider: ScreenshotOAuthProvider(),
            passkeyProvider: ScreenshotPasskeyProvider(),
            sessionManager: SessionManager(store: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })
        )
    }
}

private struct OnboardingConnectScreenshotHost: View {
    var body: some View {
        ConnectView(
            repository: ScreenshotConnectRepository(),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(
                    initial: Session(
                        userID: "screenshot",
                        accessToken: "t",
                        refreshToken: "r",
                        expiresAtEpochSeconds: 9_999_999_999
                    )
                ),
                nowEpochSeconds: { 1_000 }
            ),
            authSession: StubProviderAuthSession(),
            onConnected: {},
            onDismiss: {}
        )
    }
}

private struct ScreenshotAppleIDTokenProvider: AppleIDTokenProviding {
    let isConfigured = true
    func getIDToken(rawNonce: String) async -> AppleIDTokenResult { .unavailable }
}

private final class ScreenshotOAuthProvider: SupabaseOAuthProvider {
    func isConfigured(providerId: String) -> Bool { ["google", "discord"].contains(providerId) }
    func launch(providerId: String) async -> OAuthLaunchResult { .unavailable }
    func parseCallback(providerId: String, code: String?, state: String?) -> OAuthCallback { .malformed }
}

private struct ScreenshotPasskeyProvider: PasskeyProvider {
    let isSupported = false
    func getAssertion(options: PasskeyAuthenticationOptions) async -> PasskeyResult { .unavailable }
    func register(options: PasskeyRegistrationOptions) async -> PasskeyRegistrationResult { .unavailable }
}

private struct ScreenshotConnectRepository: ConnectRepository {
    func resolveSleeper(username: String, accessToken: String) async -> Result<ResolvedSleeperAccount, ConnectFailure> {
        .success(
            ResolvedSleeperAccount(
                username: username,
                leagues: [
                    SleeperLeague(id: "1", name: "Demo League", season: 2026, scoringFormat: "PPR", teamName: "Demo Team")
                ]
            )
        )
    }

    func connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String
    ) async -> Result<Void, ConnectFailure> {
        .success(())
    }

    func startYahooAuthorization(accessToken: String) async -> Result<URL, ConnectFailure> {
        .success(URL(string: "https://example.invalid/yahoo")!)
    }

    func yahooLeagues(accessToken: String) async -> Result<[YahooLeague], ConnectFailure> {
        .success([YahooLeague(id: "yahoo.l.1", name: "Demo Yahoo", season: 2026)])
    }

    func bindYahooLeague(id: String, accessToken: String) async -> Result<Void, ConnectFailure> {
        .success(())
    }

    /// Nil, so a capture of the ESPN screen shows the handoff steps — the state a real user
    /// arrives in — rather than a connected league they never connected.
    func espnConnection(accessToken: String) async -> Result<EspnConnection?, ConnectFailure> {
        .success(nil)
    }

    /// Screenshot mode never signs in to anything, so this is unreachable by construction. It
    /// fails rather than succeeding: a fixture that reported a successful ESPN connect would put
    /// a fake connected state into store screenshots.
    func connectEspn(_ capture: EspnCapture, accessToken: String) async -> Result<Void, ConnectFailure> {
        .failure(.espnSessionUnreadable)
    }

    /// Empty for the same reason `connectEspn` fails: screenshot mode signs in to nothing, and a
    /// fixture that invented ESPN leagues would put fake league names into store screenshots.
    /// Screenshot mode never writes, so the follow set is reported as accepted and stored —
    /// the "did not persist" disclosure is a real-server state and must not appear in a
    /// marketing capture describing something that did not happen.
    func followLeagues(
        platform: String,
        leagues: [FollowedLeague],
        accessToken: String
    ) async -> Result<Bool, ConnectFailure> {
        .success(true)
    }

    func discoverEspnLeagues(
        espnS2: String,
        swid: String,
        accessToken: String
    ) async -> Result<[EspnLeagueOption], ConnectFailure> {
        .success([])
    }
}

/// Faux tab shell — production `CommandCenterView` requires a real SessionManager;
/// screenshot mode explicitly avoids constructing one. This mirror renders the same
/// 4-tab TabView, wires the Command tab to the correct fixture per scenario key, and
/// leaves the other tabs on their "coming next" placeholders.
private struct FauxShell: View {
    var scenarioKey: String = ""
    /// Which tab the capture opens on. Without it a Trade or League scenario would screenshot
    /// the Command tab and silently prove nothing.
    var initialTab: CommandCenterTab = .command
    /// Set by scenarios that supply a state directly instead of naming a whole fixture.
    var commandStateOverride: OmenCommandCenterState?

    var body: some View {
        TabView(selection: .constant(initialTab)) {
            OmenCommandCenterScreen(
                state: commandState,
                onOpenAccount: {},
                // Supplied so the Waiver Watch "Review Omen's waiver analysis" link renders.
                // The screen hides that link when `onOpenOmen` is nil — correct product
                // behavior, but it meant iOS captures of the `urgent` and `processed` states
                // were silently missing an element of the approved composition that the
                // Android host had all along. Found while capturing M4-CC-WaiverWatch.
                onOpenOmen: {},
                onOpenLedger: { _ in },
                onOpenLeague: {}
            )
                .tabItem { CommandCenterTab.command.label }
            .tag(CommandCenterTab.command)

            OmenDecisionScreen(state: omenState)
            .tabItem { CommandCenterTab.omen.label }
            .tag(CommandCenterTab.omen)

            // The REAL screens, driven by explicit state — the same rule the Command and Omen
            // tabs above already followed. These two carried "landing next" placeholders for a
            // day after `M5` slices F and G shipped (`F-VET-B01`), so every screenshot and
            // every accessibility UI test that reached them was assessing a screen that no
            // longer existed.
            OmenTradeScreen(state: tradeState, offer: tradeOffer)
            .tabItem { CommandCenterTab.trade.label }
            .tag(CommandCenterTab.trade)

            OmenLeagueScreen(state: leagueState)
            .tabItem { CommandCenterTab.league.label }
            .tag(CommandCenterTab.league)
        }
    }

    private var commandState: OmenCommandCenterState {
        if let commandStateOverride { return commandStateOverride }
        switch scenarioKey {
        case "command-center.demo-connected": return OmenCommandCenterFixtures.demoConnected
        case "command-center.disconnected": return OmenCommandCenterFixtures.realDisconnected
        default: return OmenCommandCenterFixtures.realDisconnected
        }
    }

    /// Decoded from contract JSON rather than built by memberwise init, so a scenario also
    /// proves the screen renders from a payload the server could actually send. A malformed
    /// fixture surfaces as the screen's own failure state rather than a blank tab.
    private var leagueState: LeagueViewModel.ViewState {
        guard
            scenarioKey != "league.matchup-unavailable",
            let overview = Self.decodeOverview(Self.leagueOverviewJSON)
        else {
            if let degraded = Self.decodeOverview(Self.leagueMatchupUnavailableJSON) {
                return .loaded(degraded)
            }
            return .failed(.decode)
        }
        return .loaded(overview)
    }

    private var tradeState: TradeViewModel.ViewState {
        guard let result = Self.decodeTrade(Self.tradeVerdictJSON) else { return .failed(.decode) }
        return scenarioKey == "trade.empty" ? .idle : .loaded(result)
    }

    private var tradeOffer: TradeOffer {
        scenarioKey == "trade.empty"
            ? TradeOffer()
            : TradeOffer(
                send: [TradePlayer(name: "A.J. Brown", position: "WR", team: "PHI")],
                receive: [TradePlayer(name: "Garrett Wilson", position: "WR", team: "NYJ")]
            )
    }

    private static func decodeOverview(_ json: String) -> LeagueOverview? {
        guard let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(LeagueOverview.self, from: data)
    }

    private static func decodeTrade(_ json: String) -> TradeCompare? {
        guard let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(TradeCompare.self, from: data)
    }

    private static let leagueOverviewJSON = """
    {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
     "league_name":"Demo Slate (mock league)","season":2026,"week":8,
     "matchup":{"status":"live",
       "you":{"team_id":"7","team_name":"Demo Titans","record":"6-1","points":64.8,"projected":null},
       "opponent":{"team_id":"3","team_name":"Demo Rivals","record":"5-2","points":58.1,"projected":null},
       "unavailable_reason":null},
     "standings":{"status":"available",
       "playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},
       "teams":[
         {"team_name":"Demo Rivals","is_current_user":false,"rank":1,"wins":7,"losses":1},
         {"team_name":"Demo Hawks","is_current_user":false,"rank":2,"wins":6,"losses":2},
         {"team_name":"Demo Titans","is_current_user":true,"rank":3,"wins":6,"losses":1},
         {"team_name":"Demo Bandits","is_current_user":false,"rank":4,"wins":4,"losses":4}]},
     "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
    """

    private static let leagueMatchupUnavailableJSON = """
    {"contract_version":"league-overview.v1","platform":"yahoo","league_id":"1",
     "league_name":"Demo Slate (mock league)","season":2026,"week":8,
     "matchup":{"status":"unavailable","you":null,"opponent":null,
       "unavailable_reason":"provider_unsupported"},
     "standings":{"status":"available",
       "playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},
       "teams":[{"team_name":"Demo Titans","is_current_user":true,"rank":3,"wins":6,"losses":1}]},
     "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
    """

    private static let tradeVerdictJSON = """
    {"contract_version":"trade-compare.v2","verdict_state":"favors_you",
     "evaluability":{"status":"evaluable","reason":null,"missing_projection_count":0,"total_player_count":2},
     "analysis_context":{"mode":"personalized","platform":"sleeper","league_id":"1",
       "league_name":"Demo Slate (mock league)","applied":["scoring_format","roster_construction"],
       "unavailable_reason":null},
     "net_value":4.2,"explanation":null}
    """

    private var omenState: OmenDecisionBriefState {
        switch scenarioKey {
        case "omen.demo": return OmenDecisionFixtures.demo
        default: return OmenDecisionFixtures.realDisconnected
        }
    }
}

/// Screenshot host for the §10.2 switcher. The sheet itself takes a view model, so this
/// supplies one backed by `StubLeagueDirectoryRepository` and renders the sheet's body
/// inline rather than as a presented sheet — a modal presentation does not appear in a
/// `simctl io screenshot` of the host window.
struct LeagueSwitcherScreenshotHost: View {
    enum Kind { case loaded, empty, failed }
    let kind: Kind

    @StateObject private var viewModel: LeagueSwitcherViewModel

    init(kind: Kind) {
        self.kind = kind
        let result: Result<LeagueDirectory, OmenApiError>
        switch kind {
        case .loaded: result = .success(LeagueSwitcherScreenshotHost.sampleDirectory())
        case .empty: result = .success(LeagueSwitcherScreenshotHost.emptyDirectory())
        case .failed: result = .failure(.network)
        }
        _viewModel = StateObject(wrappedValue: LeagueSwitcherViewModel(
            repository: StubLeagueDirectoryRepository(directory: result),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "screenshot", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 9_999_999_999
                )),
                nowEpochSeconds: { 0 }
            )
        ))
    }

    var body: some View {
        OmenLeagueSwitcherSheet(
            viewModel: viewModel,
            onSelected: { _ in },
            onConnectAnother: {},
            onManageConnections: {},
            onDismiss: {}
        )
    }

    private static func decode(_ json: String) -> LeagueDirectory {
        // Force-unwrapped deliberately: this is screenshot-only fixture data that ships with
        // the app, and a malformed fixture should fail loudly in a capture run rather than
        // render an empty screen that looks like a real empty state.
        try! JSONDecoder().decode(LeagueDirectory.self, from: Data(json.utf8))
    }

    /// Shared with `TeamSwitcherScreenshotHost` so both switcher captures describe the
    /// same user rather than drifting into two different fixture worlds.
    static func screenshotDirectory() -> LeagueDirectory { sampleDirectory() }

    private static func sampleDirectory() -> LeagueDirectory {
        decode("""
        {"contract_version":"league-directory.v1","season":2026,"selection_persistence":"provider_binding_only",
         "active":{"platform":"sleeper","league_id":"L-alpha","league_name":"Dynasty Dogs","season":2026,"scoring_format":"half_ppr","team_id":"3","team_name":"Justin Titans"},
         "platforms":[
          {"platform":"sleeper","connection_state":"connected","discovery":"full","notice":null,"leagues":[
            {"league_id":"L-alpha","league_name":"Dynasty Dogs","season":2026,"scoring_format":"half_ppr","team_id":"3","team_name":"Justin Titans","is_active":true},
            {"league_id":"L-fam","league_name":"Family League","season":2026,"scoring_format":"ppr","team_id":"5","team_name":"Titans Too","is_active":false}]},
          {"platform":"espn","connection_state":"connected","discovery":"bound_only","notice":"ESPN does not expose a league list to Omen, so only the connected league is shown.","leagues":[
            {"league_id":"884411","league_name":null,"season":2026,"scoring_format":null,"team_id":"9","team_name":"Sunday Scaries","is_active":false}]},
          {"platform":"yahoo","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]}]}
        """)
    }

    private static func emptyDirectory() -> LeagueDirectory {
        decode("""
        {"contract_version":"league-directory.v1","season":2026,"selection_persistence":"provider_binding_only",
         "active":null,
         "platforms":[
          {"platform":"sleeper","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]},
          {"platform":"espn","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]},
          {"platform":"yahoo","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]}]}
        """)
    }
}

/// Screenshot host for the 2026-09-05 team switcher: the pinned context bar and the sheet's
/// body, rendered together against one deterministic directory.
///
/// Both are shown inline. A presented `.sheet` does not appear in a `simctl io screenshot` of
/// the host window, and the bar is the half where the shipped defect lived — a scroll that ran
/// off the right edge with no pinned control — so a capture that showed only the sheet would
/// miss exactly what this change fixes.
///
/// One favourite is pre-seeded through the injected preferences store, because the ordering
/// rule and the platinum star are the two things a reviewer needs to *see* rather than read.
struct TeamSwitcherScreenshotHost: View {
    @StateObject private var viewModel: LeagueCarouselViewModel

    init() {
        let preferences = InMemoryLeagueSwitcherPreferences(
            // Sunday Scaries is the ESPN team and third in the server's order. Starring it
            // proves the sort actually moved it, which a favourite that was already first
            // could not.
            favorites: ["screenshot": LeagueFavorites(ordered: ["espn:884411"])]
        )
        _viewModel = StateObject(wrappedValue: LeagueCarouselViewModel(
            directoryRepository: StubLeagueDirectoryRepository(
                directory: .success(LeagueSwitcherScreenshotHost.screenshotDirectory())
            ),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "screenshot", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 9_999_999_999
                )),
                nowEpochSeconds: { 0 }
            ),
            preferences: preferences
        ))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step24) {
            OmenTeamPicker(viewModel: viewModel, userID: "screenshot", onContextChanged: { _ in }, onAddLeague: {})
                .padding(.horizontal, OmenSpacing.step16)
            OmenTeamSwitcherSheet(
                teams: teams,
                platformFilters: filters,
                selectedFilter: viewModel.selectedPlatform,
                notice: nil,
                // Live, not inert: the capture doubles as the manual check that a tap on the
                // star toggles without switching, and a tap on the row switches.
                onSelectFilter: { viewModel.selectedPlatform = $0 },
                onSelectTeam: { team in
                    guard let page = viewModel.allPages.first(where: { $0.id == team.id }) else { return }
                    Task { _ = await viewModel.commit(page) }
                },
                onToggleFavorite: { team in
                    guard let page = viewModel.allPages.first(where: { $0.id == team.id }) else { return }
                    viewModel.toggleFavorite(page)
                },
                onAddLeague: {}
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(OmenColor.bg)
        .task { await viewModel.load(userID: "screenshot") }
    }

    private var teams: [OmenSwitcherTeam] {
        viewModel.pages.map { page in
            OmenSwitcherTeam(
                id: page.id,
                platform: page.platform == "espn" ? .espn : (page.platform == "yahoo" ? .yahoo : .sleeper),
                teamName: page.teamName?.isEmpty == false ? page.teamName! : page.displayLeagueName,
                subtitle: Self.subtitle(page),
                isActive: page.isActive,
                isFavorite: viewModel.isFavorite(page),
                isCommitting: false
            )
        }
    }

    /// Mirrors `OmenTeamPicker.subtitle(_:)`. Kept in step deliberately: a capture that showed
    /// a different second line than the real screen would be a screenshot of something that does
    /// not exist.
    private static func subtitle(_ page: LeagueCarouselViewModel.Page) -> String {
        let provider = platformDisplayName(page.platform)
        guard page.teamName?.isEmpty == false else { return "\(provider) · unnamed team" }
        guard page.leagueName?.isEmpty == false else { return provider }
        return "\(provider) · \(page.displayLeagueName)"
    }

    private var filters: [OmenSwitcherPlatformFilter] {
        [OmenSwitcherPlatformFilter(id: LeagueCarouselViewModel.allPlatforms, label: "All", tone: .omen, count: viewModel.allPages.count)]
            + viewModel.availablePlatforms.map { platform in
                OmenSwitcherPlatformFilter(
                    id: platform,
                    label: platformDisplayName(platform),
                    tone: platform == "espn" ? .espn : (platform == "yahoo" ? .yahoo : .sleeper),
                    count: viewModel.allPages.filter { $0.platform == platform }.count
                )
            }
    }
}
