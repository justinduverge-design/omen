package com.slopssaloon.omen.core.auth

import com.slopssaloon.omen.core.session.Session

/**
 * Result of an auth operation. Errors are **opaque, safe categories** only (M0c §8): raw
 * provider text, tokens, or identifiers never reach this type. The UI maps each variant to a
 * named recovery action; it must not infer state from raw HTTP/provider errors.
 */
sealed interface AuthOutcome {
    /** Authentication succeeded; [session] is ready to persist to secure storage. */
    data class Success(val session: Session) : AuthOutcome

    /** OTP requested successfully; the app should move to code entry. */
    data object OtpSent : AuthOutcome

    /** User dismissed the credential sheet / browser. Normal, not an error (M0a §6). */
    data object Canceled : AuthOutcome

    /** The submitted OTP code was wrong or expired; user can re-enter or resend. */
    data object InvalidCode : AuthOutcome

    /** A prior session's refresh failed; user must sign in again. */
    data object NeedsReauth : AuthOutcome

    /** The requested mechanism is not configured/available on this build (e.g. no Google client ID). */
    data object Unsupported : AuthOutcome

    /** Transient failure (network/timeout/server). Safe to retry. Carries an opaque code only. */
    data class RetryableError(val code: RetryableCode) : AuthOutcome
}

/** Opaque, log-safe categories for a retryable failure. Never a raw provider message. */
enum class RetryableCode {
    NETWORK,
    TIMEOUT,
    SERVER,
    UNKNOWN,
}
