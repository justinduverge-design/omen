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

        offer.send = [TradePlayer(name: "A.J. Brown", position: "WR", team: "PHI")]
        XCTAssertFalse(offer.isComparable, "one-sided offers are not comparable")

        offer.receive = [TradePlayer(name: "Garrett Wilson", position: "WR", team: "NYJ")]
        XCTAssertTrue(offer.isComparable)
    }

    /// The client may name which league to use. It may never send the roster, scoring rules,
    /// or settings — those are read server-side from the user's own stored connection.
    func testTheRequestBodyNamesTheLeagueAndSendsNoLeagueData() {
        var offer = TradeOffer()
        offer.send = [TradePlayer(name: "A.J. Brown", position: "WR", team: "PHI")]
        offer.receive = [TradePlayer(name: "Garrett Wilson", position: "WR", team: "NYJ")]
        offer.leagueContext = .init(platform: "sleeper", leagueId: "league-1")

        let body = offer.requestBody
        let context = body["league_context"] as? [String: Any]

        XCTAssertEqual(context?["platform"] as? String, "sleeper")
        XCTAssertEqual(context?["league_id"] as? String, "league-1")
        XCTAssertEqual(context?.count, 2, "league_context carries an identity only, never league data")
        XCTAssertNil(body["scoring_format"], "native ships no scoring-format-only personalize affordance")
        XCTAssertNil(body["roster"])
    }

    /// The defect that made every Compare fail. `POST /api/trade/compare` validates
    /// `each player must be an object` and answers a bare string with a 400 — so the screen
    /// showed "Omen couldn't compare this", an error surface, in place of the honest
    /// `insufficient_data` answer. Verified against the live route: a string payload returns
    /// `{"error":"each player must be an object"}`, an object payload returns a real analysis.
    func testEachPlayerIsSentAsAnObjectAndNotABareName() {
        var offer = TradeOffer()
        offer.send = [TradePlayer(name: "Justin Jefferson", position: "WR", team: "MIN", playerKey: "sleeper:6794")]
        offer.receive = [TradePlayer(name: "Chase Brown", position: "RB", team: "CIN")]

        let send = offer.requestBody["send"] as? [[String: Any]]
        XCTAssertNotNil(send, "send must be an array of objects — a bare string is a 400")
        XCTAssertEqual(send?.first?["name"] as? String, "Justin Jefferson")
        // Carried so the server can verify canonical identity before scoring.
        XCTAssertEqual(send?.first?["position"] as? String, "WR")
        XCTAssertEqual(send?.first?["team"] as? String, "MIN")
        XCTAssertEqual(send?.first?["player_key"] as? String, "sleeper:6794")
    }

    /// A hand-typed name has no position, and that must stay legal rather than being padded
    /// with an invented one. The server resolves an exact name or refuses it before scoring.
    func testAHandTypedNameSendsOnlyTheName() {
        let payload = TradePlayer(name: "Some Guy").payload

        XCTAssertEqual(payload["name"] as? String, "Some Guy")
        XCTAssertNil(payload["position"], "never invent a position the user did not give")
        XCTAssertNil(payload["team"])
        XCTAssertNil(payload["player_key"])
    }

    /// Picking from autocomplete must keep what the rows already carried. The client had this
    /// data on screen and discarded it on the way into the offer.
    func testPickingFromAutocompleteKeepsPositionTeamAndProviderId() {
        let result = PlayerSearchResult(id: "sleeper:6794", name: "Justin Jefferson", position: "WR", team: "MIN")

        let player = TradePlayer(result)

        XCTAssertEqual(player.name, "Justin Jefferson")
        XCTAssertEqual(player.position, "WR")
        XCTAssertEqual(player.team, "MIN")
        XCTAssertEqual(player.playerKey, "sleeper:6794")
    }

    func testAnOfferWithoutALeagueSendsNoContextAtAll() {
        var offer = TradeOffer()
        offer.send = [TradePlayer(name: "A.J. Brown", position: "WR", team: "PHI")]
        offer.receive = [TradePlayer(name: "Garrett Wilson", position: "WR", team: "NYJ")]

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

    // MARK: - F-DEV-03 — player search

    func testFuzzySearchRowsDecodeAsExplicitSuggestions() throws {
        let json = Data("""
        [{"id":"sleeper:12527","name":"Jaxson Dart","position":"QB","team":"NYG",
          "projected_points":null,"match_type":"fuzzy"}]
        """.utf8)

        let rows = try JSONDecoder().decode([PlayerSearchResult].self, from: json)

        XCTAssertEqual(rows.count, 1)
        XCTAssertTrue(rows[0].isFuzzySuggestion)
        XCTAssertEqual(rows[0].name, "Jaxson Dart")
    }

    /// The query must go through `URLComponents`, never interpolated into the path.
    /// `URL.appendingPathComponent` treats the whole string as ONE path segment and
    /// percent-encodes the `?`, so `search?q=x` shipped as `search%3Fq=x` and 404'd every time.
    /// Found by the founder typing a name into a real build; invisible in every prior test
    /// because no test had ever performed a search.
    func testPlayerSearchBuildsAQueryStringRatherThanEscapingItIntoThePath() async {
        final class CapturingFetcher: OmenHTTPFetching {
            var lastURL: URL?
            func data(for request: URLRequest) async throws -> (Data, URLResponse) {
                lastURL = request.url
                let response = HTTPURLResponse(
                    url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil
                )!
                return (Data("[]".utf8), response)
            }
        }

        let fetcher = CapturingFetcher()
        let client = OmenApiClient(baseURL: URL(string: "https://example.com")!, fetcher: fetcher)
        _ = await ApiPlayerSearchRepository(client: client).search(query: "jefferson")

        let url = try? XCTUnwrap(fetcher.lastURL)
        XCTAssertEqual(url?.path, "/api/players/search", "the path must not carry the query")
        XCTAssertEqual(url?.query, "q=jefferson")
        XCTAssertFalse(
            url?.absoluteString.contains("%3F") ?? true,
            "a percent-encoded ? means the query was escaped into the path — the original defect"
        )
    }

    /// A one-character query must not hit the network: the route is rate limited at 300/min/IP
    /// and a per-keystroke request would burn that on a single name.
    func testAShortQueryIsNotSentAtAll() async {
        final class CountingFetcher: OmenHTTPFetching {
            var calls = 0
            func data(for request: URLRequest) async throws -> (Data, URLResponse) {
                calls += 1
                let response = HTTPURLResponse(
                    url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil
                )!
                return (Data("[]".utf8), response)
            }
        }

        let fetcher = CountingFetcher()
        let client = OmenApiClient(baseURL: URL(string: "https://example.com")!, fetcher: fetcher)
        let repo = ApiPlayerSearchRepository(client: client)

        _ = await repo.search(query: "j")
        _ = await repo.search(query: "  ")
        XCTAssertEqual(fetcher.calls, 0)
    }

    /// The subtitle omits the separator entirely when the provider gives neither field, rather
    /// than rendering a stray "·".
    func testPlayerSubtitleOmitsAStraySeparator() {
        XCTAssertEqual(
            PlayerSearchResult(id: "1", name: "A", position: "WR", team: "MIN").subtitle,
            "WR · MIN"
        )
        XCTAssertEqual(
            PlayerSearchResult(id: "2", name: "B", position: "RB", team: nil).subtitle,
            "RB"
        )
        XCTAssertNil(PlayerSearchResult(id: "3", name: "C", position: nil, team: nil).subtitle)
    }

    // MARK: - T5: three-team trade builder

    /// Fixture matching `omen-t1-three-team-capability`'s documented `legs`-branch response
    /// (`test/tradeRoute.test.js`'s ring example) exactly, since that route is unmerged and this
    /// type is built against the documented shape rather than a live server.
    private func threeTeamFixture(
        verdictState: String = "favors_you",
        youVerdict: String = "favors_you"
    ) throws -> TradeThreeTeamCompare {
        try JSONDecoder().decode(TradeThreeTeamCompare.self, from: Data("""
        {
          "contract_version": "trade-compare.v2",
          "trade_shape": "three_team",
          "team_count": 3,
          "participants": [
            {
              "team_id": "you", "team_name": null,
              "sends": {"total_value": 4.0, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Jonathan Taylor", "position": "RB", "player_key": null}]},
              "receives": {"total_value": 3.0, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Tyjae Spears", "position": "RB", "player_key": null}]},
              "net_value": -1.0, "verdict_state": "\(youVerdict)",
              "acceptance_likelihood": "likely", "confidence": "medium",
              "roster_fit": {"summary": "fine", "depth_discounted": false},
              "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}
            },
            {
              "team_id": "team_b", "team_name": "Davante's Inferno",
              "sends": {"total_value": 5.0, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Ja'Marr Chase", "position": "WR", "player_key": null}]},
              "receives": {"total_value": 4.0, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Jonathan Taylor", "position": "RB", "player_key": null}]},
              "net_value": -1.0, "verdict_state": "close_needs_context",
              "acceptance_likelihood": "uncertain", "confidence": "medium",
              "roster_fit": {"summary": "fine", "depth_discounted": false},
              "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}
            },
            {
              "team_id": "team_c", "team_name": "Chubb Rock",
              "sends": {"total_value": 3.0, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Tyjae Spears", "position": "RB", "player_key": null}]},
              "receives": {"total_value": 5.0, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Ja'Marr Chase", "position": "WR", "player_key": null}]},
              "net_value": 2.0, "verdict_state": "favors_you",
              "acceptance_likelihood": "likely", "confidence": "medium",
              "roster_fit": {"summary": "fine", "depth_discounted": false},
              "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}
            }
          ],
          "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 6},
          "verdict_state": "\(verdictState)",
          "analysis_context": {"mode": "neutral", "platform": null, "league_id": null, "league_name": null, "applied": [], "unavailable_reason": null},
          "submission": {
            "mode": "split_handoff",
            "reason": "no_connected_provider_publishes_a_three_team_write_api",
            "caption": "No provider builds a three-team trade natively. Submit it as linked two-team trades, in this order.",
            "steps": [
              "Leg 1: send Jonathan Taylor from you to team_b.",
              "Leg 2: send Ja'Marr Chase from team_b to team_c. Make it contingent on leg 1 completing first.",
              "Leg 3: send Tyjae Spears from team_c to you. Make it contingent on leg 2 completing first."
            ]
          }
        }
        """.utf8))
    }

    func testThreeTeamCompareDecodesEveryParticipantSeparately() throws {
        let result = try threeTeamFixture()

        XCTAssertEqual(result.tradeShape, "three_team")
        XCTAssertEqual(result.teamCount, 3)
        XCTAssertEqual(result.participants.count, 3)
        XCTAssertEqual(result.participants.map(\.teamID), ["you", "team_b", "team_c"])
        XCTAssertEqual(result.participants[0].sends.players.first?.name, "Jonathan Taylor")
        XCTAssertEqual(result.participants[0].receives.players.first?.name, "Tyjae Spears")
        XCTAssertEqual(result.submission.steps.count, 3)
        XCTAssertEqual(result.submission.mode, "split_handoff")
    }

    /// The client never mints a verdict — the three-team headline reads the same closed
    /// vocabulary the two-team one does, off the same `verdict_state` field.
    func testThreeTeamHeadlineNeverMintsAVerdict() throws {
        let favors = try threeTeamFixture(verdictState: "favors_you")
        XCTAssertEqual(OmenTradeRead.from(favors).headline, "This favors you")

        let insufficient = try threeTeamFixture(verdictState: "insufficient_data")
        XCTAssertEqual(OmenTradeRead.from(insufficient).headline, "Omen can't call this one")
    }

    // MARK: - N team-headed leg blocks

    /// One `TradeThreeTeamLeg` per pairwise transfer, exactly as `TradePartnerPicker` /
    /// `TradeRoster`'s recipient chooser would build them for the ring example T1's own test
    /// fixture uses.
    private func ringOffer() -> TradeThreeTeamOffer {
        TradeThreeTeamOffer(legs: [
            TradeThreeTeamLeg(from: "you", fromName: nil, to: "team_b", toName: "Davante's Inferno", players: [
                TradePlayer(name: "Jonathan Taylor", position: "RB", team: "IND"),
            ]),
            TradeThreeTeamLeg(from: "team_b", fromName: "Davante's Inferno", to: "team_c", toName: "Chubb Rock", players: [
                TradePlayer(name: "Ja'Marr Chase", position: "WR", team: "CIN"),
            ]),
            TradeThreeTeamLeg(from: "team_c", fromName: "Chubb Rock", to: "you", toName: nil, players: [
                TradePlayer(name: "Tyjae Spears", position: "RB", team: "TEN"),
            ]),
        ])
    }

    /// `TradeBuildThreeTeam-v1.md`: one block per participant that sends something, headed by
    /// that participant, in `teamOrder` — never one block per pairwise leg (there are 3 legs and
    /// 3 blocks here only because the ring happens to have exactly one leg per sender).
    func testThreeTeamSidesProducesOneBlockPerSendingParticipantInOrder() {
        let sides = OmenTradeAnswer.sides(of: ringOffer(), viewerTeamID: "you", teamOrder: ["you", "team_b", "team_c"])

        XCTAssertEqual(sides.map(\.heading), ["You send", "Davante's Inferno sends", "Chubb Rock sends"])
        XCTAssertEqual(sides[0].legs.first?.name, "Jonathan Taylor")
        XCTAssertEqual(sides[1].legs.first?.name, "Ja'Marr Chase")
        XCTAssertEqual(sides[2].legs.first?.name, "Tyjae Spears")
    }

    /// The middle leg — Davante's Inferno sending to Chubb Rock — touches neither the viewer's
    /// outgoing nor incoming pile. `TradeBuildThreeTeam-v1.md`'s new third direction state: blank
    /// label, but still announced to VoiceOver rather than silently absent.
    func testALegTouchingNeitherSideOfTheViewerIsLateralAndBlank() {
        let sides = OmenTradeAnswer.sides(of: ringOffer(), viewerTeamID: "you", teamOrder: ["you", "team_b", "team_c"])
        let middleLeg = sides[1].legs[0]

        XCTAssertEqual(middleLeg.direction, .lateral)
        XCTAssertEqual(middleLeg.label, "", "no glyph — not even a dash — in the shipped build")
        XCTAssertEqual(middleLeg.accessibilityDirection, "Not sent or received by you", "silence must still be announced")

        XCTAssertEqual(sides[0].legs[0].direction, .sending)
        XCTAssertEqual(sides[2].legs[0].direction, .receiving)
    }

    /// `meta`'s destination suffix appears only when the recipient is not the viewer, and the
    /// viewer-recipient row never carries a "→ you" suffix in the shipped copy.
    func testMetaCarriesTheDestinationSuffixOnlyWhenTheRecipientIsNotTheViewer() {
        let sides = OmenTradeAnswer.sides(of: ringOffer(), viewerTeamID: "you", teamOrder: ["you", "team_b", "team_c"])

        XCTAssertEqual(sides[0].legs[0].meta, "RB · IND → Davante's Inferno")
        XCTAssertEqual(sides[1].legs[0].meta, "WR · CIN → Chubb Rock")
        XCTAssertEqual(sides[2].legs[0].meta, "RB · TEN", "you are the recipient — no suffix")
    }

    /// Only participants that send something get a block, and block order matches `teamOrder`
    /// (the `.partners` chip order) even when a team is filtered out.
    func testOnlySendingParticipantsGetABlock() {
        let offer = TradeThreeTeamOffer(legs: [
            TradeThreeTeamLeg(from: "you", fromName: nil, to: "team_b", toName: "Davante's Inferno", players: [TradePlayer(name: "A")]),
        ])
        let sides = OmenTradeAnswer.sides(of: offer, viewerTeamID: "you", teamOrder: ["you", "team_b"])
        XCTAssertEqual(sides.count, 1)
        XCTAssertEqual(sides[0].heading, "You send")
    }

    func testThreeTeamRequestBodyMatchesT1sDocumentedLegsShape() {
        let offer = ringOffer()
        let body = offer.requestBody
        let legs = body["legs"] as? [[String: Any]]
        XCTAssertEqual(legs?.count, 3)
        XCTAssertEqual(legs?[0]["from"] as? String, "you")
        XCTAssertEqual(legs?[0]["to"] as? String, "team_b")
        XCTAssertEqual(legs?[0]["to_name"] as? String, "Davante's Inferno")
        let players = legs?[0]["players"] as? [[String: Any]]
        XCTAssertEqual(players?.first?["name"] as? String, "Jonathan Taylor")
    }

    func testTeamIDsAndThreeTeamShapeDetection() {
        XCTAssertTrue(ringOffer().isThreeTeamShape)
        XCTAssertEqual(ringOffer().teamIDs, ["you", "team_b", "team_c"])

        let twoTeamLooking = TradeThreeTeamOffer(legs: [
            TradeThreeTeamLeg(from: "you", fromName: nil, to: "team_b", toName: nil, players: [TradePlayer(name: "A")]),
            TradeThreeTeamLeg(from: "team_b", fromName: nil, to: "you", toName: nil, players: [TradePlayer(name: "B")]),
        ])
        XCTAssertFalse(twoTeamLooking.isThreeTeamShape)
    }
}
