import Foundation

/// UI-facing glue: dispatches `AuthEvent`s through the pure `AuthFlowReducer` and performs the
/// corresponding repository/provider call. This is app-layer wiring (not tested directly — the
/// reducer, repository, and validators it composes are each tested independently), matching how
/// Android's Compose auth screens drive the same `AuthFlow`/`AuthRepository` pair.
@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var flowState: AuthFlowState = .idle
    @Published var emailField: String = ""
    @Published var otpField: String = ""

    private let repository: AuthRepository
    private let appleProvider: AppleIDTokenProviding
    private let oauthProvider: SupabaseOAuthProvider
    private let sessionManager: SessionManager

    init(
        repository: AuthRepository,
        appleProvider: AppleIDTokenProviding,
        oauthProvider: SupabaseOAuthProvider,
        sessionManager: SessionManager
    ) {
        self.repository = repository
        self.appleProvider = appleProvider
        self.oauthProvider = oauthProvider
        self.sessionManager = sessionManager
    }

    var appleSignInAvailable: Bool { appleProvider.isConfigured }
    var discordSignInAvailable: Bool { oauthProvider.isConfigured(providerId: "discord") }

    func submitEmail() {
        dispatch(.emailSubmitted(email: emailField))
        guard case .requestingOtp(let email) = flowState else { return }
        Task {
            let outcome = await repository.requestEmailOtp(email: email)
            dispatch(.otpRequestResult(outcome: outcome))
        }
    }

    func submitOtp() {
        let code = otpField
        dispatch(.otpSubmitted(code: code))
        guard case .verifyingOtp(let email) = flowState else { return }
        Task {
            let outcome = await repository.verifyEmailOtp(email: email, code: code)
            dispatch(.otpVerifyResult(outcome: outcome))
            authenticateSessionManagerIfNeeded()
        }
    }

    func signInWithApple() {
        dispatch(.appleRequested)
        Task {
            let rawNonce = SecureNonce.generate()
            let result = await appleProvider.getIDToken(rawNonce: rawNonce)
            dispatch(.appleTokenResult(result))
            guard case .token(let idToken, let nonce) = result else { return }
            let outcome = await repository.signInWithAppleIDToken(idToken: idToken, rawNonce: nonce)
            dispatch(.appleExchangeResult(outcome: outcome))
            authenticateSessionManagerIfNeeded()
        }
    }

    /// Kick off Discord (or any provider-agnostic OAuth) via `SupabaseOAuthProvider`. The
    /// deep-link callback lands in `OmenIOSApp` `.onOpenURL` and is fed to
    /// `handleOAuthCallback(_:)` below to complete the ceremony.
    func signInWithOAuth(providerId: String) {
        dispatch(.oauthRequested(providerId: providerId))
        Task {
            _ = await oauthProvider.launch(providerId: providerId)
            // Result is intentionally discarded — success is driven by the callback URL;
            // .notConfigured / .failed / .unavailable become terminal via the reducer only
            // if the callback never arrives, which the app-shell timeout handles.
        }
    }

    /// Called from `OmenIOSApp` `.onOpenURL` when a `com.slopssaloon.omen://auth/callback`
    /// deep link arrives. Validates state via the provider seam, then runs the code exchange.
    func handleOAuthCallback(_ url: URL) {
        guard let providerId = launchingProviderId else {
            // Callback arrived while we're not launching anything — surface as mismatch so a
            // stray link can't quietly succeed.
            dispatch(.oauthCallbackReceived(providerId: "unknown", code: url.queryValue("code") ?? "", state: url.queryValue("state") ?? ""))
            return
        }
        let parsed = oauthProvider.parseCallback(
            providerId: providerId,
            code: url.queryValue("code"),
            state: url.queryValue("state")
        )
        switch parsed {
        case .valid(let code, let codeVerifier):
            dispatch(.oauthCallbackReceived(providerId: providerId, code: code, state: url.queryValue("state") ?? ""))
            Task {
                let outcome = await repository.exchangeOAuthCode(providerId: providerId, code: code, codeVerifier: codeVerifier)
                dispatch(.oauthExchangeResult(providerId: providerId, outcome: outcome))
                authenticateSessionManagerIfNeeded()
            }
        case .mismatch, .malformed:
            dispatch(.oauthCallbackReceived(providerId: "unknown", code: url.queryValue("code") ?? "", state: url.queryValue("state") ?? ""))
        }
    }

    private var launchingProviderId: String? {
        if case .launchingOAuth(let providerId) = flowState { return providerId }
        return nil
    }

    func reset() {
        dispatch(.reset)
        emailField = ""
        otpField = ""
    }

    private func authenticateSessionManagerIfNeeded() {
        if case .authenticated(let session) = flowState {
            sessionManager.onAuthenticated(session)
        }
    }

    private func dispatch(_ event: AuthEvent) {
        flowState = AuthFlowReducer.reduce(state: flowState, event: event)
    }
}
