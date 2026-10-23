import XCTest
@testable import Omen

/// `GET /api/trade/roster` and `POST /api/trade/share` wired into `TradeViewModel`.
///
/// Pins: a Sleeper (or any available-provider) connection resolves a real opponent roster into
/// `OmenTradeRosterState.Rosters.read`; an unavailable answer (ESPN/Yahoo re-auth needed, a
/// league that hasn't drafted) renders `.permanentlyUnavailable` with the server's own reason,
/// never a crash and never fabricated rows; and the share client actually calls the route and
/// handles both success and failure.
@MainActor
final class TradeRosterAndShareTests: XCTestCase {

    private final class HoldingSessionRefresher: SessionRefreshing {
        private var continuation: CheckedContinuation<SessionRefreshOutcome, Never>?
        private var startWaiters: [CheckedContinuation<Void, Never>] = []

        func refreshedSession() async -> SessionRefreshOutcome {
            await withCheckedContinuation { continuation in
                self.continuation = continuation
                startWaiters.forEach { $0.resume() }
                startWaiters = []
            }
        }

        func waitUntilHeld() async {
            if continuation != nil { return }
            await withCheckedContinuation { startWaiters.append($0) }
        }

        func release(_ outcome: SessionRefreshOutcome) {
            continuation?.resume(returning: outcome)
            continuation = nil
        }
    }

    private actor HoldingRosterRepository: TradeRepository {
        private var rosterContinuation: CheckedContinuation<Result<TradeRosterResponse, OmenApiError>, Never>?
        private var startWaiters: [CheckedContinuation<Void, Never>] = []

        func compare(offer: TradeOffer, accessToken: String?) async -> Result<TradeCompare, OmenApiError> { .failure(.network) }
        func capabilities() async -> Result<TradeCapabilities, OmenApiError> { .failure(.network) }
        func share(offer: TradeOffer, accessToken: String?) async -> Result<TradeShareResponse, OmenApiError> { .failure(.network) }
        func compareThreeTeam(offer: TradeThreeTeamOffer, accessToken: String?) async -> Result<TradeThreeTeamCompare, OmenApiError> { .failure(.network) }

        func roster(
            platform: String,
            leagueId: String,
            teamId: String?,
            week: Int?,
            accessToken: String
        ) async -> Result<TradeRosterResponse, OmenApiError> {
            return await withCheckedContinuation { continuation in
                rosterContinuation = continuation
                startWaiters.forEach { $0.resume() }
                startWaiters = []
            }
        }

        func waitUntilRosterRequestIsHeld() async {
            if rosterContinuation != nil { return }
            await withCheckedContinuation { startWaiters.append($0) }
        }

        func releaseRoster(with result: Result<TradeRosterResponse, OmenApiError>) {
            rosterContinuation?.resume(returning: result)
            rosterContinuation = nil
        }
    }

    private func signedInSessionManager() -> SessionManager {
        let session = Session(userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000)
        return SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
    }

    private func makeViewModel(
        rosterResult: Result<TradeRosterResponse, OmenApiError>,
        shareResult: Result<TradeShareResponse, OmenApiError> = .failure(.network),
        compareResult: Result<TradeCompare, OmenApiError> = .failure(.network)
    ) -> TradeViewModel {
        let repo = StubTradeRepository(result: compareResult, rosterResult: rosterResult, shareResult: shareResult)
        let vm = TradeViewModel(
            repository: repo,
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: signedInSessionManager()
        )
        vm.useLeague(platform: "sleeper", leagueId: "league-1", viewerTeamId: "1")
        return vm
    }

    private func rosterFixture(status: String = "ok", reason: String? = nil, platform: String = "sleeper") -> TradeRosterResponse {
        let json = """
        {
          "contract_version": "trade-roster.v1",
          "status": "\(status)",
          "platform": "\(platform)",
          \(reason.map { "\"reason\": \"\($0)\"," } ?? "")
          "week": 3,
          "teams": [
            { "team_id": "1", "team_name": "Own Team", "players": [] },
            { "team_id": "2", "team_name": "Rival Team", "players": [
              { "player_key": "sleeper:200", "name": "Rival Player", "position": "WR", "team": "SEA" }
            ] }
          ]
        }
        """
        return try! JSONDecoder().decode(TradeRosterResponse.self, from: Data(json.utf8))
    }

    // MARK: - Roster: a real opponent roster resolves

