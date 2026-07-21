import SwiftUI

/// Signed-in tab shell. Preserves the M3 vertical-slice mock content on the Command/Omen tabs
/// (still explicitly mock/demo-labeled — live wiring is separate product work, not part of the
/// #159 auth scope) and adds a real Account tab for sign-out and account deletion.
struct CommandCenterView: View {
    let userID: String
    @ObservedObject var sessionManager: SessionManager

    private var isDemo: Bool { userID == SessionManager.demoUserID }

    var body: some View {
        TabView {
            OmenStateSurface(
                kind: isDemo ? .mock : .empty,
                title: "Command Center",
                message: isDemo
                    ? "Demo mode is active. Nothing here is live."
                    : "Connect a league to see your Omen of the Week."
            )
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(OmenColor.bg)
            .tabItem { Label("Command", systemImage: "sparkles") }

            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                Text("Mock recommendation")
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)
                Text("Start Jordan Addison over the flex alternative.")
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                Text("Connection needs attention: connect a league for live Omen.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
            }
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(OmenColor.bg)
            .tabItem { Label("Omen", systemImage: "bolt.fill") }

            Text("Trade")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(OmenColor.bg)
                .tabItem { Label("Trade", systemImage: "arrow.left.arrow.right") }

            Text("Draft")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(OmenColor.bg)
                .tabItem { Label("Draft", systemImage: "list.number") }

            AccountView(userID: userID, sessionManager: sessionManager)
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
    }
}
