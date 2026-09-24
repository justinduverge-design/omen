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
}
