import SwiftUI

/// Honest support states supplied by a host. This view never infers or exposes provider details.
enum OmenHelpSupportState: Equatable {
    case available
    case noAccount
    case offline
    case submissionUnavailable
    case providerRecovery
}

/// Required Yahoo attribution sentence. Fixed wording — it is contractual, not editorial copy.
///
/// The Yahoo API Access and Use Agreement (executed 2026-08-20, Docusign envelope
/// A1D54813-9307-84ED-83EA-FC24FBE40785) requires clear attribution wherever Yahoo Fantasy
/// Information is displayed, and for mobile applications specifically that it appear inside the
/// app in an "About", "Legal", or similar informational section. Help + Support is that section
/// on native; no separate Legal screen exists, and inventing one would need its own screen
/// contract and Figma approval under the native delivery governance.
let omenYahooAttributionText = "Fantasy data provided by Yahoo Fantasy."

/// Whether the Yahoo attribution should render.
///
/// Mirrors the web gate (`YAHOO_CONNECTIONS_ENABLED` in `frontend/src/lib/yahooAuth.js`): Omen
/// currently displays no Yahoo Fantasy Information at all, because Yahoo has not granted the
/// Fantasy Sports entitlement, so an unconditional line would state something untrue. Deriving it
/// from `ConnectProvider.yahoo.availability` means the attribution appears on the same recorded
/// decision that makes Yahoo connectable again, instead of depending on someone remembering it at
/// launch.
var omenShowsYahooAttribution: Bool {
    ConnectProvider.yahoo.availability == .available
}

/// Approved M4 Help + Support surface. Feedback is intentionally not sent or queued until an
/// approved support contract exists; no league, roster, credential, token, cookie, or raw
/// provider error is attached automatically.
struct OmenHelpSupportView: View {
    let state: OmenHelpSupportState
    let contextDescription: String?
    @State private var feedbackUnavailable = false

    init(state: OmenHelpSupportState = .available, contextDescription: String? = nil) {
        self.state = state
        self.contextDescription = contextDescription
    }

    private var effectiveState: OmenHelpSupportState {
        feedbackUnavailable ? .submissionUnavailable : state
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                Text("Help + Support")
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)

                stateMessage

                if let contextDescription {
                    OmenCard(variant: .outlined) {
                        Text(contextDescription)
                            .omenTextStyle(OmenTypography.body)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                }

                OmenCard {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text("Help Center")
                            .omenTextStyle(OmenTypography.h2)
                            .foregroundStyle(OmenColor.textPrimary)
                        OmenListRow(title: "Getting started", subtitle: "Learn the Omen basics")
                        OmenListRow(title: "League connections", subtitle: "Understand available connection paths")
                        OmenListRow(title: "Account and privacy", subtitle: "Review what support never collects")
                    }
                }

                OmenCard {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text("Help Improve Omen")
                            .omenTextStyle(OmenTypography.h2)
                            .foregroundStyle(OmenColor.textPrimary)
                        OmenListRow(
                            title: "Share feedback",
                            subtitle: "Feedback sending is not available yet",
                            action: { feedbackUnavailable = true }
                        )
                        OmenListRow(
                            title: "Report a problem",
                            subtitle: "Tell us what happened without private league data",
                            action: { feedbackUnavailable = true }
                        )
                    }
                }

                OmenCard(variant: .outlined) {
                    Text("Privacy: Omen never automatically attaches your selected league, roster, credentials, tokens, cookies, or raw provider errors to support.")
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }

                if omenShowsYahooAttribution {
                    OmenCard(variant: .outlined) {
                        Text(omenYahooAttributionText)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                }
            }
            .padding(OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .navigationTitle("Help + Support")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var stateMessage: some View {
        switch effectiveState {
        case .available:
            EmptyView()
        case .noAccount:
            OmenStateSurface(
                kind: .empty,
                title: "Sign in for account support",
                message: "You can still read Help Center topics without an account."
            )
        case .offline:
            OmenStateSurface(
                kind: .disconnected,
                title: "You are offline",
                message: "Help remains available. Try again when your connection returns."
            )
        case .submissionUnavailable:
            OmenStateSurface(
                kind: .stale,
                title: "Feedback sending is not available yet",
                message: "Nothing was sent or saved. You can return to Help Center safely."
            )
        case .providerRecovery:
            OmenStateSurface(
                kind: .error,
                title: "A league connection needs attention",
                message: "Reconnect from Account. Support does not show raw provider errors or credentials."
            )
        }
    }
}
