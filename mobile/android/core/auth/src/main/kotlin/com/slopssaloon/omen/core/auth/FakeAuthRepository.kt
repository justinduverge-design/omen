package com.slopssaloon.omen.core.auth

import com.slopssaloon.omen.core.session.Session

/**
 * Deterministic, network-free [AuthRepository] for JVM tests and the config-independent app
 * preview. It never contacts Supabase and never handles real credentials.
 *
 * Defaults model a happy path: any validly-formatted email accepts the code [validCode];
 * Google sign-in succeeds when [googleConfigured] is true. Individual outcomes can be overridden
 * to exercise cancel / retryable / needs-reauth / unsupported branches.
 */
class FakeAuthRepository(
    private val validCode: String = "123456",
    private val googleConfigured: Boolean = true,
    var requestOtpOutcome: AuthOutcome? = null,
    var verifyOtpOutcome: AuthOutcome? = null,
    var googleOutcome: AuthOutcome? = null,
    var refreshOutcome: AuthOutcome? = null,
) : AuthRepository {

    var signedOut: Boolean = false
        private set

    override suspend fun requestEmailOtp(email: String): AuthOutcome {
        requestOtpOutcome?.let { return it }
        return if (EmailValidator.isValid(email)) AuthOutcome.OtpSent
        else AuthOutcome.RetryableError(RetryableCode.UNKNOWN)
    }

    override suspend fun verifyEmailOtp(email: String, code: String): AuthOutcome {
        verifyOtpOutcome?.let { return it }
        return if (code == validCode) AuthOutcome.Success(fakeSession("email:${EmailValidator.normalize(email)}"))
        else AuthOutcome.InvalidCode
    }

    override suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String): AuthOutcome {
        googleOutcome?.let { return it }
        return if (googleConfigured) AuthOutcome.Success(fakeSession("google:$idToken"))
        else AuthOutcome.Unsupported
    }

    override suspend fun refresh(): AuthOutcome = refreshOutcome ?: AuthOutcome.NeedsReauth

    override suspend fun signOut() { signedOut = true }

    private fun fakeSession(userId: String) = Session(
        userId = userId,
        accessToken = "fake-access",
        refreshToken = "fake-refresh",
        expiresAtEpochSeconds = Long.MAX_VALUE,
    )
}
