package com.slopssaloon.omen.core.auth

/** Pure input validation for the email-OTP flow. No Android or network dependency. */
object EmailValidator {
    // Intentionally conservative: one @, a dotted domain, no spaces. Server remains authoritative.
    private val PATTERN = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

    fun isValid(raw: String): Boolean {
        val email = raw.trim()
        return email.length in 3..254 && PATTERN.matches(email)
    }

    fun normalize(raw: String): String = raw.trim().lowercase()
}

/** Validates the 6-digit numeric OTP code (M0a §4.2: code, not magic link). */
object OtpCodeValidator {
    const val LENGTH = 6

    fun normalize(raw: String): String = raw.trim()

    fun isValid(raw: String): Boolean {
        val code = normalize(raw)
        return code.length == LENGTH && code.all { it.isDigit() }
    }
}
