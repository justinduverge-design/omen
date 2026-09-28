import XCTest
@testable import Omen

/// T3 — `TradeFindReviewViewModel`, driving `TradeFindReview` from `trade-find.v1`.
///
/// Pins: a real batch resolves into `.reviewing` with an honest client-side pager; `Pass` never
/// calls the save interface and empties the stack into `.batchExhausted`; `Save` calls the
/// interface with the candidate's `id` and its `reasoning` **verbatim** and flips to `.saved`
/// without advancing the stack or navigating anywhere; a `status: "ok"` empty batch is
/// `.zeroCandidates`, never confused with `.batchExhausted`; and `status: "unavailable"` is
/// answered honestly as `.routeElsewhere` rather than rendered as either empty state.
@MainActor
final class TradeFindReviewViewModelTests: XCTestCase {

    private func sessionManager() -> SessionManager {
        let session = Session(userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000)
        return SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
    }

    private final class SpySaveAction: TradeFindSaveAction {
        var outcome: TradeFindSaveOutcome = .saved
        private(set) var calls: [(candidateId: String, reasoning: TradeFindReasoning)] = []

        func save(candidateId: String, reasoning: TradeFindReasoning) async -> TradeFindSaveOutcome {
            calls.append((candidateId, reasoning))
            return outcome
        }
    }

    private func makeViewModel(
        findResult: Result<TradeFindResponse, OmenApiError>,
        saveAction: TradeFindSaveAction = StubTradeFindSaveAction()
    ) -> TradeFindReviewViewModel {
        TradeFindReviewViewModel(
            repository: StubTradeFindRepository(result: findResult),
            saveAction: saveAction,
            sessionManager: sessionManager()
        )
    }

    private func decode(_ json: String) -> TradeFindResponse {
        try! JSONDecoder().decode(TradeFindResponse.self, from: Data(json.utf8))
    }

    private func candidateJSON(id: String, opponentName: String? = "Davante's Inferno") -> String {
        let nameField = opponentName.map { "\"\($0)\"" } ?? "null"
        return """
        {
          "id": "\(id)",
          "opponent_team_id": "2",
          "opponent_team_name": \(nameField),
          "give": { "name": "Jaylen Waddle", "position": "WR", "team": "MIA", "projected_points": 14.8 },
          "receive": { "name": "Tony Pollard", "position": "RB", "team": "TEN", "projected_points": 16.2 },
          "user_lineup_delta": 4.2,
          "opponent_lineup_delta": 1.1,
          "reasoning": {
            "fills_need_for": ["user"],
            "user_receives": { "position": "RB", "need": { "status": "hole", "have": 2, "required": 3 } },
            "opponent_receives": { "position": "WR", "need": { "status": "surplus", "have": 6, "required": 3 } },
            "evidence": ["live_roster_depth", "live_lineup_projection_delta"]
          }
        }
        """
    }

    private func batchFixture(status: String = "ok", candidateIds: [String] = ["c1", "c2"], degradedTeams: String = "[]", teamsSkippedForCap: String = "[]", budgetExceeded: Bool = false, teamsConsidered: Int = 5, reason: String? = nil) -> TradeFindResponse {
        let candidates = candidateIds.map { candidateJSON(id: $0) }.joined(separator: ",")
        let reasonField = reason.map { "\"reason\": \"\($0)\"," } ?? ""
        let json = """
        {
          "contract_version": "trade-find.v1",
          "status": "\(status)",
          "platform": "sleeper",
          "league_id": "league-1",
          "team_id": "1",
          "week": 3,
          \(reasonField)
          "bounds": {
            "max_opponent_teams": 16,
            "max_candidates": 10,
            "teams_considered": \(teamsConsidered),
            "teams_skipped_for_cap": \(teamsSkippedForCap)
          },
          "degraded_teams": \(degradedTeams),
          "budget_exceeded": \(budgetExceeded),
          "candidates": [\(candidates)]
        }
        """
        return decode(json)
    }

    // MARK: - Loading a real batch

    func testLoadingARealBatchResolvesToReviewingWithAnHonestPager() async {
        let sut = makeViewModel(findResult: .success(batchFixture()))
        await sut.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)

