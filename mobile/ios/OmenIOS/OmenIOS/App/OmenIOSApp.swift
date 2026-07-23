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
        if environment.supabaseConfigured, let supabaseURL = environment.supabaseURL, let anonKey = environment.supabaseAnonKey {
            let transport = URLSessionGoTrueTransport(supabaseURL: supabaseURL, anonKey: anonKey)
            repository = SupabaseAuthRepository(transport: transport, sessionStore: sessionStore)
            appleProvider = NativeAppleIDTokenProvider()
        } else {
            // No Supabase config for this build (e.g. local/demo) — fall back to a network-free
            // fake rather than silently claiming a live auth path that can't work.
            repository = FakeAuthRepository()
            appleProvider = UnconfiguredAppleIDTokenProvider()
        }

        _authViewModel = StateObject(wrappedValue: AuthViewModel(
            repository: repository,
            appleProvider: appleProvider,
            sessionManager: manager
        ))
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
            }
        }
    }
}
