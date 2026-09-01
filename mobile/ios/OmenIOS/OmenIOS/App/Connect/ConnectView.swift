import SwiftUI

/// M5-NativeConnect — onboarding steps 4–6 as a single navigable sheet.
///
/// Every screen here is assembled from approved primitives; no one-off component is
/// introduced. Spec §6 governs the copy rules: no bare "Loading…", every non-success state
/// carries a safe next action, and cancelling is never framed as a failure.
struct ConnectView: View {
    @StateObject private var viewModel: ConnectViewModel
    /// Called when a league is connected, so the shell can refresh and route on.
    let onConnected: () -> Void
    let onDismiss: () -> Void

    init(
        repository: ConnectRepository,
        sessionManager: SessionManager,
        /// Nil takes the real system-browser session; tests inject a stub.
        authSession: ProviderAuthSessionPresenting? = nil,
        onConnected: @escaping () -> Void,
        onDismiss: @escaping () -> Void
    ) {
        _viewModel = StateObject(wrappedValue: ConnectViewModel(
            repository: repository,
            sessionManager: sessionManager,
            authSession: authSession
        ))
        self.onConnected = onConnected
        self.onDismiss = onDismiss
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                switch viewModel.state {
                case .notStarted:
                    providerPicker
                    sleeperUsernameEntry
                case .resolvingAccount, .validatingConnection,
                     .startingYahooAuthorization, .awaitingYahooReturn,
                     .confirmingYahooConnection, .bindingYahooLeague:
                    busySection
                case .choosingLeague(let account):
                    leaguePicker(account)
                case .connected(let league):
                    connectedSection(league)
                case .choosingYahooLeague(let leagues):
                    yahooLeaguePicker(leagues)
                case .yahooConnected(let league):
                    yahooConnectedSection(league)
                case .canceled:
                    canceledSection
                case .retryableError(let failure):
                    errorSection(failure)
                case .needsReauth:
                    reauthSection
                case .unsupportedOnMobile(let provider):
                    unsupportedSection(provider)
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step24)
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    // MARK: - Step 4 — choose provider

    private var providerPicker: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text("Connect a league")
                .omenTextStyle(OmenTypography.h1)
                .foregroundStyle(OmenColor.textPrimary)
            // Spec §4: explain the benefit in one sentence.
            Text("Connect a league so Omen can use your roster, scoring, and matchup.")
                .omenTextStyle(OmenTypography.body)
                .foregroundStyle(OmenColor.textSecondary)

            // No provider is selected by default (spec §4). Availability is stated up front
            // rather than discovered by tapping into a dead end.
            ForEach(ConnectProvider.allCases) { provider in
                OmenListRow(
                    title: provider.displayName,
                    subtitle: availabilityLabel(provider),
                    action: { viewModel.selectProvider(provider) },
                    leading: { OmenPlatformBadge(platform: provider.platform) },
                    trailing: { EmptyView() }
                )
            }
        }
    }

    /// States what tapping will do *before* it is tapped, so no row is a surprise. Yahoo's row
    /// says "browser" plainly: the user is about to leave the app, and being told after the
    /// fact is how a connect flow reads as a hijack.
    private func availabilityLabel(_ provider: ConnectProvider) -> String {
        switch provider.availability {
        case .available:
            return provider == .yahoo ? "Sign in with Yahoo in your browser" : "Connect with your username"
        case .onHold: return "On hold"
        case .useWeb: return "Connect on the web"
        }
    }

    // MARK: - Step 5 — connect

    private var sleeperUsernameEntry: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text("Sleeper")
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
            // The contract is explicit that Omen never collects a provider password.
            Text("Enter your Sleeper username. Omen never asks for your Sleeper password.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)

            OmenTextField(
                value: $viewModel.username,
                label: "Sleeper username",
                placeholder: "username",
                enabled: !viewModel.state.isBusy
            )

            OmenButton(
                title: "Find my leagues",
                action: { Task { await viewModel.resolveUsername() } },
                variant: .primary,
                size: .md,
                enabled: viewModel.canSubmitUsername
            )
        }
    }

    // MARK: - Yahoo

    private func yahooLeaguePicker(_ leagues: [YahooLeague]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text("Choose a league")
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
            Text("Yahoo is connected. Pick the league Omen should read.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)

            ForEach(leagues) { league in
                OmenListRow(
                    title: league.name,
                    subtitle: league.subtitle,
                    action: { Task { await viewModel.bindYahooLeague(league) } },
                    leading: { OmenPlatformBadge(platform: .yahoo) },
                    trailing: { EmptyView() }
                )
            }

            OmenButton(title: "Choose another provider", action: { viewModel.startOver() }, variant: .link, size: .sm)
        }
    }

    private func yahooConnectedSection(_ league: YahooLeague) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(
                kind: .empty,
                title: "\(league.name) is connected",
                message: "Omen can now read this league's roster, scoring, and matchup."
            )
            OmenButton(title: "Go to Command Center", action: onConnected, variant: .primary, size: .md)
        }
    }

    private var busySection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(
                kind: .loading,
                title: "Just a moment",
                // Spec §6: never a bare "Loading…" — say what is happening.
                message: viewModel.state.progressLabel ?? "Working…"
            )
            // Leaving mid-flight is safe: the Sleeper connect is idempotent by request id, and
            // the Yahoo one is a server-bound OAuth transaction that is consumed or expires.
            OmenButton(title: "Cancel", action: { viewModel.cancel() }, variant: .link, size: .sm)
        }
    }

    private func leaguePicker(_ account: ResolvedSleeperAccount) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text("Choose a league")
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
            Text("Signed in as \(account.username).")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)

            ForEach(account.leagues) { league in
                OmenListRow(
                    title: league.name,
                    subtitle: league.subtitle.isEmpty ? nil : league.subtitle,
                    action: { Task { await viewModel.selectLeague(league) } },
                    leading: { OmenPlatformBadge(platform: .sleeper) },
                    trailing: { EmptyView() }
                )
            }

            OmenButton(title: "Use a different username", action: { viewModel.startOver() }, variant: .link, size: .sm)
        }
    }

    // MARK: - Step 6 and recovery

    private func connectedSection(_ league: SleeperLeague) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(
                kind: .empty,
                title: "\(league.name) is connected",
                message: "Omen can now read this league's roster, scoring, and matchup."
            )
            OmenButton(title: "Go to Command Center", action: onConnected, variant: .primary, size: .md)
        }
    }

    /// Cancelling is normal. No error styling, no apology, no scolding.
    private var canceledSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(
                kind: .empty,
                title: "No problem",
                message: "Nothing was connected. You can pick a provider whenever you're ready."
            )
            OmenButton(title: "Choose a provider", action: { viewModel.startOver() }, variant: .secondary, size: .md)
            OmenButton(title: "Not now", action: onDismiss, variant: .link, size: .sm)
        }
    }

    private func errorSection(_ failure: ConnectFailure) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(kind: .error, title: "That didn't work", message: failure.message)
            // Spec §6: every non-success state has a safe next action. A Yahoo round trip that
            // already happened is re-checked rather than restarted — sending a user who is in
            // fact connected back through the browser is the loop this flow exists to avoid.
            if failure == .providerNotConnected || failure == .noLeaguesForSeason {
                OmenButton(
                    title: "Check again",
                    action: { Task { await viewModel.confirmYahooConnection() } },
                    variant: .primary,
                    size: .md
                )
            }
            OmenButton(title: "Try again", action: { viewModel.startOver() }, variant: .secondary, size: .md)
            OmenButton(title: "Explore the demo instead", action: onDismiss, variant: .link, size: .sm)
        }
    }

    private var reauthSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(
                kind: .error,
                title: "Sign in again",
                message: "Your Omen session expired. Sign in again, then connect your league."
            )
            OmenButton(title: "Close", action: onDismiss, variant: .secondary, size: .md)
        }
    }

    /// A provider Omen cannot connect here. Never a dead end — it names the path that works.
    private func unsupportedSection(_ provider: ConnectProvider) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(
                kind: .disconnected,
                title: "\(provider.displayName) can't be connected in the app yet",
                message: unsupportedMessage(provider)
            )
            if provider == .espn {
                espnConsentNote
            }
            OmenButton(title: "Choose another provider", action: { viewModel.startOver() }, variant: .secondary, size: .md)
        }
    }

    /// Disclosure required by the 2026-08-31 ESPN decision (`Direction/decision_log.md`). The
    /// connection runs on the user's own ESPN session, so the user is told that plainly before
    /// they go and make one. The affiliation disclaimer is not decorative — Disney's Terms of Use
    /// §2.B.vii bars use that suggests an association with their brands.
    private var espnConsentNote: some View {
        Text(Self.espnConsentText)
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textSecondary)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityLabel(Self.espnConsentText)
    }

    static let espnConsentText = """
    Connecting ESPN uses your own ESPN session so Omen can read your league — your roster, scoring, \
    and matchup. It is your account and your choice, and you can disconnect it any time in Account. \
    Omen is not affiliated with or endorsed by ESPN.
    """

    private func unsupportedMessage(_ provider: ConnectProvider) -> String {
        switch provider.availability {
        case .onHold(let reason), .useWeb(let reason):
            return reason
        case .available:
            return ""
        }
    }
}
