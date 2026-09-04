import XCTest
@testable import Omen

/// Account → Connected leagues, and the disconnect behind it.
///
/// The ESPN consent screen has told users since it shipped that they can disconnect "any time in
/// Account", and Account had no disconnect. `DELETE /api/platforms/:platform` shipped months
/// earlier and no client ever called it. These tests exist so that sentence stays true.
@MainActor
final class ConnectedPlatformsTests: XCTestCase {

    private func sessionManager(withToken token: String? = "t") -> SessionManager {
        let session = token.map {
            Session(userID: "user-1", accessToken: $0, refreshToken: "r", expiresAtEpochSeconds: 2_000)
        }
        return SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
    }

    private func directory(_ groups: [LeagueDirectory.PlatformGroup]) -> LeagueDirectory {
        LeagueDirectory(
            contractVersion: "league-directory.v1",
            season: 2026,
            selectionPersistence: "explicit",
            followPersistence: "explicit",
            active: nil,
            platforms: groups
        )
    }

    private func group(
        _ platform: String,
        state: String,
        leagues: [LeagueDirectory.League] = []
    ) -> LeagueDirectory.PlatformGroup {
        LeagueDirectory.PlatformGroup(
            platform: platform,
            connectionState: state,
            discovery: "full",
            notice: nil,
            leagues: leagues
        )
    }

    private func league(
        _ id: String,
        name: String? = nil,
        team: String? = nil,
        active: Bool = false
    ) -> LeagueDirectory.League {
        LeagueDirectory.League(
            leagueID: id,
            leagueName: name,
            season: 2026,
            scoringFormat: nil,
            teamID: nil,
            teamName: team,
            isActive: active
        )
    }

    // MARK: - What the list shows

    /// Only genuinely connected platforms are listed. Offering "Disconnect" on something that is
    /// not connected is its own small lie, and it is the kind that erodes trust in the rest of
    /// the screen — which also holds sign-out and delete.
    func testOnlyConnectedPlatformsAreOfferedForDisconnect() {
        let rows = ConnectedPlatformsViewModel.rows(from: directory([
            group("sleeper", state: "connected", leagues: [league("1", name: "Slops Dynasty")]),
            group("yahoo", state: "not_connected"),
            group("espn", state: "reconnect_required", leagues: [league("2")]),
        ]))

        XCTAssertEqual(rows.map(\.platform), ["sleeper"])
    }

    /// The active league is what the row describes when there is more than one.
    func testTheRowDescribesTheActiveLeagueWhenThereAreSeveral() {
        let rows = ConnectedPlatformsViewModel.rows(from: directory([
            group("sleeper", state: "connected", leagues: [
                league("1", name: "Other League", team: "Other Team"),
                league("2", name: "Slops Dynasty", team: "Team Slops", active: true),
            ]),
        ]))

        XCTAssertEqual(rows.first?.subtitle, "Slops Dynasty · Team Slops")
    }

    /// ESPN exposes no league list, so `league_name` is routinely null on a healthy connection.
    /// The row must say what is real and stay silent about the rest rather than print a
    /// placeholder next to a real value.
    func testAnEspnRowWithNoLeagueNameShowsWhatIsRealAndNothingElse() {
        let rows = ConnectedPlatformsViewModel.rows(from: directory([
            group("espn", state: "connected", leagues: [league("9", name: nil, team: "Team Slops", active: true)]),
        ]))

        XCTAssertEqual(rows.first?.displayName, "ESPN")
        XCTAssertEqual(rows.first?.subtitle, "Team Slops")
    }

    func testARowWithNothingToSayHasNoSubtitleRatherThanAnEmptyOne() {
        let rows = ConnectedPlatformsViewModel.rows(from: directory([
            group("espn", state: "connected", leagues: [league("9")]),
        ]))

        XCTAssertNil(rows.first?.subtitle)
    }

    // MARK: - Disconnecting

    func testDisconnectingCallsTheRouteAndRereadsTheServer() async {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        var repository = StubLeagueDirectoryRepository(
            directory: .success(directory([group("espn", state: "connected", leagues: [league("9")])]))
        )
        repository.recorder = recorder
        let viewModel = ConnectedPlatformsViewModel(repository: repository, sessionManager: sessionManager())
        await viewModel.load()

        await viewModel.disconnect("espn")

        XCTAssertEqual(recorder.disconnected, ["espn"])
        XCTAssertNil(viewModel.errorMessage)
    }

    /// **A failed disconnect must not look like a successful one.** Removing the row locally on
    /// failure would tell the user Omen had stopped reading their league while it was still
    /// reading it — the exact false statement this whole section was built to retire.
    func testAFailedDisconnectSaysSoAndLeavesTheConnectionListed() async {
        var repository = StubLeagueDirectoryRepository(
            directory: .success(directory([group("espn", state: "connected", leagues: [league("9")])]))
        )
        repository.disconnectResult = .failure(.network)
        let viewModel = ConnectedPlatformsViewModel(repository: repository, sessionManager: sessionManager())
        await viewModel.load()

        await viewModel.disconnect("espn")

        XCTAssertNotNil(viewModel.errorMessage)
        guard case .loaded(let rows) = viewModel.state else {
            return XCTFail("expected the list to survive a failed disconnect, got \(viewModel.state)")
        }
        XCTAssertEqual(rows.map(\.platform), ["espn"])
    }

    /// A directory that will not load must not take sign-out and delete down with it — they sit
    /// directly below this section, and Account is where a user goes when something is wrong.
    func testADirectoryFailureDegradesQuietlyInsteadOfBreakingAccount() async {
        let repository = StubLeagueDirectoryRepository(directory: .failure(.network))
        let viewModel = ConnectedPlatformsViewModel(repository: repository, sessionManager: sessionManager())

        await viewModel.load()

        XCTAssertEqual(viewModel.state, .failed)
        XCTAssertNil(viewModel.errorMessage, "a failed load is not an error the user caused")
    }

    /// Without a session there is nothing to authorize the call with, and asking the server
    /// anyway would surface as a confusing failure rather than an honest one.
    func testNoSessionReportsHonestlyRatherThanCallingTheRoute() async {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        var repository = StubLeagueDirectoryRepository(directory: .success(directory([])))
        repository.recorder = recorder
        let viewModel = ConnectedPlatformsViewModel(
            repository: repository,
            sessionManager: sessionManager(withToken: nil)
        )

        await viewModel.disconnect("espn")

        XCTAssertTrue(recorder.disconnected.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
    }
}
