import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

struct AppShellView: View {
    @EnvironmentObject private var sessionManager: SessionManager
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.omenEnvironment) private var environment
    @StateObject private var updateGate: UpdateGateViewModel
    @State private var showSignIn = false

    init() {
        // Reads `environment` fresh here rather than via `@Environment` — the gate client
        // needs the base URL before the view's environment is fully wired for `init`.
        _updateGate = StateObject(
            wrappedValue: UpdateGateViewModel(
                client: MinVersionGateClient(baseURL: AppEnvironment.fromBundle.apiBaseURL)
            )
        )
    }

    var body: some View {
        Group {
            if case .blocked(let minimumVersion) = updateGate.state {
                ForcedUpdateView(
                    minimumVersion: minimumVersion,
                    storeURL: environment.appStoreURL
                ) {
                    if let url = environment.appStoreURL {
                        #if canImport(UIKit)
                        UIApplication.shared.open(url)
                        #endif
                    }
                }
            } else {
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
                // M5 slice B: the dashboard repository is constructed here from the same
                // public `apiBaseURL` the account repository already uses. No secret is
                // involved — `AppEnvironment` holds public config only.
                CommandCenterView(
                    userID: userID,
                    sessionManager: sessionManager,
                    authViewModel: authViewModel,
                    dashboardRepository: ApiDashboardRepository(
                        client: OmenApiClient(baseURL: environment.apiBaseURL)
                    ),
                    leagueRepository: ApiLeagueRepository(
                        client: OmenApiClient(baseURL: environment.apiBaseURL)
                    ),
                    movesRepository: ApiMovesRepository(
                        client: OmenApiClient(baseURL: environment.apiBaseURL)
                    ),
                    omenDecisionRepository: ApiOmenDecisionRepository(
                        client: OmenApiClient(baseURL: environment.apiBaseURL)
                    ),
                    connectRepository: ApiConnectRepository(
                        client: OmenApiClient(baseURL: environment.apiBaseURL)
                    ),
                    leagueDirectoryRepository: ApiLeagueDirectoryRepository(
                        client: OmenApiClient(baseURL: environment.apiBaseURL)
                    )
                )
                }
            }
        }
        .task { sessionManager.restore() }
        .task { await updateGate.check() }
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
