import XCTest
@testable import Omen

/// M5-NativeConnect — connection state machine and provider policy.
@MainActor
final class ConnectFlowTests: XCTestCase {
    private func sessionManager(withToken token: String? = "t") -> SessionManager {
        let session = token.map {
            Session(userID: "user-1", accessToken: $0, refreshToken: "r", expiresAtEpochSeconds: 2_000)
        }
        return SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
    }

    private func league(id: String = "L1") -> SleeperLeague {
        SleeperLeague(id: id, name: "Slops Dynasty", season: 2026, scoringFormat: "PPR", teamName: "Team Slops")
    }

    private func account() -> ResolvedSleeperAccount {
        ResolvedSleeperAccount(username: "slops", leagues: [league()])
    }

    // MARK: - Provider policy

    /// Sleeper is the only native connect path for beta. Yahoo is paused on an entitlement
    /// only Yahoo can grant; ESPN is research-gated by the onboarding contract §5.
    func testOnlySleeperIsConnectableInTheApp() {
        XCTAssertEqual(ConnectProvider.sleeper.availability, .available)

        guard case .onHold = ConnectProvider.yahoo.availability else {
            return XCTFail("Yahoo must be on hold, not connectable")
        }
        guard case .useWeb = ConnectProvider.espn.availability else {
            return XCTFail("ESPN must route to the web, not offer in-app connection")
        }
    }

    /// An unavailable provider must never dead-end: selecting it explains why and offers a way on.
    func testSelectingAnUnavailableProviderExplainsRatherThanFailing() {
        let viewModel = ConnectViewModel(repository: StubConnectRepository(), sessionManager: sessionManager())

        viewModel.selectProvider(.espn)

        guard case .unsupportedOnMobile(let provider) = viewModel.state else {
            return XCTFail("expected unsupportedOnMobile")
        }
        XCTAssertEqual(provider, .espn)
        // Not modeled as a failure state — copy must not read as an error the user caused.
        XCTAssertNil(viewModel.state.progressLabel)
    }

    /// ESPN copy must point at the working path rather than describing a limitation only.
    func testEspnCopyRoutesToTheWebPath() {
        guard case .useWeb(let reason) = ConnectProvider.espn.availability else {
            return XCTFail("expected useWeb")
        }
        XCTAssertTrue(reason.lowercased().contains("website") || reason.lowercased().contains("web"))
    }

    // MARK: - Resolve

    func testResolveMovesToLeagueChoice() async {
        var repository = StubConnectRepository()
        repository.resolveResult = .success(account())
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.username = "slops"

        await viewModel.resolveUsername()

        guard case .choosingLeague(let resolved) = viewModel.state else {
            return XCTFail("expected choosingLeague")
        }
        XCTAssertEqual(resolved.leagues.count, 1)
    }

    func testUnknownUsernameIsRetryableWithActionableCopy() async {
        var repository = StubConnectRepository()
        repository.resolveResult = .failure(.usernameNotFound)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.username = "nope"

        await viewModel.resolveUsername()

        guard case .retryableError(let failure) = viewModel.state else {
            return XCTFail("expected retryableError")
        }
        XCTAssertEqual(failure, .usernameNotFound)
        XCTAssertTrue(failure.message.contains("spelling"))
    }

    /// An account with no leagues is a real dead-end risk; it must offer the demo, not a spinner.
    func testAccountWithNoLeaguesOffersAnAlternative() {
        XCTAssertTrue(ConnectFailure.noLeaguesForSeason.message.lowercased().contains("demo"))
    }

    func testMissingSessionAsksForReauthRatherThanFailingGenerically() async {
        let viewModel = ConnectViewModel(repository: StubConnectRepository(), sessionManager: sessionManager(withToken: nil))
        viewModel.username = "slops"

        await viewModel.resolveUsername()

        XCTAssertEqual(viewModel.state, .needsReauth)
    }

    /// Spec §6: no generic endless "Loading…" — every waiting state names what is happening.
    func testEveryWaitingStateCarriesItsOwnProgressSentence() {
        XCTAssertEqual(ConnectState.resolvingAccount.progressLabel, "Looking up your Sleeper account…")
        XCTAssertNotNil(ConnectState.validatingConnection(league: league()).progressLabel)
        XCTAssertTrue(ConnectState.resolvingAccount.isBusy)
        XCTAssertTrue(ConnectState.validatingConnection(league: league()).isBusy)
    }

    // MARK: - Connect and idempotency

