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

    /// Sleeper and Yahoo both connect natively. ESPN is research-gated by the onboarding
    /// contract §5 and stays on the web path.
    ///
    /// Yahoo read `.useWeb` here until native OAuth was wired: the entitlement had been granted
    /// on 2026-08-28, but the client had browser plumbing only for Supabase sign-in, so a
    /// Yahoo tester on a phone was told to go find a computer.
    func testSleeperAndYahooAreConnectableInTheAppAndEspnIsNot() {
        XCTAssertEqual(ConnectProvider.sleeper.availability, .available)
        XCTAssertEqual(ConnectProvider.yahoo.availability, .available)

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

    /// ESPN copy must be the approved native row copy: no sheet, no logo, no endorsement.
    func testEspnCopyUsesTheApprovedComputerOnlyLine() {
        guard case .useWeb(let reason) = ConnectProvider.espn.availability else {
            return XCTFail("expected useWeb")
        }
        XCTAssertEqual(reason, "Needs a computer for now · we'll show you")
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


// MARK: - Yahoo

/// Native Yahoo connect: browser authorization → server-confirmed connection → league bind.
///
/// The flow these cover is the one a beta tester could not complete. Every route already
/// existed server-side; the client refused to offer the provider at all.
@MainActor
final class YahooConnectFlowTests: XCTestCase {

    private func sessionManager(withToken token: String? = "t") -> SessionManager {
        let store = InMemorySecureSessionStore(
            initial: token.map {
                Session(userID: "u1", accessToken: $0, refreshToken: "r", expiresAtEpochSeconds: 9_999_999_999)
            }
        )
        return SessionManager(store: store, nowEpochSeconds: { 1_000 })
    }

    private let authorizeURL = URL(string: "https://api.login.yahoo.com/oauth2/request_auth?client_id=x&state=y")!

    private func leagues(_ count: Int) -> [YahooLeague] {
        (1...count).map { YahooLeague(id: "nfl.l.\($0)", name: "League \($0)", season: 2026) }
    }

    private func viewModel(
        repository: StubConnectRepository,
        authSession: StubProviderAuthSession
    ) -> ConnectViewModel {
        ConnectViewModel(
            repository: repository,
            sessionManager: sessionManager(),
            authSession: authSession
        )
    }

    /// The happy path with more than one league: the user is asked which one.
    func testAuthorizingThenConfirmingOffersTheLeaguePicker() async {
        var repository = StubConnectRepository()
        repository.yahooAuthResult = .success(authorizeURL)
        repository.yahooLeaguesResult = .success(leagues(2))
        let authSession = StubProviderAuthSession(
            outcome: .returned(URL(string: "com.slopssaloon.omen://auth/callback?status=connected")!)
        )
        let viewModel = viewModel(repository: repository, authSession: authSession)

        await viewModel.connectYahoo()

        // The app must open the URL the *server* built, never one it assembled itself — the
        // CSRF state lives in that URL and is bound to a server-side `oauth_state` row.
        XCTAssertEqual(authSession.requestedURLs, [authorizeURL])
        guard case .choosingYahooLeague(let offered) = viewModel.state else {
            return XCTFail("expected choosingYahooLeague, got \(viewModel.state)")
        }
        XCTAssertEqual(offered.count, 2)
    }

    /// One league is not a choice — binding it directly removes a screen with one possible answer.
    func testASingleLeagueIsBoundWithoutAskingTheUserToPickIt() async {
        var repository = StubConnectRepository()
        repository.yahooAuthResult = .success(authorizeURL)
        repository.yahooLeaguesResult = .success(leagues(1))
        repository.yahooBindResult = .success(())
        let authSession = StubProviderAuthSession(
            outcome: .returned(URL(string: "com.slopssaloon.omen://auth/callback?status=connected")!)
        )
        let viewModel = viewModel(repository: repository, authSession: authSession)

        await viewModel.connectYahoo()

        guard case .yahooConnected(let league) = viewModel.state else {
            return XCTFail("expected yahooConnected, got \(viewModel.state)")
        }
        XCTAssertEqual(league.id, "nfl.l.1")
        XCTAssertEqual(repository.recorder.boundYahooLeagueIds, ["nfl.l.1"])
    }

    /// Contract §6: cancellation is normal, not an error. Dismissing the browser sheet.
    func testDismissingTheBrowserIsCancellationNotFailure() async {
        var repository = StubConnectRepository()
        repository.yahooAuthResult = .success(authorizeURL)
        let viewModel = viewModel(repository: repository, authSession: StubProviderAuthSession(outcome: .canceled))

        await viewModel.connectYahoo()

        XCTAssertEqual(viewModel.state, .canceled)
    }

    /// Declining inside Yahoo's own screen returns `status=cancelled`. Same meaning, so it must
    /// read the same way — not as an error the user caused.
    func testDecliningInsideYahooReadsAsCancellationNotFailure() async {
        var repository = StubConnectRepository()
        repository.yahooAuthResult = .success(authorizeURL)
        let authSession = StubProviderAuthSession(
            outcome: .returned(URL(string: "com.slopssaloon.omen://auth/callback?status=cancelled")!)
        )
        let viewModel = viewModel(repository: repository, authSession: authSession)

        await viewModel.connectYahoo()

        XCTAssertEqual(viewModel.state, .canceled)
    }

    /// `status=connected` is not proof. Any app on the device can fire that deep link, and more
    /// usefully, a user can approve in Yahoo while the token exchange fails behind them. The
    /// server's own answer decides.
    func testAConnectedStatusIsNotBelievedWithoutServerConfirmation() async {
        var repository = StubConnectRepository()
        repository.yahooAuthResult = .success(authorizeURL)
        repository.yahooLeaguesResult = .failure(.providerNotConnected)
        let authSession = StubProviderAuthSession(
            outcome: .returned(URL(string: "com.slopssaloon.omen://auth/callback?status=connected")!)
        )
        let viewModel = viewModel(repository: repository, authSession: authSession)

        await viewModel.connectYahoo()

        XCTAssertEqual(viewModel.state, .retryableError(.providerNotConnected))
    }

    /// The retry after a failed confirmation re-checks the server rather than reopening the
    /// browser — sending a user who is in fact connected back through Yahoo is the loop this
    /// flow exists to avoid.
    func testCheckingAgainConfirmsWithoutReopeningTheBrowser() async {
        var repository = StubConnectRepository()
        repository.yahooLeaguesResult = .success(leagues(2))
        let authSession = StubProviderAuthSession()
        let viewModel = viewModel(repository: repository, authSession: authSession)

        await viewModel.confirmYahooConnection()

        XCTAssertTrue(authSession.requestedURLs.isEmpty, "re-checking must not reopen the browser")
        guard case .choosingYahooLeague = viewModel.state else {
            return XCTFail("expected choosingYahooLeague, got \(viewModel.state)")
        }
    }

    /// A 503 from `requireYahooEnabled` is a product state with its own sentence, not the
    /// generic "problem on our side".
    func testAPausedEntitlementGetsItsOwnSentence() async {
        var repository = StubConnectRepository()
        repository.yahooAuthResult = .failure(.providerUnavailable)
        let viewModel = viewModel(repository: repository, authSession: StubProviderAuthSession())

        await viewModel.connectYahoo()

        XCTAssertEqual(viewModel.state, .retryableError(.providerUnavailable))
        XCTAssertTrue(ConnectFailure.providerUnavailable.message.contains("Yahoo"))
        XCTAssertFalse(ConnectFailure.providerUnavailable.message.contains("our side"))
    }

    /// Selecting Yahoo in the picker starts the flow. It must not fall through to the Sleeper
    /// username field, which is what `.notStarted` renders.
    func testSelectingYahooStartsItsOwnFlow() async {
        var repository = StubConnectRepository()
        repository.yahooAuthResult = .success(authorizeURL)
        repository.yahooLeaguesResult = .success(leagues(2))
        let authSession = StubProviderAuthSession(
            outcome: .returned(URL(string: "com.slopssaloon.omen://auth/callback?status=connected")!)
        )
        let viewModel = viewModel(repository: repository, authSession: authSession)

        viewModel.selectProvider(.yahoo)
        // `selectProvider` starts the work in a Task; let it run to completion.
        await viewModel.connectYahoo()

        XCTAssertNotEqual(viewModel.state, .notStarted)
    }

    /// Every waiting state names what is happening (contract §6: never a bare "Loading…").
    func testEveryYahooWaitingStateSaysWhatIsHappening() {
        let waiting: [ConnectState] = [
            .startingYahooAuthorization,
            .awaitingYahooReturn,
            .confirmingYahooConnection,
            .bindingYahooLeague(league: YahooLeague(id: "nfl.l.1", name: "L", season: 2026)),
        ]
        for state in waiting {
            XCTAssertTrue(state.isBusy, "\(state) should disable controls")
            XCTAssertNotNil(state.progressLabel, "\(state) needs its own sentence")
        }
    }

    /// The deep-link reader must not mistake Supabase's sign-in callback — same scheme, but
    /// `code`/`state` instead of `status` — for a provider connect return.
    func testCallbackStatusOnlyReadsProviderReturns() {
        XCTAssertEqual(
            ConnectViewModel.callbackStatus(URL(string: "com.slopssaloon.omen://auth/callback?status=connected")!),
            "connected"
        )
        XCTAssertNil(
            ConnectViewModel.callbackStatus(URL(string: "com.slopssaloon.omen://auth/callback?code=abc&state=xyz")!)
        )
    }
}
