import XCTest
@testable import Omen

/// M5-Native-API-Client slice E — `moves-history.v1` decoding and Ledger mapping.
///
/// The JSON in these tests is shaped by `normalizeMove()` in `src/routes/moves.js`, which is
/// the only writer of this contract.
final class MovesHistoryTests: XCTestCase {
    private func decode(_ json: String) throws -> MovesHistory {
        try JSONDecoder().decode(MovesHistory.self, from: Data(json.utf8))
    }

    func testDecodesAFullyPopulatedRow() throws {
        let history = try decode("""
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
        """)

        XCTAssertEqual(history.contractVersion, "moves-history.v1")
        XCTAssertEqual(history.summary?.avgEffectivenessPct, 58)
        XCTAssertEqual(history.moves.count, 1)

        guard case .entries(let entries) = history.ledgerState else {
            return XCTFail("expected entries")
        }
        XCTAssertEqual(entries[0].id, "7")
        XCTAssertEqual(entries[0].period, "WEEK 6")
        XCTAssertEqual(entries[0].callType, "WAIVER")
        XCTAssertEqual(entries[0].summary, "Add Tyrone Tracy Jr.")
        XCTAssertEqual(entries[0].outcome, "Outcome: win · followed · 72% effective")
    }

    /// Every nullable field null at once — the ordinary shape of a freshly written row. This
    /// must decode, because a `.decode` failure would tell the user their Ledger is unreadable
    /// when the truth is that the move simply has not been graded yet.
    func testDecodesARowWithEveryOptionalFieldNull() throws {
        let history = try decode("""
        {
          "contract_version": "moves-history.v1",
          "season": 2026,
          "summary": null,
          "moves": [{
            "id": 9, "season": 2026, "week": 3, "move_type": null,
            "recommendation": "Bench Kyren Williams this week", "followed": null,
            "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null
          }]
        }
        """)

        guard case .entries(let entries) = history.ledgerState else {
            return XCTFail("expected entries")
        }
        // Generic, because naming an unlabelled row "WAIVER" would assert advice never given.
        XCTAssertEqual(entries[0].callType, "MOVE")
        XCTAssertEqual(entries[0].outcome, "Outcome pending")
    }

    /// `recommendation` is `headline || reasoning || null`. Null means the row has no sentence
    /// at all, and a Ledger line reading only "WEEK 6 · WAIVER" looks like a rendering bug.
    func testRowWithoutARecommendationIsDroppedRatherThanRenderedBlank() throws {
        let history = try decode("""
        {
          "contract_version": "moves-history.v1", "season": 2026, "summary": null,
          "moves": [
            {"id": 1, "season": 2026, "week": 6, "move_type": "waiver", "recommendation": null,
             "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null},
            {"id": 2, "season": 2026, "week": 6, "move_type": "waiver", "recommendation": "Add Jaylen Wright",
             "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null}
          ]
        }
        """)

        guard case .entries(let entries) = history.ledgerState else {
            return XCTFail("one bad row must not blank the section")
        }
        XCTAssertEqual(entries.map(\.id), ["2"])
    }

    /// `moves.id` is a Supabase key. Both JSON shapes decode so a future column-type change
    /// cannot silently blank a user's Ledger.
    func testIdDecodesFromEitherANumberOrAString() throws {
        let history = try decode("""
        {
          "contract_version": "moves-history.v1", "season": 2026, "summary": null,
          "moves": [
            {"id": 12, "season": 2026, "week": 1, "move_type": "trade", "recommendation": "Hold",
             "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null},
            {"id": "b6f0-uuid", "season": 2026, "week": 2, "move_type": "trade", "recommendation": "Sell",
             "followed": null, "stars": null, "outcome": "pending", "effectiveness_pct": null, "created_at": null}
          ]
        }
        """)

        XCTAssertEqual(history.ledgerState.entries.map(\.id), ["12", "b6f0-uuid"])
    }

    func testEmptyMoveListIsTheEmptyStateNotAnError() throws {
        let history = try decode("""
        {"contract_version":"moves-history.v1","season":2026,"summary":null,"moves":[]}
        """)

        guard case .empty = history.ledgerState else {
            return XCTFail("an empty list is a real answer")
        }
    }

    /// `buildSummary()` only counts effectiveness for followed, decided moves. The row line
    /// mirrors that rule rather than pairing a score with a move the user never made.
    func testEffectivenessIsOnlyShownForAFollowedDecidedMove() throws {
        let unfollowed = MovesHistory.Move(
            id: .int(1), season: 2026, week: 4, moveType: "start_sit",
            recommendation: "Start Bijan Robinson", followed: false, stars: nil,
            outcome: "win", effectivenessPct: 88, createdAt: nil
        )
        XCTAssertEqual(MovesHistory.outcomeText(for: unfollowed), "Outcome: win · not followed")

        let pendingWithScore = MovesHistory.Move(
            id: .int(2), season: 2026, week: 4, moveType: "start_sit",
            recommendation: "Start Bijan Robinson", followed: true, stars: nil,
            outcome: "pending", effectivenessPct: 88, createdAt: nil
        )
        XCTAssertEqual(MovesHistory.outcomeText(for: pendingWithScore), "Outcome pending · followed")
    }

    /// An outcome this version has never seen is shown verbatim rather than bucketed into
    /// "pending", which would hide a real backend change behind a plausible-looking word.
    func testUnrecognisedOutcomeIsShownVerbatim() throws {
        let move = MovesHistory.Move(
            id: .int(3), season: 2026, week: 5, moveType: nil,
            recommendation: "Claim Jordan Mason", followed: nil, stars: nil,
            outcome: "voided", effectivenessPct: nil, createdAt: nil
        )
        XCTAssertEqual(MovesHistory.outcomeText(for: move), "Outcome: voided")
    }

    /// Week is typed optional by the contract; a season alone is still a true period label.
    func testMissingWeekFallsBackToTheSeasonLabel() throws {
        let history = try decode("""
        {
          "contract_version": "moves-history.v1", "season": 2026, "summary": null,
          "moves": [{"id": 5, "season": 2026, "week": null, "move_type": "waiver",
                     "recommendation": "Stash Ray Davis", "followed": null, "stars": null,
                     "outcome": "pending", "effectiveness_pct": null, "created_at": null}]
        }
        """)

        XCTAssertEqual(history.ledgerState.entries.first?.period, "2026 SEASON")
    }
}
