package com.slopssaloon.omen.core.auth

import com.slopssaloon.omen.core.session.SecureSessionStore
import com.slopssaloon.omen.core.session.Session

/**
 * Live [AuthRepository] backed by Supabase GoTrue via a [GoTrueTransport]. Maps transport
 * results to opaque [AuthOutcome]s; the app never sees a raw provider error (M0c §8).
 *
 * `nowEpochSeconds` is injected so token-expiry math is deterministic in unit tests.
 * `store` supplies the refresh token for [refresh]; persistence remains the SessionManager's job.
 */
class SupabaseAuthRepository(
    private val transport: GoTrueTransport,
    private val store: SecureSessionStore,
    private val nowEpochSeconds: () -> Long,
) : AuthRepository {

    override suspend fun requestEmailOtp(email: String): AuthOutcome = when (val r = transport.requestEmailOtp(email)) {
        is TransportResult.Ok, is TransportResult.SessionTokens -> AuthOutcome.OtpSent
        is TransportResult.HttpError -> AuthOutcome.RetryableError(r.status.toRetryable())
        TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
        TransportResult.Malformed -> AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
    }

    override suspend fun verifyEmailOtp(email: String, code: String): AuthOutcome =
        when (val r = transport.verifyEmailOtp(email, code)) {
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> if (r.status in 400..403) AuthOutcome.InvalidCode
                else AuthOutcome.RetryableError(r.status.toRetryable())
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed -> AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
        }

    override suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String): AuthOutcome =
        when (val r = transport.signInWithGoogleIdToken(idToken, rawNonce)) {
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> if (r.status in 400..403) AuthOutcome.Unsupported
                else AuthOutcome.RetryableError(r.status.toRetryable())
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed -> AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
        }

    override suspend fun refresh(): AuthOutcome {
        val refreshToken = store.load()?.refreshToken ?: return AuthOutcome.NeedsReauth
        return when (val r = transport.refresh(refreshToken)) {
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> AuthOutcome.NeedsReauth
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed -> AuthOutcome.NeedsReauth
        }
    }

    override suspend fun signOut() {
        // Best-effort remote sign-out is optional; local secure storage is cleared by SessionManager.
    }

    private fun TransportResult.SessionTokens.toSession() = Session(
        userId = userId,
        accessToken = accessToken,
        refreshToken = refreshToken,
        expiresAtEpochSeconds = nowEpochSeconds() + expiresInSeconds,
    )

    private fun Int.toRetryable(): RetryableCode = when {
        this == 408 || this == 504 -> RetryableCode.TIMEOUT
        this in 500..599 -> RetryableCode.SERVER
        else -> RetryableCode.UNKNOWN
    }
}
