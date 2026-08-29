package com.slopssaloon.omen.app.feature.api

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `trade-compare.v2` parsing and the Trade destination's verdict rules.
 * Swift twin: `TradeCompareTests.swift`.
 *
 * The contract exists because the engine emits three verdicts and the approved vocabulary has
 * four. The single most important property here is that **the client never mints a verdict**.
 */
class TradeCompareTest {

    private val evaluable =
        """{"status":"evaluable","reason":null,"missing_projection_count":0,"total_player_count":2}"""
    private val neutralContext =
        """{"mode":"neutral","platform":null,"league_id":null,"league_name":null,"applied":[],"unavailable_reason":null}"""

    private fun parse(
        verdictState: String,
        evaluability: String = evaluable,
        analysis: String = neutralContext,
        netValue: String = "4.2",
    ): TradeCompare = requireNotNull(
        TradeCompare.parse(
            """
            {"contract_version":"trade-compare.v2","verdict_state":"$verdictState",
             "evaluability":$evaluability,"analysis_context":$analysis,
             "net_value":$netValue,"explanation":null}
            """.trimIndent(),
        ),
    )

    @Test
    fun `all four approved verdict states parse`() {
        assertEquals(TradeCompare.VerdictState.FavorsYou, parse("favors_you").verdictState)
        assertEquals(TradeCompare.VerdictState.YouGiveUpTooMuch, parse("you_give_up_too_much").verdictState)
        assertEquals(TradeCompare.VerdictState.CloseNeedsContext, parse("close_needs_context").verdictState)
        assertEquals(TradeCompare.VerdictState.InsufficientData, parse("insufficient_data").verdictState)
    }

    /**
     * An unrecognized state must degrade to the honest non-answer. Degrading to a *verdict*
     * would be the client issuing a call the server did not make.
     */
    @Test
    fun `an unknown verdict state degrades to the non answer`() {
        val result = parse("definitely_take_it")

        assertEquals(TradeCompare.VerdictState.InsufficientData, result.verdictState)
        assertEquals("Omen can't call this one", result.headline)
    }

    @Test
    fun `insufficient data names what is missing`() {
        val result = parse(
            verdictState = "insufficient_data",
            evaluability = """{"status":"insufficient_data","reason":"missing_projections","missing_projection_count":2,"total_player_count":3}""",
        )

        assertFalse(result.evaluability.isEvaluable)
        assertEquals(
            "Omen has no projection for 2 of these players, so it won't force a verdict.",
            result.subhead,
        )
    }

    @Test
    fun `singular copy when exactly one projection is missing`() {
        val result = parse(
            verdictState = "insufficient_data",
            evaluability = """{"status":"insufficient_data","reason":"missing_projections","missing_projection_count":1,"total_player_count":2}""",
        )

        assertTrue(result.subhead.contains("1 of these players"))
    }

    @Test
    fun `an empty offer asks for players rather than reporting a failure`() {
        val result = parse(
            verdictState = "insufficient_data",
            evaluability = """{"status":"insufficient_data","reason":"no_players","missing_projection_count":0,"total_player_count":0}""",
        )

        assertEquals("Add players to both sides and Omen will look at it.", result.subhead)
    }

    @Test
    fun `personalized and neutral answers are distinguishable`() {
        val neutral = parse("favors_you")
        assertFalse(neutral.analysisContext.isPersonalized)
        assertEquals("Based on standard scoring — not your league's settings.", neutral.subhead)

        val personalized = parse(
            verdictState = "favors_you",
            analysis = """{"mode":"personalized","platform":"sleeper","league_id":"1","league_name":"Slops Dynasty","applied":["scoring_format","roster_construction"],"unavailable_reason":null}""",
        )
        assertTrue(personalized.analysisContext.isPersonalized)
        assertEquals("Based on your league's scoring and your roster.", personalized.subhead)
        assertEquals(2, personalized.analysisContext.applied.size)
    }

    @Test
    fun `the server names why it could not personalize`() {
        val result = parse(
            verdictState = "close_needs_context",
            analysis = """{"mode":"neutral","platform":null,"league_id":null,"league_name":null,"applied":[],"unavailable_reason":"unauthenticated"}""",
        )

        // Silently returning a neutral answer the user believes is personalized is the failure
        // this field exists to prevent.
        assertEquals("unauthenticated", result.analysisContext.unavailableReason)
    }

    @Test
    fun `an offer is not comparable until both sides have a player`() {
        assertFalse(TradeOffer().isComparable)
        assertFalse(TradeOffer(send = listOf("A.J. Brown")).isComparable)
        assertTrue(TradeOffer(send = listOf("A.J. Brown"), receive = listOf("Garrett Wilson")).isComparable)
    }

    /**
     * The client may name which league to use. It may never send the roster, scoring rules, or
     * settings — those are read server-side from the user's own stored connection.
     */
    @Test
    fun `the request body names the league and sends no league data`() {
        val offer = TradeOffer(
            send = listOf("A.J. Brown"),
            receive = listOf("Garrett Wilson"),
            leagueContext = TradeOffer.LeagueContext("sleeper", "league-1"),
        )

        val body = JSONObject(offer.requestBody())
        val context = body.getJSONObject("league_context")

        assertEquals("sleeper", context.getString("platform"))
        assertEquals("league-1", context.getString("league_id"))
        assertEquals("league_context carries an identity only, never league data", 2, context.length())
        assertFalse("native ships no scoring-format-only personalize affordance", body.has("scoring_format"))
        assertFalse(body.has("roster"))
    }

    @Test
    fun `an offer without a league sends no context at all`() {
        val offer = TradeOffer(send = listOf("A.J. Brown"), receive = listOf("Garrett Wilson"))

        assertFalse(JSONObject(offer.requestBody()).has("league_context"))
    }
}
