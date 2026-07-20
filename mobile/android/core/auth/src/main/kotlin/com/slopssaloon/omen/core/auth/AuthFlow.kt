package com.slopssaloon.omen.core.auth

import com.slopssaloon.omen.core.session.Session

/**
 * Transient sign-in flow state (distinct from the persistent
 * [com.slopssaloon.omen.core.session.SessionState]). Every non-success state has a named,
 * safe next action so no screen shows a generic endless "Loading…" (M0a §6/§7, governance §5).
 *
 * The reducer ([AuthFlowReducer.reduce]) is pure — no coroutines, no Android, no network — so
 * the whole flow is exhaustively unit-testable. Side effects (calling [AuthRepository],
 * launching Credential Manager) are performed by the caller in response to the *entered* state.
 */
sealed interface AuthFlowState {
    /** Nothing in progress; the account/auth entry surface is shown. */
    data object Idle : AuthFlowState

    /** Requesting an OTP for [email]; caller invokes `requestEmailOtp`. */
    data class RequestingOtp(val email: String) : AuthFlowState

    /** OTP delivered; awaiting the user's 6-digit code for [email]. */
    data class AwaitingOtp(val email: String) : AuthFlowState

    /** Verifying the entered code; caller invokes `verifyEmailOtp`. */
    data class VerifyingOtp(val email: String) : AuthFlowState

    /** Credential Manager sheet in progress; caller invokes the Google provider. */
    data object LaunchingGoogle : AuthFlowState

    /** Exchanging a Google ID token for a session; caller invokes `signInWithGoogleIdToken`. */
    data object ExchangingGoogleToken : AuthFlowState

    /** Terminal success — caller persists [session] via the session manager. */
    data class Authenticated(val session: Session) : AuthFlowState

    /** A recoverable stop with a named [reason]; the UI offers the matching next action. */
    data class Failed(val reason: AuthFailure) : AuthFlowState
}

/** Named, log-safe failure reasons that each map to a concrete recovery affordance. */
enum class AuthFailure {
    INVALID_EMAIL,     // → correct the email
    INVALID_CODE,      // → re-enter or resend the code
    CANCELED,          // → return to Idle; not a hard error
    NETWORK,           // → retry
    TIMEOUT,           // → retry
    SERVER,            // → retry / try another method
    GOOGLE_UNAVAILABLE,// → use email instead
    NEEDS_REAUTH,      // → sign in again
    UNKNOWN,           // → retry / support without credentials
}

sealed interface AuthEvent {
    data class EmailSubmitted(val email: String) : AuthEvent
    data class OtpRequestResult(val outcome: AuthOutcome) : AuthEvent
    data class OtpSubmitted(val code: String) : AuthEvent
    data class OtpVerifyResult(val outcome: AuthOutcome) : AuthEvent
    data object GoogleRequested : AuthEvent
    data class GoogleTokenResult(val result: GoogleIdTokenResult) : AuthEvent
    data class GoogleExchangeResult(val outcome: AuthOutcome) : AuthEvent
    data object Canceled : AuthEvent
    data object Reset : AuthEvent
}

object AuthFlowReducer {

    fun reduce(state: AuthFlowState, event: AuthEvent): AuthFlowState = when (event) {
        is AuthEvent.Reset -> AuthFlowState.Idle
        is AuthEvent.Canceled -> AuthFlowState.Failed(AuthFailure.CANCELED)

        is AuthEvent.EmailSubmitted ->
            if (EmailValidator.isValid(event.email)) AuthFlowState.RequestingOtp(EmailValidator.normalize(event.email))
            else AuthFlowState.Failed(AuthFailure.INVALID_EMAIL)

        is AuthEvent.OtpRequestResult -> when (val o = event.outcome) {
            is AuthOutcome.OtpSent -> (state as? AuthFlowState.RequestingOtp)
                ?.let { AuthFlowState.AwaitingOtp(it.email) } ?: AuthFlowState.Failed(AuthFailure.UNKNOWN)
            is AuthOutcome.RetryableError -> AuthFlowState.Failed(o.code.toFailure())
            else -> AuthFlowState.Failed(AuthFailure.UNKNOWN)
        }

        is AuthEvent.OtpSubmitted -> when (state) {
            is AuthFlowState.AwaitingOtp ->
                if (OtpCodeValidator.isValid(event.code)) AuthFlowState.VerifyingOtp(state.email)
                else AuthFlowState.Failed(AuthFailure.INVALID_CODE)
            else -> AuthFlowState.Failed(AuthFailure.UNKNOWN)
        }

        is AuthEvent.OtpVerifyResult -> when (val o = event.outcome) {
            is AuthOutcome.Success -> AuthFlowState.Authenticated(o.session)
            is AuthOutcome.InvalidCode -> AuthFlowState.Failed(AuthFailure.INVALID_CODE)
            is AuthOutcome.RetryableError -> AuthFlowState.Failed(o.code.toFailure())
            is AuthOutcome.NeedsReauth -> AuthFlowState.Failed(AuthFailure.NEEDS_REAUTH)
            else -> AuthFlowState.Failed(AuthFailure.UNKNOWN)
        }

        is AuthEvent.GoogleRequested -> AuthFlowState.LaunchingGoogle

        is AuthEvent.GoogleTokenResult -> when (event.result) {
            is GoogleIdTokenResult.Token -> AuthFlowState.ExchangingGoogleToken
            is GoogleIdTokenResult.Canceled -> AuthFlowState.Failed(AuthFailure.CANCELED)
            is GoogleIdTokenResult.Unavailable -> AuthFlowState.Failed(AuthFailure.GOOGLE_UNAVAILABLE)
            is GoogleIdTokenResult.Failed -> AuthFlowState.Failed(AuthFailure.UNKNOWN)
        }

        is AuthEvent.GoogleExchangeResult -> when (val o = event.outcome) {
            is AuthOutcome.Success -> AuthFlowState.Authenticated(o.session)
            is AuthOutcome.Unsupported -> AuthFlowState.Failed(AuthFailure.GOOGLE_UNAVAILABLE)
            is AuthOutcome.RetryableError -> AuthFlowState.Failed(o.code.toFailure())
            is AuthOutcome.NeedsReauth -> AuthFlowState.Failed(AuthFailure.NEEDS_REAUTH)
            else -> AuthFlowState.Failed(AuthFailure.UNKNOWN)
        }
    }

    private fun RetryableCode.toFailure(): AuthFailure = when (this) {
        RetryableCode.NETWORK -> AuthFailure.NETWORK
        RetryableCode.TIMEOUT -> AuthFailure.TIMEOUT
        RetryableCode.SERVER -> AuthFailure.SERVER
        RetryableCode.UNKNOWN -> AuthFailure.UNKNOWN
    }
}
