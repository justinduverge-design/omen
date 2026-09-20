import XCTest
@testable import Omen

/// M5-Native-API-Client slice E — `moves-history.v2` decoding and Ledger mapping.
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
        // Was "Outcome: win · 72% effective" until J6. The fixture below still carries the raw
        // column, which is exactly the payload shape the client must not surface.
        XCTAssertEqual(entries[0].outcome, "Outcome not verified")
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
    ///
    /// **Rewritten in J6.** It used to assert `"Outcome: win"` — the raw stored column, which
    /// `CONTRACTS.md` says is translated and never surfaced raw. A decided outcome under
    /// `moves-history.v2` is `worked` / `did_not_work`, and that is what carries the score now.
    func testEffectivenessIsOnlyShownForAFollowedDecidedMove() throws {
        let unfollowed = MovesHistory.Move(
            id: .int(1), season: 2026, week: 4, moveType: "start_sit",
            recommendation: "Start Bijan Robinson", followed: false, stars: nil,
            outcome: "worked", effectivenessPct: 88, createdAt: nil
        )
        XCTAssertEqual(MovesHistory.outcomeText(for: unfollowed), "Verified outcome: worked")

        let followed = MovesHistory.Move(
            id: .int(4), season: 2026, week: 4, moveType: "start_sit",
            recommendation: "Start Bijan Robinson", followed: true, stars: nil,
            outcome: "worked", effectivenessPct: 88, createdAt: nil
        )
        XCTAssertEqual(MovesHistory.outcomeText(for: followed), "Verified outcome: worked · 88% effective")

        let pendingWithScore = MovesHistory.Move(
            id: .int(2), season: 2026, week: 4, moveType: "start_sit",
            recommendation: "Start Bijan Robinson", followed: true, stars: nil,
            outcome: "pending", effectivenessPct: 88, createdAt: nil
        )
        XCTAssertEqual(MovesHistory.outcomeText(for: pendingWithScore), "Outcome pending")
    }

    /// **The raw stored column never reaches a reader.** J6's pinning test, and the reason the
    /// two tests around it changed.
    ///
    /// `CONTRACTS.md`: the stored `outcome` column holds raw `win`/`loss` and *"is translated,
    /// never surfaced raw"*. `moves-history.v2` does that translating; this asserts the client
    /// does not undo it if a v1-shaped payload arrives anyway.
    ///
    /// It also asserts the client does **not** translate `win` into "worked". v2's mapping has
    /// three outputs, and inventing the verification would be a worse failure than showing none.
    func testARawWinOrLossIsNeverRenderedToTheUser() throws {
        for raw in ["win", "loss", "WIN", " Loss "] {
            let move = MovesHistory.Move(
                id: .string("raw-\(raw)"), season: 2026, week: 6, moveType: "start_sit",
                recommendation: "Start Bijan Robinson", followed: true, stars: nil,
                outcome: raw, effectivenessPct: 88, createdAt: nil
            )
            let line = MovesHistory.outcomeText(for: move)
            XCTAssertEqual(line, "Outcome not verified", "raw \(raw) leaked into the Ledger line")
            XCTAssertFalse(line.lowercased().contains("win"), "the raw token appeared in \(line)")
            XCTAssertFalse(line.lowercased().contains("loss"), "the raw token appeared in \(line)")
            XCTAssertFalse(line.contains("88%"), "an unverified outcome must not carry a score")
        }
    }

    /// An outcome this version has never seen is **not** printed verbatim.
    ///
    /// The previous version of this test asserted the opposite, on the argument that showing the
    /// token avoided hiding a backend change. A backend change is visible in `contract_version`
    /// and in this suite; neither of those is the user's screen, and `actionTextFor` already
    /// applied the correct rule one function below.
    func testUnrecognisedOutcomeIsNotPrintedVerbatim() throws {
        let move = MovesHistory.Move(
            id: .int(3), season: 2026, week: 5, moveType: nil,
            recommendation: "Claim Jordan Mason", followed: nil, stars: nil,
            outcome: "voided", effectivenessPct: nil, createdAt: nil
        )
        XCTAssertEqual(MovesHistory.outcomeText(for: move), "Outcome not verified")
    }

    /// `move-detail.v1` is asserted, not assumed. Android has done this since slice E.
    func testAReceiptWithoutItsContractVersionDoesNotDecode() throws {
        let payload = """
        {"snapshot":{"recommendation":"Bench Kyren Williams","issued_at":"2026-10-07T07:00:00Z","issued_at_timezone":"America/New_York"},
         "evidence_at_the_time":[],"user_action":{"known":true,"statement":"You followed it"},
         "observed_outcome":{"known":true,"statement":"It did not work"},"fairness_note":"Losses stay in the Ledger."}
        """
        XCTAssertThrowsError(try JSONDecoder().decode(MoveReceipt.self, from: Data(payload.utf8)))

        let versioned = """
        {"contract_version":"move-detail.v1",
         "snapshot":{"recommendation":"Bench Kyren Williams","issued_at":"2026-10-07T07:00:00Z","issued_at_timezone":"America/New_York"},
         "evidence_at_the_time":[{"kind":"verified","statement":"Snap share fell to 54%."}],
         "user_action":{"known":true,"statement":"You followed it"},
         "observed_outcome":{"known":true,"statement":"It did not work"},
         "fairness_note":"Losses stay in the Ledger."}
        """
        let receipt = try JSONDecoder().decode(MoveReceipt.self, from: Data(versioned.utf8))
        XCTAssertEqual(receipt.snapshot.issuedAtTimezone, "America/New_York")
        XCTAssertEqual(receipt.evidenceAtTheTime.count, 1)
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

    func testV2KeepsVerifiedOutcomeAndSelfReportAsSeparateFacts() throws {
        let history = try decode("""
        {"contract_version":"moves-history.v2","moves":[{"id":"receipt-1","week":2,"move_type":"trade","headline":"Accept the offer","followed":true,"action_provenance":"self_reported","provenance":"verified","outcome":"worked"}]}
        """)
        guard case .entries(let entries) = history.ledgerState, let entry = entries.first else {
            return XCTFail("expected a Ledger receipt")
        }
        XCTAssertEqual(entry.summary, "Accept the offer")
        XCTAssertEqual(entry.outcome, "Verified outcome: worked")
        XCTAssertEqual(entry.actionStatus, "You reported following this call")
        XCTAssertEqual(entry.outcomeProvenance, "verified")
    }
}
