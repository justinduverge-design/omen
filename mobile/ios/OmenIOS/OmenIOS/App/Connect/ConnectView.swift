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
                    case .discoveringEspnLeagues:
                        espnDiscoverySteps
                    case .validatingEspnConnection:
                        busySection
                    case .espnConnected(let connection):
                        espnConnectedSection(connection)
                    }
                }
                .padding(.horizontal, OmenSpacing.step20)
                .padding(.bottom, OmenSpacing.step24)
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
        VStack(alignment: .leading, spacing: OmenSpacing.step20) {
            OmenBackButton(title: "Back", action: onDismiss).padding(.top, OmenSpacing.step8)
            pageTitle("Where do you play?", "Connect one now. You can add the rest from the Desk.")
            // No provider is selected by default; each row says how it connects before it is tapped.
            VStack(spacing: 0) {
                ForEach(ConnectProvider.displayOrder) { provider in
                    OmenPressable(action: { viewModel.selectProvider(provider) }) {
                        HStack(spacing: OmenSpacing.step12) {
                            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                                Text(provider.displayName).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                                Text(availabilityLabel(provider)).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(OmenColor.textTertiary)
                                .accessibilityHidden(true)
                        }
                        .frame(minHeight: 64)
                        .contentShape(Rectangle())
                        .overlay(alignment: .bottom) { OmenHairline() }
                    }
                    .accessibilityLabel("\(provider.displayName). \(availabilityLabel(provider))")
                }
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                Text("What Omen reads").omenTextStyle(OmenTypography.cardLead).foregroundStyle(OmenColor.textPrimary)
                Text("Every roster and lineup in your league, the scores, the waiver wire and the trades. Omen only reads: it never sets a lineup, makes a claim or sends a trade for you.")
                    .omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(OmenSpacing.step16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(OmenColor.surface1, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            OmenBarTextButton(title: "I\u{2019}ll do this later", tone: OmenColor.textSecondary, action: onDismiss)
                .frame(maxWidth: .infinity)
        }
    }

    private func pageTitle(_ title: String, _ lead: String?) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text(title).omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
            if let lead {
                Text(lead).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    /// One honest line per provider on how it connects.
    private func availabilityLabel(_ provider: ConnectProvider) -> String {
        switch provider {
        case .yahoo: "Approve Omen on Yahoo\u{2019}s own page."
        case .espn: "Sign in to ESPN inside Omen. We never see your password."
        default: "Your username. No password."
        }
    }

    // MARK: - Step 5 — connect

    private var sleeperUsernameEntry: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenBackButton(title: "Back", action: { viewModel.startOver() }).padding(.top, OmenSpacing.step8)
            pageTitle("Your Sleeper username", "Omen finds your leagues from it. Sleeper never asks for a password here, and neither does Omen.")
            OmenTextField(value: $viewModel.username, label: "Sleeper username", placeholder: "username", enabled: !viewModel.state.isBusy)
            OmenButton(title: "Find my leagues", action: { Task { await viewModel.resolveUsername() } }, variant: .primary, size: .lg,
                       enabled: viewModel.canSubmitUsername, fullWidth: true)
        }
    }

    // MARK: - Multiselect

    /// The tick shown on a chosen row. A glyph, never colour alone.
    @ViewBuilder
    private func selectionTick(_ id: String) -> some View {
        if viewModel.isLeagueSelected(id) {
            Image(systemName: "checkmark.square.fill")
                .font(.system(size: 22))
                .foregroundStyle(OmenColor.accentHover)
                .accessibilityHidden(true)
        } else {
            Image(systemName: "square")
                .font(.system(size: 22))
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
                Text("Omen will follow all \(viewModel.selectedLeagueIDs.count) and start on the first one. You can swipe between them on the Desk.")
                    .omenTextStyle(OmenTypography.quiet)
                    .foregroundStyle(OmenColor.textTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    /// Frame LeaguePick: what happened, "Follow which?", a checkbox per league, then Follow.
    private func pickScreen(
        provider: String,
        steps: [String],
        notice: String? = nil,
        leagues: [(id: String, title: String, subtitle: String?)],
        confirm: @escaping () -> Void,
        backTitle: String = "Choose another provider"
    ) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenBackButton(title: "Connect", action: { viewModel.startOver() }).padding(.top, OmenSpacing.step8)
            Text(provider.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                ForEach(steps, id: \.self) { step in
                    HStack(spacing: OmenSpacing.step10) {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(OmenColor.accentHover).accessibilityHidden(true)
                        Text(step).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                    }
                }
                if let notice {
                    Text(notice).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).fixedSize(horizontal: false, vertical: true)
                }
            }
            OmenSectionHeader(title: "Follow which?").padding(.top, OmenSpacing.step8)
            VStack(spacing: 0) {
                ForEach(leagues, id: \.id) { league in
                    OmenPressable(action: { viewModel.toggleLeague(league.id) }) {
                        HStack(spacing: OmenSpacing.step12) {
                            selectionTick(league.id)
                            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                                Text(league.title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                                if let subtitle = league.subtitle, !subtitle.isEmpty {
                                    Text(subtitle).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .frame(minHeight: 60)
                        .contentShape(Rectangle())
                        .overlay(alignment: .bottom) { OmenHairline() }
                    }
                    .disabled(viewModel.state.isBusy)
                    .accessibilityLabel(selectionAccessibilityLabel(league.title, id: league.id))
                    .accessibilityAddTraits(viewModel.isLeagueSelected(league.id) ? .isSelected : [])
                }
            }
            multiselectFooter
            OmenButton(title: followTitle, action: confirm, variant: .primary, size: .lg, enabled: viewModel.canConfirmLeagueSelection, fullWidth: true)
            OmenBarTextButton(title: backTitle, tone: OmenColor.textSecondary, action: { viewModel.startOver() }).frame(maxWidth: .infinity)
        }
    }

    private var followTitle: String {
        switch viewModel.selectedLeagueIDs.count {
        case 0: "Pick a league"
        case 1: "Follow 1 league"
        case let n: "Follow \(n) leagues"
        }
    }

    // MARK: - Yahoo

    private func yahooLeaguePicker(_ leagues: [YahooLeague]) -> some View {
        pickScreen(
            provider: "Yahoo",
            steps: ["Yahoo approved Omen", "Found \(leagues.count) football league\(leagues.count == 1 ? "" : "s")"],
            leagues: leagues.map { ($0.id, $0.name, $0.subtitle) },
            confirm: { Task { await viewModel.confirmYahooSelection() } }
        )
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
        // Leaving mid-flight is safe: Sleeper connects by request id, Yahoo's transaction is consumed or expires.
        OmenStateBlock(kind: .loading, title: "Just a moment", message: viewModel.state.progressLabel ?? "Working\u{2026}",
                       actionTitle: "Cancel", action: { viewModel.cancel() })
            .padding(.top, OmenSpacing.step48)
    }

    private func leaguePicker(_ account: ResolvedSleeperAccount) -> some View {
        pickScreen(
            provider: "Sleeper",
            steps: ["Found \(account.username)", "Found \(account.leagues.count) football league\(account.leagues.count == 1 ? "" : "s")"],
            leagues: account.leagues.map { ($0.id, $0.name, $0.subtitle) },
            confirm: { Task { await viewModel.confirmSleeperSelection() } },
            backTitle: "Use a different username"
        )
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
        return OmenStateBlock(
            kind: confirmation.title != nil && viewModel.followsNotPersisted ? .notEnoughToGoOn : .hold,
            title: confirmation.title ?? title,
            message: confirmation.message ?? message
        )
        .padding(.top, OmenSpacing.step48)
    }

    private var connectedActions: some View {
        VStack(spacing: OmenSpacing.step12) {
            OmenButton(title: "Go to the Desk", action: onConnected, variant: .primary, size: .lg, fullWidth: true)
            OmenButton(title: "Connect another league", action: { viewModel.startOver() }, variant: .secondary, size: .lg, fullWidth: true)
        }
    }

    /// Cancelling is normal. No error styling, no apology.
    private var canceledSection: some View {
        VStack(spacing: OmenSpacing.step12) {
            OmenStateBlock(kind: .nothingWorthDoing, title: "No problem", message: "Nothing was connected. Pick a provider whenever you\u{2019}re ready.")
            OmenButton(title: "Choose a provider", action: { viewModel.startOver() }, variant: .primary, size: .lg, fullWidth: true)
            OmenBarTextButton(title: "Not now", tone: OmenColor.textSecondary, action: onDismiss)
        }
        .padding(.top, OmenSpacing.step48)
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
        VStack(spacing: OmenSpacing.step12) {
            OmenStateBlock(kind: .failed, title: "That didn\u{2019}t connect", message: failure.message)
            // A Yahoo round trip that already happened is re-checked rather than restarted.
            if failure == .providerNotConnected || failure == .noLeaguesForSeason {
                OmenButton(title: "Check again", action: { Task { await viewModel.confirmYahooConnection() } }, variant: .primary, size: .lg, fullWidth: true)
            }
            OmenButton(title: "Try again", action: { viewModel.startOver() }, variant: .secondary, size: .lg, fullWidth: true)
            OmenBarTextButton(title: "Look around with a sample league", tone: OmenColor.textSecondary, action: onDismiss)
        }
        .padding(.top, OmenSpacing.step48)
    }

    private var reauthSection: some View {
        OmenStateBlock(kind: .notEnoughToGoOn, title: "Sign in again", message: "Your Omen session expired. Sign in again, then connect your league.",
                       actionTitle: "Close", action: onDismiss)
            .padding(.top, OmenSpacing.step48)
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
            OmenBackButton(title: "Back", action: { viewModel.startOver() }).padding(.top, OmenSpacing.step8)
            Text(EspnConnectCopy.consentEyebrow.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
            pageTitle(EspnConnectCopy.consentTitle, EspnConnectCopy.consentLead)
            consentList(EspnConnectCopy.consentTakesTitle, EspnConnectCopy.consentTakes)
            consentList(EspnConnectCopy.consentNeverTitle, EspnConnectCopy.consentNever)
            Text(EspnConnectCopy.consentFooter).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
            OmenButton(title: EspnConnectCopy.consentContinueTitle, action: { viewModel.beginEspnSignIn() }, variant: .primary, size: .lg, fullWidth: true)
            OmenButton(title: EspnConnectCopy.consentDeclineTitle, action: { viewModel.startOver() }, variant: .secondary, size: .lg, fullWidth: true)
        }
    }

    private func consentList(_ title: String, _ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            OmenSectionHeader(title: title)
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: OmenSpacing.step8) {
                    Text("\u{00B7}").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.accentHover).accessibilityHidden(true)
                    Text(item).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    /// ESPN discovery as visible steps (whole-app canvas, `EspnConnect.dc.html`): what is done, what
    /// Omen is waiting on, and ESPN's own status line while a new login is still being listed.
    private var espnDiscoverySteps: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            Text("ESPN").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover).padding(.top, OmenSpacing.step24)
            pageTitle("Finding your leagues", nil)
            espnStep(done: true, title: "Signed in to ESPN", detail: "Your ESPN login stays private to Omen\u{2019}s server.")
            espnStep(done: false, title: "Finding your football leagues", detail: viewModel.espnCheckNotice)
        }
    }

    private func espnStep(done: Bool, title: String, detail: String?) -> some View {
        HStack(alignment: .top, spacing: OmenSpacing.step10) {
            Group {
                if done {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(OmenColor.accentHover)
                } else {
                    ProgressView().controlSize(.small).tint(OmenColor.accentHover)
                }
            }
            .frame(width: 22, height: 22)
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                if let detail {
                    Text(detail).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityValue(done ? "Done" : "In progress")
    }

    /// Inline stand-in while the cover is up, so the sheet's dismissal never reveals a blank
    /// screen underneath.
    private var espnSignInPlaceholder: some View {
        OmenStateBlock(kind: .loading, title: "Just a moment", message: EspnConnectCopy.signInWaiting)
            .padding(.top, OmenSpacing.step48)
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
        pickScreen(
            provider: "ESPN",
            steps: ["Signed in to ESPN", "Found \(options.count) football league\(options.count == 1 ? "" : "s")"],
            notice: viewModel.espnCheckNotice,
            leagues: options.map { ($0.id, $0.displayName, $0.subtitle) },
            confirm: { Task { await viewModel.confirmEspnSelection() } }
        )
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
