package com.slopssaloon.omen.core.auth

import com.slopssaloon.omen.core.session.Session
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class AuthFlowReducerTest {

    private fun reduce(state: AuthFlowState, event: AuthEvent) = AuthFlowReducer.reduce(state, event)

    private val session = Session("u1", "a", "r", Long.MAX_VALUE)

    @Test fun emailHappyPathReachesAuthenticated() {
        var s: AuthFlowState = AuthFlowState.Idle
        s = reduce(s, AuthEvent.EmailSubmitted("Fan@Example.com"))
        assertEquals(AuthFlowState.RequestingOtp("fan@example.com"), s)
        s = reduce(s, AuthEvent.OtpRequestResult(AuthOutcome.OtpSent))
        assertEquals(AuthFlowState.AwaitingOtp("fan@example.com"), s)
        s = reduce(s, AuthEvent.OtpSubmitted("123456"))
        assertEquals(AuthFlowState.VerifyingOtp("fan@example.com"), s)
        s = reduce(s, AuthEvent.OtpVerifyResult(AuthOutcome.Success(session)))
        assertEquals(AuthFlowState.Authenticated(session), s)
    }

    @Test fun invalidEmailFailsFast() {
        assertEquals(
            AuthFlowState.Failed(AuthFailure.INVALID_EMAIL),
            reduce(AuthFlowState.Idle, AuthEvent.EmailSubmitted("nope")),
        )
    }

    @Test fun invalidCodeShapeIsRejectedBeforeVerify() {
        val awaiting = AuthFlowState.AwaitingOtp("fan@example.com")
        assertEquals(AuthFlowState.Failed(AuthFailure.INVALID_CODE), reduce(awaiting, AuthEvent.OtpSubmitted("12")))
    }

    @Test fun wrongCodeFromServerIsInvalidCode() {
        val verifying = AuthFlowState.VerifyingOtp("fan@example.com")
        assertEquals(
            AuthFlowState.Failed(AuthFailure.INVALID_CODE),
            reduce(verifying, AuthEvent.OtpVerifyResult(AuthOutcome.InvalidCode)),
        )
    }

    @Test fun retryableOtpRequestMapsToNamedFailure() {
        val requesting = AuthFlowState.RequestingOtp("fan@example.com")
        assertEquals(
            AuthFlowState.Failed(AuthFailure.NETWORK),
            reduce(requesting, AuthEvent.OtpRequestResult(AuthOutcome.RetryableError(RetryableCode.NETWORK))),
        )
    }

    @Test fun googleHappyPath() {
        var s: AuthFlowState = reduce(AuthFlowState.Idle, AuthEvent.GoogleRequested)
        assertEquals(AuthFlowState.LaunchingGoogle, s)
        s = reduce(s, AuthEvent.GoogleTokenResult(GoogleIdTokenResult.Token("idt", "nonce")))
        assertEquals(AuthFlowState.ExchangingGoogleToken, s)
        s = reduce(s, AuthEvent.GoogleExchangeResult(AuthOutcome.Success(session)))
        assertIs<AuthFlowState.Authenticated>(s)
    }

    @Test fun googleUnavailableGuidesToEmail() {
        val launching = AuthFlowState.LaunchingGoogle
        assertEquals(
            AuthFlowState.Failed(AuthFailure.GOOGLE_UNAVAILABLE),
            reduce(launching, AuthEvent.GoogleTokenResult(GoogleIdTokenResult.Unavailable)),
        )
    }

    @Test fun cancellationIsNamedNotFatal() {
        assertEquals(
            AuthFlowState.Failed(AuthFailure.CANCELED),
            reduce(AuthFlowState.LaunchingGoogle, AuthEvent.GoogleTokenResult(GoogleIdTokenResult.Canceled)),
        )
    }

    @Test fun resetReturnsToIdle() {
        assertEquals(AuthFlowState.Idle, reduce(AuthFlowState.Failed(AuthFailure.NETWORK), AuthEvent.Reset))
    }

    // M4-Auth-Providers-v1 §6.1 — OAuth reducer

    @Test fun oauthRequestedEntersLaunching() {
        assertEquals(
            AuthFlowState.LaunchingOAuth("discord"),
            reduce(AuthFlowState.Idle, AuthEvent.OAuthRequested("discord")),
        )
    }

    @Test fun oauthCallbackReceivedEntersExchange() {
        val launching = AuthFlowState.LaunchingOAuth("discord")
        assertEquals(
            AuthFlowState.ExchangingOAuthCode("discord"),
            reduce(launching, AuthEvent.OAuthCallbackReceived("discord", code = "c", state = "s")),
        )
    }

    @Test fun oauthCallbackProviderMismatchIsRejected() {
        val launching = AuthFlowState.LaunchingOAuth("discord")
        // A stray callback claiming a different providerId while launching Discord must not
        // silently proceed; the reducer routes to a named failure so the UI can recover.
        assertEquals(
            AuthFlowState.Failed(AuthFailure.OAUTH_CALLBACK_MISMATCH),
            reduce(launching, AuthEvent.OAuthCallbackReceived("github", code = "c", state = "s")),
        )
    }

    @Test fun oauthExchangeSuccessAuthenticates() {
        val exchanging = AuthFlowState.ExchangingOAuthCode("discord")
        val s = reduce(exchanging, AuthEvent.OAuthExchangeResult("discord", AuthOutcome.Success(session)))
        assertIs<AuthFlowState.Authenticated>(s)
    }

    @Test fun oauthCallbackMismatchFromExchangeMapsToNamedFailure() {
        val exchanging = AuthFlowState.ExchangingOAuthCode("discord")
        assertEquals(
            AuthFlowState.Failed(AuthFailure.OAUTH_CALLBACK_MISMATCH),
            reduce(exchanging, AuthEvent.OAuthExchangeResult("discord", AuthOutcome.OAuthCallbackMismatch)),
        )
    }

    @Test fun oauthProviderNotConfiguredMapsToNamedFailure() {
        val launching = AuthFlowState.LaunchingOAuth("discord")
        assertEquals(
            AuthFlowState.Failed(AuthFailure.OAUTH_PROVIDER_NOT_CONFIGURED),
            reduce(launching, AuthEvent.OAuthExchangeResult("discord", AuthOutcome.OAuthProviderNotConfigured)),
        )
    }

    @Test fun oauthRetryableExchangeErrorMapsToNamedFailure() {
        val exchanging = AuthFlowState.ExchangingOAuthCode("discord")
        assertEquals(
            AuthFlowState.Failed(AuthFailure.NETWORK),
            reduce(
                exchanging,
                AuthEvent.OAuthExchangeResult("discord", AuthOutcome.RetryableError(RetryableCode.NETWORK)),
            ),
        )
    }

    // M4-Auth-Providers-v1 §6.1 — Passkey reducer

    @Test fun passkeyRequestedEntersLaunching() {
        assertEquals(AuthFlowState.LaunchingPasskey, reduce(AuthFlowState.Idle, AuthEvent.PasskeyRequested))
    }

    @Test fun passkeyAssertionEntersExchange() {
        val assertion = PasskeyResult.Assertion(
            credentialId = "cred-1",
            clientDataJson = "cdj",
            authenticatorData = "auth",
            signature = "sig",
            userHandle = "u1",
        )
        assertEquals(
            AuthFlowState.ExchangingPasskeyAssertion,
            reduce(AuthFlowState.LaunchingPasskey, AuthEvent.PasskeyAssertionResult(assertion)),
        )
    }

    @Test fun passkeyNoCredentialMapsToNamedFailure() {
        assertEquals(
            AuthFlowState.Failed(AuthFailure.PASSKEY_NO_CREDENTIAL),
            reduce(
                AuthFlowState.LaunchingPasskey,
                AuthEvent.PasskeyAssertionResult(PasskeyResult.NoCredential),
            ),
        )
    }

    @Test fun passkeyUnavailableMapsToNamedFailure() {
        assertEquals(
            AuthFlowState.Failed(AuthFailure.PASSKEY_UNAVAILABLE),
            reduce(
                AuthFlowState.LaunchingPasskey,
                AuthEvent.PasskeyAssertionResult(PasskeyResult.Unavailable),
            ),
        )
    }

    @Test fun passkeyCancelIsNamedNotFatal() {
        assertEquals(
            AuthFlowState.Failed(AuthFailure.CANCELED),
            reduce(
                AuthFlowState.LaunchingPasskey,
                AuthEvent.PasskeyAssertionResult(PasskeyResult.Canceled),
            ),
        )
    }

    @Test fun passkeyExchangeSuccessAuthenticates() {
        val exchanging = AuthFlowState.ExchangingPasskeyAssertion
        val s = reduce(exchanging, AuthEvent.PasskeyExchangeResult(AuthOutcome.Success(session)))
        assertIs<AuthFlowState.Authenticated>(s)
    }
}
