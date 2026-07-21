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
                CommandCenterView(userID: userID, sessionManager: sessionManager)
            }
        }
        .task { sessionManager.restore() }
    }
}
