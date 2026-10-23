import SwiftUI

// Account on the foundation (frames: Account, AccountPages). Who you are, your leagues, appearance, help, then
// sign out. Privacy, data sources and how Omen makes a call are pages pushed from here; delete is phrase-gated.
// The frame's Notifications row is left out: the app has no notification settings yet.

enum AccountRoute: Hashable {
    case signIn
    case privacy
    case sources
    case howCalls
}

/// One connected provider, as the league directory reports it.
struct OmenAccountConnection: Identifiable, Equatable {
    let id: String
    let platform: String
    let leagueName: String
    /// The provider signed the user out; the row says "Sign in again" and opens Connect.
    var needsSignIn = false
}

/// Loading, unread and empty are different claims; an unread list never reads as "no leagues".
enum OmenAccountConnections: Equatable {
    case loading
    case loaded([OmenAccountConnection])
    case none
    case unavailable
}

struct OmenAccountState: Equatable {
    var initials: String
    var identity: String
    var identityDetail: String
    var connections: OmenAccountConnections
    var isDemo = false
    var version: String = OmenAccountState.appVersion

    static var appVersion: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = info?["CFBundleVersion"] as? String
        return "Omen \(short)" + (build.map { " (\($0))" } ?? "")
    }

    static func initials(from identity: String) -> String {
        let letters = identity.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).prefix(2).compactMap { $0.first?.uppercased() }.joined()
        return letters.isEmpty ? "\u{2014}" : letters
    }
}

