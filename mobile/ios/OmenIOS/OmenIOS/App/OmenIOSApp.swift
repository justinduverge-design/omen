import SwiftUI

@main
struct OmenIOSApp: App {
    @StateObject private var sessionManager: SessionManager
    @StateObject private var authViewModel: AuthViewModel

    init() {
        let environment = AppEnvironment.fromBundle
        let sessionStore: SecureSessionStore = KeychainSessionStore()
        let manager = SessionManager(store: sessionStore)
        _sessionManager = StateObject(wrappedValue: manager)

        let repository: AuthRepository
        let appleProvider: AppleIDTokenProviding
        let oauthProvider: SupabaseOAuthProvider
        let passkeyProvider: PasskeyProvider
        if environment.supabaseConfigured, let supabaseURL = environment.supabaseURL, let anonKey = environment.supabaseAnonKey {
            let transport = URLSessionGoTrueTransport(supabaseURL: supabaseURL, anonKey: anonKey)
            repository = SupabaseAuthRepository(transport: transport, sessionStore: sessionStore)
            appleProvider = NativeAppleIDTokenProvider()
            oauthProvider = ASWebAuthenticationOAuthProvider(supabaseURL: supabaseURL)
            passkeyProvider = NativePasskeyProvider()
        } else {
            // No Supabase config for this build (e.g. local/demo) — fall back to a network-free
            // fake rather than silently claiming a live auth path that can't work.
            repository = FakeAuthRepository()
            appleProvider = UnconfiguredAppleIDTokenProvider()
            oauthProvider = UnconfiguredSupabaseOAuthProvider()
            passkeyProvider = UnsupportedPasskeyProvider()
        }

        let viewModel = AuthViewModel(
            repository: repository,
            appleProvider: appleProvider,
            oauthProvider: oauthProvider,
            passkeyProvider: passkeyProvider,
            sessionManager: manager
        )
        if let nativeOAuthProvider = oauthProvider as? ASWebAuthenticationOAuthProvider {
            nativeOAuthProvider.callbackHandler = { [weak viewModel] url in
                viewModel?.handleOAuthCallback(url)
            }
        }
        _authViewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some Scene {
        WindowGroup {
            // Screenshot short-circuit — when the native-visual-evidence CI workflow
            // launches with `-OMEN_SCREENSHOT_SCENARIO <slug>` or the env-var equivalent,
            // mount only the requested scenario. No session, no network. Unknown or
            // missing key falls through to the normal production shell. Cannot be
            // triggered by an end user — no UI surface exposes this launch argument.
            if let scenarioKey = ScreenshotScenarios.active(
                from: ProcessInfo.processInfo.environment,
                arguments: ProcessInfo.processInfo.arguments
            ), ScreenshotScenarios.isKnown(scenarioKey) {
                ScreenshotScenarioHost(scenarioKey: scenarioKey)
            } else {
                AppShellView()
                    .environmentObject(sessionManager)
                    .environmentObject(authViewModel)
                    .environment(\.omenEnvironment, .fromBundle)
                    // M4-Auth-Providers-v1: Supabase → Discord → Supabase → deep-link callback
                    // returns here. Feed the URL to the view model to complete the OAuth
                    // ceremony (validate CSRF state, exchange PKCE code for session).
                    .onOpenURL { url in
                        guard url.scheme == "com.slopssaloon.omen", url.host == "auth" else { return }
                        authViewModel.handleOAuthCallback(url)
                    }
            }
        }
    }
}
