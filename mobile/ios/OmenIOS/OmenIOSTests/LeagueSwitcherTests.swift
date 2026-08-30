import XCTest
@testable import Omen

/// Visual briefs §10.2/§10.3 — the team/league switcher sheet.
///
/// The regression this file exists to prevent is the one the founder actually hit: the
/// backend endpoints existed and were deployed, `OmenContextStrip` supported a switch
/// gesture, and the real app still gave a user with a connected league no way to choose
/// it — because `onSwitchContext` was never passed at the call site, so the control did
/// not render. Every unit was fine; the wiring between them was the whole defect.
@MainActor
final class LeagueSwitcherTests: XCTestCase {

    private func makeSessionManager() -> SessionManager {
        SessionManager(
            store: InMemorySecureSessionStore(initial: Session(
                userID: "user-1", accessToken: "t", refreshToken: "refresh", expiresAtEpochSeconds: 2_000
            )),
            nowEpochSeconds: { 1_000 }
        )
    }

    /// The shape `GET /api/leagues` actually returns, nulls included.
    private func directoryJSON() -> Data {
        Data("""
        {
          "contract_version": "league-directory.v1",
          "season": 2026,
          "selection_persistence": "provider_binding_only",
          "active": {"platform":"sleeper","league_id":"L-alpha","league_name":"Alpha League","season":2026,"scoring_format":"standard","team_id":"3","team_name":"Justin Titans"},
          "platforms": [
            {"platform":"sleeper","connection_state":"connected","discovery":"full","notice":null,"leagues":[
              {"league_id":"L-alpha","league_name":"Alpha League","season":2026,"scoring_format":"standard","team_id":"3","team_name":"Justin Titans","is_active":true},
              {"league_id":"L-zeta","league_name":"Zeta League","season":2026,"scoring_format":"half_ppr","team_id":"7","team_name":"Titans Too","is_active":false}]},
            {"platform":"espn","connection_state":"connected","discovery":"bound_only","notice":"ESPN does not expose a league list to Omen, so only the connected league is shown.","leagues":[
              {"league_id":"12345","league_name":null,"season":2026,"scoring_format":null,"team_id":"9","team_name":"ESPN Team","is_active":false}]},
            {"platform":"yahoo","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]}
          ]
        }
        """.utf8)
    }

    private func decodedDirectory() throws -> LeagueDirectory {
        try JSONDecoder().decode(LeagueDirectory.self, from: directoryJSON())
    }

    // MARK: - Contract decoding

    func testDirectoryDecodesServerNullsWithoutFailing() throws {
        let directory = try decodedDirectory()

        XCTAssertEqual(directory.contractVersion, "league-directory.v1")
        XCTAssertEqual(directory.selectionPersistence, "provider_binding_only")
        XCTAssertEqual(directory.platforms.map(\.platform), ["sleeper", "espn", "yahoo"])

        // ESPN's league carries a null name and null scoring format on purpose — ESPN
        // exposes no league list, and its scoring rules are unverified. Modelling either
        // as required would turn an honest response into a decode failure.
        let espn = try XCTUnwrap(directory.platforms.first { $0.platform == "espn" })
        XCTAssertNil(espn.leagues[0].leagueName)
        XCTAssertNil(espn.leagues[0].scoringFormat)
        XCTAssertEqual(espn.discovery, "bound_only")
    }

    func testSelectionResultCarriesTheSurfacesToRefresh() throws {
        let json = Data("""
        {"contract_version":"league-active-selection.v1","selection_persistence":"provider_binding_only",
         "active":{"platform":"sleeper","league_id":"L-zeta","team_id":"7"},
         "refresh":["command_center","omen","league","waiver_watch","ledger"]}
        """.utf8)

        let result = try JSONDecoder().decode(LeagueSelectionResult.self, from: json)

        // §10.3 names the affected surfaces server-side rather than letting the client guess.
        XCTAssertEqual(result.refresh, ["command_center", "omen", "league", "waiver_watch", "ledger"])
        XCTAssertEqual(result.active?.leagueID, "L-zeta")
    }

    // MARK: - View model

    private func viewModel(
        selection: Result<LeagueSelectionResult, OmenApiError>,
        recorder: StubLeagueDirectoryRepository.Recorder? = nil
    ) throws -> LeagueSwitcherViewModel {
        var repo = StubLeagueDirectoryRepository(
            directory: .success(try decodedDirectory()), selection: selection
        )
        repo.recorder = recorder
        return LeagueSwitcherViewModel(repository: repo, sessionManager: makeSessionManager())
    }

    private func successfulSelection() -> Result<LeagueSelectionResult, OmenApiError> {
        .success(LeagueSelectionResult(
            contractVersion: "league-active-selection.v1",
            selectionPersistence: "provider_binding_only",
            active: .init(platform: "sleeper", leagueID: "L-zeta", teamID: "7"),
            refresh: ["command_center", "omen"]
        ))
    }

    // MARK: - F-DEV-02: the switch that "did not take"

    /// The founder picked ESPN and Omen kept using Sleeper. The switch was not ignored — the
    /// server bound the league inside ESPN — but nothing records which PROVIDER he chose until
    /// the reviewed selection column is applied, so every surface falls back to a tie-break
    /// that puts Sleeper first. The server reports this in `selection_persistence`, and the
    /// sheet decoded that field and ignored it.
    func testACrossProviderChoiceIsFlaggedAsUnableToPersist() throws {
        let directory = try decodedDirectory()

        XCTAssertEqual(directory.selectionPersistence, "provider_binding_only")
        XCTAssertGreaterThan(directory.platforms.filter { !$0.leagues.isEmpty }.count, 1)
        XCTAssertTrue(directory.crossProviderChoiceCannotPersist)
    }