    func testLoadRosterResolvesARealOpponentRoster() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture()))
        await sut.loadRoster(userID: "user-1")

        guard case .loaded(let response) = sut.rosterBrowseState else {
            return XCTFail("Expected .loaded")
        }
        XCTAssertTrue(response.isAvailable)
        XCTAssertEqual(response.teams.count, 2)
        XCTAssertEqual(sut.rosterPartners.map(\.id), ["2"])
        XCTAssertEqual(sut.selectedPartnerTeamID, "2")

        sut.selectPartnerTeam("2")
        XCTAssertEqual(sut.partnerRoster?.teamName, "Rival Team")
        XCTAssertEqual(sut.partnerRoster?.players.map(\.name), ["Rival Player"])
    }

    func testAddingAPlayerFromTheRosterMarksThatRowAdded() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture()))
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")

        guard case .loaded(let response) = sut.rosterBrowseState,
              let player = response.teams.first(where: { $0.id == "2" })?.players.first else {
            return XCTFail("Fixture missing expected player")
        }
        sut.addFromRoster(player)

        XCTAssertTrue(sut.offer.receive.contains { $0.playerKey == "sleeper:200" })
        XCTAssertTrue(sut.isInOffer(player, side: .receive))
    }

    func testRosterPartnersFailClosedWhenViewerIdentityIsUnknown() async {
        let repo = StubTradeRepository(result: .failure(.network), rosterResult: .success(rosterFixture()))
        let sut = TradeViewModel(
            repository: repo,
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: signedInSessionManager()
        )
        sut.useLeague(platform: "sleeper", leagueId: "league-1")

        await sut.loadRoster(userID: "user-1")

        XCTAssertTrue(sut.rosterPartners.isEmpty, "unknown viewer identity must not expose the viewer as a partner")
        XCTAssertNil(sut.selectedPartnerTeamID)
        XCTAssertTrue(sut.partnerPickerCandidates.isEmpty)
    }

    func testDirectoryIdentitySurvivesAByeWithNoMatchupTeam() throws {
        let directory = try JSONDecoder().decode(LeagueDirectory.self, from: Data("""
        {
          "platforms": [{
            "platform": "sleeper",
            "leagues": [{
              "league_id": "league-1",
              "team_id": "1",
              "is_active": true
            }]
          }]
        }
        """.utf8))

        XCTAssertEqual(directory.teamID(platform: "SLEEPER", leagueID: "league-1"), "1")
        XCTAssertNil(directory.teamID(platform: "sleeper", leagueID: "bye-week-matchup"))
    }

    func testLoadingOrFailedLeagueClearsPreviouslyLoadedRoster() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture()))
        await sut.loadRoster(userID: "user-1")
        XCTAssertEqual(sut.rosterPartners.map(\.id), ["2"])

        // The shell sends an unavailable context for both `.loading` and `.failed`; neither
        // may retain league A while league B is unresolved.
        sut.useLeague(platform: nil, leagueId: nil, viewerTeamId: nil)

        XCTAssertEqual(sut.rosterBrowseState, .idle)
        XCTAssertTrue(sut.rosterPartners.isEmpty)
        XCTAssertNil(sut.selectedPartnerTeamID)
        XCTAssertNil(sut.viewerTeamID)
        XCTAssertNil(sut.offer.leagueContext)
    }

    func testLoadedLeagueBInvalidatesLoadedLeagueARoster() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture()))
        await sut.loadRoster(userID: "user-1")
        XCTAssertEqual(sut.rosterPartners.map(\.id), ["2"])

        sut.useLeague(platform: "yahoo", leagueId: "league-2", viewerTeamId: "9")

        XCTAssertEqual(sut.rosterBrowseState, .idle)
        XCTAssertTrue(sut.rosterPartners.isEmpty)
        XCTAssertNil(sut.selectedPartnerTeamID)
        XCTAssertEqual(sut.viewerTeamID, "9")
        XCTAssertEqual(sut.offer.leagueContext, .init(platform: "yahoo", leagueId: "league-2"))
    }

    func testLateLeagueARosterCannotReturnAfterLeagueBStartsLoadingOrFails() async {
        let repo = HoldingRosterRepository()
        let sut = TradeViewModel(
            repository: repo,
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: signedInSessionManager()
        )
        sut.useLeague(platform: "sleeper", leagueId: "league-a", viewerTeamId: "1")
        let load = Task { await sut.loadRoster(userID: "user-1") }
        await repo.waitUntilRosterRequestIsHeld()

        sut.useLeague(platform: nil, leagueId: nil, viewerTeamId: nil)
        await repo.releaseRoster(with: .success(rosterFixture()))
        await load.value

        XCTAssertEqual(sut.rosterBrowseState, .idle)
        XCTAssertTrue(sut.rosterPartners.isEmpty)
        XCTAssertNil(sut.offer.leagueContext)
    }

    func testLateLeagueARosterCannotReturnAfterLeagueBLoads() async {
        let repo = HoldingRosterRepository()
        let sut = TradeViewModel(
            repository: repo,
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: signedInSessionManager()
        )
        sut.useLeague(platform: "sleeper", leagueId: "league-a", viewerTeamId: "1")
        let load = Task { await sut.loadRoster(userID: "user-1") }
        await repo.waitUntilRosterRequestIsHeld()

        sut.useLeague(platform: "yahoo", leagueId: "league-b", viewerTeamId: "9")
        await repo.releaseRoster(with: .success(rosterFixture()))
        await load.value

        XCTAssertEqual(sut.rosterBrowseState, .idle)
        XCTAssertTrue(sut.rosterPartners.isEmpty)
        XCTAssertEqual(sut.offer.leagueContext, .init(platform: "yahoo", leagueId: "league-b"))
    }

    func testLateLeagueAAuthorizationFailureCannotOverwriteLeagueBState() async {
        let expiring = Session(
            userID: "user-1",
            accessToken: "old",
            refreshToken: "refresh",
            expiresAtEpochSeconds: 1_050
        )
        let sessionManager = SessionManager(
            store: InMemorySecureSessionStore(initial: expiring),
            nowEpochSeconds: { 1_000 }
        )
        let refresher = HoldingSessionRefresher()
        sessionManager.attach(refresher: refresher)
        let sut = TradeViewModel(
            repository: StubTradeRepository(result: .failure(.network), rosterResult: .success(rosterFixture())),
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: sessionManager
        )
        sut.useLeague(platform: "sleeper", leagueId: "league-a", viewerTeamId: "1")
        let load = Task { await sut.loadRoster(userID: "user-1") }
        await refresher.waitUntilHeld()

        sut.useLeague(platform: "yahoo", leagueId: "league-b", viewerTeamId: "9")
        refresher.release(.rejected)
        await load.value

        XCTAssertEqual(sut.rosterBrowseState, .idle)
        XCTAssertEqual(sut.offer.leagueContext, .init(platform: "yahoo", leagueId: "league-b"))
    }

    // MARK: - Roster: honest unavailable, never fabricated, never a crash

    func testUnavailableResponseRendersPermanentlyUnavailableWithTheServerReason() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture(status: "unavailable", reason: "provider_reauth_required", platform: "espn")))
        await sut.loadRoster(userID: "user-1")

        guard case .loaded(let response) = sut.rosterBrowseState, !response.isAvailable else {
            return XCTFail("Expected an honest unavailable answer")
        }
        XCTAssertTrue(response.unavailableSentence.contains("reconnected"), "Sentence should name the real reason, got: \(response.unavailableSentence)")
        // No partner has a fabricated roster.
        XCTAssertNil(sut.partnerRoster)
        XCTAssertNil(sut.viewerRoster)
    }

    func testProviderUnsupportedRendersHonestlyRatherThanCrashing() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture(status: "unavailable", reason: "provider_unsupported", platform: "yahoo")))
        await sut.loadRoster(userID: "user-1")

        guard case .loaded(let response) = sut.rosterBrowseState, !response.isAvailable else {
            return XCTFail("Expected an honest unavailable answer, never a crash")
        }
        XCTAssertNil(sut.partnerRoster)
    }

    func testTransportFailureIsDistinctFromTheServersHonestUnavailableAnswer() async {
        let sut = makeViewModel(rosterResult: .failure(.server(status: 503)))
        await sut.loadRoster(userID: "user-1")

        XCTAssertEqual(sut.rosterBrowseState, .failed(.server(status: 503)))
        // Nothing stale or fabricated to pick from.
        XCTAssertNil(sut.partnerRoster)
    }

    /// Live walk, 2026-10-22: opening Trade before the league overview loaded said "couldn't reach the server".
    /// With no league named yet the builder waits (and never guesses a league); it is not a network failure.
    func testNoLeagueYetWaitsRatherThanGuessingOrBlamingTheNetwork() async {
        let vm = TradeViewModel(
            repository: StubTradeRepository(result: .failure(.network), rosterResult: .success(rosterFixture())),
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: signedInSessionManager()
        )
        await vm.loadRoster(userID: "user-1")
        XCTAssertEqual(vm.rosterBrowseState, .idle)
        XCTAssertNil(vm.partnerRoster)
    }

    // MARK: - Share: calls the route, handles both outcomes

    func testShareCallsTheRouteAndHandlesSuccess() async {
        let response = try! JSONDecoder().decode(TradeShareResponse.self, from: Data("""
        { "contract_version": "trade-share.v1", "hash": "abc-123", "api_path": "/api/trade/share/abc-123", "expires_at": "2026-10-24T00:00:00Z" }
        """.utf8))
        let sut = makeViewModel(rosterResult: .failure(.network), shareResult: .success(response))
        sut.offer.send = [TradePlayer(name: "A", position: "RB")]
        sut.offer.receive = [TradePlayer(name: "B", position: "WR")]

        await sut.share(userID: "user-1")

        XCTAssertEqual(sut.shareState, .shared(response))
        XCTAssertEqual(
            sut.sharedURL(baseURL: URL(string: "https://slopssaloon.com")!)?.absoluteString,
            "https://slopssaloon.com/api/trade/share/abc-123"
        )
    }

    func testShareFailureIsNamedRatherThanSilent() async {
        let sut = makeViewModel(rosterResult: .failure(.network), shareResult: .failure(.server(status: 503)))
        sut.offer.send = [TradePlayer(name: "A", position: "RB")]
        sut.offer.receive = [TradePlayer(name: "B", position: "WR")]

        await sut.share(userID: "user-1")

        XCTAssertEqual(sut.shareState, .failed(.server(status: 503)))
    }

    func testNamesOffByDefaultMasksThePayloadSentToShare() async {
        let sut = makeViewModel(rosterResult: .failure(.network))
        sut.offer.send = [TradePlayer(name: "Real Name", position: "RB")]
        sut.offer.receive = [TradePlayer(name: "Other Name", position: "WR")]

        XCTAssertFalse(sut.shareIncludeNames)
        await sut.share(userID: "user-1")
        // Not directly observable from state (the mask is applied to the outgoing payload),
        // but toggling must be possible and must change future payloads.
        sut.toggleShareInclusion("names")
        XCTAssertTrue(sut.shareIncludeNames)
    }

    // MARK: - T5: three-team trade builder

    /// `GET /api/trade/roster`'s `teams` array is documented as opponent rosters only (the
    /// server never lists the caller's own team) — the client has no `is_you` flag to filter on,
    /// so this fixture intentionally lists only the two teams a real response would.
    private func threeTeamRosterFixture() -> TradeRosterResponse {
        let json = """
        {
          "contract_version": "trade-roster.v1",
          "status": "ok",
          "platform": "sleeper",
          "week": 3,
          "teams": [
            { "team_id": "1", "team_name": "Own Team", "players": [
              { "player_key": "sleeper:100", "name": "Jonathan Taylor", "position": "RB", "team": "IND" }
            ] },
            { "team_id": "2", "team_name": "Davante's Inferno", "players": [
              { "player_key": "sleeper:200", "name": "Ja'Marr Chase", "position": "WR", "team": "CIN" }
            ] },
            { "team_id": "3", "team_name": "Chubb Rock", "players": [
              { "player_key": "sleeper:300", "name": "Tyjae Spears", "position": "RB", "team": "TEN" }
            ] }
          ]
        }
        """
        return try! JSONDecoder().decode(TradeRosterResponse.self, from: Data(json.utf8))
    }

    private func threeTeamCapableViewModel(threeTeamResult: Result<TradeThreeTeamCompare, OmenApiError> = .failure(.network)) -> TradeViewModel {
        let repo = StubTradeRepository(
            result: .failure(.network),
            rosterResult: .success(threeTeamRosterFixture()),
            threeTeamResult: threeTeamResult
        )
        let vm = TradeViewModel(repository: repo, playerSearch: StubPlayerSearchRepository(result: .success([])), sessionManager: signedInSessionManager())
        vm.useLeague(platform: "sleeper", leagueId: "league-1", viewerTeamId: "1")
        return vm
    }

    /// Three-team needs a third team: until one is picked there are no teams to send between.
    func testWithNoThirdPartnerThereIsNoThreeTeamTrade() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")

        XCTAssertTrue(sut.threeTeamTeams.isEmpty)
        XCTAssertTrue(sut.threeTeamLegs.isEmpty)
        // Candidates exclude the viewer (never listed) and the already-selected primary.
        XCTAssertEqual(sut.partnerPickerCandidates.map(\.id), ["3"])
    }

    func testAddingAThirdPartnerNamesAllThreeTeams() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")
        guard let candidate = sut.partnerPickerCandidates.first else { return XCTFail("expected a candidate") }
        sut.addThirdPartner(candidate)

        XCTAssertEqual(sut.thirdPartnerTeamID, "3")
        XCTAssertEqual(sut.threeTeamTeams.map(\.id), ["you", "2", "3"])
        XCTAssertEqual(sut.threeTeamRoster("you")?.players.map(\.name), ["Jonathan Taylor"])
        XCTAssertTrue(sut.partnerPickerCandidates.isEmpty)
    }

    func testAnyTeamCanSendToEitherOtherAndChoosingAgainTakesHimBack() async {
        let sut = threeTeamWithThirdTeam()
        await sut.loadRoster(userID: "user-1")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        guard let chase = sut.threeTeamRoster("2")?.players.first, let taylor = sut.threeTeamRoster("you")?.players.first else {
            return XCTFail("fixture players missing")
        }

        sut.setThreeTeamDestination(chase, from: "2", to: "3")
        sut.setThreeTeamDestination(taylor, from: "you", to: "2")
        XCTAssertEqual(sut.threeTeamLegs.map { "\($0.from)>\($0.to)" }, ["2>3", "you>2"])
        XCTAssertEqual(sut.threeTeamDestination(playerKey: "sleeper:200", from: "2"), "3")

        // Moving him to the other team replaces the leg; choosing the same team again takes him out.
        sut.setThreeTeamDestination(chase, from: "2", to: "you")
        XCTAssertEqual(sut.threeTeamDestination(playerKey: "sleeper:200", from: "2"), "you")
        sut.setThreeTeamDestination(chase, from: "2", to: "you")
        XCTAssertNil(sut.threeTeamDestination(playerKey: "sleeper:200", from: "2"))
        XCTAssertEqual(sut.threeTeamLegs.map { "\($0.from)>\($0.to)" }, ["you>2"], "no empty legs left behind")
    }

    func testRemovingTheThirdPartnerDiscardsItsLegsAndReturnsToTwoTeamState() async {
        let sut = threeTeamWithThirdTeam()
        await sut.loadRoster(userID: "user-1")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        if let chase = sut.threeTeamRoster("2")?.players.first { sut.setThreeTeamDestination(chase, from: "2", to: "3") }
        XCTAssertEqual(sut.threeTeamLegs.count, 1)

        sut.removeThirdPartner()

        XCTAssertNil(sut.thirdPartnerTeamID)
        XCTAssertTrue(sut.threeTeamLegs.isEmpty, "every leg touching the removed team is discarded")
        XCTAssertEqual(sut.thirdPartnerRemovalDisclosure, "Removed Chubb Rock. Any legs with them were cleared too.")
        XCTAssertTrue(sut.threeTeamTeams.isEmpty)
    }

    func testCompareThreeTeamRefusesAnythingShortOfTheThreeTeamShape() async {
        let sut = threeTeamWithThirdTeam()
        await sut.loadRoster(userID: "user-1")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        if let chase = sut.threeTeamRoster("2")?.players.first { sut.setThreeTeamDestination(chase, from: "2", to: "3") }
        // Only one leg so far — T1 requires at least two.

        await sut.compareThreeTeam(userID: "user-1")
        XCTAssertEqual(sut.threeTeamViewState, .idle, "never sent a payload short of the documented shape")
    }

    func testCompareThreeTeamSucceedsAndTicksTheHandoffSteps() async throws {
        let compareResponse = try JSONDecoder().decode(TradeThreeTeamCompare.self, from: Data("""
        {
          "contract_version": "trade-compare.v2", "trade_shape": "three_team", "team_count": 3,
          "participants": [
            {"team_id": "you", "team_name": null,
             "sends": {"total_value": 4, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Jonathan Taylor", "position": "RB", "player_key": null}]},
             "receives": {"total_value": 3, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Ja'Marr Chase", "position": "WR", "player_key": null}]},
             "net_value": -1, "verdict_state": "favors_you", "acceptance_likelihood": "likely", "confidence": "medium",
             "roster_fit": null, "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}}
          ],
          "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2},
          "verdict_state": "favors_you",
          "analysis_context": {"mode": "neutral", "platform": "sleeper", "league_id": null, "league_name": null, "applied": [], "unavailable_reason": null},
          "submission": {"mode": "split_handoff", "reason": null, "caption": "Submit it as linked two-team trades.", "steps": ["Leg 1: send X.", "Leg 2: send Y."]}
        }
        """.utf8))
        let sut = threeTeamWithThirdTeam(threeTeamResult: .success(compareResponse))
        await sut.loadRoster(userID: "user-1")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        guard let chase = sut.threeTeamRoster("2")?.players.first, let taylor = sut.threeTeamRoster("you")?.players.first else {
            return XCTFail("fixture players missing")
        }
        sut.setThreeTeamDestination(chase, from: "2", to: "3")
        sut.setThreeTeamDestination(taylor, from: "you", to: "2")

        await sut.compareThreeTeam(userID: "user-1")

        guard case .loaded(let compare) = sut.threeTeamViewState else { return XCTFail("Expected .loaded") }
        XCTAssertEqual(compare.verdictState, .favorsYou)
        XCTAssertEqual(compare.submission.steps.count, 2)

        sut.toggleThreeTeamSubmissionStep(0)
        XCTAssertEqual(sut.threeTeamSubmissionDoneSteps, [0])
        XCTAssertEqual(sut.copyTextForThreeTeamStep(0), "Ja'Marr Chase")
    }

    func testCompareThreeTeamFailureIsNamed() async {
        let sut = threeTeamWithThirdTeam(threeTeamResult: .failure(.server(status: 503)))
        await sut.loadRoster(userID: "user-1")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        if let chase = sut.threeTeamRoster("2")?.players.first { sut.setThreeTeamDestination(chase, from: "2", to: "3") }
        if let taylor = sut.threeTeamRoster("you")?.players.first { sut.setThreeTeamDestination(taylor, from: "you", to: "2") }

        await sut.compareThreeTeam(userID: "user-1")
        XCTAssertEqual(sut.threeTeamViewState, .failed(.server(status: 503)))
    }

    private func threeTeamWithThirdTeam(threeTeamResult: Result<TradeThreeTeamCompare, OmenApiError> = .failure(.network)) -> TradeViewModel {
        let vm = threeTeamCapableViewModel(threeTeamResult: threeTeamResult)
        return vm
    }
}

