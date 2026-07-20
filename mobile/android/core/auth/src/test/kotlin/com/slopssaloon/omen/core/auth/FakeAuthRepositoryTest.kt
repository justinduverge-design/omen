package com.slopssaloon.omen.core.auth

import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertIs
import kotlin.test.assertTrue

class FakeAuthRepositoryTest {

    @Test fun requestOtpSucceedsForValidEmail() = runTest {
        assertIs<AuthOutcome.OtpSent>(FakeAuthRepository().requestEmailOtp("fan@example.com"))
    }

    @Test fun verifyReturnsSuccessForValidCode() = runTest {
        val repo = FakeAuthRepository(validCode = "654321")
        assertIs<AuthOutcome.Success>(repo.verifyEmailOtp("fan@example.com", "654321"))
    }

    @Test fun verifyReturnsInvalidForWrongCode() = runTest {
        assertIs<AuthOutcome.InvalidCode>(FakeAuthRepository().verifyEmailOtp("fan@example.com", "000000"))
    }

    @Test fun googleUnsupportedWhenNotConfigured() = runTest {
        val repo = FakeAuthRepository(googleConfigured = false)
        assertIs<AuthOutcome.Unsupported>(repo.signInWithGoogleIdToken("idt", "nonce"))
    }

    @Test fun signOutFlags() = runTest {
        val repo = FakeAuthRepository()
        repo.signOut()
        assertTrue(repo.signedOut)
    }
}
