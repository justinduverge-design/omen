import SwiftUI

private let connectCanvasTileSurface = Color(red: 20 / 255, green: 20 / 255, blue: 22 / 255)

/// M5-NativeConnect — onboarding steps 4–6 as a single navigable sheet.
///
/// Every screen here is assembled from approved primitives; no one-off component is
/// introduced. Spec §6 governs the copy rules: no bare "Loading…", every non-success state
/// carries a safe next action, and cancelling is never framed as a failure.
struct ConnectView: View {
    @StateObject private var viewModel: ConnectViewModel
    @Environment(\.openURL) private var openURL
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
        GeometryReader { proxy in
            ScrollView {
                Group {
                    switch viewModel.state {
                    case .notStarted:
                        if viewModel.selectedProvider == .sleeper {
                            sleeperUsernameEntry
                        } else {
                            providerPicker
                        }
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
                    case .espnConsent:
                        espnConsentSection
                    case .espnSigningIn:
                        // Rendered as a full-screen cover below, not inline: ESPN's site needs the
                        // whole screen, and nesting a web view inside this ScrollView would fight
                        // it for scrolling.
                        espnSignInPlaceholder
                    case .checkingEspnConnection, .validatingEspnConnection:
                        busySection
                    case .espnConnected(let connection):
                        espnConnectedSection(connection)
                    case .unsupportedOnMobile(let provider):
                        unsupportedSection(provider)
                    }
                }
                .padding(.horizontal, OmenSpacing.step24)
                .frame(maxWidth: .infinity, minHeight: proxy.size.height, alignment: .top)
            }
            .background(OmenColor.bg.ignoresSafeArea())
        }
        .fullScreenCover(isPresented: Binding(
            get: { viewModel.state == .espnSigningIn },
            set: { if !$0 { viewModel.cancelEspnSignIn() } }
        )) {
            espnSignInSheet
        }
    }

    // MARK: - Step 4 — choose provider

    private var providerPicker: some View {
        VStack(alignment: .leading, spacing: 0) {
            Color.clear.frame(height: OmenSpacing.step12)
            OmenIconButton(
                contentDescription: "Back",
                icon: Image("CanvasChevronLeft"),
                action: onDismiss,
                size: .sm
            )
            .frame(height: 44)

            Color.clear.frame(height: 28)

            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                Text("Bring your league.")
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)
                // Spec §4: explain the benefit in one sentence.
                Text("Omen reads your roster, your scoring, and your matchup. That's all it asks for, and you can disconnect any time.")
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
            }

            Color.clear.frame(height: 28)

            // No provider is selected by default (spec §4). Availability is stated up front
            // rather than discovered by tapping into a dead end.
            VStack(alignment: .leading, spacing: 10) {
                ForEach(ConnectProvider.allCases) { provider in
                    ConnectProviderCard(
                        provider: provider,
                        subtitle: availabilityLabel(provider),
                        action: { viewModel.selectProvider(provider) }
                    )
                }
            }

            Spacer(minLength: 0)

            HStack(alignment: .center, spacing: 10) {
                Image("CanvasShield")
                    .resizable()
                    .renderingMode(.original)
                    .frame(width: 18, height: 18)
                    .accessibilityHidden(true)
                Text("Omen never asks for your league password, and never posts or trades on your behalf.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(OmenColor.omen.opacity(0.10))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(OmenColor.omen.opacity(0.35), lineWidth: 1)
                )

            Color.clear.frame(height: 14)
            CanvasTextAction(title: "I'll do this later", action: onDismiss)
            Color.clear.frame(height: 22)
        }
    }

    /// States what tapping will do *before* it is tapped, so no row is a surprise. Yahoo's row
    /// says "browser" plainly: the user is about to leave the app, and being told after the
    /// fact is how a connect flow reads as a hijack.
    private func availabilityLabel(_ provider: ConnectProvider) -> String {
        switch provider.availability {
        case .available:
            if provider == .yahoo { return "Sign in with Yahoo" }
            if provider == .espn { return "Sign in with ESPN" }
            return "Just your username — no password"
        // The reason is read from `availability`, not restated. It was restated once, and the
        // two copies drifted the moment the ESPN line was reworded — the picker row kept
        // saying "needs a computer" while the destination screen said something else.
        case .onHold(let reason), .useWeb(let reason): return reason
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
            OmenButton(
                title: "Choose another provider",
                action: { viewModel.startOver() },
                variant: .link,
                size: .sm
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
            connectedActions
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
            connectedActions
        }
    }

    private var connectedActions: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: OmenSpacing.step12) {
                OmenButton(title: "Go to Command Center", action: onConnected, variant: .primary, size: .md)
                    .frame(maxWidth: .infinity)
                OmenButton(
                    title: "Connect another league",
                    action: { viewModel.startOver() },
                    variant: .secondary,
                    size: .md
                )
                .frame(maxWidth: .infinity)
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                OmenButton(title: "Go to Command Center", action: onConnected, variant: .primary, size: .md)
                    .frame(maxWidth: .infinity)
                OmenButton(
                    title: "Connect another league",
                    action: { viewModel.startOver() },
                    variant: .secondary,
                    size: .md
                )
                .frame(maxWidth: .infinity)
            }
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
    @ViewBuilder
    private func unsupportedSection(_ provider: ConnectProvider) -> some View {
        if provider == .espn {
            espnSyncSection
        } else {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                OmenStateSurface(
                    kind: .disconnected,
                    title: "\(provider.displayName) can't be connected in the app yet",
                    message: unsupportedMessage(provider)
                )
                OmenButton(
                    title: "Choose another provider",
                    action: { viewModel.startOver() },
                    variant: .secondary,
                    size: .md
                )
            }
        }
    }

    // MARK: - ESPN sign-in (W1-A)

    /// Consent, before anything opens.
    ///
    /// Its own screen rather than a line under a button, because that is what W1-A binds: the
    /// user is told what is about to happen while they can still decline, and declining writes
    /// nothing. The affiliation disclaimer is not decorative — Disney's Terms of Use §2.B.vii
    /// bars use that suggests an association with their brands.
    private var espnConsentSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            Text(EspnHandoffCopy.consentTitle)
                .omenTextStyle(OmenTypography.h1)
                .foregroundStyle(OmenColor.textPrimary)

            Text(EspnHandoffCopy.consentBody)
                .omenTextStyle(OmenTypography.body)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            OmenButton(
                title: EspnHandoffCopy.consentContinueTitle,
                action: { viewModel.beginEspnSignIn() },
                variant: .primary,
                size: .md
            )
            OmenButton(
                title: EspnHandoffCopy.consentDeclineTitle,
                action: { viewModel.startOver() },
                variant: .secondary,
                size: .md
            )
        }
    }

    /// Inline stand-in while the cover is up, so the sheet's dismissal never reveals a blank
    /// screen underneath.
    private var espnSignInPlaceholder: some View {
        OmenStateSurface(
            kind: .loading,
            title: "Just a moment",
            message: EspnHandoffCopy.signInWaiting
        )
    }

    private var espnSignInSheet: some View {
        VStack(spacing: 0) {
            if let store = viewModel.espnCookieStore {
                EspnWebSignIn(store: store) { progress in
                    viewModel.espnSignInProgressed(progress)
                }
                .ignoresSafeArea(edges: .bottom)
            } else {
                Spacer(minLength: 0)
            }

            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                Text(viewModel.espnSignInProgress.isSignedIn
                     ? EspnHandoffCopy.signInReady
                     : EspnHandoffCopy.signInWaiting)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Shown only once ESPN has a session, so a signed-out user is not asked for a
                // league id they cannot yet use. Pre-filled by detection when ESPN's URL happens
                // to carry one; typed by the user when it does not. The desktop helper has had
                // exactly this field since it shipped.
                if viewModel.espnSignInProgress.isSignedIn {
                    OmenTextField(
                        value: $viewModel.espnLeagueId,
                        label: "ESPN League ID",
                        placeholder: "e.g. 156664",
                        enabled: !viewModel.state.isBusy
                    )
                    Text(EspnHandoffCopy.leagueIdHint)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textTertiary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                // Omen never submits on the user's behalf — the same rule the desktop helper
                // follows. Disabled until there is both a session and a league.
                OmenButton(
                    title: EspnHandoffCopy.signInConnectTitle,
                    action: { Task { await viewModel.confirmEspnConnection() } },
                    variant: .primary,
                    size: .md,
                    enabled: viewModel.canConnectEspn
                )
                OmenButton(
                    title: EspnHandoffCopy.signInCancelTitle,
                    action: { viewModel.cancelEspnSignIn() },
                    variant: .link,
                    size: .sm
                )
            }
            .padding(OmenSpacing.step16)
            .background(OmenColor.bg)
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    // MARK: - ESPN handoff

    /// The ESPN screen is a **handoff**, not a connect flow, and it is built to read like one.
    ///
    /// It previously rendered as the generic `disconnected` state surface — one grey box saying
    /// ESPN can't be connected in the app, which is accurate and useless. What a user needs is
    /// the shape of the whole errand before they go and do it, so the steps are laid out up
    /// front and the app tells them what to do when they come back.
    ///
    /// What it must never become: an ESPN sign-in. No password field, no cookie field, no
    /// embedded provider login, no in-app credential capture of any kind (onboarding contract
    /// §2 and §5). Every action here either opens Omen's own public guide in the system browser
    /// or re-reads Omen's own API.
    private var espnSyncSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                Text(EspnHandoffCopy.title)
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)
                Text(EspnHandoffCopy.subtitle)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                ForEach(EspnHandoffCopy.steps) { step in
                    EspnHandoffStepRow(step: step)
                }
            }
            .padding(OmenSpacing.step16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(connectCanvasTileSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(OmenColor.border, lineWidth: 1)
            )

            OmenButton(
                title: EspnHandoffCopy.openSetupTitle,
                action: { openURL(ConnectProvider.espnSetupURL) },
                variant: .primary,
                size: .md
            )

            // The "did it work?" button. It exists because the alternative is worse: without
            // it a user who finished on a computer has to guess whether to close the sheet,
            // relaunch, or wait. It performs a read, never a connect.
            OmenButton(
                title: viewModel.espnCheckNotice == nil
                    ? EspnHandoffCopy.checkConnectionTitle
                    : EspnHandoffCopy.checkAgainTitle,
                action: { Task { await viewModel.checkEspnConnection() } },
                variant: .secondary,
                size: .md,
                enabled: !viewModel.state.isBusy
            )

            if let notice = viewModel.espnCheckNotice {
                // A status line, not an error surface. Nothing has gone wrong when a user taps
                // this before finishing the desktop steps, and the copy must not imply it has.
                Text(notice)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.updatesFrequently)
            }

            espnConsentNote

            OmenButton(
                title: "Choose another provider",
                action: { viewModel.startOver() },
                variant: .link,
                size: .sm
            )
        }
    }

    private func espnConnectedSection(_ connection: EspnConnection) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenStateSurface(
                kind: .empty,
                title: "\(connection.displayLeagueName) is connected",
                message: EspnHandoffCopy.connectedMessage(connection)
            )
            connectedActions
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
    The desktop helper fills Omen's ESPN form from your ESPN browser session. You review it and choose Connect yourself. \
    It is your account and your choice, and you can disconnect it any time in Account. \
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