struct OmenAccountScreen: View {
    let state: OmenAccountState
    var disconnecting: String?
    var disconnectError: String?
    var onOpen: ((AccountRoute) -> Void)?
    var onConnect: (() -> Void)?
    var onDisconnect: ((OmenAccountConnection) -> Void)?
    var onContactSupport: (() -> Void)?
    var onReportProblem: (() -> Void)?
    var onSignOut: (() -> Void)?
    @AppStorage(OmenAppearance.storageKey) private var appearance = OmenAppearance.dark.rawValue
    @State private var confirming: OmenAccountConnection?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                OmenPressable(action: { onOpen?(.signIn) }) {
                    HStack(spacing: OmenSpacing.step12) {
                        Text(state.initials).omenTextStyle(OmenTypography.cardLead).foregroundStyle(OmenColor.textSecondary)
                            .frame(width: 52, height: 52).background(OmenColor.surface2, in: Circle())
                        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                            Text("Account").omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                                .accessibilityAddTraits(.isHeader)
                            Text(state.identityDetail).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        }
                        Spacer(minLength: 0)
                        if !state.isDemo { chevron }
                    }
                    .contentShape(Rectangle())
                }
                .disabled(state.isDemo)
                .accessibilityLabel("Account, \(state.identity), \(state.identityDetail)")
                .accessibilityHint(state.isDemo ? "" : "Opens sign-in and passkeys")

                section("Leagues") {
                    leagues
                    row("Connect a league", value: nil, tint: OmenColor.accentHover, action: onConnect)
                }
                section("App") {
                    Menu {
                        Picker("Appearance", selection: $appearance) {
                            ForEach(OmenAppearance.allCases, id: \.rawValue) { Text($0.title).tag($0.rawValue) }
                        }
                    } label: {
                        rowLabel("Appearance", value: (OmenAppearance(rawValue: appearance) ?? .dark).title, tint: OmenColor.textPrimary)
                    }
                    .accessibilityLabel("Appearance, \((OmenAppearance(rawValue: appearance) ?? .dark).title)")
                }
                section("Help") {
                    row("Contact support", value: nil, action: onContactSupport)
                    row("Report a problem", value: nil, action: onReportProblem)
                    row("How Omen makes a call", value: nil, action: { onOpen?(.howCalls) })
                    if !state.isDemo { row("Privacy and your data", value: nil, action: { onOpen?(.privacy) }) }
                    row("About and data sources", value: nil, action: { onOpen?(.sources) }, last: true)
                }
                if let onSignOut {
                    OmenButton(title: "Sign out", action: onSignOut, variant: .secondary, size: .lg, fullWidth: true)
                }
                Text(state.version).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                    .frame(maxWidth: .infinity)
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .sheet(item: $confirming) { connection in
            let name = OmenProviderMark.displayName(connection.platform)
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                Text("Disconnect \(name)?").omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                Text("Omen stops reading every \(name) league you follow. Your \(name) account and teams are untouched, and you can connect again any time.")
                    .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                OmenButton(title: "Disconnect", action: { confirming = nil; onDisconnect?(connection) }, variant: .danger, size: .lg, haptic: .warning, fullWidth: true)
                OmenButton(title: "Keep it connected", action: { confirming = nil }, variant: .secondary, size: .lg, fullWidth: true)
            }
            .padding(OmenSpacing.step20)
            .frame(maxHeight: .infinity, alignment: .top)
            .background(OmenColor.surface1.ignoresSafeArea())
            .presentationDetents([.medium])
        }
        .omenScreenReady("account")
    }

    @ViewBuilder private var leagues: some View {
        switch state.connections {
        case .loading:
            OmenStateBlock(kind: .loading, title: "Reading your leagues").padding(.vertical, OmenSpacing.step12)
        case .none:
            note("No leagues connected yet.")
        case .unavailable:
            note("Omen couldn\u{2019}t read your leagues. Nothing has been disconnected.")
        case .loaded(let rows):
            ForEach(rows) { connection in
                let busy = disconnecting == connection.platform
                OmenPressable(action: {
                    if connection.needsSignIn { onConnect?() } else if onDisconnect != nil { confirming = connection }
                }) {
                    HStack(spacing: OmenSpacing.step12) {
                        OmenProviderMark(platform: connection.platform, style: .tag)
                        Text(connection.leagueName).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(busy ? "Disconnecting" : connection.needsSignIn ? "Sign in again" : "Connected")
                            .omenTextStyle(OmenTypography.quiet)
                            .foregroundStyle(connection.needsSignIn ? OmenColor.Data.riskMedium : OmenColor.textTertiary)
                    }
                    .frame(minHeight: 52)
                    .contentShape(Rectangle())
                    .overlay(alignment: .bottom) { OmenHairline() }
                }
                .disabled(busy)
                .accessibilityHint(connection.needsSignIn ? "Opens Connect" : "Disconnect this league")
            }
        }
        if let disconnectError { note(disconnectError) }
    }

    private func note(_ text: String) -> some View {
        Text(text).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.vertical, OmenSpacing.step12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .bottom) { OmenHairline() }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textTertiary)
                .padding(.bottom, OmenSpacing.step4)
                .accessibilityAddTraits(.isHeader)
            content()
        }
    }

    private func row(_ title: String, value: String?, tint: Color = OmenColor.textPrimary, action: (() -> Void)?, last: Bool = false) -> some View {
        OmenPressable(action: { action?() }) { rowLabel(title, value: value, tint: tint, last: last) }
            .disabled(action == nil)
    }

    private func rowLabel(_ title: String, value: String?, tint: Color, last: Bool = false) -> some View {
        HStack(spacing: OmenSpacing.step12) {
            Text(title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(tint).frame(maxWidth: .infinity, alignment: .leading)
            if let value { Text(value).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary) }
            chevron
        }
        .frame(minHeight: 52)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) { if !last { OmenHairline() } }
    }

    private var chevron: some View {
        Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(OmenColor.textTertiary).accessibilityHidden(true)
    }
}

// MARK: - Pages

/// Shared page body: title, optional lead, then sections.
private struct OmenAccountPage<Content: View>: View {
    let title: String
    var lead: String?
    let id: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text(title).omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                    if let lead {
                        Text(lead).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                    }
                }
                content()
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .omenScreenReady(id)
    }
}

private struct OmenPageSection: View {
    let title: String
    var text: String?
    var rows: [(String, String)] = []

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            OmenSectionHeader(title: title)
            if let text {
                Text(text).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
            }
            ForEach(rows, id: \.0) { OmenKeyValueRow(key: $0.0, value: $0.1, valueTone: OmenColor.textTertiary) }
        }
    }
}

struct OmenPrivacyScreen: View {
    var onExport: (() -> Void)?
    var onDelete: () -> Void

