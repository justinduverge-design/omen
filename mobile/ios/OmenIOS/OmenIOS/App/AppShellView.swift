import SwiftUI

struct AppShellView: View {
    @EnvironmentObject private var sessionManager: SessionManager
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.omenEnvironment) private var environment
    @State private var showSignIn = false

    var body: some View {
        Group {
            switch sessionManager.state {
            case .loading:
                OmenStateSurface(kind: .loading, title: "Loading Omen", message: "Checking your session.")
                    .padding(OmenSpacing.step24)

            case .signedOut:
                if showSignIn {
                    SignInView(
                        viewModel: authViewModel,
                        onBack: {
                            showSignIn = false
                            authViewModel.reset()
                        }
                    )
                } else {
                    WelcomeView(
                        demoModeEnabled: environment.demoModeEnabled,
                        onTryDemo: { sessionManager.onDemo() },
                        onGetStarted: { showSignIn = true }
                    )
                }

            case .needsReauth:
                SignInView(
                    viewModel: authViewModel,
                    reauthPrompt: true,
                    onSignOut: {
                        sessionManager.signOut()
                        authViewModel.reset()
                    }
                )

            case .signedIn(let userID):
                CommandCenterView(userID: userID, sessionManager: sessionManager, authViewModel: authViewModel)
            }
        }
        .task { sessionManager.restore() }
        .sheet(
            isPresented: Binding(
                get: { authViewModel.showsPasskeyPairingOffer },
                set: { if !$0 { authViewModel.dismissPasskeyPairingOffer() } }
            )
        ) {
            OmenModalSheet(title: "Save a passkey for faster sign-in?") {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    Text("Use Face ID to sign in without waiting for an email code.")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                    OmenButton(
                        title: "Save passkey",
                        action: { authViewModel.registerPasskey() },
                        variant: .primary,
                        size: .lg,
                        loading: authViewModel.passkeyManagementState == .registering
                    )
                    OmenButton(
                        title: "Not now",
                        action: { authViewModel.dismissPasskeyPairingOffer() },
                        variant: .secondary,
                        size: .lg
                    )
                    if case .failed(let message) = authViewModel.passkeyManagementState {
                        Text(message)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.Data.riskHigh)
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }
}
