import SwiftUI

/// Account's production host: session, connection directory, and the three sheets the screen
/// can open.
///
/// **The composition moved out of here on 2026-09-20.** This file used to *be* the Account
/// screen — a flat stack of cards that was never built to `Account.dc.html`. `OmenAccountScreen`
/// is now the drawn screen and this is what feeds it: it owns the view models, maps the
/// directory into rows, and presents Privacy & data, the delete phrase gate, Help, and the
/// report composer.
///
/// The split is the one every other destination already has (`OmenLedgerScreen` /
/// `CommandCenterView`), and it is what lets a screenshot scenario mount the screen against a
/// fixture without a session.
struct AccountView: View {
    let userID: String
    @ObservedObject var sessionManager: SessionManager
    @ObservedObject var authViewModel: AuthViewModel
    /// Nil in demo mode and in previews — there are no real connections to manage there.
    var leagueDirectoryRepository: LeagueDirectoryRepository?
    /// Supplied by the shell so the composer can name the screen a user is reporting on. Nil
    /// leaves the Support row present but inert rather than lying about where it goes.
    var onReportProblem: (() -> Void)?

    @State private var showingDeleteConfirmation = false
    @State private var showingPrivacyAndData = false
    @State private var showingHelpSupport = false

    private var isDemo: Bool { userID == SessionManager.demoUserID }

    var body: some View {
        content
            .sheet(isPresented: $showingPrivacyAndData) {
                OmenPrivacyAndDataSheet(
                    // Export has no native carrier yet: `GET /api/user/export` exists and
                    // nothing on iOS downloads or presents the file. Passing nil renders the
                    // section with no button rather than a button that does nothing, which is
                    // the same rule the header slot applies to its avatar.
                    onExport: nil,
                    onDelete: { showingPrivacyAndData = false; showingDeleteConfirmation = true },
                    onDismiss: { showingPrivacyAndData = false }
                )
            }
            .sheet(isPresented: $showingDeleteConfirmation) {
                DeleteAccountConfirmationView(sessionManager: sessionManager)
            }
            .sheet(isPresented: $showingHelpSupport) {
                NavigationStack { OmenHelpSupportView() }
            }
            .task {
                if !isDemo { authViewModel.loadPasskeys() }
            }
    }

    @ViewBuilder private var content: some View {
        if !isDemo, let leagueDirectoryRepository {
            ConnectedAccountScreen(
                state: baseState,
                repository: leagueDirectoryRepository,
                sessionManager: sessionManager,
                securitySection: AnyView(passkeysSection),
                onReportProblem: onReportProblem,
                onOpenHelpCentre: { showingHelpSupport = true },
                onOpenPrivacyAndData: { showingPrivacyAndData = true },
                onSignOut: { sessionManager.signOut() }
            )
        } else {
            // Demo mode, and the preview path. There is no directory to read, so the section
            // says "none" rather than "unavailable" — nothing failed.
            OmenAccountScreen(
                state: OmenAccountState(
                    identity: baseState.identity,
                    identityProvider: baseState.identityProvider,
                    avatarInitials: baseState.avatarInitials,
                    connections: .none,
                    isDemo: isDemo
                ),
                onReportProblem: onReportProblem,
                onOpenHelpCentre: { showingHelpSupport = true },
                onSignOut: { sessionManager.signOut() }
            )
        }
    }

    private var baseState: OmenAccountState {
        let identity = isDemo ? "Demo mode" : userID
        return OmenAccountState(
            identity: identity,
            // The session does not carry which provider signed the user in, so this states what
            // is knowable rather than guessing "Apple ID" from the artboard's fixture. A wrong
            // provider name under an email address is a specific false claim.
            identityProvider: isDemo ? "No account" : "Signed in",
            avatarInitials: OmenAccountState.initials(from: identity),
            connections: .none,
            isDemo: isDemo
        )
    }

    @ViewBuilder
    private var passkeysSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            if authViewModel.passkeys.isEmpty {
                Text("No passkeys saved yet.")
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
            } else {
                ForEach(authViewModel.passkeys) { passkey in
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenListRow(
                            title: passkey.friendlyName ?? "Passkey",
                            subtitle: "Added \(passkey.createdAt.formatted(date: .abbreviated, time: .omitted))"
                        )
                        OmenButton(
                            title: "Remove",
                            action: { authViewModel.deletePasskey(id: passkey.id) },
                            variant: .link,
                            size: .sm,
                            enabled: authViewModel.passkeyManagementState != .deleting(passkey.id),
                            loading: authViewModel.passkeyManagementState == .deleting(passkey.id)
                        )
                    }
                }
            }

            OmenButton(
                title: "Add a passkey",
                action: { authViewModel.registerPasskey() },
                variant: .secondary,
                size: .lg,
                enabled: authViewModel.passkeyManagementState != .registering,
                loading: authViewModel.passkeyManagementState == .registering
            )

            if case .failed(let message) = authViewModel.passkeyManagementState {
                Text(message)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.Data.riskHigh)
            }
        }
    }
}