    var body: some View {
        OmenAccountPage(title: "Privacy and your data", id: "account-privacy") {
            OmenPageSection(title: "What Omen keeps", rows: [
                ("Your account and sign-in", "until you delete it"),
                ("Leagues you follow", "until you disconnect"),
                ("Omen\u{2019}s calls and your choices", "the Ledger"),
                ("Reports you send", "30 days"),
            ])
            OmenPageSection(
                title: "What Omen never keeps",
                text: "Your ESPN, Yahoo or Sleeper password. ESPN\u{2019}s sign-in cookie is held encrypted only while you\u{2019}re connected, and removed if ESPN rejects it."
            )
            VStack(spacing: OmenSpacing.step12) {
                if let onExport { OmenButton(title: "Export your data", action: onExport, variant: .secondary, size: .lg, fullWidth: true) }
                OmenButton(title: "Delete account", action: onDelete, variant: .danger, size: .lg, fullWidth: true)
                    .accessibilityIdentifier("account.delete")
            }
            .padding(.top, OmenSpacing.step8)
        }
    }
}

/// The Yahoo API Access and Use Agreement (executed 2026-08-20) requires attribution inside the app, in an
/// About or similar section, wherever Yahoo Fantasy Information can appear. Only `.onHold` means no Yahoo data
/// exists anywhere in the app, so only `.onHold` hides the line.
let omenYahooAttributionText = "Fantasy data provided by Yahoo Fantasy."

var omenShowsYahooAttribution: Bool {
    omenYahooAttributionApplies(to: ConnectProvider.yahoo.availability)
}

func omenYahooAttributionApplies(to availability: ConnectAvailability) -> Bool {
    if case .onHold = availability { return false }
    return true
}

/// The nflverse credit is a licence term (CC BY 4.0: attribution, licence link, note of changes); a test pins it.
enum OmenDataSources {
    static let nflverseCredit = "Player and usage statistics: nflverse data, CC BY 4.0."
    static let nflverseURL = URL(string: "https://github.com/nflverse/nflverse-data")!
    static let nflverseLicenseURL = URL(string: "https://creativecommons.org/licenses/by/4.0/")!
    static let nflverseChanges = "Omen aggregates and reformats this data; it is not endorsed by nflverse."
    static let providerData = "Your league, roster, scoring and matchup data comes from the ESPN, Yahoo or Sleeper account you connected. It is your own data, read with your permission, and Omen never posts or trades for you."
}

struct OmenSourcesScreen: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        OmenAccountPage(title: "Where Omen\u{2019}s numbers come from", id: "account-sources") {
            VStack(spacing: 0) {
                OmenKeyValueRow(key: "Your league, rosters, scores", value: "ESPN, Yahoo, Sleeper", valueTone: OmenColor.textTertiary)
                OmenKeyValueRow(key: "Play-by-play and snaps", value: "nflverse (open data)", valueTone: OmenColor.textTertiary)
                OmenKeyValueRow(key: "Injury reports", value: "Sleeper", valueTone: OmenColor.textTertiary)
                OmenKeyValueRow(key: "Vegas lines and totals", value: "daily", valueTone: OmenColor.textTertiary)
                OmenKeyValueRow(key: "Weather", value: "forecast and observed", valueTone: OmenColor.textTertiary)
                OmenKeyValueRow(key: "Omen\u{2019}s read and grade", value: "Omen, on its own servers", valueTone: OmenColor.textTertiary)
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                Text(OmenDataSources.nflverseCredit).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
                Text(OmenDataSources.nflverseChanges).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: OmenSpacing.step16) {
                    OmenBarTextButton(title: "nflverse data", action: { openURL(OmenDataSources.nflverseURL) })
                    OmenBarTextButton(title: "CC BY 4.0 licence", action: { openURL(OmenDataSources.nflverseLicenseURL) })
                }
            }
            Text(OmenDataSources.providerData).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            if omenShowsYahooAttribution {
                Text(omenYahooAttributionText).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text("Omen is not affiliated with ESPN, Yahoo, Sleeper or the NFL.").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            Text(OmenAccountState.appVersion).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
        }
    }
}

struct OmenHowCallsScreen: View {
    var body: some View {
        OmenAccountPage(
            title: "How Omen makes a call",
            lead: "Every week Omen reads your league and the whole NFL, then picks the one move worth making for each of your teams. If nothing is worth it, it says hold.",
            id: "account-how-calls"
        ) {
            OmenPageSection(title: "Omen\u{2019}s read", text: "Omen forecasts every player from usage, matchup, game script and role changes. It also keeps score: for each position and scoring, whichever forecast, Omen\u{2019}s or your provider\u{2019}s, has been closer this season leads.")
            OmenPageSection(title: "Confidence and risk", text: "Strong means the reads agree. Lean means one pulls the other way. Risk is how bad the downside is.")
            OmenPageSection(title: "The Ledger", text: "Every call is graded on your league\u{2019}s own scoring, against the player it passed over.")
        }
    }
}

