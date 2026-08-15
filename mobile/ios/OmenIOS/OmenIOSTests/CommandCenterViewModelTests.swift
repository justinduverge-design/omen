import XCTest
@testable import Omen

/// M5-Native-API-Client slice B — view-model state machine.
@MainActor
final class CommandCenterViewModelTests: XCTestCase {
    private func makeSessionManager(withToken token: String?) -> SessionManager {
        let session = token.map {
            Session(userID: "user-1", accessToken: $0, refreshToken: "refresh", expiresAtEpochSeconds: 2_000)
        }
        return SessionManager(
            store: InMemorySecureSessionStore(initial: session),
            nowEpochSeconds: { 1_000 }
        )
    }

    private func summary(omen: String) throws -> DashboardSummary {
        try JSONDecoder().decode(DashboardSummary.self, from: Data("""
        {
          "contract_version": "dashboard-summary.v1",
          "is_mock": false,
          "user": { "favorite_team": null },
          "platforms": {
            "yahoo": { "connected": false },
            "sleeper": { "connected": true, "username": "slops" },
            "espn": { "connected": false }
          },
          "tools": {
            "omen_of_the_week": { "available": true, "status": "\(omen)" },
            "waiver_wire": { "available": true, "status": "ready" }
          }
        }
        """.utf8))
    }

    /// Demo must never touch the network, and must always render the labeled demo fixture.
    func testDemoUserRendersDemoFixtureWithoutCallingTheApi() async throws {
        final class FailingRepository: DashboardRepository {
            var called = false
            func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError> {
                called = true
                return .failure(.network)
            }
        }
        let repository = FailingRepository()
        let viewModel = CommandCenterViewModel(repository: repository, sessionManager: makeSessionManager(withToken: "t"))

        await viewModel.load(userID: SessionManager.demoUserID)

        XCTAssertFalse(repository.called, "demo must not issue a network request")
        XCTAssertEqual(viewModel.viewState, .demo)
        XCTAssertNil(viewModel.failure)
    }

    func testSuccessfulLoadMapsSummaryIntoCommandCenterState() async throws {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .success(try summary(omen: "ready"))),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertNil(viewModel.failure)
        XCTAssertEqual(viewModel.commandCenterState.greeting, "This week's move is ready.")
    }

    /// The critical honesty guarantee: a failed read must surface as a failure, never as a
    /// confident "you have no leagues connected" rendered from the disconnected fixture.
    func testFailedLoadSurfacesFailureRatherThanClaimingNoLeagues() async {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: "t")
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.failure, .network)
    }

    func testMissingAccessTokenIsUnauthorizedRatherThanACrash() async {
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: nil)
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.failure, .unauthorized)
    }

    /// A 401 from the product API means the session is no longer good; the shell must be
    /// told so it can route to re-auth rather than leaving a dead tab on screen.
    func testUnauthorizedResponseNotifiesTheSessionManager() async {
        let sessionManager = makeSessionManager(withToken: "t")
        sessionManager.restore()
        let viewModel = CommandCenterViewModel(
            repository: StubDashboardRepository(result: .failure(.unauthorized)),
            sessionManager: sessionManager
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(sessionManager.state, .needsReauth)
    }
}
