package com.slopssaloon.omen.app.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.auth.AuthFailure
import com.slopssaloon.omen.core.auth.AuthOutcome
import com.slopssaloon.omen.core.auth.asAuthFailure
import kotlinx.coroutines.delay

/**
 * The "code didn't arrive" half of email sign-in. iOS mirror: the resend members on
 * `AuthViewModel`.
 *
 * The code-entry screen used to end at "Verify code". Supabase answering 200 to an OTP request
 * means it **accepted the request** — not that the message reached an inbox. It can still
 * bounce, be deferred by the receiving provider, land in spam, or be dropped for an address on
 * a suppression list. A beta user whose code never arrived had nothing to press and nothing to
 * read, so they simply stopped.
 *
 * Failures are held here rather than dispatched through `AuthFlowReducer` on purpose: a reduced
 * failure knocks the user out of `AwaitingOtp` and discards the code they may be mid-way
 * through typing.
 *
 * `sleep` is injected so the countdown is testable without spending 60 real seconds.
 */
class OtpResendController(
    private val sleep: suspend (Long) -> Unit = { delay(it) },
) {
    /** Seconds until another code can be requested. Zero means the resend is live. */
    var secondsRemaining by mutableIntStateOf(0)
        private set

    /** True once a resend has actually been accepted, so the UI can say so. */
    var resent by mutableStateOf(false)
        private set

    /** A resend that failed, in the same safe, opaque copy the reducer would have used. */
    var error by mutableStateOf<String?>(null)
        private set

    val canResend: Boolean get() = secondsRemaining == 0

    /**
     * Begins the wait after a code has genuinely been sent.
     *
     * Suspends for the duration of the countdown, so the caller launches it rather than
     * awaiting it. The cooldown is not decoration: hammering resend gets the address throttled
     * by Supabase, and the user then blames Omen for the silence it caused.
     */
    suspend fun startCooldown() {
        secondsRemaining = COOLDOWN_SECONDS
        while (secondsRemaining > 0) {
            sleep(1000)
            secondsRemaining -= 1
        }
    }

    /** Clears any wait — used when nothing was actually sent, so there is nothing to wait for. */
    fun releaseCooldown() {
        secondsRemaining = 0
    }

    fun reset() {
        secondsRemaining = 0
        resent = false
        error = null
    }

    /**
     * Requests another code for [email] via [request], recording the outcome for the UI.
     * Returns true when the code was accepted, so the caller knows whether to run the cooldown.
     */
    suspend fun resend(email: String, request: suspend (String) -> AuthOutcome): Boolean {
        if (!canResend) return false
        resent = false
        error = null

        return when (val outcome = request(email)) {
            is AuthOutcome.OtpSent -> {
                resent = true
                true
            }
            is AuthOutcome.RetryableError -> {
                error = authFailureMessage(outcome.code.asAuthFailure())
                false
            }
            else -> {
                error = authFailureMessage(AuthFailure.UNKNOWN)
                false
            }
        }
    }

    companion object {
        /**
         * Long enough that a second request is a considered act rather than a reflex, and
         * comfortably inside Supabase's own per-address rate limit.
         */
        const val COOLDOWN_SECONDS = 60
    }
}