/// Sign-in and passkeys, pushed from the identity row.
struct OmenSignInScreen: View {
    let identity: String
    @ObservedObject var authViewModel: AuthViewModel

    var body: some View {
        OmenAccountPage(title: "Sign-in", lead: identity, id: "account-sign-in") {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                OmenSectionHeader(title: "Passkeys")
                if authViewModel.passkeys.isEmpty {
                    Text("No passkeys saved yet.").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                }
                ForEach(authViewModel.passkeys) { passkey in
                    HStack {
                        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                            Text(passkey.friendlyName ?? "Passkey").omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                            Text("Added \(passkey.createdAt.formatted(date: .abbreviated, time: .omitted))").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        }
                        Spacer()
                        OmenBarTextButton(title: "Remove", action: { authViewModel.deletePasskey(id: passkey.id) })
                            .disabled(authViewModel.passkeyManagementState == .deleting(passkey.id))
                            .accessibilityLabel("Remove \(passkey.friendlyName ?? "passkey")")
                    }
                    .frame(minHeight: 52)
                    .overlay(alignment: .bottom) { OmenHairline() }
                }
            }
            OmenButton(
                title: "Add a passkey",
                action: { authViewModel.registerPasskey() },
                variant: .secondary,
                size: .lg,
                enabled: authViewModel.passkeyManagementState != .registering,
                loading: authViewModel.passkeyManagementState == .registering,
                fullWidth: true
            )
            if case .failed(let message) = authViewModel.passkeyManagementState {
                OmenStateBlock(kind: .failed, title: "The passkey didn\u{2019}t change", message: message)
            }
            if case .succeeded(let message) = authViewModel.passkeyManagementState {
                OmenStateBlock(kind: .hold, title: "Sign-in updated", message: message)
            }
        }
        .task { authViewModel.loadPasskeys() }
    }
}

/// "Delete your Omen account?" — the confirm stays off until the exact phrase is typed; the server checks it again.
struct OmenDeleteAccountSheet: View {
    @ObservedObject var sessionManager: SessionManager
    @Environment(\.omenEnvironment) private var environment
    @Environment(\.dismiss) private var dismiss
    @State private var phrase = ""
    @State private var deleting = false
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            Text("Delete your Omen account?").omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
            Text("Your account, leagues, Ledger and reports are deleted for good. Your ESPN, Yahoo and Sleeper accounts are not touched.")
                .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                Text("Type \(AccountDeletion.requiredPhrase) to confirm").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                OmenTextField(value: $phrase, label: "Type \(AccountDeletion.requiredPhrase) to confirm", enabled: !deleting)
                if let error { Text(error).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.Data.riskMedium) }
            }
            HStack(spacing: OmenSpacing.step12) {
                OmenButton(title: "Cancel", action: { dismiss() }, variant: .secondary, size: .lg, fullWidth: true)
                OmenButton(title: "Delete", action: { Task { await delete() } }, variant: .danger, size: .lg,
                           enabled: AccountDeletion.isConfirmed(phrase) && !deleting, loading: deleting, fullWidth: true)
            }
        }
        .padding(OmenSpacing.step20)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(OmenColor.surface1.ignoresSafeArea())
        .presentationDetents([.medium])
        .interactiveDismissDisabled(deleting)
        .omenScreenReady("account-delete")
    }

    private func delete() async {
        guard let session = sessionManager.currentSession else { error = "Sign in again to delete your account."; return }
        deleting = true
        error = nil
        let outcome = await URLSessionAccountRepository(apiBaseURL: environment.apiBaseURL)
            .deleteAccount(accessToken: session.accessToken, confirmation: phrase)
        deleting = false
        switch outcome {
        case .deleted: sessionManager.signOut(); dismiss()
        case .invalidConfirmation: error = "Type the word exactly as shown."
        case .unauthorized: error = "Sign in again to delete your account."
        case .retryableError: error = "Omen couldn\u{2019}t delete it right now. Try again."
        }
    }
}
