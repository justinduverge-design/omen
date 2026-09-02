import Foundation

/// Mirrors Android `core/auth/AuthFlow.kt`'s `AuthFlowState`. Apple states replace Google states
/// (iOS's primary native mechanism is Apple, not Google) — same shape, different provider.
enum AuthFlowState: Equatable {
    case idle
    case requestingOtp(email: String)
    case awaitingOtp(email: String)
    case verifyingOtp(email: String)
    case launchingApple
    case exchangingAppleToken
    // M4-Auth-Providers-v1 §2.1 — provider-agnostic OAuth (e.g. Discord)
    case launchingOAuth(providerId: String)
    case exchangingOAuthCode(providerId: String)
    // M4-Auth-Providers-v1 §2.1 — WebAuthn passkeys (different technology from OAuth)
    case launchingPasskey
    case exchangingPasskeyAssertion
    case authenticated(session: Session)
    case failed(reason: AuthFailure)
}

/// Mirrors Android `core/auth/AuthFlow.kt`'s `AuthFailure`. Each case has a documented recovery
/// affordance in `AuthFailure.userMessage` — never a raw provider error string (M0c §8).
enum AuthFailure: Equatable {
    case invalidEmail
    case invalidCode
    case canceled
    case network
    case timeout
    case server
    case appleUnavailable
    case needsReauth
    // M4-Auth-Providers-v1 §2.3
    case oauthProviderNotConfigured
    case oauthCallbackMismatch
    case passkeyUnavailable
    case passkeyNoCredential
    case unknown
}

extension AuthFailure {
    /// Safe, opaque, user-facing copy. Never derived from a raw HTTP status or provider message.
    var userMessage: String {
        switch self {
        case .invalidEmail: return "Enter a valid email address."
        case .invalidCode: return "That code didn't match. Check your email and try again."
        case .canceled: return "Sign-in was canceled."
        case .network: return "No connection. Check your network and try again."
        case .timeout: return "That took too long. Try again."
        case .server: return "Omen is having trouble right now. Try again shortly."
        case .appleUnavailable: return "Sign in with Apple isn't available right now. Use email instead."
        case .needsReauth: return "Sign in again to continue."
        // M4-Auth-Providers-v1: placeholder copy per brief §10; slops-ux-copy tunes wording
        // after the mechanical seam works. Keeping strings functional so nothing is blank.
        case .oauthProviderNotConfigured: return "That sign-in option isn't available right now. Use another method."
        case .oauthCallbackMismatch: return "Sign-in couldn't be verified. Start again."
        case .passkeyUnavailable: return "Passkeys aren't available on this device. Use another method."
        case .passkeyNoCredential: return "No passkey found for this account on this device. Sign in another way to pair one."
        case .unknown: return "Something went wrong. Try again."
        }
    }
}

/// Mirrors Android `core/auth/AuthFlow.kt`'s `AuthEvent`.
enum AuthEvent {
    case emailSubmitted(email: String)
    case otpRequestResult(outcome: AuthOutcome)
    case otpSubmitted(code: String)
    case otpVerifyResult(outcome: AuthOutcome)
    case appleRequested
    case appleTokenResult(AppleIDTokenResult)
    case appleExchangeResult(outcome: AuthOutcome)
    // M4-Auth-Providers-v1 §2.2 — provider-agnostic OAuth (e.g. Discord)
    case oauthRequested(providerId: String)
    case oauthCallbackReceived(providerId: String, code: String, state: String)
    case oauthExchangeResult(providerId: String, outcome: AuthOutcome)
    // M4-Auth-Providers-v1 §2.2 — WebAuthn passkeys
    case passkeyRequested
    case passkeyAssertionResult(PasskeyResult)
    case passkeyExchangeResult(outcome: AuthOutcome)
    case canceled
    case reset
}

