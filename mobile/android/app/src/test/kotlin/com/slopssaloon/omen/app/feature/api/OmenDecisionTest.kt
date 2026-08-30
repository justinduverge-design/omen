package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefPayload
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
              "mode": "live",
              "signals": {"roster": {"status": "live", "source": "sleeper_roster", "message": "Roster imported."}},
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
            {"state": "success", "mode": "live", "recommendation": {
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
    fun successModeMustBeExplicitAndControlsTheVisibleTruthState() {
        val recommendation = """"recommendation": {"title": "Start A", "move": "Bench B"}"""

        assertTrue(
            "missing mode must not be inferred as live",
            parse("""{"state": "success", $recommendation}""").briefState() is OmenDecisionBriefState.Error,
        )
        assertTrue(
            parse("""{"state": "success", "mode": "mock", $recommendation}""").briefState()
                is OmenDecisionBriefState.Mock,
        )
        assertTrue(
            parse("""{"state": "success", "mode": "demo", $recommendation}""").briefState()
                is OmenDecisionBriefState.Demo,
        )
        assertTrue(
            parse("""{"state": "success", "mode": "future_mode", $recommendation}""").briefState()
                is OmenDecisionBriefState.Error,
        )
    }

    @Test
    fun backendSignalStatusesArePreservedInsteadOfMintingLive() {
        val state = parse(
            """
            {
              "state": "success",
              "mode": "live",
              "signals": {
                "exact_espn_scoring_unavailable": {"status": "unavailable", "source": "provider_restricted", "message": "Omen cannot verify every scoring rule and final ESPN result."},
                "roster": {"status": "live", "source": "sleeper_roster", "message": "Roster imported."},
                "matchup_dvp": {"status": "stub", "source": "baseline", "message": "Matchup model unavailable."},
                "weather": {"status": "unavailable", "source": "weather", "message": "No weather feed."}
              },
              "recommendation": {"title": "Start A", "move": "Bench B"}
            }
            """.trimIndent(),
        ).briefState() as OmenDecisionBriefState.Success

        assertEquals(
            listOf(OmenSignalSource.Unavailable, OmenSignalSource.Stub, OmenSignalSource.Live, OmenSignalSource.Unavailable),
            state.payload.signals.map { it.source },
        )
        assertEquals("Exact ESPN scoring unavailable", state.payload.signals.first().label)
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
                {"state": "success", "mode": "live", "recommendation": {
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
                """{"state": "success", "mode": "live", "recommendation": {
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

    /**
     * Regression, `F-VET-01`. Swift twin: `testAMissingConfidenceScoreIsAbsentRatherThanZero`.
     *
     * `OmenDecision` filled a missing confidence score with `?: 0`, and `OmenConfidenceBar`
     * prints its score verbatim — so a brief the server declined to score displayed
     * **"Confidence 0"**, which reads as "Omen has no confidence in this move" rather than
     * "Omen did not say". The server models the absence deliberately: `src/routes/omen.js`
     * persists it as null behind a Number.isFinite guard.
     */
    @Test
    fun `a missing confidence score is absent rather than zero`() {
        val envelope = parse(
            """
            {"contract_version":"2026-05-18.omen-live.v1","state":"success","mode":"live",
             "recommendation":{"type":"waiver_pickup","title":"Add Jaylen Wright",
              "move":"Pick up Jaylen Wright to cover your RB slot.",
              "risk":{"level":"medium","reasons":[]},
              "explanation":{"summary":"Add Jaylen Wright."}}}
            """.trimIndent(),
        )

        val payload = (envelope.briefState() as OmenDecisionBriefState.Success).payload
        assertNull("absence must survive the mapping, not become 0", payload.confidence)
        // One absent field must not degrade the others.
        assertEquals("Add Jaylen Wright", payload.verdict)
    }

    /** The whole confidence block absent, not merely its score. */
    @Test
    fun `a confidence block with a label but no score is still scoreless`() {
        val envelope = parse(
            """
            {"contract_version":"2026-05-18.omen-live.v1","state":"success","mode":"live",
             "recommendation":{"type":"start_sit","title":"Start DeVonta Smith",
              "move":"Start DeVonta Smith over Chris Olave.",
              "confidence":{"label":"medium_high","rationale":"No numeric score supplied."},
              "risk":{"level":"low","reasons":[]},
              "explanation":{"summary":"Start Smith."}}}
            """.trimIndent(),
        )

        val payload = (envelope.briefState() as OmenDecisionBriefState.Success).payload
        assertNull(payload.confidence)
    }

    /** A real score must survive untouched — including a genuine zero, which IS an answer. */
    @Test
    fun `a real confidence score still renders`() {
        assertEquals(0, scored("0")?.confidence)
        assertEquals(83, scored("83")?.confidence)
    }

    private fun scored(score: String): OmenDecisionBriefPayload? {
        val envelope = parse(
            """
            {"contract_version":"2026-05-18.omen-live.v1","state":"success","mode":"live",
             "recommendation":{"type":"start_sit","title":"Start DeVonta Smith",
              "move":"Start DeVonta Smith over Chris Olave.",
              "confidence":{"score":$score,"label":"low","rationale":"r"},
              "risk":{"level":"low","reasons":[]},
              "explanation":{"summary":"Start Smith."}}}
            """.trimIndent(),
        )
        return (envelope.briefState() as? OmenDecisionBriefState.Success)?.payload
    }
}