        XCTAssertEqual(sut.viewState, .reviewing)
        XCTAssertEqual(sut.candidates.count, 2)
        XCTAssertEqual(sut.positionLabel, "1 of 2")
        XCTAssertEqual(sut.currentCandidate?.id, "c1")
    }

    func testOpponentNameFallsBackHonestlyWhenTheProviderNamedNoOpponent() async {
        let json = """
        {
          "contract_version": "trade-find.v1", "status": "ok", "platform": "sleeper",
          "league_id": "l", "team_id": "1", "week": 1,
          "bounds": { "max_opponent_teams": 16, "max_candidates": 10, "teams_considered": 1, "teams_skipped_for_cap": [] },
          "degraded_teams": [], "budget_exceeded": false,
          "candidates": [\(candidateJSON(id: "c1", opponentName: nil))]
        }
        """
        let sut = makeViewModel(findResult: .success(decode(json)))
        await sut.load(platform: "sleeper", leagueId: "l", teamId: "1", week: nil)
        XCTAssertEqual(sut.currentCandidate?.opponentDisplayName, "another team in your league")
    }

    // MARK: - Pass: local only, never a network call, empties into batchExhausted

    func testPassAdvancesTheStackAndNeverCallsSave() async {
        let spy = SpySaveAction()
        let sut = makeViewModel(findResult: .success(batchFixture()), saveAction: spy)
        await sut.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)

        sut.pass()
        XCTAssertEqual(sut.currentCandidate?.id, "c2")
        XCTAssertEqual(sut.viewState, .reviewing)

        sut.pass()
        XCTAssertEqual(sut.viewState, .batchExhausted)
        XCTAssertNil(sut.currentCandidate)
        XCTAssertTrue(spy.calls.isEmpty, "Pass must never call the save interface")
    }

    // MARK: - Save: calls the interface verbatim, flips to Saved, never advances or navigates

    func testSaveCallsTheInterfaceWithCandidateIdAndReasoningVerbatim() async {
        let spy = SpySaveAction()
        let sut = makeViewModel(findResult: .success(batchFixture()), saveAction: spy)
        await sut.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)

        let candidateBeforeSave = sut.currentCandidate
        await sut.save()

        XCTAssertEqual(spy.calls.count, 1)
        XCTAssertEqual(spy.calls.first?.candidateId, "c1")
        XCTAssertEqual(spy.calls.first?.reasoning, candidateBeforeSave?.reasoning)
        XCTAssertEqual(sut.saveState(for: "c1"), .saved)
        // Never advances and never changes viewState -- no queue destination exists yet.
        XCTAssertEqual(sut.currentCandidate?.id, "c1")
        XCTAssertEqual(sut.viewState, .reviewing)
    }

    func testSaveFailureRevertsRatherThanClaimingSuccess() async {
        let spy = SpySaveAction()
        spy.outcome = .error
        let sut = makeViewModel(findResult: .success(batchFixture()), saveAction: spy)
        await sut.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)

        await sut.save()
        XCTAssertEqual(sut.saveState(for: "c1"), .error)

        // Retrying after a fixed backend succeeds.
        spy.outcome = .saved
        await sut.save()
        XCTAssertEqual(sut.saveState(for: "c1"), .saved)
    }

    // MARK: - Zero-candidates: a real, honest positive state, distinct from batch-exhausted

    func testZeroCandidatesFoundIsDistinctFromBatchExhausted() async {
        let sut = makeViewModel(findResult: .success(batchFixture(status: "ok", candidateIds: [])))
        await sut.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)

        XCTAssertEqual(sut.viewState, .zeroCandidates)
        XCTAssertNotEqual(sut.viewState, .batchExhausted)
    }

    // MARK: - Unavailable: not this screen's job, answered honestly rather than guessed

    func testUnavailableStatusRoutesElsewhereRatherThanRenderingAnEmptyState() async {
        let sut = makeViewModel(findResult: .success(batchFixture(status: "unavailable", candidateIds: [], reason: "own_roster_unavailable")))
        await sut.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)

        guard case .routeElsewhere(let reason) = sut.viewState else {
            return XCTFail("Expected .routeElsewhere, got \(sut.viewState)")
        }
        XCTAssertEqual(reason, "own_roster_unavailable")
    }

    // MARK: - Degraded banner: named, not hidden, and only when the fields say so

    func testDegradedBannerRendersOnlyWhenATeamWasSkippedOrDegraded() async {
        let clean = makeViewModel(findResult: .success(batchFixture()))
        await clean.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)
        XCTAssertNil(clean.degradedShowingLabel, "A clean scan must show no banner")

        let degraded = makeViewModel(findResult: .success(batchFixture(
            degradedTeams: "[{\"team_id\":\"9\",\"team_name\":\"Chubb Rock\",\"reason\":\"roster_unreadable\"}]",
            teamsConsidered: 5
        )))
        await degraded.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)
        XCTAssertEqual(degraded.degradedShowingLabel, "Showing 5 of 6 teams.")
        XCTAssertEqual(
            degraded.degradedSentence,
            "ESPN couldn't read Chubb Rock's roster this week — Omen never proposes a trade against a roster it can't see."
        )
    }

    // MARK: - Transport failure

    func testTransportFailureIsHonestRatherThanFabricatingABatch() async {
        let sut = makeViewModel(findResult: .failure(.server(status: 503)))
        await sut.load(platform: "sleeper", leagueId: "league-1", teamId: "1", week: 3)
        XCTAssertEqual(sut.viewState, .failed(.server(status: 503)))
        XCTAssertTrue(sut.candidates.isEmpty)
    }
}
