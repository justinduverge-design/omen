import SwiftUI

/// M0c §1.3 "Account" route, including the Danger Zone (in-app account deletion, App Store
/// 5.1.1). Demo sessions never see the delete affordance — there's no real account to delete.
struct AccountView: View {
    let userID: String
    @ObservedObject var sessionManager: SessionManager
    @ObservedObject var authViewModel: AuthViewModel
    /// Nil in demo mode and in previews — there are no real connections to manage there.
    var leagueDirectoryRepository: LeagueDirectoryRepository?
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

                if !isDemo, let leagueDirectoryRepository {
                    // The ESPN consent screen promises a disconnect "any time in Account".
                    // Until this section existed, that sentence was false.
                    ConnectedPlatformsSection(
                        repository: leagueDirectoryRepository,
                        sessionManager: sessionManager
                    )
                }

                if !isDemo {
                    passkeysSection

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
        .task {
            if !isDemo { authViewModel.loadPasskeys() }
        }
    }

    @ViewBuilder
    private var passkeysSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text("Passkeys")
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)

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
