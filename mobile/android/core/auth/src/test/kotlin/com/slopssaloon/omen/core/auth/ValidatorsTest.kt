package com.slopssaloon.omen.core.auth

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ValidatorsTest {
    @Test fun acceptsWellFormedEmail() {
        assertTrue(EmailValidator.isValid("fan@example.com"))
        assertTrue(EmailValidator.isValid("  fan@example.com  "))
    }

    @Test fun rejectsMalformedEmail() {
        assertFalse(EmailValidator.isValid(""))
        assertFalse(EmailValidator.isValid("nope"))
        assertFalse(EmailValidator.isValid("a@b"))
        assertFalse(EmailValidator.isValid("a b@c.com"))
    }

    @Test fun normalizesEmail() {
        assertEquals("fan@example.com", EmailValidator.normalize("  Fan@Example.COM "))
    }

    @Test fun acceptsSixDigitCode() {
        assertTrue(OtpCodeValidator.isValid("123456"))
        assertTrue(OtpCodeValidator.isValid(" 123456\n"))
        assertEquals("123456", OtpCodeValidator.normalize(" 123456\n"))
    }

    @Test fun rejectsBadCodes() {
        assertFalse(OtpCodeValidator.isValid("12345"))
        assertFalse(OtpCodeValidator.isValid("1234567"))
        assertFalse(OtpCodeValidator.isValid("12a456"))
        assertFalse(OtpCodeValidator.isValid(""))
    }
}
