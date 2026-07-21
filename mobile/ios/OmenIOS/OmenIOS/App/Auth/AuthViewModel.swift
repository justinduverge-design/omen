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
    private let sessionManager: SessionManager

    init(repository: AuthRepository, appleProvider: AppleIDTokenProviding, sessionManager: SessionManager) {
        self.repository = repository
        self.appleProvider = appleProvider
        self.sessionManager = sessionManager
    }

    var appleSignInAvailable: Bool { appleProvider.isConfigured }

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