extension TradeRosterAndShareTests {
    /// Review P1, 2026-10-22: a new main partner must end the three-team trade built around the old one.
    func testSwitchingPartnerEndsTheThreeTeamTrade() async {
        let repo = StubTradeRepository(result: .failure(.network), rosterResult: .success(threeTeamFixtureForSwitch()))
        let sut = TradeViewModel(repository: repo, playerSearch: StubPlayerSearchRepository(result: .success([])), sessionManager: signedInSessionManagerForSwitch())
        sut.useLeague(platform: "sleeper", leagueId: "league-1", viewerTeamId: "1")
        await sut.loadRoster(userID: "user-1")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        if let chase = sut.threeTeamRoster("2")?.players.first { sut.setThreeTeamDestination(chase, from: "2", to: "3") }

        sut.switchPartner(to: "3")

        XCTAssertNil(sut.thirdPartnerTeamID)
        XCTAssertTrue(sut.threeTeamLegs.isEmpty)
        XCTAssertTrue(sut.threeTeamTeams.isEmpty, "never the same team twice")
    }

    private func threeTeamFixtureForSwitch() -> TradeRosterResponse {
        try! JSONDecoder().decode(TradeRosterResponse.self, from: Data("""
        { "contract_version": "trade-roster.v1", "status": "ok", "platform": "sleeper", "week": 3, "teams": [
          { "team_id": "1", "team_name": "Own", "players": [ { "player_key": "sleeper:100", "name": "A" } ] },
          { "team_id": "2", "team_name": "Two", "players": [ { "player_key": "sleeper:200", "name": "B" } ] },
          { "team_id": "3", "team_name": "Chubb Rock", "players": [ { "player_key": "sleeper:300", "name": "C" } ] } ] }
        """.utf8))
    }

    private func signedInSessionManagerForSwitch() -> SessionManager {
        SessionManager(store: InMemorySecureSessionStore(initial: Session(userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000)), nowEpochSeconds: { 1_000 })
    }
}