/// The signed-in path, which is the one that owns a connection directory.
///
/// Split into its own view for one reason: `ConnectedPlatformsViewModel` is a `@StateObject` and
/// a `@StateObject` declared on `AccountView` would be constructed in demo mode too, where
/// there is no repository to give it.
private struct ConnectedAccountScreen: View {
    let state: OmenAccountState
    @StateObject private var viewModel: ConnectedPlatformsViewModel
    @State private var pendingDisconnect: OmenAccountConnection?

    let securitySection: AnyView
    var onReportProblem: (() -> Void)?
    var onOpenHelpCentre: (() -> Void)?
    var onOpenPrivacyAndData: (() -> Void)?
    var onSignOut: (() -> Void)?

    init(
        state: OmenAccountState,
        repository: LeagueDirectoryRepository,
        sessionManager: SessionManager,
        securitySection: AnyView,
        onReportProblem: (() -> Void)?,
        onOpenHelpCentre: (() -> Void)?,
        onOpenPrivacyAndData: (() -> Void)?,
        onSignOut: (() -> Void)?
    ) {
        self.state = state
        _viewModel = StateObject(
            wrappedValue: ConnectedPlatformsViewModel(repository: repository, sessionManager: sessionManager)
        )
        self.securitySection = securitySection
        self.onReportProblem = onReportProblem
        self.onOpenHelpCentre = onOpenHelpCentre
        self.onOpenPrivacyAndData = onOpenPrivacyAndData
        self.onSignOut = onSignOut
    }

    /// `.loading` renders as `.unavailable` — *"couldn't read"* — rather than as an empty list.
    /// A list that is still arriving is also a list that has not been read, and the sentence is
    /// true of both. Rendering it empty for the first second is the same false claim, briefly.
    private var connections: OmenAccountConnections {
        switch viewModel.state {
        case .loading, .failed:
            return .unavailable
        case .loaded(let rows) where rows.isEmpty:
            return .none
        case .loaded(let rows):
            return .loaded(rows.map(Self.connection))
        }
    }

    var body: some View {
        OmenAccountScreen(
            state: OmenAccountState(
                identity: state.identity,
                identityProvider: state.identityProvider,
                avatarInitials: state.avatarInitials,
                connections: connections,
                isDemo: state.isDemo
            ),
            onDisconnect: { pendingDisconnect = $0 },
            onReportProblem: onReportProblem,
            onOpenHelpCentre: onOpenHelpCentre,
            onOpenPrivacyAndData: onOpenPrivacyAndData,
            onSignOut: onSignOut,
            securitySection: securitySection
        )
        .task { await viewModel.load() }
        // Confirmed, because disconnecting is not what a user means by a mis-tap — but no typed
        // phrase: it is reversible by reconnecting. Carried over from `ConnectedPlatformsSection`
        // unchanged.
        .sheet(item: $pendingDisconnect) { row in
            OmenModalSheet(title: "Disconnect \(Self.providerName(row.platform))?") {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    Text("Omen will stop reading this league. Your \(Self.providerName(row.platform)) account and your team are untouched, and you can connect again any time.")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    OmenButton(
                        title: "Disconnect",
                        action: {
                            let platform = row.id
                            pendingDisconnect = nil
                            Task { await viewModel.disconnect(platform) }
                        },
                        variant: .danger,
                        size: .lg
                    )
                    OmenButton(
                        title: "Keep it connected",
                        action: { pendingDisconnect = nil },
                        variant: .secondary,
                        size: .lg
                    )
                }
            }
            .presentationDetents([.medium])
        }
    }

    /// `ConnectedPlatformsViewModel.Row` carries optional names because ESPN exposes no league
    /// list — `league_name` is routinely null on a **healthy** connection. The row therefore
    /// says what is missing rather than printing a placeholder that reads as a real name.
    private static func connection(_ row: ConnectedPlatformsViewModel.Row) -> OmenAccountConnection {
        OmenAccountConnection(
            id: row.platform,
            platform: platform(row.platform),
            teamName: row.teamName ?? row.displayName,
            leagueName: row.leagueName ?? "League name not provided"
        )
    }

    private static func platform(_ raw: String) -> OmenPlatform {
        switch raw {
        case "yahoo": return .yahoo
        case "sleeper": return .sleeper
        default: return .espn
        }
    }

    private static func providerName(_ platform: OmenPlatform) -> String {
        switch platform {
        case .espn: return "ESPN"
        case .yahoo: return "Yahoo"
        case .sleeper: return "Sleeper"
        }
    }
}
