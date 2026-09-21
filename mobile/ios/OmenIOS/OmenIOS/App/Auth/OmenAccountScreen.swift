import SwiftUI

// MARK: - Account, built to `Account.dc.html`
//
// The last two artboards of the 32-artboard lock are `Account` and `ReportPill`, and
// `screen-journeys-v1.md` classes both as **chrome**: reachable from anywhere, belonging to no
// journey. So there is no nominal/degraded pass here — a path through Account would be invented
// rather than observed. What there is instead is one scenario per state that genuinely exists.
//
// ## What existed before this file
//
// `AccountView.swift` — 124 lines, shipped, and never built to its artboard. It rendered a
// "Signed in" card, one support row, sign out, the connected-platforms section and a Danger
// Zone as a flat stack of `OmenCard`s. Every fact on it was true; none of the composition was
// the drawn one.
//
// This file is the drawn one. `AccountView` is **not** deleted — it is what `OmenAccountScreen`
// is composed from at the seams that were already right (`ConnectedPlatformsSection`, the
// passkey list, `DeleteAccountConfirmationView`), and its two callers now reach this screen.
//
// ## The recursion, avoided explicitly
//
// `OmenScreenShell`'s E017 slot carries help **then** account on 25 of the 30 artboards. On
// this screen the account control would open the screen it is already on, so the slot carries
// help alone — `OmenScreenHeaderControls` takes `onOpenAccount` as an optional for exactly this
// reason, and its own documentation gives the rule: *"An avatar that opens nothing is a lie
// about what the header can do."* The artboard agrees: it draws `JD` at E009 as an avatar, and
// an avatar on the Account screen is an identity mark rather than a control.
//
// ## Two rules from `CONTRACTS.md`, both of which are load-bearing here
//
//   1. **Delete requires the exact string `DELETE MY OMEN DATA`.** `AccountDeletion` owns that
//      constant on both platforms and the server checks it again. This screen never types it
//      for the user, never pre-fills it, and never enables the destructive control without it.
//   2. **Export excludes OAuth tokens, ESPN cookies and Vault ids.** The export row says so in
//      words, because a user who believes an export contains their credentials will handle the
//      file as if it does — and the reverse mistake is worse.

/// One `.conn` row — a connected league, not a connected provider.
///
/// The distinction matters and the artboard makes it: three rows, three different providers,
/// each naming a **team** and a **league**. `OmenPlatformCompactRow` in the design system is
/// per-*platform* and carries a connection status; it is the right component for the Connect
/// surface and the wrong shape for this one, so this is a row rather than a reuse.
struct OmenAccountConnection: Identifiable, Equatable {
    /// Provider plus league id. Two leagues on one provider are two rows and must not collide.
    let id: String
    let platform: OmenPlatform
    /// The user's team in that league.
    let teamName: String
    let leagueName: String

    init(id: String, platform: OmenPlatform, teamName: String, leagueName: String) {
        self.id = id
        self.platform = platform
        self.teamName = teamName
        self.leagueName = leagueName
    }
}

/// How the connected-leagues section stands. Three cases, because three different things are
/// true and only one of them is "you have no leagues".
enum OmenAccountConnections: Equatable {
    /// Read, and these are the leagues.
    case loaded([OmenAccountConnection])
    /// Read, and there are none. A zero state, not an error — the same rule
    /// `CommandNoLeague.dc.html` states: *"Not an error state — nothing dashed or struck
    /// through."*
    case none
    /// **Not read.** The list is unread, not empty, and the screen must say which — the rule
    /// `LeagueDegraded`'s contract row states in those words. Rendering an unread list as an
    /// empty one tells a user their leagues are gone.
    case unavailable

    var rows: [OmenAccountConnection] {
        if case .loaded(let rows) = self { return rows }
        return []
    }

    /// `.sh`'s trailing count. Absent rather than `0` when the list was not read: a count of
    /// zero beside "Connected leagues" is a claim, and an unread list supports no claim.
    var countLabel: String? {
        switch self {
        case .loaded(let rows): return String(rows.count)
        case .none: return "0"
        case .unavailable: return nil
        }
    }
}

/// Everything `Account.dc.html` renders.
struct OmenAccountState: Equatable {
    /// `.arow b` — the identity line. The email for an email account, the provider's own
    /// wording otherwise.
    let identity: String
    /// `.arow span` — "Apple ID", "Google", "Email".
    let identityProvider: String
    /// `.av` — initials. Derived from the identity rather than invented, the same rule
    /// `omenCrest(from:)` states for a team crest.
    let avatarInitials: String
    let connections: OmenAccountConnections
    /// Demo sessions have no real account, so no delete affordance and no export. The Danger
    /// Zone is hidden rather than disabled: there is nothing to confirm.
    var isDemo: Bool = false

