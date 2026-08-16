package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.designsystem.component.OmenMetricDelta
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.component.OmenSignalSource
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M5-Native-API-Client slice D — `POST /api/omen/mvp-move` → `2026-05-18.omen-live.v1`.
 * Swift twin: `OmenDecisionTests.swift`. The two must map the same states the same way.
 *
 * Envelope fixtures are shaped from `src/services/omen.js` — the field names
 * (`expected_value_delta`, `comparison_player`, `why_it_matters`, `recovery.message`) are
 * the server's, not invented for the test.
 *
 * Runs as a JVM unit test. `:app` gained a `src/test` source set on 2026-08-16 precisely
 * because tests like these — pure mapping logic touching no Android framework class — had
 * been forced onto an emulator for want of anywhere else to live.
 *
 * `org.json` is stubbed on the JVM (the android.jar on the unit-test classpath throws from
 * every method), so `testOptions.unitTests.isReturnDefaultValues` alone would give silent
 * wrong answers rather than errors. The real implementation is on the test classpath
 * instead — see the `:app` build script.
 */
class OmenDecisionTest {

    private fun parse(json: String): OmenDecisionEnvelope =
        requireNotNull(OmenDecisionEnvelope.parse(json)) { "envelope failed to parse: $json" }

    @Test
    fun successDecodesIntoARenderableBrief() {
        val envelope = parse(
            """
            {
              "contract_version": "2026-05-18.omen-live.v1",
              "state": "success",
              "recommendation": {
                "title": "Add Jaylen Wright for Kenneth Walker III",
                "move": "Pick up Jaylen Wright to cover your RB slot.",
                "comparison_player": {"name": "Kenneth Walker III", "position": "RB", "team": "SEA"},
                "expected_value_delta": {"points": 4.2, "label": "meaningful"},
                "confidence": {"score": 70, "label": "medium_high"},
                "risk": {"level": "medium", "reasons": ["Waiver priority is not modeled."]},
                "explanation": {
                  "summary": "Add Jaylen Wright while Kenneth Walker III is out.",
                  "why_it_matters": "Your RB slot cannot produce as it stands.",
                  "risk": "Risk is medium because the add may not clear."
                }
              }
            }
            """.trimIndent(),
        )

        val state = envelope.briefState()
        assertTrue(state is OmenDecisionBriefState.Success)
        val payload = (state as OmenDecisionBriefState.Success).payload
        assertEquals("Add Jaylen Wright for Kenneth Walker III", payload.verdict)
        assertEquals(70, payload.confidence)
        assertEquals(OmenRiskLevel.Medium, payload.risk)
        assertEquals(listOf("Waiver priority is not modeled."), payload.riskReasons)
        assertEquals(3, payload.explanation.size)
        assertEquals("+4.2 projected (meaningful)", payload.impact)
        assertEquals("Kenneth Walker III", payload.alternatives.first().name)

        // facts-of-record #7: live data is labeled live. Demo never reaches this mapping.
        assertEquals(listOf(OmenSignalSource.Live), payload.signals.map { it.source })
    }

    @Test
    fun negativeDeltaKeepsItsSignAndDirection() {
        val envelope = parse(
            """
            {"state": "success", "recommendation": {
              "title": "Hold", "move": "Keep your current lineup.",
              "expected_value_delta": {"points": -1.5, "label": "small"}}}
            """.trimIndent(),
        )
        val payload = (envelope.briefState() as OmenDecisionBriefState.Success).payload
        assertEquals("-1.5 projected (small)", payload.impact)
        assertEquals(OmenMetricDelta.Negative, payload.metrics.first().deltaDirection)
    }

    /** A success carrying nothing renderable is a contract violation, not an empty card. */
    @Test
    fun successWithNoRenderableRecommendationBecomesAnError() {
        assertTrue(parse("""{"state": "success"}""").briefState() is OmenDecisionBriefState.Error)
    }

    @Test
    fun emptyUsesTheServersOwnSummary() {
        val envelope = parse(
            """{"state": "empty", "explanation": {"summary": "No move clears the threshold."}}""",
        )
        val state = envelope.briefState()
        assertTrue(state is OmenDecisionBriefState.Empty)
        assertEquals("No move clears the threshold.", (state as OmenDecisionBriefState.Empty).message)
    }

