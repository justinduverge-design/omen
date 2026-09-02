package com.slopssaloon.omen.app.auth

import com.slopssaloon.omen.core.auth.AuthFailure
import com.slopssaloon.omen.core.auth.AuthOutcome
import com.slopssaloon.omen.core.auth.RetryableCode
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.suspendCancellableCoroutine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The code-entry screen used to end at "Verify code". Swift twin: `OmenIOSTests/OtpResendTests`.
 *
 * Supabase answering 200 to an OTP request means it **accepted the request** — not that the
 * message reached an inbox. A beta user whose code never arrived had nothing to press and
 * nothing to read, so they simply stopped.
 */
class OtpResendControllerTest {

    /** Each simulated second returns instantly, so a countdown does not cost a real minute. */
    private fun instantClock(): Pair<OtpResendController, MutableList<Long>> {
        val slept = mutableListOf<Long>()
        return OtpResendController { slept.add(it) } to slept
    }

    /** A clock that never ticks, so the controller stays mid-cooldown for the whole test. */
    private fun frozenClock() = OtpResendController { suspendCancellableCoroutine<Unit> { } }

    @Test
    fun `the cooldown counts down the full window`() = runBlocking {
        val (resend, slept) = instantClock()

        assertTrue(resend.canResend)
        resend.startCooldown()

        assertEquals(OtpResendController.COOLDOWN_SECONDS, slept.size)
        assertEquals(0, resend.secondsRemaining)
        assertTrue(resend.canResend)
    }

    /**
     * The cooldown is not decoration: hammering resend gets the address throttled by Supabase,
     * and the user then blames Omen for the silence it caused.
     */
    @Test
    fun `resend is refused while the cooldown is running`() = runBlocking {
        val resend = frozenClock()
        var requests = 0
        val cooling = CoroutineScope(Dispatchers.Unconfined).launch { resend.startCooldown() }

        assertEquals(OtpResendController.COOLDOWN_SECONDS, resend.secondsRemaining)
        assertFalse(resend.canResend)
        assertFalse(resend.resend("tester@example.com") { requests++; AuthOutcome.OtpSent })
        assertEquals("no request may go out during the wait", 0, requests)

        cooling.cancel()
    }

    @Test
    fun `an accepted resend records that it was sent`() = runBlocking {
        val (resend, _) = instantClock()
        val emails = mutableListOf<String>()

        val sent = resend.resend("tester@example.com") { emails.add(it); AuthOutcome.OtpSent }

        assertTrue(sent)
        assertEquals(listOf("tester@example.com"), emails)
        assertTrue(resend.resent)
        assertNull(resend.error)
    }

    /**
     * A failed resend reports in place rather than through the reducer, so the code the user is
     * typing survives — and it reports false, so the caller does not start a wait for a message
     * that was never sent.
     */
    @Test
    fun `a failed resend reports in place and does not start a wait`() = runBlocking {
        val (resend, _) = instantClock()

        val sent = resend.resend("tester@example.com") {
            AuthOutcome.RetryableError(RetryableCode.NETWORK)
        }

        assertFalse(sent)
        assertFalse(resend.resent)
        assertEquals(authFailureMessage(AuthFailure.NETWORK), resend.error)
        assertEquals(0, resend.secondsRemaining)
    }

    @Test
    fun `an unexpected outcome still produces safe copy rather than nothing`() = runBlocking {
        val (resend, _) = instantClock()

        assertFalse(resend.resend("tester@example.com") { AuthOutcome.Unsupported })
        assertEquals(authFailureMessage(AuthFailure.UNKNOWN), resend.error)
    }

    @Test
    fun `reset clears the resend state`() = runBlocking {
        val (resend, _) = instantClock()
        resend.resend("tester@example.com") { AuthOutcome.OtpSent }

        resend.reset()

        assertEquals(0, resend.secondsRemaining)
        assertFalse(resend.resent)
        assertNull(resend.error)
    }
}