    func testSelectingALeagueConnectsAndReportsTheLeague() async {
        var repository = StubConnectRepository()
        repository.resolveResult = .success(account())
        repository.connectResult = .success(())
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.username = "slops"
        await viewModel.resolveUsername()

        await viewModel.selectLeague(league())

        guard case .connected(let connected) = viewModel.state else { return XCTFail("expected connected") }
        XCTAssertEqual(connected.id, "L1")
    }

    /// Spec §7: request ids are idempotent. Retrying the *same* attempt must reuse its id, or
    /// the backend replay guard cannot recognize the retry and a duplicate connection is possible.
    func testRetryingTheSameAttemptReusesTheRequestId() async {
        var repository = StubConnectRepository()
        repository.resolveResult = .success(account())
        repository.connectResult = .failure(.network)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.username = "slops"
        await viewModel.resolveUsername()

        await viewModel.selectLeague(league())
        await viewModel.retryConnect(league: league(), username: "slops")

        XCTAssertEqual(repository.recorder.requestIds.count, 2)
        XCTAssertEqual(
            repository.recorder.requestIds[0],
            repository.recorder.requestIds[1],
            "a retry of the same attempt must reuse its request id"
        )
    }

    /// Generated ids must satisfy the backend's `NATIVE_REQUEST_ID_PATTERN` — otherwise the
    /// route rejects the connect with 422 before it ever reaches Sleeper.
    func testGeneratedRequestIdMatchesTheBackendPattern() {
        let id = ConnectViewModel.defaultRequestId()

        XCTAssertGreaterThanOrEqual(id.count, 16)
        XCTAssertLessThanOrEqual(id.count, 128)
        let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-")
        XCTAssertTrue(id.unicodeScalars.allSatisfy(allowed.contains))
    }

    func testInProgressDuplicateIsSurfacedAsItsOwnFailure() async {
        var repository = StubConnectRepository()
        repository.resolveResult = .success(account())
        repository.connectResult = .failure(.alreadyInProgress)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.username = "slops"
        await viewModel.resolveUsername()

        await viewModel.selectLeague(league())

        guard case .retryableError(let failure) = viewModel.state else { return XCTFail("expected retryableError") }
        XCTAssertEqual(failure, .alreadyInProgress)
    }

    // MARK: - Cancellation

    /// Spec §6: "Cancellation is normal, not an error." It must not be modeled as a failure.
    func testCancellationIsItsOwnStateNotAnError() {
        let viewModel = ConnectViewModel(repository: StubConnectRepository(), sessionManager: sessionManager())

        viewModel.cancel()

        XCTAssertEqual(viewModel.state, .canceled)
        if case .retryableError = viewModel.state { XCTFail("cancel must not be an error state") }
    }

    /// Cancelling then reconnecting must mint a fresh attempt rather than replaying the
    /// abandoned one, which the backend would answer from its ten-minute replay cache.
    func testCancellingClearsThePendingAttempt() async {
        var repository = StubConnectRepository()
        repository.resolveResult = .success(account())
        repository.connectResult = .failure(.network)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.username = "slops"
        await viewModel.resolveUsername()
        await viewModel.selectLeague(league())

        viewModel.cancel()
        await viewModel.resolveUsername()
        await viewModel.selectLeague(league())

        XCTAssertNotEqual(
            repository.recorder.requestIds.first,
            repository.recorder.requestIds.last,
            "a new attempt after cancelling must not reuse the abandoned request id"
        )
    }

    // MARK: - Copy safety

    /// The contract forbids implying Omen collects a provider password, and forbids raw
    /// provider detail in client copy.
    func testNoFailureCopyMentionsPasswordsOrCookies() {
        let messages: [String] = [
            ConnectFailure.usernameNotFound, .noLeaguesForSeason, .network, .server, .alreadyInProgress,
        ].map(\.message)

        for message in messages {
            let lowered = message.lowercased()
            XCTAssertFalse(lowered.contains("password"))
            XCTAssertFalse(lowered.contains("cookie"))
            XCTAssertFalse(lowered.contains("token"))
        }
    }

    func testLeagueSubtitleOmitsMissingFieldsRatherThanPrintingPlaceholders() {
        let sparse = SleeperLeague(id: "L2", name: "Sparse", season: 2026, scoringFormat: nil, teamName: nil)

        XCTAssertEqual(sparse.subtitle, "2026")
        XCTAssertFalse(sparse.subtitle.contains("nil"))
    }
}