    static func initials(from identity: String) -> String {
        let letters = identity
            .split(whereSeparator: { !$0.isLetter && !$0.isNumber })
            .prefix(2)
            .compactMap { $0.first?.uppercased() }
            .joined()
        return letters.isEmpty ? "\u{2014}" : letters
    }
}

struct OmenAccountScreen: View {
    let state: OmenAccountState
    var onOpenIdentity: (() -> Void)?
    var onDisconnect: ((OmenAccountConnection) -> Void)?
    var onAddLeague: (() -> Void)?
    var onReportProblem: (() -> Void)?
    var onOpenHelpCentre: (() -> Void)?
    var onOpenPrivacyAndData: (() -> Void)?
    var onSignOut: (() -> Void)?
    /// Rendered under Support when supplied. This is the shipped passkey management that
    /// `AccountView` already carried and the artboard does not draw — recorded drift, kept for
    /// the same reason the E017 resolution kept the help button: *deleting a shipped affordance
    /// to match a picture* is the failure mode, not the fix.
    var securitySection: AnyView?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                identityRow
                connectionsSection
                supportSection
                if let securitySection {
                    sectionHeader("Sign-in security", trailing: nil)
                    securitySection
                        .padding(.horizontal, OmenSpacing.step16)
                        .padding(.top, OmenSpacing.step8)
                }
                if let onSignOut {
                    OmenButton(title: "Sign out", action: onSignOut, variant: .secondary, size: .lg)
                        .padding(.horizontal, OmenSpacing.step16)
                        .padding(.top, OmenSpacing.step20)
                }
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .accessibilityIdentifier("chrome.account")
            .omenFitContent()
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe("chrome.fit.account")
        .background(OmenColor.bg)
    }

    /// `.top` — kicker, title, and the E017 slot carrying **help alone**. See the file header
    /// for why the account control is absent here and nowhere else.
    private var header: some View {
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text("Signed in")
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("Account")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .account),
                onOpenAccount: nil
            )
            // `.av` — E009. An identity mark, not a button: on this screen there is nowhere for
            // it to go. It is hidden from VoiceOver because the identity row directly below
            // says the same thing in full, and hearing "JD" before "justin@…" is noise.
            Text(state.avatarInitials)
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.accentHover)
                .frame(width: 30, height: 30)
                .background(OmenColor.surface2)
                .clipShape(RoundedRectangle(cornerRadius: 999))
                .accessibilityHidden(true)
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }

    /// `.arow` — E010 through E014.
    private var identityRow: some View {
        OmenListRow(
            title: state.identity,
            subtitle: state.identityProvider,
            action: onOpenIdentity,
            leading: { EmptyView() },
            trailing: { chevron }
        )
        .padding(.top, OmenSpacing.step12)
    }

    @ViewBuilder private var connectionsSection: some View {
        sectionHeader("Connected leagues", trailing: state.connections.countLabel)

        switch state.connections {
        case .loaded(let rows):
            ForEach(rows) { connection in
                connectionRow(connection)
            }
        case .none:
            // A zero state in a sentence. Nothing dashed, nothing struck through.
            Text("No leagues connected yet.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.vertical, OmenSpacing.step8)
        case .unavailable:
            // Named, in a sentence that survives truncation, and it says **unread** rather than
            // empty. The second sentence is the one that matters: a user who sees a blank
            // Account screen concludes their connections were dropped.
            Text("Omen couldn\u{2019}t read your connected leagues. This list is unread, not empty \u{2014} nothing has been disconnected.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.vertical, OmenSpacing.step8)
                .accessibilityIdentifier("chrome.account.connections-unavailable")
        }

        if let onAddLeague {
            // `+ Add a league` — E040. A 12.5px accent word on the artboard; the target grows
            // to 44 and the type does not.
            Button(action: onAddLeague) {
                Text("+ Add a league")
                    .omenTextStyle(OmenTypography.name)
                    .foregroundStyle(OmenColor.accent)
                    .frame(maxWidth: .infinity, minHeight: OmenLayout.minTouchTarget, alignment: .leading)
                    .padding(.horizontal, OmenSpacing.step16)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Add a league")
        }
    }

    /// `.conn` — E018 through E038. Provider mark, team over league, and a `Disconnect` action.
    ///
    /// Disconnect is **not** the whole row: the row is not a destination and a whole-row target
    /// that disconnects a league on a mis-tap is the wrong shape entirely. The word is its own
    /// 44pt control and the rest of the row is text.
    private func connectionRow(_ connection: OmenAccountConnection) -> some View {
        HStack(spacing: OmenSpacing.step12) {
            OmenPlatformBadge(platform: connection.platform)
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(connection.teamName)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(2)
                Text(connection.leagueName)
                    .omenTextStyle(OmenTypography.label)
                    .foregroundStyle(OmenColor.textTertiary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)

            if let onDisconnect {
                Button { onDisconnect(connection) } label: {
                    Text("Disconnect")
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.accent)
                        .frame(minWidth: OmenLayout.minTouchTarget, minHeight: OmenLayout.minTouchTarget, alignment: .trailing)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                // Named, so VoiceOver hears which league it is about to unlink rather than
                // three identical "Disconnect"s.
                .accessibilityLabel("Disconnect \(connection.teamName), \(connection.leagueName)")
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.vertical, OmenSpacing.step10)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private var supportSection: some View {
        sectionHeader("Support", trailing: nil)
        OmenListRow(
            title: "Report a problem",
            // The artboard's own words, and they are the same promise `OmenReportPill` makes.
            // Both are kept true by `OmenBetaReport` being a closed struct.
            subtitle: "Sends device and version. Never your league data.",
            action: onReportProblem,
            leading: { EmptyView() },
            trailing: { chevron }
        )
        OmenListRow(
            title: "Help centre",
            subtitle: "Connecting, waivers, trades",
            action: onOpenHelpCentre,
            leading: { EmptyView() },
            trailing: { chevron }
        )
        if !state.isDemo {
            OmenListRow(
                title: "Privacy & data",
                subtitle: "Export or delete everything",
                action: onOpenPrivacyAndData,
                leading: { EmptyView() },
                trailing: { chevron }
            )
        }
    }

    /// `.sh` — an uppercase label with an optional uppercase count.
    private func sectionHeader(_ title: String, trailing: String?) -> some View {
        HStack {
            Text(title)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing { Text(trailing) }
        }
        .omenTextStyle(OmenTypography.micro)
        .foregroundStyle(OmenColor.textTertiary)
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step16)
        .padding(.bottom, OmenSpacing.step6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(trailing.map { "\(title), \($0)" } ?? title)
    }

    private var chevron: some View {
        Text("\u{203A}")
            .omenTextStyle(OmenTypography.cardLead)
            .foregroundStyle(OmenColor.textTertiary)
            .accessibilityHidden(true)
    }
}

// MARK: - Privacy & data

/// What `Privacy & data` opens — E053's destination, and the only place the destructive control
/// lives.
///
/// The artboard draws the row and not the screen behind it, so this composition is **built, not
/// drawn**, from the vocabulary the rest of the lock already established. Recorded as drift
/// rather than improvised into the canvas: adding an artboard is the founder's call.
///
/// Two actions, deliberately unequal in weight. Export is a link-weight action because it is
/// reversible and costs nothing. Delete is a danger button behind a phrase gate because it is
/// neither.
struct OmenPrivacyAndDataSheet: View {
    var onExport: (() -> Void)?
    var onDelete: (() -> Void)?
    var onDismiss: () -> Void

    var body: some View {
        OmenModalSheet(title: "Privacy & data") {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text("Export your data")
                        .omenTextStyle(OmenTypography.h3)
                        .foregroundStyle(OmenColor.textPrimary)
                    // `CONTRACTS.md`: *"Export excludes OAuth tokens, ESPN cookies and Vault
                    // ids."* Said here because a user who believes the file contains their
                    // credentials will handle it as if it does — and the opposite mistake is
                    // the dangerous one.
                    Text("Everything Omen stores about you, as a file. It does not include sign-in tokens, ESPN cookies, or anything Omen uses to reach your leagues \u{2014} those are never exported.")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let onExport {
                        OmenButton(title: "Export my data", action: onExport, variant: .secondary, size: .lg)
                            .accessibilityIdentifier("chrome.account.export")
                    }
                }

                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text("Delete everything")
                        .omenTextStyle(OmenTypography.h3)
                        .foregroundStyle(OmenColor.Data.riskHigh)
                    Text("Permanently deletes your Omen account and data. It cannot be undone, and it does not delete anything held by ESPN, Yahoo or Sleeper.")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let onDelete {
                        // This button does **not** delete. It opens the phrase gate, which is
                        // the only thing that can. `ChromeInteractionUITests` asserts that
                        // pressing it leaves the phrase gate unconfirmed.
                        OmenButton(title: "Delete my Omen data", action: onDelete, variant: .danger, size: .lg)
                            .accessibilityIdentifier("chrome.account.delete")
                    }
                }

                OmenButton(title: "Close", action: onDismiss, variant: .link, size: .sm)
            }
        }
        .accessibilityIdentifier("chrome.account.privacy")
    }
}
