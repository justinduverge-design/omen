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
/// The test is **"can Yahoo Fantasy Information reach this app at all"**, not "can you connect
/// from inside it". Those came apart on 2026-08-28 when Yahoo restored the entitlement: for a
/// while a user could connect Yahoo only on the web, while every native surface read that
/// connection and displayed the data. Gating on `== .available` would have shipped Yahoo data
/// **with no attribution**, which the Yahoo API Access and Use Agreement requires wherever that
/// data is displayed.
///
/// Native connect has since shipped, so `.available` is now the live case — but the gate stays
/// written the same way on purpose. `.onHold` is the one state that means no Yahoo data exists
/// anywhere in the app, so `.onHold` is the only state that hides the line.
var omenShowsYahooAttribution: Bool {
    omenYahooAttributionApplies(to: ConnectProvider.yahoo.availability)
}

/// Split out so the rule can be tested against every availability state, not only whichever
/// one happens to be live today.
func omenYahooAttributionApplies(to availability: ConnectAvailability) -> Bool {
    if case .onHold = availability { return false }
    return true
}

/// Approved M4 Help + Support surface.
///
/// **Feedback now reaches a human (F-VET-06, 2026-08-30).** It previously did not: both rows
/// were deliberate dead ends, on the reasoning that nothing should be *"sent or queued until an
/// approved support contract exists."* That was a defensible call when written and became a
/// beta blocker the moment the beta plan depended on hearing from testers — a tester who hit a
/// broken connection was told reporting was unavailable, and we learned nothing.
///
/// It routes to `support@slopssaloon.com`, **the same address the web app already publishes**
/// (`frontend/src/pages/Support.jsx`), so this invents no contract and adds no backend surface.
///
/// It deliberately does **not** use `POST /api/omen/feedback`. That route is *move* feedback —
/// it requires `week`, `season` and a boolean `followed`, and upserts into `moves`. A bug report
/// written there would fabricate scoring data and still not reach a person.
///
/// The privacy promise below is enforced by construction: the prefilled body carries the app and
/// OS version and nothing else. No league, roster, credential, token, cookie, or provider error
/// is ever attached.
struct OmenHelpSupportView: View {
    static let supportAddress = "support@slopssaloon.com"

    let state: OmenHelpSupportState
    let contextDescription: String?
    @State private var feedbackUnavailable = false
    @Environment(\.openURL) private var openURL

    init(state: OmenHelpSupportState = .available, contextDescription: String? = nil) {
        self.state = state
        self.contextDescription = contextDescription
    }

    private var effectiveState: OmenHelpSupportState {
        feedbackUnavailable ? .submissionUnavailable : state
    }

    /// Opens the user's mail app. `submissionUnavailable` is now reached only when there is
    /// genuinely no way to send — a device with no mail account — which is what that state was
    /// always supposed to mean.
    private func compose(subject: String) {
        guard let url = Self.mailtoURL(subject: subject) else {
            feedbackUnavailable = true
            return
        }
        openURL(url) { accepted in
            if !accepted { feedbackUnavailable = true }
        }
    }

    /// Body carries app and OS version only. Everything the privacy card promises is excluded
    /// by simply never being read here — there is no code path that could attach a league,
    /// roster, credential, token, cookie, or provider error.
    static func mailtoURL(subject: String) -> URL? {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"
        let body = """


        —
        Omen \(version) (\(build))
        """

        var components = URLComponents()
        components.scheme = "mailto"
        components.path = supportAddress
        components.queryItems = [
            URLQueryItem(name: "subject", value: subject),
            URLQueryItem(name: "body", value: body)
        ]
        return components.url
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
                            subtitle: "Opens your mail app — nothing is attached automatically",
                            action: { compose(subject: "Omen feedback") }
                        )
                        OmenListRow(
                            title: "Report a problem",
                            subtitle: "Tell us what happened without private league data",
                            action: { compose(subject: "Omen problem report") }
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
