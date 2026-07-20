package com.slopssaloon.omen.core.auth

import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class SupabaseAuthRepositoryTest {

    private class FakeTransport(
        var otp: TransportResult = TransportResult.Ok,
        var verify: TransportResult = TransportResult.SessionTokens("u1", "a", "r", 3600),
        var google: TransportResult = TransportResult.SessionTokens("u1", "a", "r", 3600),
        var refreshResult: TransportResult = TransportResult.SessionTokens("u1", "a2", "r2", 3600),
    ) : GoTrueTransport {
        override suspend fun requestEmailOtp(email: String) = otp
        override suspend fun verifyEmailOtp(email: String, code: String) = verify
        override suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String) = google
        override suspend fun refresh(refreshToken: String) = refreshResult
    }

    private fun repo(
        transport: GoTrueTransport,
        store: InMemorySecureSessionStore = InMemorySecureSessionStore(),
        now: Long = 1_000L,
    ) = SupabaseAuthRepository(transport, store) { now }

    @Test fun otpOkMapsToOtpSent() = runTest {
        assertIs<AuthOutcome.OtpSent>(repo(FakeTransport(otp = TransportResult.Ok)).requestEmailOtp("fan@example.com"))
    }

    @Test fun otpNetworkErrorIsRetryableNetwork() = runTest {
        val out = repo(FakeTransport(otp = TransportResult.NetworkError)).requestEmailOtp("fan@example.com")
        assertEquals(AuthOutcome.RetryableError(RetryableCode.NETWORK), out)
    }

    @Test fun verifySessionComputesExpiryFromClock() = runTest {
        val out = repo(FakeTransport(verify = TransportResult.SessionTokens("u1", "a", "r", 3600)), now = 1_000L)
            .verifyEmailOtp("fan@example.com", "123456")
        val s = assertIs<AuthOutcome.Success>(out)
        assertEquals(4_600L, s.session.expiresAtEpochSeconds)
    }

    @Test fun verifyBadCodeStatusMapsToInvalidCode() = runTest {
        val out = repo(FakeTransport(verify = TransportResult.HttpError(400))).verifyEmailOtp("fan@example.com", "000000")
        assertIs<AuthOutcome.InvalidCode>(out)
    }

    @Test fun verifyServerErrorIsRetryableServer() = runTest {
        val out = repo(FakeTransport(verify = TransportResult.HttpError(503))).verifyEmailOtp("fan@example.com", "123456")
        assertEquals(AuthOutcome.RetryableError(RetryableCode.SERVER), out)
    }

    @Test fun googleClientErrorIsUnsupported() = runTest {
        val out = repo(FakeTransport(google = TransportResult.HttpError(401))).signInWithGoogleIdToken("idt", "nonce")
        assertIs<AuthOutcome.Unsupported>(out)
    }

    @Test fun refreshWithoutStoredTokenNeedsReauth() = runTest {
        val out = repo(FakeTransport(), store = InMemorySecureSessionStore()).refresh()
        assertIs<AuthOutcome.NeedsReauth>(out)
    }

    @Test fun refreshWithStoredTokenSucceeds() = runTest {
        val store = InMemorySecureSessionStore(Session("u1", "a", "r", 500L))
        val out = repo(FakeTransport(), store = store).refresh()
        assertIs<AuthOutcome.Success>(out)
    }

    @Test fun refreshHttpErrorNeedsReauth() = runTest {
        val store = InMemorySecureSessionStore(Session("u1", "a", "r", 500L))
        val out = repo(FakeTransport(refreshResult = TransportResult.HttpError(401)), store = store).refresh()
        assertIs<AuthOutcome.NeedsReauth>(out)
    }
}
