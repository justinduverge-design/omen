package com.slopssaloon.omen.core.auth

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

/**
 * PKCE (RFC 7636) code generator used by [SupabaseOAuthProvider] implementations
 * (M4-Auth-Providers-v1 §2.4). Pure JVM — no Android APIs — so it is unit-testable
 * in `:core:auth`'s existing suite.
 *
 * - `codeVerifier`: 43–128 chars from [A-Z][a-z][0-9]-._~ per RFC 7636 §4.1. We produce
 *   43 chars (base64url of 32 random bytes) which is the RFC's minimum and matches the
 *   Supabase JS SDK behavior.
 * - `codeChallenge`: base64url(SHA-256(codeVerifier)), 43 chars. Method is `s256`.
 * - `state`: 32-byte URL-safe random string. Used purely for CSRF defense (RFC 6749 §10.12);
 *   the value is opaque and never inspected past equality comparison.
 */
data class PkceParams(
    val codeVerifier: String,
    val codeChallenge: String,
    val state: String,
) {
    /** OAuth spec constant. Only `s256` is accepted by Supabase for mobile flows. */
    val codeChallengeMethod: String get() = "s256"
}

object PkceCodes {
    private val random: SecureRandom = SecureRandom()
    private val b64: Base64.Encoder = Base64.getUrlEncoder().withoutPadding()

    fun generate(): PkceParams {
        val verifier = randomBase64Url(byteCount = 32) // 43-char verifier
        val challenge = b64.encodeToString(sha256(verifier.toByteArray(Charsets.US_ASCII)))
        val state = randomBase64Url(byteCount = 32)
        return PkceParams(codeVerifier = verifier, codeChallenge = challenge, state = state)
    }

    private fun randomBase64Url(byteCount: Int): String {
        val bytes = ByteArray(byteCount).also(random::nextBytes)
        return b64.encodeToString(bytes)
    }

    private fun sha256(bytes: ByteArray): ByteArray =
        MessageDigest.getInstance("SHA-256").digest(bytes)
}
