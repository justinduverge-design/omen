package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerPreviewState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M5-Native-API-Client slice E — `GET /api/moves` → `moves-history.v1`.
 * Swift twin: `MovesHistoryTests.swift`. The two must map the same rows the same way.
 *
 * The JSON here is shaped by `normalizeMove()` in `src/routes/moves.js`, the only writer of
 * this contract. Pure mapping, so it lives in `:app/src/test` rather than on an emulator.
 */
class MovesHistoryTest {

    private fun parse(json: String): MovesHistory =
        requireNotNull(MovesHistory.parse(json)) { "history failed to parse: $json" }

    @Test
    fun decodesAFullyPopulatedRow() {
        val history = parse(
            """
            {
              "contract_version": "moves-history.v1",
              "generated_at": "2026-10-14T12:00:00Z",
              "season": 2026,
              "summary": {"wins":2,"losses":1,"pending":1,"avg_effectiveness_pct":58,"followed_count":3,"total_count":4},
              "moves": [{
                "id": 7, "season": 2026, "week": 6, "move_type": "waiver",
                "recommendation": "Add Tyrone Tracy Jr.", "followed": true, "stars": 4,
                "outcome": "win", "effectiveness_pct": 71.6, "created_at": "2026-10-14T12:00:00Z"
              }]
            }
            """.trimIndent(),
        )

        assertEquals("moves-history.v1", history.contractVersion)
        assertEquals(58, history.summary?.avgEffectivenessPct)

        val state = history.ledgerState as OmenLedgerPreviewState.Entries
        assertEquals("7", state.entries[0].id)
        assertEquals("WEEK 6", state.entries[0].period)
        assertEquals("WAIVER", state.entries[0].callType)
        assertEquals("Add Tyrone Tracy Jr.", state.entries[0].summary)
        assertEquals("Outcome: win · followed · 72% effective", state.entries[0].outcome)
    }

    /**
     * Every nullable field null at once — the ordinary shape of a freshly written row. `org.json`
     * would coerce these to `0` / `""` / `false`, which is exactly how a missing grade becomes a
     * fabricated one, so this is the test that keeps the null-preserving readers honest.
     */
    @Test
    fun decodesARowWithEveryOptionalFieldNull() {
        val history = parse(
            """
            {
              "contract_version": "moves-history.v1", "season": 2026, "summary": null,
              "moves": [{
                "id": 9, "season": 2026, "week": 3, "move_type": null,
                "recommendation": "Bench Kyren Williams this week", "followed": null,
                "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null
              }]
            }
            """.trimIndent(),
        )

        val move = history.moves.single()
        assertNull(move.moveType)
        assertNull(move.followed)
        assertNull(move.effectivenessPct)
        assertNull(history.summary)

        val state = history.ledgerState as OmenLedgerPreviewState.Entries
        // Generic, because naming an unlabelled row "WAIVER" would assert advice never given.
        assertEquals("MOVE", state.entries[0].callType)
        assertEquals("Outcome pending", state.entries[0].outcome)
    }

    @Test
    fun rowWithoutARecommendationIsDroppedRatherThanRenderedBlank() {
        val history = parse(
            """
            {
              "contract_version": "moves-history.v1", "season": 2026, "summary": null,
              "moves": [
                {"id": 1, "season": 2026, "week": 6, "move_type": "waiver", "recommendation": null,
                 "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null},
                {"id": 2, "season": 2026, "week": 6, "move_type": "waiver", "recommendation": "Add Jaylen Wright",
                 "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null}
              ]
            }
            """.trimIndent(),
        )

        val state = history.ledgerState as OmenLedgerPreviewState.Entries
        assertEquals(listOf("2"), state.entries.map { it.id })
    }

    @Test
    fun idDecodesFromEitherANumberOrAString() {
        val history = parse(
            """
            {
              "contract_version": "moves-history.v1", "season": 2026, "summary": null,
              "moves": [
                {"id": 12, "season": 2026, "week": 1, "move_type": "trade", "recommendation": "Hold",
                 "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null},
                {"id": "b6f0-uuid", "season": 2026, "week": 2, "move_type": "trade", "recommendation": "Sell",
                 "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null}
              ]
            }
            """.trimIndent(),
        )

        val state = history.ledgerState as OmenLedgerPreviewState.Entries
        assertEquals(listOf("12", "b6f0-uuid"), state.entries.map { it.id })
    }

    @Test
    fun emptyMoveListIsTheEmptyStateNotAnError() {
        val history = parse(
            """{"contract_version":"moves-history.v1","season":2026,"summary":null,"moves":[]}""",
        )

        assertTrue(history.ledgerState is OmenLedgerPreviewState.Empty)
    }

    /**
     * `buildSummary()` only counts effectiveness for followed, decided moves. The row line
     * mirrors that rule rather than pairing a score with a move the user never made.
     */
    @Test
    fun effectivenessIsOnlyShownForAFollowedDecidedMove() {
        val unfollowed = MovesHistory.Move(
            id = "1", season = 2026, week = 4, moveType = "start_sit",
            recommendation = "Start Bijan Robinson", followed = false, stars = null,
            outcome = "win", effectivenessPct = 88.0, createdAt = null,
        )
        assertEquals("Outcome: win · not followed", MovesHistory.outcomeTextFor(unfollowed))

        val pendingWithScore = unfollowed.copy(followed = true, outcome = "pending")
        assertEquals("Outcome pending · followed", MovesHistory.outcomeTextFor(pendingWithScore))
    }

    /** An unfamiliar outcome is shown verbatim rather than hidden behind a plausible word. */
    @Test
    fun unrecognisedOutcomeIsShownVerbatim() {
        val move = MovesHistory.Move(
            id = "3", season = 2026, week = 5, moveType = null,
            recommendation = "Claim Jordan Mason", followed = null, stars = null,
            outcome = "voided", effectivenessPct = null, createdAt = null,
        )
        assertEquals("Outcome: voided", MovesHistory.outcomeTextFor(move))
    }

    @Test
    fun missingWeekFallsBackToTheSeasonLabel() {
        val history = parse(
            """
            {
              "contract_version": "moves-history.v1", "season": 2026, "summary": null,
              "moves": [{"id": 5, "season": 2026, "week": null, "move_type": "waiver",
                         "recommendation": "Stash Ray Davis", "followed": null, "stars": null,
                         "outcome": "pending", "effectiveness_pct": null, "created_at": null}]
            }
            """.trimIndent(),
        )

        val state = history.ledgerState as OmenLedgerPreviewState.Entries
        assertEquals("2026 SEASON", state.entries[0].period)
    }

    /** Malformed JSON fails safe to null so the caller renders an honest error, not a crash. */
    @Test
    fun malformedPayloadReturnsNullRatherThanThrowing() {
        assertNull(MovesHistory.parse("not json at all"))
    }
}
