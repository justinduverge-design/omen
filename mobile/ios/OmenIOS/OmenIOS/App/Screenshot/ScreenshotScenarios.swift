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
        "command-center.demo-connected": ScreenshotScenario(
            label: "Command Center — demo/mock connected",
            content: { AnyView(FauxShell(scenarioKey: "command-center.demo-connected")) }
        ),
        "command-center.disconnected": ScreenshotScenario(
            label: "Command Center — real user, disconnected",
            content: { AnyView(FauxShell(scenarioKey: "command-center.disconnected")) }
        ),
        "omen.demo": ScreenshotScenario(
            label: "Omen — demo/mock decision",
            content: { AnyView(FauxShell(scenarioKey: "omen.demo")) }
        ),
        "omen.disconnected": ScreenshotScenario(
            label: "Omen — real user, disconnected",
            content: { AnyView(FauxShell(scenarioKey: "omen.disconnected")) }
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

/// Faux tab shell — production `CommandCenterView` requires a real SessionManager;
/// screenshot mode explicitly avoids constructing one. This mirror renders the same
/// 4-tab TabView, wires the Command tab to the correct fixture per scenario key, and
/// leaves the other tabs on their "coming next" placeholders.
private struct FauxShell: View {
    var scenarioKey: String = ""
    /// Set by scenarios that supply a state directly instead of naming a whole fixture.
    var commandStateOverride: OmenCommandCenterState?

    var body: some View {
        TabView {
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
                .tabItem { Label("Command", systemImage: "sparkles") }

            OmenDecisionScreen(state: omenState)
            .tabItem { Label("Omen", systemImage: "bolt.fill") }

            OmenStateSurface(
                kind: .empty,
                title: "Trade is landing next",
                message: "Trade Analyzer arrives here. It is free and open on the Omen website today."
            )
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
            .tabItem { Label("Trade", systemImage: "arrow.left.arrow.right") }

            OmenStateSurface(
                kind: .empty,
                title: "League is landing next",
                message: "Roster, matchup, and standings for your connected league arrive here."
            )
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
            .tabItem { Label("League", systemImage: "person.3.fill") }
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
