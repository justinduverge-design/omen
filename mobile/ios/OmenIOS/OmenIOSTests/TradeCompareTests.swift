import XCTest
@testable import Omen

/// `trade-compare.v2` decoding and the Trade destination's verdict rules.
///
/// The contract exists because the engine emits three verdicts and the approved vocabulary has
/// four. The fourth is reachable only through the server's `evaluability` signal — so the
/// single most important property here is that **the client never mints a verdict**.
final class TradeCompareTests: XCTestCase {

    private func decode(
        verdictState: String,
        evaluability: String = #"{"status":"evaluable","reason":null,"missing_projection_count":0,"total_player_count":2}"#,
        analysis: String = #"{"mode":"neutral","platform":null,"league_id":null,"league_name":null,"applied":[],"unavailable_reason":null}"#,
        netValue: String = "4.2"
    ) throws -> TradeCompare {
        try JSONDecoder().decode(TradeCompare.self, from: Data("""
        {
          "contract_version": "trade-compare.v2",
          "verdict_state": "\(verdictState)",
          "evaluability": \(evaluability),
          "analysis_context": \(analysis),
          "net_value": \(netValue),
          "explanation": null
        }
        """.utf8))
    }

    func testAllFourApprovedVerdictStatesDecode() throws {
        let expected: [(String, TradeCompare.VerdictState)] = [
            ("favors_you", .favorsYou),
            ("you_give_up_too_much", .youGiveUpTooMuch),
            ("close_needs_context", .closeNeedsContext),
            ("insufficient_data", .insufficientData),
        ]
        for (raw, state) in expected {
            XCTAssertEqual(try decode(verdictState: raw).verdictState, state)
        }
    }

    /// An unrecognized state must degrade to the honest non-answer. Degrading to a *verdict*
    /// would be the client issuing a call the server did not make.
    func testAnUnknownVerdictStateDegradesToTheNonAnswer() throws {
        let result = try decode(verdictState: "definitely_take_it")

        XCTAssertEqual(result.verdictState, .insufficientData)
        XCTAssertEqual(result.headline, "Omen can't call this one")
    }

    /// §9.4: name incomplete input, do not force a verdict. The count is stated so the user
    /// knows how much is missing.
    func testInsufficientDataNamesWhatIsMissing() throws {
        let result = try decode(
            verdictState: "insufficient_data",
            evaluability: #"{"status":"insufficient_data","reason":"missing_projections","missing_projection_count":2,"total_player_count":3}"#
        )

        XCTAssertFalse(result.evaluability.isEvaluable)
        XCTAssertEqual(result.subhead, "Omen has no projection for 2 of these players, so it won't force a verdict.")
    }

    func testSingularCopyWhenExactlyOneProjectionIsMissing() throws {
        let result = try decode(
            verdictState: "insufficient_data",
            evaluability: #"{"status":"insufficient_data","reason":"missing_projections","missing_projection_count":1,"total_player_count":2}"#
        )

        XCTAssertTrue(result.subhead.contains("1 of these players"))
        XCTAssertFalse(result.subhead.contains("1 of these players,s"))
    }

    func testAnEmptyOfferAsksForPlayersRatherThanReportingAFailure() throws {
        let result = try decode(
            verdictState: "insufficient_data",
            evaluability: #"{"status":"insufficient_data","reason":"no_players","missing_projection_count":0,"total_player_count":0}"#
        )

        XCTAssertEqual(result.subhead, "Add players to both sides and Omen will look at it.")
    }

    /// A personalized answer must say so, and a neutral one must not imply it used the
    /// user's league.
    func testPersonalizedAndNeutralAnswersAreDistinguishable() throws {
        let neutral = try decode(verdictState: "favors_you")
        XCTAssertFalse(neutral.analysisContext.isPersonalized)
        XCTAssertEqual(neutral.subhead, "Based on standard scoring — not your league's settings.")

        let personalized = try decode(
            verdictState: "favors_you",
            analysis: #"{"mode":"personalized","platform":"sleeper","league_id":"1","league_name":"Slops Dynasty","applied":["scoring_format","roster_construction"],"unavailable_reason":null}"#
        )
        XCTAssertTrue(personalized.analysisContext.isPersonalized)
        XCTAssertEqual(personalized.subhead, "Based on your league's scoring and your roster.")
        XCTAssertEqual(personalized.analysisContext.applied.count, 2)
    }

    func testTheServerNamesWhyItCouldNotPersonalize() throws {
        let result = try decode(
            verdictState: "close_needs_context",
            analysis: #"{"mode":"neutral","platform":null,"league_id":null,"league_name":null,"applied":[],"unavailable_reason":"unauthenticated"}"#
        )

        // Silently returning a neutral answer the user believes is personalized is the
        // failure this field exists to prevent.
        XCTAssertEqual(result.analysisContext.unavailableReason, "unauthenticated")
    }

    // MARK: - Offer

    func testAnOfferIsNotComparableUntilBothSidesHaveAPlayer() {
        var offer = TradeOffer()
        XCTAssertFalse(offer.isComparable)

        offer.send = ["A.J. Brown"]
        XCTAssertFalse(offer.isComparable, "one-sided offers are not comparable")

        offer.receive = ["Garrett Wilson"]
        XCTAssertTrue(offer.isComparable)
    }

    /// The client may name which league to use. It may never send the roster, scoring rules,
    /// or settings — those are read server-side from the user's own stored connection.
    func testTheRequestBodyNamesTheLeagueAndSendsNoLeagueData() {
        var offer = TradeOffer()
        offer.send = ["A.J. Brown"]
        offer.receive = ["Garrett Wilson"]
        offer.leagueContext = .init(platform: "sleeper", leagueId: "league-1")

        let body = offer.requestBody
        let context = body["league_context"] as? [String: Any]

        XCTAssertEqual(context?["platform"] as? String, "sleeper")
        XCTAssertEqual(context?["league_id"] as? String, "league-1")
        XCTAssertEqual(context?.count, 2, "league_context carries an identity only, never league data")
        XCTAssertNil(body["scoring_format"], "native ships no scoring-format-only personalize affordance")
        XCTAssertNil(body["roster"])
    }

    func testAnOfferWithoutALeagueSendsNoContextAtAll() {
        var offer = TradeOffer()
        offer.send = ["A.J. Brown"]
        offer.receive = ["Garrett Wilson"]

        XCTAssertNil(offer.requestBody["league_context"])
    }

    /// `F-HOT-02`. `missing_projection_count`, `total_player_count` and `applied` were required
    /// on iOS and defaulted on Android, so a server release that legitimately omitted one —
    /// additive by the server's own rules — broke iOS Trade with a decode error while Android
    /// kept working. Same payload, two products.
    func testAPayloadOmittingAdditiveFieldsStillDecodes() throws {
        let json = Data("""
        {"contract_version":"trade-compare.v2","verdict_state":"favors_you",
         "evaluability":{"status":"evaluable","reason":null},
         "analysis_context":{"mode":"neutral","platform":null,"league_id":null,
           "league_name":null,"unavailable_reason":null},
         "net_value":4.2,"explanation":null}
        """.utf8)

        let result = try JSONDecoder().decode(TradeCompare.self, from: json)

        XCTAssertEqual(result.verdictState, .favorsYou)
        XCTAssertEqual(result.evaluability.missingProjectionCount, 0)
        XCTAssertEqual(result.evaluability.totalPlayerCount, 0)
        XCTAssertEqual(result.analysisContext.applied, [])
    }
}
