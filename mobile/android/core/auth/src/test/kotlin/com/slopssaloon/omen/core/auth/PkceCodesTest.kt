package com.slopssaloon.omen.core.auth

import java.security.MessageDigest
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class PkceCodesTest {

    @Test fun challengeIsBase64UrlSha256OfVerifier() {
        val p = PkceCodes.generate()
        val expected = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(MessageDigest.getInstance("SHA-256").digest(p.codeVerifier.toByteArray(Charsets.US_ASCII)))
        assertEquals(expected, p.codeChallenge)
    }

    @Test fun verifierAndStateAreUrlSafeAndUnpadded() {
        val p = PkceCodes.generate()
        val allowed = Regex("^[A-Za-z0-9_-]+$")
        assertTrue(allowed.matches(p.codeVerifier), "verifier: ${p.codeVerifier}")
        assertTrue(allowed.matches(p.codeChallenge), "challenge: ${p.codeChallenge}")
        assertTrue(allowed.matches(p.state), "state: ${p.state}")
    }

    @Test fun verifierMeetsRfc7636LengthFloor() {
        // RFC 7636 §4.1: 43 <= length <= 128
        val p = PkceCodes.generate()
        assertTrue(p.codeVerifier.length in 43..128, "verifier length ${p.codeVerifier.length}")
    }

    @Test fun eachGenerationProducesDifferentValues() {
        val (a, b) = PkceCodes.generate() to PkceCodes.generate()
        assertNotEquals(a.codeVerifier, b.codeVerifier)
        assertNotEquals(a.state, b.state)
    }

    @Test fun methodIsSha256() {
        assertEquals("s256", PkceCodes.generate().codeChallengeMethod)
    }
}