    /// Applying the column flips the server to `explicit`, and the warning must disappear on
    /// its own — no client release, no flag to remember to remove.
    func testTheWarningDisappearsOnceTheServerCanPersistTheChoice() throws {
        let directory = try decodedDirectory()
        let applied = LeagueDirectory(
            contractVersion: directory.contractVersion,
            season: directory.season,
            selectionPersistence: "explicit",
            active: directory.active,
            platforms: directory.platforms
        )

        XCTAssertFalse(applied.crossProviderChoiceCannotPersist)
    }

    /// One provider has nothing to cross. Warning there would describe a limit the user
    /// cannot reach, which is its own kind of dishonesty.
    func testASingleProviderIsNotWarnedAboutCrossProviderPersistence() throws {
        let directory = try decodedDirectory()
        let onlyFirst = LeagueDirectory(
            contractVersion: directory.contractVersion,
            season: directory.season,
            selectionPersistence: "provider_binding_only",
            active: directory.active,
            platforms: directory.platforms.filter { !$0.leagues.isEmpty }.prefix(1).map { $0 }
        )

        XCTAssertFalse(onlyFirst.crossProviderChoiceCannotPersist)
    }

    func testLoadPublishesTheDirectory() async throws {
        let model = try viewModel(selection: successfulSelection())
        await model.load()

        guard case .loaded(let directory) = model.viewState else {
            return XCTFail("expected loaded, got \(model.viewState)")
        }
        XCTAssertEqual(directory.platforms.count, 3)
    }

    func testSelectSendsPlatformLeagueAndTeamAndReturnsRefreshTargets() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let model = try viewModel(selection: successfulSelection(), recorder: recorder)

        let refresh = await model.select(platform: "sleeper", leagueID: "L-zeta", teamID: "7")

        XCTAssertEqual(refresh, ["command_center", "omen"])
        XCTAssertEqual(recorder.calls.count, 1)
        XCTAssertEqual(recorder.calls[0].platform, "sleeper")
        XCTAssertEqual(recorder.calls[0].leagueID, "L-zeta")
        XCTAssertEqual(recorder.calls[0].teamID, "7")
    }

    func testAFailedSelectionReturnsNilSoTheCallerCannotRefreshIntoAStaleContext() async throws {
        let model = try viewModel(selection: .failure(.server(status: 502)))

        let refresh = await model.select(platform: "sleeper", leagueID: "L-zeta", teamID: "7")

        // §10.3: a failed switch must never leave the old context looking new. Returning
        // nil is what stops the caller re-reading and relabelling it.
        XCTAssertNil(refresh)
        XCTAssertEqual(model.selectionError, .server(status: 502))
    }

    func testAnUnreadableDirectoryFailsHonestlyRatherThanFallingBackToAFixture() async {
        let model = LeagueSwitcherViewModel(
            repository: StubLeagueDirectoryRepository(directory: .failure(.network)),
            sessionManager: makeSessionManager()
        )
        await model.load()

        // facts-of-record #7: showing demo leagues to a real user during an outage is
        // exactly the mock/live mixing the doctrine forbids.
        guard case .failed(let error) = model.viewState else {
            return XCTFail("expected failed, got \(model.viewState)")
        }
        XCTAssertEqual(error, .network)
    }

    // MARK: - Presentation rules

    func testAccessibilityLabelCarriesTeamLeagueAndPlatformEvenWhenLabelsTruncate() throws {
        let directory = try decodedDirectory()
        let sleeper = try XCTUnwrap(directory.platforms.first { $0.platform == "sleeper" })

        let selected = switcherRowAccessibilityLabel(group: sleeper, league: sleeper.leagues[0])
        XCTAssertTrue(selected.contains("Justin Titans"), selected)
        XCTAssertTrue(selected.contains("Alpha League"), selected)
        XCTAssertTrue(selected.contains("Sleeper"), selected)
        // §10.2 forbids a colour-only selection cue, so the state is in the label too.
        XCTAssertTrue(selected.contains("selected"), selected)

        let unselected = switcherRowAccessibilityLabel(group: sleeper, league: sleeper.leagues[1])
        XCTAssertFalse(unselected.contains("selected"), unselected)
    }

    func testAnEspnLeagueWithNoNameStillProducesAUsableLabel() throws {
        let directory = try decodedDirectory()
        let espn = try XCTUnwrap(directory.platforms.first { $0.platform == "espn" })

        let label = switcherRowAccessibilityLabel(group: espn, league: espn.leagues[0])

        XCTAssertTrue(label.contains("ESPN Team"), label)
        XCTAssertFalse(label.lowercased().contains("nil"), label)
    }

    func testErrorCopyNeverExposesAStatusCodeOrProviderDetail() {
        for error in [OmenApiError.network, .decode, .server(status: 502), .unauthorized] {
            let message = switcherErrorMessage(error)
            XCTAssertFalse(message.contains("502"), message)
            XCTAssertFalse(message.lowercased().contains("token"), message)
            XCTAssertFalse(message.lowercased().contains("cookie"), message)
            XCTAssertFalse(message.isEmpty)
        }
        XCTAssertTrue(switcherErrorMessage(.unauthorized).contains("Sign in"))
    }
}