    @Test
    fun offSeasonMapsToItsOwnState() {
        assertEquals(OmenDecisionBriefState.OffSeason, parse("""{"state": "off_season"}""").briefState())
    }

    @Test
    fun platformDisconnectedOffersConnectRatherThanAnError() {
        var connectCalled = false
        val state = parse(
            """{"state": "platform_disconnected", "recovery": {"message": "Connect a league first."}}""",
        ).briefState(onConnect = { connectCalled = true })

        assertTrue(state is OmenDecisionBriefState.Disconnected)
        (state as OmenDecisionBriefState.Disconnected).onConnect?.invoke()
        assertTrue("the disconnected state must reach the app's connect flow", connectCalled)
    }

    /**
     * Every recovery state renders the backend's sentence verbatim. Re-wording them on the
     * client would create a second copy of this truth that drifts from the server's.
     */
    @Test
    fun recoveryStatesSurfaceTheServerMessage() {
        val states = listOf(
            "pending_live_engine", "context_unavailable",
            "yahoo_reauth_required", "sleeper_league_context_missing",
            "espn_reauth_required", "espn_league_context_missing", "espn_import_blocked",
            "error",
        )
        for (state in states) {
            val brief = parse("""{"state": "$state", "recovery": {"message": "Server sentence for $state."}}""")
                .briefState()
            assertTrue("$state must render an error surface", brief is OmenDecisionBriefState.Error)
            assertEquals("Server sentence for $state.", (brief as OmenDecisionBriefState.Error).message)
        }
    }

    /** An unrecognised state must not be force-fitted into success. */
    @Test
    fun unknownStateFailsSafeRatherThanRenderingAsSuccess() {
        val brief = parse("""{"state": "some_state_shipped_after_this_build"}""").briefState()
        assertTrue(brief is OmenDecisionBriefState.Error)
    }

    @Test
    fun retryIsWiredOnRecoverableStates() {
        var retried = false
        val brief = parse("""{"state": "error", "recovery": {"message": "Try again."}}""")
            .briefState(onRetry = { retried = true })
        (brief as OmenDecisionBriefState.Error).onRetry?.invoke()
        assertTrue(retried)
    }

    /**
     * An unknown position cannot render without inventing a position chip beside a real
     * player's name, so the alternative row is dropped and the verdict still renders.
     */
    @Test
    fun unmappablePositionDropsTheAlternativeRatherThanGuessing() {
        val payload = (
            parse(
                """
                {"state": "success", "recommendation": {
                  "title": "Start someone", "move": "Make the swap.",
                  "comparison_player": {"name": "Someone", "position": "FLEX", "team": "SEA"}}}
                """.trimIndent(),
            ).briefState() as OmenDecisionBriefState.Success
            ).payload

        assertTrue("a position we cannot map must not be guessed", payload.alternatives.isEmpty())
        assertEquals("Start someone", payload.verdict)
    }

    @Test
    fun unknownRiskLevelDefaultsToMediumNotLow() {
        val payload = (
            parse(
                """{"state": "success", "recommendation": {
                  "title": "T", "move": "M", "risk": {"level": "catastrophic", "reasons": []}}}""",
            ).briefState() as OmenDecisionBriefState.Success
            ).payload
        assertEquals("an unfamiliar risk must not read as safer than it is", OmenRiskLevel.Medium, payload.risk)
    }

    /**
     * The envelope legitimately varies by state. Treating optional sections as required
     * would turn an honest backend answer into a decode failure.
     */
    @Test
    fun minimalEnvelopeParsesWithoutOptionalSections() {
        val envelope = parse("""{"state": "empty"}""")
        assertNull(envelope.recommendation)
        assertNull(envelope.recoveryMessage)
        assertTrue(envelope.briefState() is OmenDecisionBriefState.Empty)
    }

    /** A body that is not the contract at all is a decode failure, not a fabricated state. */
    @Test
    fun unparseableBodyIsRejectedRatherThanGuessed() {
        assertNull(OmenDecisionEnvelope.parse("not json"))
        assertNull(OmenDecisionEnvelope.parse("""{"no_state_field": true}"""))
    }
}
