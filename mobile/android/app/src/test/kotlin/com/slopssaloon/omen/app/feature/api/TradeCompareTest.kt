package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeLeg
import com.slopssaloon.omen.app.feature.commandcenter.omenTradeThreeTeamRead
import com.slopssaloon.omen.app.feature.commandcenter.omenTradeThreeTeamSides
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
        assertFalse(TradeOffer(send = listOf(TradePlayer("A.J. Brown", "WR", "PHI"))).isComparable)
        assertTrue(TradeOffer(send = listOf(TradePlayer("A.J. Brown", "WR", "PHI")), receive = listOf(TradePlayer("Garrett Wilson", "WR", "NYJ"))).isComparable)
    }

    /**
     * The client may name which league to use. It may never send the roster, scoring rules, or
     * settings — those are read server-side from the user's own stored connection.
     */
    @Test
    fun `the request body names the league and sends no league data`() {
        val offer = TradeOffer(
            send = listOf(TradePlayer("A.J. Brown", "WR", "PHI")),
            receive = listOf(TradePlayer("Garrett Wilson", "WR", "NYJ")),
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
        val offer = TradeOffer(send = listOf(TradePlayer("A.J. Brown", "WR", "PHI")), receive = listOf(TradePlayer("Garrett Wilson", "WR", "NYJ")))

        assertFalse(JSONObject(offer.requestBody()).has("league_context"))
    }

    // -------------------------------------------------------------------------------------- T5

    /**
     * Fixture matching `omen-t1-three-team-capability`'s documented `legs`-branch response
     * (`test/tradeRoute.test.js`'s ring example) exactly, since that route is unmerged and this
     * type is built against the documented shape rather than a live server.
     */
    private fun threeTeamFixture(verdictState: String = "favors_you"): TradeThreeTeamCompare = requireNotNull(
        TradeThreeTeamCompare.parse(
            """
            {
              "contract_version": "trade-compare.v2", "trade_shape": "three_team", "team_count": 3,
              "participants": [
                {"team_id": "you", "team_name": null,
                 "sends": {"total_value": 4, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Jonathan Taylor", "position": "RB", "player_key": null}]},
                 "receives": {"total_value": 3, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Tyjae Spears", "position": "RB", "player_key": null}]},
                 "net_value": -1, "verdict_state": "favors_you", "acceptance_likelihood": "likely", "confidence": "medium",
                 "roster_fit": {"summary": "fine", "depth_discounted": false},
                 "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}},
                {"team_id": "team_b", "team_name": "Davante's Inferno",
                 "sends": {"total_value": 5, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Ja'Marr Chase", "position": "WR", "player_key": null}]},
                 "receives": {"total_value": 4, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Jonathan Taylor", "position": "RB", "player_key": null}]},
                 "net_value": -1, "verdict_state": "close_needs_context", "acceptance_likelihood": "uncertain", "confidence": "medium",
                 "roster_fit": {"summary": "fine", "depth_discounted": false},
                 "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}},
                {"team_id": "team_c", "team_name": "Chubb Rock",
                 "sends": {"total_value": 3, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Tyjae Spears", "position": "RB", "player_key": null}]},
                 "receives": {"total_value": 5, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Ja'Marr Chase", "position": "WR", "player_key": null}]},
                 "net_value": 2, "verdict_state": "favors_you", "acceptance_likelihood": "likely", "confidence": "medium",
                 "roster_fit": {"summary": "fine", "depth_discounted": false},
                 "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}}
              ],
              "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 6},
              "verdict_state": "$verdictState",
              "analysis_context": {"mode": "neutral", "platform": null, "league_id": null, "league_name": null, "applied": [], "unavailable_reason": null},
              "submission": {
                "mode": "split_handoff", "reason": "no_connected_provider_publishes_a_three_team_write_api",
                "caption": "No provider builds a three-team trade natively. Submit it as linked two-team trades, in this order.",
                "steps": [
                  "Leg 1: send Jonathan Taylor from you to team_b.",
                  "Leg 2: send Ja'Marr Chase from team_b to team_c. Make it contingent on leg 1 completing first.",
                  "Leg 3: send Tyjae Spears from team_c to you. Make it contingent on leg 2 completing first."
                ]
              }
            }
            """.trimIndent(),
        ),
    )

    @Test
    fun `three-team compare decodes every participant separately`() {
        val result = threeTeamFixture()

        assertEquals("three_team", result.tradeShape)
        assertEquals(3, result.teamCount)
        assertEquals(3, result.participants.size)
        assertEquals(listOf("you", "team_b", "team_c"), result.participants.map { it.teamId })
        assertEquals("Jonathan Taylor", result.participants[0].sends.players.first().name)
        assertEquals("Tyjae Spears", result.participants[0].receives.players.first().name)
        assertEquals(3, result.submission.steps.size)
        assertEquals("split_handoff", result.submission.mode)
    }

    @Test
    fun `three-team headline never mints a verdict`() {
        assertEquals("This favors you", omenTradeThreeTeamRead(threeTeamFixture(verdictState = "favors_you")).headline)
        assertEquals("Omen can't call this one", omenTradeThreeTeamRead(threeTeamFixture(verdictState = "insufficient_data")).headline)
    }

    /**
     * One [TradeThreeTeamLeg] per pairwise transfer, exactly as `TradePartnerPicker` /
     * `TradeRoster`'s recipient chooser would build them for the ring example T1's own test
     * fixture uses.
     */
    private fun ringOffer(): TradeThreeTeamOffer = TradeThreeTeamOffer(
        legs = listOf(
            TradeThreeTeamLeg("you", null, "team_b", "Davante's Inferno", listOf(TradePlayer("Jonathan Taylor", "RB", "IND"))),
            TradeThreeTeamLeg("team_b", "Davante's Inferno", "team_c", "Chubb Rock", listOf(TradePlayer("Ja'Marr Chase", "WR", "CIN"))),
            TradeThreeTeamLeg("team_c", "Chubb Rock", "you", null, listOf(TradePlayer("Tyjae Spears", "RB", "TEN"))),
        ),
    )

    /**
     * `TradeBuildThreeTeam-v1.md`: one block per participant that sends something, headed by
     * that participant, in `teamOrder` order.
     */
    @Test
    fun `three-team sides produce one block per sending participant in order`() {
        val sides = omenTradeThreeTeamSides(ringOffer(), "you", listOf("you", "team_b", "team_c"))

        assertEquals(listOf("You send", "Davante's Inferno sends", "Chubb Rock sends"), sides.map { it.heading })
        assertEquals("Jonathan Taylor", sides[0].legs.first().name)
        assertEquals("Ja'Marr Chase", sides[1].legs.first().name)
        assertEquals("Tyjae Spears", sides[2].legs.first().name)
    }

    /**
     * The middle leg touches neither the viewer's outgoing nor incoming pile.
     * `TradeBuildThreeTeam-v1.md`'s new third direction state: blank label, but still announced
     * to TalkBack rather than silently absent.
     */
    @Test
    fun `a leg touching neither side of the viewer is lateral and blank`() {
        val sides = omenTradeThreeTeamSides(ringOffer(), "you", listOf("you", "team_b", "team_c"))
        val middleLeg = sides[1].legs[0]

        assertEquals(OmenTradeLeg.Direction.Lateral, middleLeg.direction)
        assertEquals("", middleLeg.label)
        assertEquals("Not sent or received by you", middleLeg.accessibilityDirection)

        assertEquals(OmenTradeLeg.Direction.Sending, sides[0].legs[0].direction)
        assertEquals(OmenTradeLeg.Direction.Receiving, sides[2].legs[0].direction)
    }

    @Test
    fun `meta carries the destination suffix only when the recipient is not the viewer`() {
        val sides = omenTradeThreeTeamSides(ringOffer(), "you", listOf("you", "team_b", "team_c"))

        assertEquals("RB · IND → Davante's Inferno", sides[0].legs[0].meta)
        assertEquals("WR · CIN → Chubb Rock", sides[1].legs[0].meta)
        assertEquals("RB · TEN", sides[2].legs[0].meta)
    }

    @Test
    fun `only sending participants get a block`() {
        val offer = TradeThreeTeamOffer(
            legs = listOf(TradeThreeTeamLeg("you", null, "team_b", "Davante's Inferno", listOf(TradePlayer("A")))),
        )
        val sides = omenTradeThreeTeamSides(offer, "you", listOf("you", "team_b"))
        assertEquals(1, sides.size)
        assertEquals("You send", sides[0].heading)
    }

    @Test
    fun `three-team request body matches T1's documented legs shape`() {
        val body = JSONObject(ringOffer().requestBody())
        val legs = body.getJSONArray("legs")
        assertEquals(3, legs.length())
        val first = legs.getJSONObject(0)
        assertEquals("you", first.getString("from"))
        assertEquals("team_b", first.getString("to"))
        assertEquals("Davante's Inferno", first.getString("to_name"))
        assertEquals("Jonathan Taylor", first.getJSONArray("players").getJSONObject(0).getString("name"))
    }

    @Test
    fun `team ids and three-team shape detection`() {
        assertTrue(ringOffer().isThreeTeamShape)
        assertEquals(listOf("you", "team_b", "team_c"), ringOffer().teamIds)

        val twoTeamLooking = TradeThreeTeamOffer(
            legs = listOf(
                TradeThreeTeamLeg("you", null, "team_b", null, listOf(TradePlayer("A"))),
                TradeThreeTeamLeg("team_b", null, "you", null, listOf(TradePlayer("B"))),
            ),
        )
        assertFalse(twoTeamLooking.isThreeTeamShape)
    }
}