/// Mirrors Android `core/auth/AuthFlow.kt`'s `AuthFlowReducer`: a pure, exhaustive, side-effect
/// free state machine. No coroutines/async, no Foundation networking — just data in, data out —
/// so it is trivially unit-testable (see `AuthFlowReducerTests`).
enum AuthFlowReducer {
    static func reduce(state: AuthFlowState, event: AuthEvent) -> AuthFlowState {
        switch event {
        case .reset:
            return .idle

        case .canceled:
            return .failed(reason: .canceled)

        case .emailSubmitted(let email):
            guard EmailValidator.isValid(email) else {
                return .failed(reason: .invalidEmail)
            }
            return .requestingOtp(email: EmailValidator.normalize(email))

        case .otpRequestResult(let outcome):
            guard case .requestingOtp(let email) = state else { return state }
            return reduceOtpRequestResult(outcome, email: email)

        case .otpSubmitted(let code):
            guard case .awaitingOtp(let email) = state else { return state }
            guard OtpCodeValidator.isValid(code) else {
                return .failed(reason: .invalidCode)
            }
            return .verifyingOtp(email: email)

        case .otpVerifyResult(let outcome):
            guard case .verifyingOtp = state else { return state }
            return reduceCredentialOutcome(outcome, invalidCodeFailure: .invalidCode)

        case .appleRequested:
            return .launchingApple

        case .appleTokenResult(let result):
            guard case .launchingApple = state else { return state }
            switch result {
            case .token:
                return .exchangingAppleToken
            case .canceled:
                return .failed(reason: .canceled)
            case .unavailable:
                return .failed(reason: .appleUnavailable)
            case .failed:
                return .failed(reason: .unknown)
            }

        case .appleExchangeResult(let outcome):
            guard case .exchangingAppleToken = state else { return state }
            return reduceCredentialOutcome(outcome, invalidCodeFailure: .unknown)

        case .oauthRequested(let providerId):
            return .launchingOAuth(providerId: providerId)

        case .oauthCallbackReceived(let providerId, _, _):
            guard case .launchingOAuth(let launchingProviderId) = state else {
                return .failed(reason: .unknown)
            }
            guard launchingProviderId == providerId else {
                // Stray callback naming a different providerId while launching provider X is a
                // routing/CSRF anomaly, not a normal recoverable event.
                return .failed(reason: .oauthCallbackMismatch)
            }
            return .exchangingOAuthCode(providerId: providerId)

        case .oauthExchangeResult(_, let outcome):
            return reduceOAuthExchangeOutcome(outcome)

        case .passkeyRequested:
            return .launchingPasskey

        case .passkeyAssertionResult(let result):
            guard case .launchingPasskey = state else { return state }
            switch result {
            case .assertion:
                return .exchangingPasskeyAssertion
            case .canceled:
                return .failed(reason: .canceled)
            case .unavailable:
                return .failed(reason: .passkeyUnavailable)
            case .noCredential:
                return .failed(reason: .passkeyNoCredential)
            case .failed:
                return .failed(reason: .unknown)
            }

        case .passkeyExchangeResult(let outcome):
            return reduceCredentialOutcome(outcome, invalidCodeFailure: .unknown)
        }
    }

    private static func reduceOAuthExchangeOutcome(_ outcome: AuthOutcome) -> AuthFlowState {
        switch outcome {
        case .success(let session):
            return .authenticated(session: session)
        case .oauthCallbackMismatch:
            return .failed(reason: .oauthCallbackMismatch)
        case .oauthProviderNotConfigured:
            return .failed(reason: .oauthProviderNotConfigured)
        case .canceled:
            return .failed(reason: .canceled)
        case .retryableError(let code):
            return .failed(reason: code.asAuthFailure)
        case .needsReauth:
            return .failed(reason: .needsReauth)
        case .otpSent, .invalidCode, .unsupported:
            return .failed(reason: .unknown)
        }
    }

    private static func reduceOtpRequestResult(_ outcome: AuthOutcome, email: String) -> AuthFlowState {
        switch outcome {
        case .otpSent, .success:
            return .awaitingOtp(email: email)
        case .canceled:
            return .failed(reason: .canceled)
        case .retryableError(let code):
            return .failed(reason: code.asAuthFailure)
        case .invalidCode, .needsReauth, .unsupported,
             .oauthCallbackMismatch, .oauthProviderNotConfigured:
            return .failed(reason: .unknown)
        }
    }

    /// Shared by OTP verification, Apple token exchange, and passkey assertion exchange: all
    /// resolve a credential against the server and either land on `.authenticated` or a named
    /// `.failed` reason.
    private static func reduceCredentialOutcome(_ outcome: AuthOutcome, invalidCodeFailure: AuthFailure) -> AuthFlowState {
        switch outcome {
        case .success(let session):
            return .authenticated(session: session)
        case .invalidCode:
            return .failed(reason: invalidCodeFailure)
        case .canceled:
            return .failed(reason: .canceled)
        case .retryableError(let code):
            return .failed(reason: code.asAuthFailure)
        case .needsReauth:
            return .failed(reason: .needsReauth)
        case .otpSent, .unsupported,
             .oauthCallbackMismatch, .oauthProviderNotConfigured:
            return .failed(reason: .unknown)
        }
    }
}

/// Internal rather than fileprivate: the resend path in `AuthViewModel` surfaces its failure
/// beside the code field instead of through the reducer, so that a failed resend cannot knock
/// the user out of code entry and discard what they have typed. It still needs the same
/// mapping, and a second copy of it would be a second thing to keep in step.
extension RetryableCode {
    var asAuthFailure: AuthFailure {
        switch self {
        case .network: return .network
        case .timeout: return .timeout
        case .server: return .server
        case .unknown: return .unknown
        }
    }
}
