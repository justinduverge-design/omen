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
}
