package com.slopssaloon.omen.app.crashreporting

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SentryEnvelopeReporterTest {

    private val dsn = "https://abc123@o4511928445960192.ingest.us.sentry.io/4511928999999999"

    @Test
    fun ingestUrlBuildsTheEnvelopeEndpointFromTheDsn() {
        assertEquals(
            "https://o4511928445960192.ingest.us.sentry.io/api/4511928999999999/envelope/",
            SentryEnvelopeReporter.ingestUrl(dsn),
        )
    }

    @Test
    fun buildEnvelopeProducesThreeLinesInTheRequiredOrder() {
        val envelope = SentryEnvelopeReporter.buildEnvelope(RuntimeException("boom"), dsn)
        val lines = envelope.split("\n")

        assertEquals(3, lines.size)
        assertTrue(lines[0].contains("\"dsn\":\"$dsn\""), "line 1 must be the envelope header carrying the dsn")
        assertTrue(lines[1].contains("\"type\":\"event\""), "line 2 must be the item header")
        assertTrue(lines[2].startsWith("{\"event_id\""), "line 3 must be the event payload")
    }

    @Test
    fun itemHeaderLengthMatchesTheActualPayloadByteCount() {
        val envelope = SentryEnvelopeReporter.buildEnvelope(RuntimeException("boom"), dsn)
        val lines = envelope.split("\n")
        val declaredLength = Regex(""""length":(\d+)""").find(lines[1])!!.groupValues[1].toInt()

        assertEquals(lines[2].toByteArray(Charsets.UTF_8).size, declaredLength)
    }

    @Test
    fun eventPayloadCarriesExceptionTypeAndMessage() {
        val payload = SentryEnvelopeReporter.buildEventPayload(IllegalStateException("something broke"))

        assertTrue(payload.contains("\"type\":\"java.lang.IllegalStateException\""))
        assertTrue(payload.contains("\"value\":\"something broke\""))
        assertTrue(payload.contains("\"platform\":\"android\""))
        assertTrue(payload.contains("\"level\":\"fatal\""))
    }

    @Test
    fun eventPayloadHandlesANullMessageWithoutCrashing() {
        val payload = SentryEnvelopeReporter.buildEventPayload(NullPointerException())

        assertTrue(payload.contains("\"value\":\"\""))
    }

    @Test
    fun eventPayloadEscapesSpecialCharactersInTheMessage() {
        val payload = SentryEnvelopeReporter.buildEventPayload(
            RuntimeException("line1\nline2 with \"quotes\" and a \\backslash"),
        )

        // Must still be one well-formed JSON string value, not a payload broken by a raw
        // newline or an unescaped quote — the literal escape sequences must survive.
        assertTrue(payload.contains("\\n"))
        assertTrue(payload.contains("\\\""))
        assertTrue(payload.contains("\\\\"))
    }

    @Test
    fun eventPayloadCarriesRealStackFramesWithNoUserData() {
        val throwable = try {
            throw RuntimeException("test")
        } catch (e: RuntimeException) {
            e
        }

        val payload = SentryEnvelopeReporter.buildEventPayload(throwable)

        assertTrue(payload.contains("\"function\":"))
        assertTrue(payload.contains("\"lineno\":"))
        assertTrue(payload.contains(this::class.java.name.substringBefore("$")))
    }
}
