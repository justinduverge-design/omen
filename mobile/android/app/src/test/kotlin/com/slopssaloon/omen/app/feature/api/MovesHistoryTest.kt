package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerAction
import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerOutcome
import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerPreviewState
import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerProvenance
import com.slopssaloon.omen.app.feature.commandcenter.issuedLabel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
        // Was "Outcome: win · 72% effective" until J6; the fixture carries the raw column.
        assertEquals("Outcome not verified", state.entries[0].outcome)
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
     *
     * **Rewritten in J6.** It used to assert `"Outcome: win"` — the raw stored column, which
     * `CONTRACTS.md` says is translated and never surfaced raw.
     */
    @Test
    fun effectivenessIsOnlyShownForAFollowedDecidedMove() {
        val unfollowed = MovesHistory.Move(
            id = "1", season = 2026, week = 4, moveType = "start_sit",
            recommendation = "Start Bijan Robinson", followed = false, stars = null,
            outcome = "worked", effectivenessPct = 88.0, createdAt = null,
        )
        assertEquals("Verified outcome: worked", MovesHistory.outcomeTextFor(unfollowed))

        val followed = unfollowed.copy(followed = true)
        assertEquals("Verified outcome: worked · 88% effective", MovesHistory.outcomeTextFor(followed))

        val pendingWithScore = unfollowed.copy(followed = true, outcome = "pending")
        assertEquals("Outcome pending", MovesHistory.outcomeTextFor(pendingWithScore))
    }

    /**
     * **The raw stored column never reaches a reader.** J6's pinning test; the Swift twin is
     * `testARawWinOrLossIsNeverRenderedToTheUser`.
     *
     * `moves-history.v2` maps the raw column to `worked`/`did_not_work`/`not_verified`. This
     * asserts the client does not undo that if a v1-shaped payload arrives — and that it does
     * not translate `win` into "worked" itself, which would invent the verification that v2's
     * third value exists to withhold.
     */
    @Test
    fun aRawWinOrLossIsNeverRenderedToTheUser() {
        for (raw in listOf("win", "loss", "WIN", " Loss ")) {
            val move = MovesHistory.Move(
                id = "raw-$raw", season = 2026, week = 6, moveType = "start_sit",
                recommendation = "Start Bijan Robinson", followed = true, stars = null,
                outcome = raw, effectivenessPct = 88.0, createdAt = null,
            )
            val line = MovesHistory.outcomeTextFor(move)
            assertEquals("Outcome not verified", line)
            assertFalse("the raw token appeared in $line", line.lowercase().contains("win"))
            assertFalse("the raw token appeared in $line", line.lowercase().contains("loss"))
            assertFalse("an unverified outcome must not carry a score", line.contains("88%"))
        }
    }

    /**
     * An unfamiliar outcome is **not** shown verbatim.
     *
     * This test asserted the opposite until J6, on the argument that printing the token avoided
     * hiding a backend change. A backend change is visible in `contract_version` and in this
     * suite, and neither of those is the user's screen — `actionTextFor` already applied the
     * correct rule one function below.
     */
    @Test
    fun unrecognisedOutcomeIsNotPrintedVerbatim() {
        val move = MovesHistory.Move(
            id = "3", season = 2026, week = 5, moveType = null,
            recommendation = "Claim Jordan Mason", followed = null, stars = null,
            outcome = "voided", effectivenessPct = null, createdAt = null,
        )
        assertEquals("Outcome not verified", MovesHistory.outcomeTextFor(move))
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

    @Test
    fun v2KeepsVerifiedOutcomeAndSelfReportAsSeparateFacts() {
        val history = parse(
            """{"contract_version":"moves-history.v2","moves":[{"id":"receipt-1","week":2,"move_type":"trade","headline":"Accept the offer","followed":true,"action_provenance":"self_reported","provenance":"verified","outcome":"worked"}]}""",
        )
        val entry = (history.ledgerState as OmenLedgerPreviewState.Entries).entries.single()
        assertEquals("Accept the offer", entry.summary)
        assertEquals("Verified outcome: worked", entry.outcome)
        assertEquals("You reported following this call", entry.actionStatus)
        assertEquals("verified", entry.outcomeProvenance)
    }

    /**
     * The **structured** axis, pinned separately from the sentence.
     *
     * `outcomeTextFor` builds a line for the Ledger preview; `ledgerOutcomeFor` builds the value
     * `OmenLedgerScreen` renders as a chip. They are two functions and the raw column can leak
     * through either, so a test on the sentence alone would have left the J6 screens unguarded.
     * There is deliberately no `Win` case for this to map onto, and it must resolve to
     * `NotVerified` rather than `Worked` — translating would invent the verification that v2's
     * third value exists to withhold.
     *
     * Swift twin: `testARawWinIsNotPromotedToAVerifiedOutcomeOnTheStructuredAxis`.
     */
    @Test
    fun aRawWinIsNotPromotedToAVerifiedOutcomeOnTheStructuredAxis() {
        fun move(outcome: String) = MovesHistory.Move(
            id = "structured-$outcome", season = 2026, week = 4, moveType = "start_sit",
            recommendation = "Bench Kyren Williams", followed = true, stars = null,
            outcome = outcome, effectivenessPct = 88.0, createdAt = null,
        )
        for (raw in listOf("win", "WIN", " loss ", "loss", "voided")) {
            assertEquals(
                "raw $raw resolved to something other than NotVerified",
                OmenLedgerOutcome.NotVerified,
                MovesHistory.ledgerOutcomeFor(move(raw)),
            )
            assertEquals("Not verified", MovesHistory.ledgerOutcomeFor(move(raw)).label)
        }

        // And the values the server actually sends still map, so the loop above is not passing
        // by mapping everything to NotVerified.
        assertEquals(OmenLedgerOutcome.Worked, MovesHistory.ledgerOutcomeFor(move("worked")))
        assertEquals(OmenLedgerOutcome.DidNotWork, MovesHistory.ledgerOutcomeFor(move("did_not_work")))
        assertEquals(OmenLedgerOutcome.Pending, MovesHistory.ledgerOutcomeFor(move("pending")))
        assertEquals(OmenLedgerOutcome.NotVerified, MovesHistory.ledgerOutcomeFor(move("not_verified")))
    }

    /**
     * Self-reported action never becomes a verified one, on the structured axis either.
     *
     * An absent `followed` is `Unknown` rather than `Passed`: a roster Omen could not read is not
     * a roster the user declined to move.
     */
    @Test
    fun actionCarriesItsOwnProvenanceAndAnAbsentFollowedIsUnknown() {
        fun move(followed: Boolean?, provenance: String?) = MovesHistory.Move(
            id = "action", season = 2026, week = 4, moveType = "waiver",
            recommendation = "Claim Jaylen Wright", followed = followed,
            actionProvenance = provenance, provenance = null, stars = null,
            outcome = "pending", effectivenessPct = null, createdAt = null,
        )
        assertEquals(
            OmenLedgerAction.Followed(OmenLedgerProvenance.SelfReported),
            MovesHistory.actionFor(move(true, "self_reported")),
        )
        assertEquals(
            OmenLedgerAction.Passed(OmenLedgerProvenance.SelfReported),
            MovesHistory.actionFor(move(false, "self_reported")),
        )
        assertEquals(
            OmenLedgerAction.Followed(OmenLedgerProvenance.Verified),
            MovesHistory.actionFor(move(true, null)),
        )
        assertEquals(OmenLedgerAction.Unknown, MovesHistory.actionFor(move(null, "self_reported")))
        assertEquals(OmenLedgerAction.Unknown, MovesHistory.actionFor(move(null, null)))
    }

    /**
     * **A bare UTC timestamp is not an acceptable fallback**, and neither is a guessed zone.
     *
     * `CONTRACTS.md`: *"`issued_at` carries `issued_at_timezone`."* A receipt issued Tuesday
     * 3:00 AM Eastern is 07:00 UTC, and a user checking whether Omen called it before the waiver
     * ran would read the UTC rendering as the wrong day's answer.
     *
     * Android had the worse of the two bugs here: `LedgerReceipt` rendered
     * `"Issued $issuedAt · ${timezone ?: ...}"`, which put a raw ISO-8601 string in front of a
     * reader **and** showed a UTC wall clock beside a zone name it was not expressed in.
     */
    @Test
    fun theIssuedLabelIsZoneQualifiedOrSaysTheZoneIsMissing() {
        assertEquals("Issued Tue 3:00 AM", issuedLabel("2026-09-29T07:00:00Z", "America/New_York"))

        val noZone = issuedLabel("2026-09-29T07:00:00Z", null)
        assertEquals("Issue time zone unavailable", noZone)
        assertFalse("the UTC wall clock leaked into the fallback", noZone.contains("7:00"))

        // An unknown zone identifier is the same refusal, not a silent fall back to UTC.
        assertEquals("Issue time zone unavailable", issuedLabel("2026-09-29T07:00:00Z", "Mars/Olympus"))
        assertEquals("Issue time not recorded", issuedLabel(null, "America/New_York"))
        assertEquals("Issue time not recorded", issuedLabel("not a date", "America/New_York"))
    }

    /**
     * The two artboards get their own words from one set of cases.
     *
     * `Ledger.dc.html` draws "Followed"; `LedgerDetail.dc.html` draws "You followed it". Sharing
     * one string across both was drift against an approved artboard, and splitting the *cases*
     * instead of the *words* would have reintroduced exactly the merge the Ledger's rule forbids.
     */
    @Test
    fun theTwoVoicesDifferInWordsAndNotInCases() {
        val followed = OmenLedgerAction.Followed(OmenLedgerProvenance.Verified)
        assertEquals("Followed", followed.label(OmenLedgerAction.Voice.Row))
        assertEquals("You followed it", followed.label(OmenLedgerAction.Voice.Receipt))
        assertEquals("Didn\u2019t work", OmenLedgerOutcome.DidNotWork.label(OmenLedgerAction.Voice.Row))
        assertEquals("It did not work", OmenLedgerOutcome.DidNotWork.label(OmenLedgerAction.Voice.Receipt))
        // Statements rather than verdicts read correctly in both registers and stay one string.
        for (voice in OmenLedgerAction.Voice.entries) {
            assertEquals("Not verified", OmenLedgerOutcome.NotVerified.label(voice))
            assertEquals("Follow-through unknown", OmenLedgerAction.Unknown.label(voice))
        }
    }

}
