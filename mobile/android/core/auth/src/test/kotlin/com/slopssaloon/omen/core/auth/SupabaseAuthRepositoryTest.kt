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
        var oauth: TransportResult = TransportResult.SessionTokens("u1", "a", "r", 3600),
        var passkeyChallenge: TransportResult = TransportResult.Challenge("fake-challenge"),
        var passkeyVerify: TransportResult = TransportResult.SessionTokens("u1", "a", "r", 3600),
        var passkeyRegister: TransportResult = TransportResult.Ok,
    ) : GoTrueTransport {
        override suspend fun requestEmailOtp(email: String) = otp
        override suspend fun verifyEmailOtp(email: String, code: String) = verify
        override suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String) = google
        override suspend fun refresh(refreshToken: String) = refreshResult
        override suspend fun exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) = oauth
        override suspend fun startPasskeyChallenge() = passkeyChallenge
        override suspend fun verifyPasskeyAssertion(assertion: PasskeyResult.Assertion) = passkeyVerify
        override suspend fun registerPasskey(credential: PasskeyResult.Assertion) = passkeyRegister
    }

    private val fakeAssertion = PasskeyResult.Assertion(
        credentialId = "cred-1",
        clientDataJson = "cdj",
        authenticatorData = "auth",
        signature = "sig",
        userHandle = "u1",
    )

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

    // M4-Auth-Providers-v1 §6.2 — OAuth repository

    @Test fun oauthExchangeHappyPathReturnsSession() = runTest {
        val out = repo(FakeTransport()).exchangeOAuthCode("discord", code = "c", codeVerifier = "v")
        assertIs<AuthOutcome.Success>(out)
    }

    @Test fun oauthExchange400MapsToCallbackMismatch() = runTest {
        val out = repo(FakeTransport(oauth = TransportResult.HttpError(400)))
            .exchangeOAuthCode("discord", code = "c", codeVerifier = "v")
        assertIs<AuthOutcome.OAuthCallbackMismatch>(out)
    }

    @Test fun oauthExchange404MapsToProviderNotConfigured() = runTest {
        val out = repo(FakeTransport(oauth = TransportResult.HttpError(404)))
            .exchangeOAuthCode("discord", code = "c", codeVerifier = "v")
        assertIs<AuthOutcome.OAuthProviderNotConfigured>(out)
    }

    @Test fun oauthExchangeServerErrorIsRetryableServer() = runTest {
        val out = repo(FakeTransport(oauth = TransportResult.HttpError(503)))
            .exchangeOAuthCode("discord", code = "c", codeVerifier = "v")
        assertEquals(AuthOutcome.RetryableError(RetryableCode.SERVER), out)
    }

    // M4-Auth-Providers-v1 §6.2 — Passkey repository

    @Test fun passkeyChallengeOkCarriesChallenge() = runTest {
        val out = repo(FakeTransport()).startPasskeyChallenge()
        val ok = assertIs<PasskeyChallenge.Ok>(out)
        assertEquals("fake-challenge", ok.challenge)
    }

    @Test fun passkeyChallengeNetworkErrorMapsToRetryableNetwork() = runTest {
        val out = repo(FakeTransport(passkeyChallenge = TransportResult.NetworkError)).startPasskeyChallenge()
        assertEquals(PasskeyChallenge.Failed(RetryableCode.NETWORK), out)
    }

    @Test fun passkeyVerifyHappyPathReturnsSession() = runTest {
        val out = repo(FakeTransport()).signInWithPasskey(fakeAssertion)
        assertIs<AuthOutcome.Success>(out)
    }

    @Test fun passkeyRegisterOkOnActiveSessionReturnsExistingSession() = runTest {
        val existing = Session("u1", "a", "r", 500L)
        val out = repo(FakeTransport(), store = InMemorySecureSessionStore(existing)).registerPasskey(fakeAssertion)
        val s = assertIs<AuthOutcome.Success>(out)
        assertEquals(existing, s.session)
    }

    @Test fun passkeyRegisterOkWithoutSessionNeedsReauth() = runTest {
        val out = repo(FakeTransport()).registerPasskey(fakeAssertion)
        assertIs<AuthOutcome.NeedsReauth>(out)
    }
}
