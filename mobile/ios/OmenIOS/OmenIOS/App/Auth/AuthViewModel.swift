import Foundation

enum PasskeyManagementState: Equatable {
    case idle
    case loading
    case registering
    case deleting(String)
    case failed(String)
}

/// UI-facing glue: dispatches `AuthEvent`s through the pure `AuthFlowReducer` and performs the
/// corresponding repository/provider call. Focused orchestration tests cover provider
/// availability and the Apple happy path; the reducer, repository, and validators retain their
/// independent suites, matching how Android's Compose auth screens drive the same pair.
@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var flowState: AuthFlowState = .idle
    @Published var emailField: String = ""
    @Published var otpField: String = ""
    @Published private(set) var passkeys: [PasskeyInfo] = []
    @Published private(set) var passkeyManagementState: PasskeyManagementState = .idle
    @Published private(set) var showsPasskeyPairingOffer = false

    /// Seconds until another code can be requested. Zero means the resend is live.
    @Published private(set) var otpResendSecondsRemaining = 0
    /// Set once a resend has actually been accepted, so the UI can say so.
    @Published private(set) var otpResent = false
    /// A resend that failed. Kept separate from `flowState` on purpose: pushing this
    /// through the reducer would knock the user out of `awaitingOtp` and discard the
    /// code they may already be typing.
    @Published private(set) var otpResendError: String?

    private let repository: AuthRepository
    private let appleProvider: AppleIDTokenProviding
    private let oauthProvider: SupabaseOAuthProvider
    private let passkeyProvider: PasskeyProvider
    private let sessionManager: SessionManager
    private var otpCooldownTask: Task<Void, Never>?

    /// Long enough that a second request is a considered act rather than a reflex, and
    /// comfortably inside Supabase's own per-address rate limit — a user hammering resend
    /// would otherwise get themselves throttled and blame Omen for the silence.
    static let otpResendCooldownSeconds = 60

    init(
        repository: AuthRepository,
        appleProvider: AppleIDTokenProviding,
        oauthProvider: SupabaseOAuthProvider,
        passkeyProvider: PasskeyProvider,
        sessionManager: SessionManager
    ) {
        self.repository = repository
        self.appleProvider = appleProvider
        self.oauthProvider = oauthProvider
        self.passkeyProvider = passkeyProvider
        self.sessionManager = sessionManager
    }

    var appleSignInAvailable: Bool { appleProvider.isConfigured }
    var discordSignInAvailable: Bool { oauthProvider.isConfigured(providerId: "discord") }
    var passkeySignInAvailable: Bool { passkeyProvider.isSupported }

    func submitEmail() {
        dispatch(.emailSubmitted(email: emailField))
        guard case .requestingOtp(let email) = flowState else { return }
        otpResent = false
        otpResendError = nil
        Task {
            let outcome = await repository.requestEmailOtp(email: email)
            dispatch(.otpRequestResult(outcome: outcome))
            if case .otpSent = outcome { startOtpResendCooldown() }
        }
    }

    /// Requests another code for the address already in flight.
    ///
    /// The code-entry screen used to be a dead end. Supabase answering 200 means it
    /// **accepted the request**, not that the message reached an inbox — it can still
    /// bounce, be deferred by the receiving provider, land in spam, or be dropped for an
    /// address on a suppression list. A user whose code never arrived had nothing to press.
    ///
    /// Success deliberately does not touch `flowState`: the user is already on the code
    /// screen and may be mid-type, and re-entering `awaitingOtp` would clear their field.
    func resendOtp() {
        guard otpResendSecondsRemaining == 0 else { return }
        guard case .awaitingOtp(let email) = flowState else { return }

        otpResent = false
        otpResendError = nil
        startOtpResendCooldown()
        Task {
            switch await repository.requestEmailOtp(email: email) {
            case .otpSent:
                otpResent = true
            case .retryableError(let code):
                otpResendError = code.asAuthFailure.userMessage
                // Nothing was sent, so nothing is worth waiting for.
                cancelOtpResendCooldown()
            default:
                otpResendError = AuthFailure.unknown.userMessage
                cancelOtpResendCooldown()
            }
        }
    }

    private func startOtpResendCooldown() {
        otpCooldownTask?.cancel()
        otpResendSecondsRemaining = Self.otpResendCooldownSeconds
        otpCooldownTask = Task { [weak self] in
            while true {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if Task.isCancelled { return }
                guard let self else { return }
                if self.otpResendSecondsRemaining <= 1 {
                    self.otpResendSecondsRemaining = 0
                    return
                }
                self.otpResendSecondsRemaining -= 1
            }
        }
    }

    /// Lets a test exercise the resend without waiting 60 real seconds. The cooldown itself is
    /// asserted separately, so skipping it here does not skip covering it.
    func clearOtpResendCooldownForTesting() {
        cancelOtpResendCooldown()
    }

    private func cancelOtpResendCooldown() {
        otpCooldownTask?.cancel()
        otpCooldownTask = nil
        otpResendSecondsRemaining = 0
    }

    func submitOtp() {
        let code = OtpCodeValidator.normalize(otpField)
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

    func signInWithPasskey() {
        dispatch(.passkeyRequested)
        Task {
            let start = await repository.startPasskeyAuthentication()
            guard case .ready(let options) = start else {
                switch start {
                case .failed(let code):
                    dispatch(.passkeyExchangeResult(outcome: .retryableError(code: code)))
                case .needsReauth:
                    dispatch(.passkeyExchangeResult(outcome: .needsReauth))
                case .ready:
                    break
                }
                return
            }
            let result = await passkeyProvider.getAssertion(options: options)
            dispatch(.passkeyAssertionResult(result))
            guard case .assertion(let assertion) = result else { return }
            let outcome = await repository.signInWithPasskey(
                challengeID: options.challengeID,
                assertion: assertion
            )
            dispatch(.passkeyExchangeResult(outcome: outcome))
            authenticateSessionManagerIfNeeded(offerPasskeyPairing: false)
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
        passkeys = []
        passkeyManagementState = .idle
        showsPasskeyPairingOffer = false
        cancelOtpResendCooldown()
        otpResent = false
        otpResendError = nil
    }

    func loadPasskeys() {
        Task { await refreshPasskeys(offerIfEmpty: false) }
    }

    func registerPasskey() {
        passkeyManagementState = .registering
        Task {
            let start = await repository.startPasskeyRegistration()
            guard case .ready(let options) = start else {
                switch start {
                case .needsReauth:
                    passkeyManagementState = .failed("Sign in again before adding a passkey.")
                    sessionManager.onRefreshFailed()
                case .failed(let code):
                    passkeyManagementState = .failed(Self.passkeyManagementMessage(for: code))
                case .ready:
                    break
                }
                return
            }
            let result = await passkeyProvider.register(options: options)
            guard case .credential(let credential) = result else {
                switch result {
                case .canceled:
                    passkeyManagementState = .idle
                case .unavailable:
                    passkeyManagementState = .failed("Passkeys aren't available on this device.")
                case .failed:
                    passkeyManagementState = .failed("Passkey setup failed. Please retry.")
                case .credential:
                    break
                }
                return
            }
            let outcome = await repository.registerPasskey(
                challengeID: options.challengeID,
                credential: credential
            )
            guard case .success = outcome else {
                if case .needsReauth = outcome {
                    sessionManager.onRefreshFailed()
                    passkeyManagementState = .failed("Sign in again before adding a passkey.")
                } else {
                    passkeyManagementState = .failed("Passkey setup failed. Please retry.")
                }
                return
            }
            showsPasskeyPairingOffer = false
            await refreshPasskeys(offerIfEmpty: false)
        }
    }

    func deletePasskey(id: String) {
        passkeyManagementState = .deleting(id)
        Task {
            switch await repository.deletePasskey(id: id) {
            case .success:
                await refreshPasskeys(offerIfEmpty: false)
            case .needsReauth:
                passkeyManagementState = .failed("Sign in again before removing a passkey.")
                sessionManager.onRefreshFailed()
            case .failed:
                passkeyManagementState = .failed("Passkey removal failed. Please retry.")
            }
        }
    }

    func dismissPasskeyPairingOffer() {
        if let session = sessionManager.currentSession {
            sessionManager.dismissPasskeyPairing(for: session.userID)
        }
        showsPasskeyPairingOffer = false
    }

    private func authenticateSessionManagerIfNeeded(offerPasskeyPairing: Bool = true) {
        if case .authenticated(let session) = flowState {
            sessionManager.onAuthenticated(session)
            if offerPasskeyPairing, passkeyProvider.isSupported {
                Task { await refreshPasskeys(offerIfEmpty: true) }
            }
        }
    }

    private func refreshPasskeys(offerIfEmpty: Bool) async {
        passkeyManagementState = .loading
        switch await repository.listPasskeys() {
        case .success(let passkeys):
            self.passkeys = passkeys
            passkeyManagementState = .idle
            if
                offerIfEmpty,
                passkeys.isEmpty,
                let session = sessionManager.currentSession,
                !sessionManager.hasDismissedPasskeyPairing(for: session.userID)
            {
                showsPasskeyPairingOffer = true
            }
        case .needsReauth:
            passkeyManagementState = .failed("Sign in again to manage passkeys.")
        case .failed:
            passkeyManagementState = .failed("Passkeys couldn't be loaded. Please retry.")
        }
    }

    private func dispatch(_ event: AuthEvent) {
        flowState = AuthFlowReducer.reduce(state: flowState, event: event)
    }

    private static func passkeyManagementMessage(for code: RetryableCode) -> String {
        switch code {
        case .network: return "Check your connection and retry passkey setup."
        case .timeout: return "Passkey setup timed out. Please retry."
        case .server: return "Passkey setup is temporarily unavailable. Please retry."
        case .unknown: return "Passkey setup couldn't start. Please retry."
        }
    }
}
