import SwiftUI

/// M0c §1.3 "Account" route, including the Danger Zone (in-app account deletion, App Store
/// 5.1.1). Demo sessions never see the delete affordance — there's no real account to delete.
struct AccountView: View {
    let userID: String
    @ObservedObject var sessionManager: SessionManager
    @State private var showingDeleteConfirmation = false

    private var isDemo: Bool { userID == SessionManager.demoUserID }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                OmenCard {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text("Signed in")
                            .omenTextStyle(OmenTypography.label)
                            .foregroundStyle(OmenColor.textSecondary)
                        Text(isDemo ? "Demo mode" : userID)
                            .omenTextStyle(OmenTypography.h3)
                            .foregroundStyle(OmenColor.textPrimary)
                    }
                }

                NavigationLink {
                    OmenHelpSupportView()
                } label: {
                    OmenListRow(
                        title: "Support & Help Improve Omen",
                        subtitle: "Help Center, feedback, and problem reporting"
                    )
                }
                .buttonStyle(.plain)
                .accessibilityHint("Double tap to open Help and Support")

                OmenButton(title: "Sign out", action: { sessionManager.signOut() }, variant: .secondary, size: .lg)

                if !isDemo {
                    VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                        Text("Danger Zone")
                            .omenTextStyle(OmenTypography.h3)
                            .foregroundStyle(OmenColor.Data.riskHigh)
                        OmenButton(
                            title: "Delete account",
                            action: { showingDeleteConfirmation = true },
                            variant: .danger,
                            size: .lg
                        )
                    }
                }
            }
            .padding(OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .sheet(isPresented: $showingDeleteConfirmation) {
            DeleteAccountConfirmationView(sessionManager: sessionManager)
        }
    }
}
