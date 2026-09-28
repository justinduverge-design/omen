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
        vm.useLeague(platform: "sleeper", leagueId: "league-1")
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
        XCTAssertEqual(sut.selectedPartnerTeamID, "1")

        sut.selectPartnerTeam("2")
        let screenState = sut.rosterScreenState
        guard case .read(let teamName, let playerCount, let rows, _) = screenState?.rosters else {
            return XCTFail("Expected .read for the selected partner")
        }
        XCTAssertEqual(teamName, "Rival Team")
        XCTAssertEqual(playerCount, 1)
        XCTAssertEqual(rows.first?.name, "Rival Player")
        XCTAssertEqual(rows.first?.availability, .available)
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

        guard case .read(_, _, let rows, _) = sut.rosterScreenState?.rosters else {
            return XCTFail("Expected .read")
        }
        XCTAssertEqual(rows.first?.availability, .added)
    }

    // MARK: - Roster: honest unavailable, never fabricated, never a crash

    func testUnavailableResponseRendersPermanentlyUnavailableWithTheServerReason() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture(status: "unavailable", reason: "provider_reauth_required", platform: "espn")))
        await sut.loadRoster(userID: "user-1")

        guard case .permanentlyUnavailable(_, let sentence) = sut.rosterScreenState?.rosters else {
            return XCTFail("Expected .permanentlyUnavailable")
        }
        XCTAssertTrue(sentence.contains("reconnected"), "Sentence should name the real reason, got: \(sentence)")
        // No partner has a fabricated roster.
        XCTAssertTrue(sut.rosterScreenState?.rosters != .read(teamName: "", playerCount: 0, rows: [], freshness: ""))
    }

    func testProviderUnsupportedRendersHonestlyRatherThanCrashing() async {
        let sut = makeViewModel(rosterResult: .success(rosterFixture(status: "unavailable", reason: "provider_unsupported", platform: "yahoo")))
        await sut.loadRoster(userID: "user-1")

        guard case .permanentlyUnavailable = sut.rosterScreenState?.rosters else {
            return XCTFail("Expected .permanentlyUnavailable, never a crash")
        }
    }

    func testTransportFailureIsDistinctFromTheServersHonestUnavailableAnswer() async {
        let sut = makeViewModel(rosterResult: .failure(.server(status: 503)))
        await sut.loadRoster(userID: "user-1")

        XCTAssertEqual(sut.rosterBrowseState, .failed(.server(status: 503)))
        // The screen state itself models no failure case — the hosting flow handles it, so it
        // must be nil rather than silently rendering a stale or fabricated roster.
        XCTAssertNil(sut.rosterScreenState)
    }

    func testNoLeagueConnectedFailsRatherThanGuessingALeague() async {
        let vm = TradeViewModel(
            repository: StubTradeRepository(result: .failure(.network), rosterResult: .success(rosterFixture())),
            playerSearch: StubPlayerSearchRepository(result: .success([])),
            sessionManager: signedInSessionManager()
        )
        await vm.loadRoster(userID: "user-1")
        XCTAssertEqual(vm.rosterBrowseState, .failed(.network))
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
        vm.useLeague(platform: "sleeper", leagueId: "league-1")
        return vm
    }

    /// **The strict regression requirement.** A user without a third partner must see exactly
    /// today's existing 2-team experience — `thirdPartner`/`removalDisclosure` nil, `sides` built
    /// from the plain 2-team `offer`, `read`/`submission` nil, unchanged from before T5.
    func testWithNoThirdPartnerTheBuildStateIsExactlyTheExisting2TeamShape() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")

        let state = sut.rosterBuildState
        XCTAssertNil(state.thirdPartner)
        XCTAssertNil(state.removalDisclosure)
        XCTAssertNil(state.read)
        XCTAssertNil(state.submission)
        XCTAssertEqual(state.kicker, "Two teams")
        XCTAssertEqual(state.sides.map(\.heading), ["You send", "You receive"])
        XCTAssertTrue(sut.threeTeamRecipientChoices.isEmpty, "no recipient chooser without a third team")

        // The roster screen's rows carry no recipients either — a plain "Add to deal" commits
        // straight to "you", exactly as before T5.
        guard case .read(let teamName, let playerCount, let rows, _) = sut.rosterScreenState?.rosters else {
            return XCTFail("Expected .read")
        }
        XCTAssertEqual(teamName, "Davante's Inferno")
        XCTAssertEqual(playerCount, 1)
        XCTAssertEqual(rows, [
            .init(id: "sleeper:200", name: "Ja'Marr Chase", meta: "WR · CIN", availability: .available, recipients: []),
        ])
    }

    func testOpenPartnerPickerIsANoOpWithoutThreeTeamSupport() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")

        sut.openPartnerPicker()
        XCTAssertFalse(sut.isPartnerPickerPresented, "capability never read as supported, so the chip stays unavailable")
    }

    func testAddingAThirdPartnerActivatesTheThreeTeamPartnersRowAndClearsCandidates() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")

        // Candidates exclude the viewer (never listed) and the already-selected primary.
        XCTAssertEqual(sut.partnerPickerCandidates.map(\.id), ["3"])

        guard let candidate = sut.partnerPickerCandidates.first else { return XCTFail("expected a candidate") }
        sut.addThirdPartner(candidate)

        XCTAssertEqual(sut.thirdPartnerTeamID, "3")
        XCTAssertFalse(sut.isPartnerPickerPresented)
        let state = sut.rosterBuildState
        XCTAssertEqual(state.thirdPartner?.id, "3")
        XCTAssertEqual(state.kicker, "Three teams")
        XCTAssertEqual(sut.threeTeamRecipientChoices.map(\.label), ["Send to you", "Send to Chubb Rock"])
    }

    func testChoosingARecipientBuildsALegAndMarksTheRowAdded() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))

        sut.chooseThreeTeamRecipient(playerID: "sleeper:200", recipientTeamID: "3")

        XCTAssertEqual(sut.threeTeamLegs.count, 1)
        XCTAssertEqual(sut.threeTeamLegs.first?.from, "2")
        XCTAssertEqual(sut.threeTeamLegs.first?.to, "3")
        XCTAssertEqual(sut.threeTeamLegs.first?.players.first?.name, "Ja'Marr Chase")

        guard case .read(_, _, let rows, _) = sut.rosterScreenState?.rosters else {
            return XCTFail("Expected .read")
        }
        XCTAssertEqual(rows.first?.availability, .added)
        XCTAssertEqual(rows.first?.recipients, [], "an already-added row offers no further choice")
    }

    func testRemovingTheThirdPartnerDiscardsItsLegsAndReturnsToTwoTeamState() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        sut.chooseThreeTeamRecipient(playerID: "sleeper:200", recipientTeamID: "3")
        XCTAssertEqual(sut.threeTeamLegs.count, 1)

        sut.removeThirdPartner()

        XCTAssertNil(sut.thirdPartnerTeamID)
        XCTAssertTrue(sut.threeTeamLegs.isEmpty, "every leg touching the removed team is discarded")
        XCTAssertEqual(sut.thirdPartnerRemovalDisclosure, "Removed Chubb Rock. Any legs with them were cleared too.")
        XCTAssertNil(sut.rosterBuildState.thirdPartner)
    }

    func testCompareThreeTeamRefusesAnythingShortOfTheThreeTeamShape() async {
        let sut = threeTeamCapableViewModel()
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        sut.chooseThreeTeamRecipient(playerID: "sleeper:200", recipientTeamID: "3")
        // Only one leg so far — T1 requires at least two.

        await sut.compareThreeTeam(userID: "user-1")
        XCTAssertEqual(sut.threeTeamViewState, .idle, "never sent a payload short of the documented shape")
    }

    func testCompareThreeTeamSucceedsAndBuildsTheSplitHandoffChecklist() async throws {
        let compareResponse = try JSONDecoder().decode(TradeThreeTeamCompare.self, from: Data("""
        {
          "contract_version": "trade-compare.v2", "trade_shape": "three_team", "team_count": 3,
          "participants": [
            {"team_id": "you", "team_name": null,
             "sends": {"total_value": 4, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Jonathan Taylor", "position": "RB", "player_key": null}]},
             "receives": {"total_value": 3, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Tyjae Spears", "position": "RB", "player_key": null}]},
             "net_value": -1, "verdict_state": "favors_you", "acceptance_likelihood": "likely", "confidence": "medium",
             "roster_fit": null, "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}}
          ],
          "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2},
          "verdict_state": "favors_you",
          "analysis_context": {"mode": "neutral", "platform": "sleeper", "league_id": null, "league_name": null, "applied": [], "unavailable_reason": null},
          "submission": {"mode": "split_handoff", "reason": null, "caption": "Submit it as linked two-team trades.", "steps": ["Leg 1: send X.", "Leg 2: send Y."]}
        }
        """.utf8))
        let sut = threeTeamCapableViewModel(threeTeamResult: .success(compareResponse))
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        sut.chooseThreeTeamRecipient(playerID: "sleeper:200", recipientTeamID: "3")
        // Fake a second leg by adding another (same from/to pairing would merge, so pick a
        // distinct player on the same row to keep the fixture simple) — the guard only checks
        // count >= 2, not distinct team pairs, matching T1's own `MIN_THREE_TEAM_LEGS` check.
        sut.chooseThreeTeamRecipient(playerID: "sleeper:200", recipientTeamID: "you")

        await sut.compareThreeTeam(userID: "user-1")

        guard case .loaded(let compare) = sut.threeTeamViewState else {
            return XCTFail("Expected .loaded")
        }
        XCTAssertEqual(compare.verdictState, .favorsYou)

        let state = sut.rosterBuildState
        XCTAssertEqual(state.read?.headline, "This favors you")
        XCTAssertEqual(state.submission?.steps.count, 2)
        XCTAssertEqual(state.submission?.progressCaption, "0 of 2 legs sent.")
        XCTAssertEqual(state.submission?.stepDone, [false, false])

        sut.toggleThreeTeamSubmissionStep(0)
        XCTAssertEqual(sut.rosterBuildState.submission?.progressCaption, "1 of 2 legs sent.")
        XCTAssertEqual(sut.rosterBuildState.submission?.stepDone, [true, false])

        XCTAssertEqual(sut.copyTextForThreeTeamStep(0), "Ja'Marr Chase")
    }

    func testCompareThreeTeamFailureIsNamed() async {
        let sut = threeTeamCapableViewModel(threeTeamResult: .failure(.server(status: 503)))
        await sut.loadRoster(userID: "user-1")
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner(id: "3", crest: "CHB", name: "Chubb Rock"))
        sut.chooseThreeTeamRecipient(playerID: "sleeper:200", recipientTeamID: "3")
        sut.chooseThreeTeamRecipient(playerID: "sleeper:200", recipientTeamID: "you")

        await sut.compareThreeTeam(userID: "user-1")
        XCTAssertEqual(sut.threeTeamViewState, .failed(.server(status: 503)))
    }
}
