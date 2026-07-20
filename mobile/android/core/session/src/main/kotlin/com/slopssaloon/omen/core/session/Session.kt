package com.slopssaloon.omen.core.session

/**
 * The minimal, non-secret-free session record persisted to secure storage.
 *
 * Tokens here are sensitive. This object must only ever live in Keystore-backed encrypted
 * storage (see [SecureSessionStore]) — never plain files, logs, screenshots, or analytics
 * (facts-of-record #6, M0c §2.2, §8). Do not add `toString()` overrides that print tokens.
 */
data class Session(
    val userId: String,
    val accessToken: String,
    val refreshToken: String,
    /** Epoch seconds when the access token expires. */
    val expiresAtEpochSeconds: Long,
) {
    /** Redacted — never expose token material via string conversion. */
    override fun toString(): String = "Session(userId=$userId, expiresAt=$expiresAtEpochSeconds, tokens=<redacted>)"
}
