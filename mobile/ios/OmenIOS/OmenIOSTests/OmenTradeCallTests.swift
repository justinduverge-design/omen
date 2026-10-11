import XCTest
@testable import Omen

/// An Omen `trade_suggestion` call as a first-class trade: the mapping from the envelope, the honest gating of
/// its actions, and the hand-off that fills the Trade screens with the call's swap.
///
/// Envelopes are shaped like `mapTradeSuggestionToMvpMove` in `src/services/omen.js`; every field name is the
/// server's. Names are generic (`omen-store-review-notes-v1.md`).
@MainActor
final class OmenTradeCallTests: XCTestCase {

    // MARK: - Fixtures

    private func envelope(
        source: String = "espn_league_rosters",
        platform: String = "espn",
        move: String = "Offer Sample WR1 to Sample Rivals for Sample RB1.",
        primary: String = #"{"id":"sample-rb1","name":"Sample RB1","position":"RB","team":"Sample Team"}"#,
        comparison: String = #"{"id":"sample-wr1","name":"Sample WR1","position":"WR","team":"Sample Team"}"#,
        type: String = "trade_suggestion"
    ) throws -> OmenDecisionEnvelope {
        let json = """
        {"contract_version":"omen-decision-brief.v3","state":"success","mode":"live","call_kind":"\(type)",
         "answered_for":{"platform":"\(platform)","league_id":"L1","matched":true,"selection":"requested"},
         "signals":{"trade_rosters":{"status":"live","source":"\(source)","message":"x"}},
         "recommendation":{"type":"\(type)","title":"Offer Sample WR1 for Sample RB1","move":"\(move)",
           "primary_player":\(primary),"comparison_player":\(comparison),
           "expected_value_delta":{"points":3.1,"label":"meaningful"},
           "confidence":{"band":"leaning","label":"Leaning"},
           "risk":{"level":"medium","reasons":["The other lineup improves by +1.4 as well, but that does not predict acceptance."]},
           "explanation":{"summary":"Your best live trade candidate is Sample WR1 for Sample RB1.",
             "why_it_matters":"The swap adds +3.1 to your optimal weekly lineup while also improving Sample Rivals's lineup.",
             "risk":"A fair projected lineup gain is not a guarantee that the other manager will accept the offer."}}}
        """
        return try JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data(json.utf8))
    }

    private func payload(_ env: OmenDecisionEnvelope) throws -> OmenDecisionBriefPayload {
        guard case .success(let payload) = env.briefState() else {
            XCTFail("expected success")
            throw XCTSkip("not a success")
        }
        return payload
    }

    // MARK: - Mapping

    func testEspnTradeSuggestionMapsToATradeCallFromServerFieldsOnly() throws {
        let p = try payload(try envelope())
        let call = try XCTUnwrap(p.tradeCall)

        XCTAssertEqual(call.give.name, "Sample WR1", "comparison_player is who you send")
        XCTAssertEqual(call.receive.name, "Sample RB1", "primary_player is who you get")
        XCTAssertEqual(call.give.playerKey, "sample-wr1")
        XCTAssertEqual(call.receive.playerKey, "sample-rb1")
        XCTAssertEqual(call.give.meta, "WR · Sample Team")
        XCTAssertEqual(call.partnerName, "Sample Rivals")
        XCTAssertEqual(call.platform, "espn")
        XCTAssertEqual(call.scope, OmenCallScope(platform: "espn", leagueID: "L1"))
        XCTAssertEqual(call.whyBothLineups, "The swap adds +3.1 to your optimal weekly lineup while also improving Sample Rivals's lineup.")
        XCTAssertEqual(call.acceptanceCaveat, "A fair projected lineup gain is not a guarantee that the other manager will accept the offer.")
        XCTAssertTrue(call.canReview)
        XCTAssertEqual(p.callType, "trade_suggestion")
        XCTAssertEqual(p.impact, "+3.1 projected (meaningful)")
    }

    func testConfidenceIsABandNeverANumberOnATradeCall() throws {
        let p = try payload(try envelope())
        XCTAssertEqual(p.confidenceBand, .leaning)
        XCTAssertNil(p.confidence, "no numeric score is manufactured")
    }

    func testSleeperTradeCallReadsItsPlatformFromTheRostersSource() throws {
        let call = try XCTUnwrap(try payload(try envelope(source: "sleeper_league_rosters", platform: "sleeper")).tradeCall)
        XCTAssertEqual(call.platform, "sleeper")
        XCTAssertTrue(call.canReview)
    }

    func testPlatformFallsBackToTheLeagueTheServerAnsweredFor() throws {
        let call = try XCTUnwrap(try payload(try envelope(source: "", platform: "sleeper")).tradeCall)
        XCTAssertEqual(call.platform, "sleeper")
    }

    func testPartnerIsNeverGuessedWhenTheSentenceIsNotTheServersTemplate() throws {
        XCTAssertNil(OmenTradeCall.partnerName(inMove: "Trade Sample WR1 for Sample RB1.", give: "Sample WR1", receive: "Sample RB1"))
        XCTAssertNil(OmenTradeCall.partnerName(inMove: nil, give: "A", receive: "B"))
        XCTAssertNil(
            OmenTradeCall.partnerName(inMove: "Offer A to that team for B.", give: "A", receive: "B"),
            "the server's stand-in for an unknown team is not a team"
        )
        XCTAssertNil(
            OmenTradeCall.partnerName(inMove: "Offer Other to Team for B.", give: "A", receive: "B"),
            "the sentence must be about these two players"
        )
        XCTAssertEqual(OmenTradeCall.partnerName(inMove: "Offer A to Team X for B.", give: "A", receive: "B"), "Team X")
        let call = try XCTUnwrap(try payload(try envelope(move: "Offer Sample WR1 to that team for Sample RB1.")).tradeCall)
        XCTAssertNil(call.partnerName)
    }

    func testStartSitCallIsNotATradeCall() throws {
        let env = try JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data("""
        {"state":"success","mode":"live","recommendation":{"type":"start_sit","title":"Start A","move":"Start A over B.",
         "primary_player":{"id":"a","name":"A","position":"WR"},"comparison_player":{"id":"b","name":"B","position":"WR"}}}
        """.utf8))
        XCTAssertNil(try payload(env).tradeCall)
    }

    func testHalfNamedSwapDoesNotRenderAsATrade() throws {
        let p = try payload(try envelope(primary: #"{"id":null,"name":"Unknown","position":null,"team":null}"#))
        XCTAssertNil(p.tradeCall, "a trade that does not name both players is not offered for review")
        XCTAssertEqual(p.callType, "trade_suggestion")
    }

    // MARK: - Honest gating

    func testYahooTradeCallIsNeverOfferedForReview() throws {
        let call = try XCTUnwrap(try payload(try envelope(source: "yahoo_league_rosters", platform: "yahoo")).tradeCall)
        XCTAssertFalse(call.canReview)
    }

    func testYahooHoldCarriesNoTradeCallAndSoNoTradeAction() throws {
        let env = try JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data("""
        {"contract_version":"omen-decision-brief.v3","state":"empty","mode":"live","call_kind":"hold",
         "answered_for":{"platform":"yahoo","league_id":"L1","matched":true},
         "hold":{"kind":"hold","headline":"Hold","summary":"Hold.",
           "reasons":[{"code":"projections_unavailable","text":"Yahoo does not give Omen weekly projections."}],
           "considered":[{"kind":"trade_suggestion","outcome":"unavailable","reason":"projections_unavailable","detail":"A trade cannot be weighed."}],
           "projections":{"available":false}}}
        """.utf8))
        guard case .hold(let hold) = env.briefState() else { return XCTFail("expected a hold") }
        XCTAssertTrue(hold.cannotRank)
        XCTAssertNil(env.tradeCall(), "a hold is not a trade call, so nothing opens the Trade screens from it")
    }

    // MARK: - Prefill

    private func signedInSessionManager() -> SessionManager {
        let session = Session(userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000)
        return SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
    }

    private final class RecordingTradeRepository: TradeRepository, @unchecked Sendable {
        var comparedOffers: [TradeOffer] = []
        var compareResult: Result<TradeCompare, OmenApiError> = .failure(.network)
        var rosterResult: Result<TradeRosterResponse, OmenApiError> = .failure(.network)

        func capabilities() async -> Result<TradeCapabilities, OmenApiError> { .failure(.network) }
        func compare(offer: TradeOffer, accessToken: String?) async -> Result<TradeCompare, OmenApiError> {
            comparedOffers.append(offer)
            return compareResult
        }
        func roster(platform: String, leagueId: String, teamId: String?, week: Int?, accessToken: String) async -> Result<TradeRosterResponse, OmenApiError> {
            rosterResult
        }
        func share(offer: TradeOffer, accessToken: String?) async -> Result<TradeShareResponse, OmenApiError> { .failure(.network) }
        func compareThreeTeam(offer: TradeThreeTeamOffer, accessToken: String?) async -> Result<TradeThreeTeamCompare, OmenApiError> { .failure(.network) }
    }

    private func rosterFixture() -> TradeRosterResponse {
        let json = """
        {"contract_version":"trade-roster.v1","status":"ok","platform":"espn","week":3,"teams":[
          {"team_id":"1","team_name":"Own Team","players":[]},
          {"team_id":"2","team_name":"Other Team","players":[{"player_key":"x","name":"X","position":"WR"}]},
          {"team_id":"3","team_name":"Sample Rivals","players":[{"player_key":"sample-rb1","name":"Sample RB1","position":"RB"}]}]}
        """
        return try! JSONDecoder().decode(TradeRosterResponse.self, from: Data(json.utf8))
    }

    private func makeViewModel(_ repo: RecordingTradeRepository) -> TradeViewModel {
        TradeViewModel(
            repository: repo,
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: signedInSessionManager()
        )
    }

    private func call() throws -> OmenTradeCall {
        try XCTUnwrap(try payload(try envelope()).tradeCall)
    }

    func testPrefillReplacesTheOfferWithTheCallsSwapInTheCallsLeague() throws {
        let vm = makeViewModel(RecordingTradeRepository())
        vm.useLeague(platform: "sleeper", leagueId: "other")
        vm.add("Typed Player", to: .send)

        vm.applyPrefill(from: try call())

        XCTAssertEqual(vm.offer.send.map(\.name), ["Sample WR1"])
        XCTAssertEqual(vm.offer.receive.map(\.name), ["Sample RB1"])
        XCTAssertEqual(vm.offer.send.first?.playerKey, "sample-wr1")
        XCTAssertEqual(vm.offer.send.first?.position, "WR")
        XCTAssertEqual(vm.offer.receive.first?.playerKey, "sample-rb1")
        XCTAssertEqual(vm.offer.leagueContext, TradeOffer.LeagueContext(platform: "espn", leagueId: "L1"))
        XCTAssertEqual(vm.viewState, .idle, "a standing verdict about another deal is dropped")
        XCTAssertEqual(vm.prefill?.partnerName, "Sample Rivals")
        XCTAssertTrue(vm.offer.isComparable)
    }

    func testReviewSendsExactlyTheCallsPlayersToCompare() async throws {
        let repo = RecordingTradeRepository()
        let vm = makeViewModel(repo)

        await vm.review(try call(), userID: "user-1")

        XCTAssertEqual(repo.comparedOffers.count, 1)
        let sent = try XCTUnwrap(repo.comparedOffers.first)
        XCTAssertEqual(sent.send.compactMap { $0.payload["player_key"] as? String }, ["sample-wr1"])
        XCTAssertEqual(sent.receive.compactMap { $0.payload["player_key"] as? String }, ["sample-rb1"])
        let league = try XCTUnwrap(sent.requestBody["league_context"] as? [String: String])
        XCTAssertEqual(league, ["platform": "espn", "league_id": "L1"])
    }

    func testReviewOfAYahooCallDoesNothing() async throws {
        let repo = RecordingTradeRepository()
        let vm = makeViewModel(repo)
        let yahoo = try XCTUnwrap(try payload(try envelope(source: "yahoo_league_rosters", platform: "yahoo")).tradeCall)

        await vm.review(yahoo, userID: "user-1")

        XCTAssertTrue(repo.comparedOffers.isEmpty)
        XCTAssertTrue(vm.offer.send.isEmpty)
        XCTAssertNil(vm.prefill)
    }

    func testACompareThatFailsLeavesThePrefilledOfferAndSaysSo() async throws {
        let repo = RecordingTradeRepository()
        repo.compareResult = .failure(.server(status: 503))
        let vm = makeViewModel(repo)

        await vm.review(try call(), userID: "user-1")

        XCTAssertEqual(vm.viewState, .failed(.server(status: 503)))
        XCTAssertEqual(vm.offer.send.map(\.name), ["Sample WR1"], "the offer is kept so the user can retry")
        let status = OmenTradePrefillCard.status(for: vm.viewState)
        XCTAssertTrue(status?.contains("couldn't re-check") == true)
        XCTAssertTrue(status?.contains("not been confirmed") == true, "it does not repeat the Omen tab's call as confirmed")
    }

    func testEditingTheOfferEndsItBeingOmensCall() throws {
        let vm = makeViewModel(RecordingTradeRepository())
        vm.applyPrefill(from: try call())
        XCTAssertNotNil(vm.prefill)
        vm.remove(at: 0, from: .send)
        XCTAssertNil(vm.prefill)

        vm.applyPrefill(from: try call())
        vm.add("Typed Player", to: .receive)
        XCTAssertNil(vm.prefill)
    }

    func testRosterBrowseOpensOnThePartnerHoldingThePlayerYouGet() async throws {
        let repo = RecordingTradeRepository()
        repo.rosterResult = .success(rosterFixture())
        let vm = makeViewModel(repo)
        vm.applyPrefill(from: try call())

        await vm.loadRoster(userID: "user-1")

        XCTAssertEqual(vm.selectedPartnerTeamID, "3")
    }

    func testRosterBrowseWithoutAPrefillStillOpensOnTheFirstTeam() async throws {
        let repo = RecordingTradeRepository()
        repo.rosterResult = .success(rosterFixture())
        let vm = makeViewModel(repo)
        vm.useLeague(platform: "espn", leagueId: "L1")

        await vm.loadRoster(userID: "user-1")

        XCTAssertEqual(vm.selectedPartnerTeamID, "1")
    }

    func testPartnerResolvesByNameWhenTheKeyIsAbsentAndNeverOnAnAmbiguousMatch() {
        let response = rosterFixture()
        let byName = TradeViewModel.Prefill(giveName: "A", receiveName: "B", partnerName: " sample rivals ", receivePlayerKey: nil, platform: "espn")
        XCTAssertEqual(TradeViewModel.partnerTeamID(in: response, for: byName), "3")
        let unknown = TradeViewModel.Prefill(giveName: "A", receiveName: "B", partnerName: "No Such Team", receivePlayerKey: "nope", platform: "espn")
        XCTAssertNil(TradeViewModel.partnerTeamID(in: response, for: unknown))
        XCTAssertNil(TradeViewModel.partnerTeamID(in: response, for: nil))
    }

    // MARK: - Words and accessibility

    func testPrefillCardNamesThePartnerOnlyWhenTheCallDid() {
        let withPartner = TradeViewModel.Prefill(giveName: "A", receiveName: "B", partnerName: "Team X", receivePlayerKey: nil, platform: nil)
        let without = TradeViewModel.Prefill(giveName: "A", receiveName: "B", partnerName: nil, receivePlayerKey: nil, platform: nil)
        XCTAssertEqual(OmenTradePrefillCard.summary(for: withPartner), "Send A, get B, with Team X.")
        XCTAssertEqual(OmenTradePrefillCard.summary(for: without), "Send A, get B.")
        XCTAssertNil(OmenTradePrefillCard.status(for: .idle))
        XCTAssertNotNil(OmenTradePrefillCard.status(for: .loading))
    }

    func testSwapRowsAreSpokenAsSentences() throws {
        let call = try self.call()
        XCTAssertEqual(OmenTradeCallSwap.accessibilityLabel(title: "You send", side: call.give), "You send Sample WR1, WR, Sample Team.")
        XCTAssertEqual(OmenTradeCallSwap.accessibilityLabel(title: "You get", side: call.receive), "You get Sample RB1, RB, Sample Team.")
        XCTAssertEqual(OmenTradeCallSwap.partnerAccessibilityLabel("Sample Rivals"), "Trade partner Sample Rivals.")
        let bare = OmenTradeCall.Side(name: "Solo", position: nil, team: nil, playerKey: nil)
        XCTAssertEqual(OmenTradeCallSwap.accessibilityLabel(title: "You get", side: bare), "You get Solo.")
    }

    // MARK: - Screenshot registry

    func testTradeCallScenariosAreRegistered() {
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.trade-call"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("trade.prefilled"))
    }
}
