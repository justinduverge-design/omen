import SwiftUI

/// Honest support states supplied by a host. This view never infers or exposes provider details.
enum OmenHelpSupportState: Equatable {
    case available
    case noAccount
    case offline
    case submissionUnavailable
    case providerRecovery
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