/// One numbered line of the ESPN errand.
///
/// Not a `ListRow`: those are tappable navigation targets, and every one of these is a thing
/// that happens somewhere else. Making them look tappable would be the lie.
private struct EspnHandoffStepRow: View {
    let step: EspnHandoffCopy.Step

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step12) {
            Text("\(step.index)")
                .omenTextStyle(OmenTypography.bodySmall)
                .fontWeight(.bold)
                .foregroundStyle(OmenColor.textPrimary)
                .frame(width: 24, height: 24)
                .background(OmenColor.omen.opacity(0.18))
                .clipShape(Circle())
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(step.title)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(step.detail)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Step \(step.index). \(step.title). \(step.detail)")
    }
}

private struct ConnectProviderCard: View {
    let provider: ConnectProvider
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step12) {
                providerMark
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    Text(provider.displayName)
                        .omenTextStyle(OmenTypography.h3)
                        .foregroundStyle(OmenColor.textPrimary)
                    Text(subtitle)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textTertiary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: OmenSpacing.step8)
                Image("CanvasChevronRight")
                    .resizable()
                    .renderingMode(.original)
                    .frame(width: 20, height: 20)
                    .accessibilityHidden(true)
            }
            .padding(OmenSpacing.step16)
            .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
            .background(connectCanvasTileSurface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(OmenColor.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(provider.displayName), \(subtitle)")
        .accessibilityHint("Double tap to open")
    }

    private var providerMark: some View {
        Text(markText)
            .omenTextStyle(OmenTypography.h2)
            .fontWeight(.bold)
            .foregroundStyle(markForeground)
            .frame(width: 44, height: 44)
            .background(markBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .accessibilityHidden(true)
    }

    private var markText: String {
        switch provider {
        case .espn: return "E"
        case .yahoo: return "Y!"
        case .sleeper: return "S"
        }
    }

    private var markBackground: Color {
        switch provider {
        case .espn: return OmenColor.Data.platformEspnChip
        case .yahoo: return OmenColor.Data.platformYahooChip
        case .sleeper: return OmenColor.Data.platformSleeperChip
        }
    }

    private var markForeground: Color {
        switch provider {
        case .espn: return OmenColor.Data.onPlatformEspn
        case .yahoo: return OmenColor.Data.onPlatformYahoo
        case .sleeper: return OmenColor.Data.onPlatformSleeper
        }
    }
}

private struct CanvasTextAction: View {
    let title: String
    let action: () -> Void
    var enabled = true

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(enabled ? OmenColor.textTertiary : OmenColor.textTertiary.opacity(0.45))
                .frame(maxWidth: .infinity, minHeight: 48, alignment: .center)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}
