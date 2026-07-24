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
        TransportResult.Malformed, is TransportResult.Challenge -> AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
    }

    override suspend fun verifyEmailOtp(email: String, code: String): AuthOutcome =
        when (val r = transport.verifyEmailOtp(email, code)) {
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> if (r.status in 400..403) AuthOutcome.InvalidCode
                else AuthOutcome.RetryableError(r.status.toRetryable())
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed, is TransportResult.Challenge ->
                AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
        }

    override suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String): AuthOutcome =
        when (val r = transport.signInWithGoogleIdToken(idToken, rawNonce)) {
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> if (r.status in 400..403) AuthOutcome.Unsupported
                else AuthOutcome.RetryableError(r.status.toRetryable())
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed, is TransportResult.Challenge ->
                AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
        }

    override suspend fun refresh(): AuthOutcome {
        val refreshToken = store.load()?.refreshToken ?: return AuthOutcome.NeedsReauth
        return when (val r = transport.refresh(refreshToken)) {
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> AuthOutcome.NeedsReauth
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed, is TransportResult.Challenge -> AuthOutcome.NeedsReauth
        }
    }

    override suspend fun exchangeOAuthCode(
        providerId: String,
        code: String,
        codeVerifier: String,
    ): AuthOutcome = when (val r = transport.exchangeOAuthCode(providerId, code, codeVerifier)) {
        is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
        // 400 on OAuth exchange means either the code is stale/reused (mismatch) or the provider
        // isn't configured; Supabase distinguishes these only in the response body, which by
        // §M0c-8 the transport must not expose. Treat 400/403 as a callback-mismatch class error;
        // 404 means the provider isn't wired.
        is TransportResult.HttpError -> when (r.status) {
            in 400..403 -> AuthOutcome.OAuthCallbackMismatch
            404 -> AuthOutcome.OAuthProviderNotConfigured
            else -> AuthOutcome.RetryableError(r.status.toRetryable())
        }
        TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
        TransportResult.Ok, TransportResult.Malformed, is TransportResult.Challenge ->
            AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
    }

    override suspend fun startPasskeyChallenge(): PasskeyChallenge =
        when (val r = transport.startPasskeyChallenge()) {
            is TransportResult.Challenge -> PasskeyChallenge.Ok(r.challenge)
            is TransportResult.HttpError -> PasskeyChallenge.Failed(r.status.toRetryable())
            TransportResult.NetworkError -> PasskeyChallenge.Failed(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed, is TransportResult.SessionTokens ->
                PasskeyChallenge.Failed(RetryableCode.UNKNOWN)
        }

    override suspend fun signInWithPasskey(assertion: PasskeyResult.Assertion): AuthOutcome =
        when (val r = transport.verifyPasskeyAssertion(assertion)) {
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> AuthOutcome.RetryableError(r.status.toRetryable())
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Ok, TransportResult.Malformed, is TransportResult.Challenge ->
                AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
        }

    override suspend fun registerPasskey(credential: PasskeyResult.Assertion): AuthOutcome =
        when (val r = transport.registerPasskey(credential)) {
            // Registration returns 2xx-with-no-body on success; the app already has a session,
            // so we don't need new tokens here. Map to a no-op Success carrying the current one.
            is TransportResult.Ok -> store.load()?.let { AuthOutcome.Success(it) }
                ?: AuthOutcome.NeedsReauth
            is TransportResult.SessionTokens -> AuthOutcome.Success(r.toSession())
            is TransportResult.HttpError -> AuthOutcome.RetryableError(r.status.toRetryable())
            TransportResult.NetworkError -> AuthOutcome.RetryableError(RetryableCode.NETWORK)
            TransportResult.Malformed, is TransportResult.Challenge -> AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
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
