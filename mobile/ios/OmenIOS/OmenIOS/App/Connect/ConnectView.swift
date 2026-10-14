import SwiftUI


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
    /// Screenshot-only: drives the flow straight to a provider's first step so a journey capture
    /// can reach a state that otherwise needs a tap. Nil in the app — this never auto-selects for
    /// a real user, because choosing a provider is their decision to make.
    private let autoSelectProvider: ConnectProvider?

    init(
        repository: ConnectRepository,
        sessionManager: SessionManager,
        /// Nil takes the real system-browser session; tests inject a stub.
        authSession: ProviderAuthSessionPresenting? = nil,
        autoSelectProvider: ConnectProvider? = nil,
        onConnected: @escaping () -> Void,
        onDismiss: @escaping () -> Void
    ) {
        self.autoSelectProvider = autoSelectProvider
        _viewModel = StateObject(wrappedValue: ConnectViewModel(
            repository: repository,
            sessionManager: sessionManager,
            authSession: authSession
        ))
        self.onConnected = onConnected
        self.onDismiss = onDismiss
    }

    var body: some View {
        content
            .task {
                if let autoSelectProvider { viewModel.selectProvider(autoSelectProvider) }
            }
    }

    private var content: some View {
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
                    case .choosingEspnLeague(let options):
                        espnLeaguePicker(options)
                    case .validatingEspnConnection, .discoveringEspnLeagues:
                        busySection
                    case .espnConnected(let connection):
                        espnConnectedSection(connection)
                    }
                }
                .padding(.horizontal, OmenSpacing.step24)
                .frame(maxWidth: .infinity, minHeight: proxy.size.height, alignment: .top)
            }
            .background(OmenColor.bg.ignoresSafeArea())
        }
        // Bound to the state, so discovery finishing closes ESPN's site automatically and the
        // user lands on Omen's own picker rather than being left on a web page they are done with.
        .fullScreenCover(isPresented: Binding(
            get: { viewModel.state == .espnSigningIn },
            // A presentation dismissal is not evidence that the person chose to abandon ESPN.
            // MyDisney's verification handoff can briefly change presentation focus while its
            // one-time-code page returns to ESPN. Treating that as a cancellation strands a
            // successful sign-in on Omen's generic "Nothing was connected" screen before the
            // WebKit cookie observer has a chance to begin league discovery. The cover closes
            // only when the view model moves to a real next state (picker, recovery, or error).
            set: { _ in }
        )) {
            espnSignInSheet
                // Prevent an accidental sheet gesture from racing the MyDisney return. This
                // does not inspect the provider form or alter its page; it simply preserves the
                // app-owned presentation until ESPN reports its session.
                .interactiveDismissDisabled()
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
                ForEach(ConnectProvider.displayOrder) { provider in
                    OmenProviderCard(
                        platform: provider.platform,
                        title: provider.displayName,
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
            OmenCanvasTextAction(title: "I'll do this later", action: onDismiss)
            Color.clear.frame(height: 22)
        }
    }

    /// States what tapping will do *before* it is tapped, so no row is a surprise. Yahoo's row
    /// says "browser" plainly: the user is about to leave the app, and being told after the
    /// fact is how a connect flow reads as a hijack.
    private func availabilityLabel(_ provider: ConnectProvider) -> String {
        if provider == .yahoo { return "Sign in with Yahoo. Read-only access." }
        if provider == .espn { return "A few more steps — ESPN has no read-only sign-in. We walk you through it here, on your phone." }
        return "Username only. About ten seconds."
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

    // MARK: - Multiselect

    /// The tick shown on a chosen row. A glyph, never colour alone.
    @ViewBuilder
    private func selectionTick(_ id: String) -> some View {
        if viewModel.isLeagueSelected(id) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(OmenColor.accent)
                .accessibilityHidden(true)
        } else {
            Image(systemName: "circle")
                .foregroundStyle(OmenColor.textTertiary)
                .accessibilityHidden(true)
        }
    }

    private func selectionAccessibilityLabel(_ title: String, id: String) -> String {
        "\(title), \(viewModel.isLeagueSelected(id) ? "selected" : "not selected")"
    }

    /// Says what picking several actually does: follow all, start on the first.
    private var multiselectFooter: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            if viewModel.selectedLeagueIDs.count > 1 {
                Text("Omen will follow all \(viewModel.selectedLeagueIDs.count) and start on the first one. You can swipe between them on Command Center.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: - Yahoo

    private func yahooLeaguePicker(_ leagues: [YahooLeague]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text("Choose a league")
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
            Text("Yahoo is connected. Pick every league Omen should follow.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)

            ForEach(leagues) { league in
                OmenListRow(
                    title: league.name,
                    subtitle: league.subtitle,
                    enabled: !viewModel.state.isBusy,
                    action: { viewModel.toggleLeague(league.id) },
                    leading: { OmenPlatformBadge(platform: .yahoo) },
                    trailing: { selectionTick(league.id) }
                )
                .accessibilityLabel(selectionAccessibilityLabel(league.name, id: league.id))
            }

            multiselectFooter
            OmenButton(
                title: viewModel.confirmLeagueSelectionTitle,
                action: { Task { await viewModel.confirmYahooSelection() } },
                variant: .primary,
                size: .md,
                enabled: viewModel.canConfirmLeagueSelection
            )

            OmenButton(title: "Choose another provider", action: { viewModel.startOver() }, variant: .link, size: .sm)
        }
    }

    private func yahooConnectedSection(_ league: YahooLeague) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            connectedSurface(
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
                    enabled: !viewModel.state.isBusy,
                    action: { viewModel.toggleLeague(league.id) },
                    leading: { OmenPlatformBadge(platform: .sleeper) },
                    trailing: { selectionTick(league.id) }
                )
                .accessibilityLabel(selectionAccessibilityLabel(league.name, id: league.id))
            }

            multiselectFooter
            OmenButton(
                title: viewModel.confirmLeagueSelectionTitle,
                action: { Task { await viewModel.confirmSleeperSelection() } },
                variant: .primary,
                size: .md,
                enabled: viewModel.canConfirmLeagueSelection
            )

            OmenButton(title: "Use a different username", action: { viewModel.startOver() }, variant: .link, size: .sm)
        }
    }

    // MARK: - Step 6 and recovery

    private func connectedSection(_ league: SleeperLeague) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            connectedSurface(
                title: "\(league.name) is connected",
                message: "Omen can now read this league's roster, scoring, and matchup."
            )
            connectedActions
        }
    }

    /// One league reads as before; several list every league and say what Omen remembers.
    private func connectedSurface(title: String, message: String) -> some View {
        let confirmation = viewModel.connectionConfirmation
        return OmenStateSurface(
            kind: confirmation.title != nil && viewModel.followsNotPersisted ? .stale : .empty,
            title: confirmation.title ?? title,
            message: confirmation.message ?? message
        )
    }

    /// The connected screen's actions, preceded by the list of every league confirmed and what
    /// Omen remembers. The picker's footer is gone by the time `recordFollows` learns this, so
    /// the confirmation has to live where the user is by then.
    private var connectedActions: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            connectedButtons
        }
    }

    private var connectedButtons: some View {
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

    @ViewBuilder
    private func errorSection(_ failure: ConnectFailure) -> some View {
        // An ESPN failure with a provider response behind it gets the full report rather than a
        // one-line error. That screen was built to `ConnectFailed.dc.html` and, until the failure
        // model carried these fields, nothing could populate it — so nothing routed to it and it
        // existed only in a screenshot. A stale session is the failure users actually hit, it is
        // not their fault, and the fix is an ordered procedure a sentence cannot carry.
        if let diagnostic = failure.espnDiagnostic {
            OmenConnectFailedScreen(
                diagnosis: .init(
                    provider: "ESPN",
                    statusCode: diagnostic.statusCode,
                    statusText: diagnostic.statusText,
                    leagueID: diagnostic.leagueID,
                    observedAt: Self.observedAtFormatter.string(from: diagnostic.observedAt),
                    // Named only when true. The other providers' state is not known here, so
                    // nothing is claimed about them.
                    unaffected: []
                ),
                onReconnect: { viewModel.selectProvider(.espn) },
                onSendToSupport: onDismiss
            )
        } else {
            plainErrorSection(failure)
        }
    }

    /// Wall-clock, because the user is being asked to compare it against when they last signed in.
    private static let observedAtFormatter: DateFormatter = {
        let f = DateFormatter()
        f.timeStyle = .short
        f.dateStyle = .none
        return f
    }()

    private func plainErrorSection(_ failure: ConnectFailure) -> some View {
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

    // MARK: - ESPN sign-in (W1-A)

    /// Consent, before anything opens.
    ///
    /// Its own screen rather than a line under a button, because that is what W1-A binds: the
    /// user is told what is about to happen while they can still decline, and declining writes
    /// nothing. The affiliation disclaimer is not decorative — Disney's Terms of Use §2.B.vii
    /// bars use that suggests an association with their brands.
    /// `EspnConnect.dc.html`. Two itemised lists rather than one paragraph, because a promise
    /// buried mid-sentence is not one a user can check. This is the screen `W1-GATE` required
    /// when the terms answer came back No, so it is doing real work.
    private var espnConsentSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(EspnConnectCopy.consentEyebrow)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text(EspnConnectCopy.consentTitle)
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)
            }

            Text(EspnConnectCopy.consentLead)
                .omenTextStyle(OmenTypography.body)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            consentList(EspnConnectCopy.consentTakesTitle, EspnConnectCopy.consentTakes)
            consentList(EspnConnectCopy.consentNeverTitle, EspnConnectCopy.consentNever)

            Text(EspnConnectCopy.consentFooter)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)

            OmenButton(
                title: EspnConnectCopy.consentContinueTitle,
                action: { viewModel.beginEspnSignIn() },
                variant: .primary,
                size: .md
            )
            OmenButton(
                title: EspnConnectCopy.consentDeclineTitle,
                action: { viewModel.startOver() },
                variant: .secondary,
                size: .md
            )
        }
    }

    private func consentList(_ title: String, _ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    ForEach(items, id: \.self) { item in
                        HStack(alignment: .top, spacing: OmenSpacing.step8) {
                            Text("·")
                                .omenTextStyle(OmenTypography.bodySmall)
                                .foregroundStyle(OmenColor.accent)
                            Text(item)
                                .omenTextStyle(OmenTypography.bodySmall)
                                .foregroundStyle(OmenColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
            }
        }
    }

    /// Inline stand-in while the cover is up, so the sheet's dismissal never reveals a blank
    /// screen underneath.
    private var espnSignInPlaceholder: some View {
        OmenStateSurface(
            kind: .loading,
            title: "Just a moment",
            message: EspnConnectCopy.signInWaiting
        )
    }

    private var espnSignInSheet: some View {
        VStack(spacing: 0) {
            if let store = viewModel.espnCookieStore {
                EspnWebSignIn(store: store) { progress in
                    viewModel.espnSignInProgressed(progress)
                }
            } else {
                Spacer(minLength: 0)
            }

            // During ESPN / MyDisney authentication, this sheet belongs entirely to the
            // provider. A persistent Omen footer steals vertical space from the field being
            // edited and can cover it when iOS raises the keyboard. There is no useful Omen
            // action before sign-in: the provider's own close control exits normally, and a
            // valid session automatically moves on to discovery. The fallback panel below is
            // deliberately the only exception, shown after both safe discovery attempts fail.
            if viewModel.espnSignInProgress.isSignedIn,
               viewModel.espnDiscoveryFallbackAvailable {
                espnManualFallbackPanel
            }
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    /// The manual League ID path is recovery-only. Keeping it outside the provider sign-in
    /// state protects the MyDisney form's usable viewport while retaining an honest escape hatch
    /// for an account whose directory cannot be read.
    private var espnManualFallbackPanel: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            if let notice = viewModel.espnCheckNotice {
                Text(notice)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if viewModel.espnCanCheckAgain {
                OmenButton(
                    title: EspnConnectCopy.checkAgainTitle,
                    action: { viewModel.checkEspnLeaguesAgain() },
                    variant: .secondary,
                    size: .md,
                    enabled: !viewModel.state.isBusy
                )
            }

            OmenTextField(
                value: $viewModel.espnLeagueId,
                label: "ESPN League ID",
                placeholder: "e.g. 156664",
                enabled: !viewModel.state.isBusy
            )
            Text(EspnConnectCopy.leagueIdHint)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)

            OmenButton(
                title: EspnConnectCopy.signInConnectTitle,
                action: { Task { await viewModel.confirmEspnConnection() } },
                variant: .primary,
                size: .md,
                enabled: viewModel.canConnectEspn
            )
            OmenButton(
                title: EspnConnectCopy.signInCancelTitle,
                action: { viewModel.cancelEspnSignIn() },
                variant: .link,
                size: .sm
            )
        }
        .padding(OmenSpacing.step16)
        .background(OmenColor.bg)
    }

    /// The leagues ESPN reported. Omen's own list, in Omen's own design — the user is out of
    /// ESPN's web view by the time they see this.
    private func espnLeaguePicker(_ options: [EspnLeagueOption]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text(EspnConnectCopy.foundLeaguesTitle(options.count))
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
            Text(EspnConnectCopy.foundLeaguesSubtitle)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            ForEach(options) { option in
                OmenListRow(
                    title: option.displayName,
                    subtitle: option.subtitle,
                    enabled: !viewModel.state.isBusy,
                    action: { viewModel.toggleLeague(option.id) },
                    leading: { OmenPlatformBadge(platform: .espn) },
                    trailing: { selectionTick(option.id) }
                )
                .accessibilityLabel(selectionAccessibilityLabel(option.displayName, id: option.id))
            }

            multiselectFooter
            OmenButton(
                title: viewModel.confirmLeagueSelectionTitle,
                action: { Task { await viewModel.confirmEspnSelection() } },
                variant: .primary,
                size: .md,
                enabled: viewModel.canConfirmLeagueSelection
            )

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
            connectedSurface(
                title: "\(connection.displayLeagueName) is connected",
                message: EspnConnectCopy.connectedMessage(connection)
            )
            connectedActions
        }
    }

}
