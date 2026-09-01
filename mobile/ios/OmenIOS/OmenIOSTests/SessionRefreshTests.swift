import XCTest
@testable import Omen

/// Covers the seam that renews an access token before every authenticated request.
///
/// The defect these exist to prevent: `AuthRepository.refresh()` shipped fully implemented and
/// was never called from anywhere in the app, so a Supabase access token — one hour of life —
/// simply went stale in the Keychain and every signed-in user was handed the re-auth screen an
/// hour after signing in.
@MainActor
final class SessionRefreshTests: XCTestCase {

    /// Records how many times a refresh was actually attempted, so the behavior is provable.
    private final class StubRefresher: SessionRefreshing {
        var outcomes: [SessionRefreshOutcome]
        private(set) var attempts = 0

        init(_ outcomes: [SessionRefreshOutcome]) { self.outcomes = outcomes }

        func refreshedSession() async -> SessionRefreshOutcome {
            attempts += 1
            return outcomes.isEmpty ? .rejected : outcomes.removeFirst()
        }
    }

    private func makeManager(
        expiresAt: Int64,
        now: Int64 = 1_000,
        refresher: StubRefresher? = nil
    ) -> (SessionManager, InMemorySecureSessionStore) {
        let session = Session(userID: "u1", accessToken: "stale", refreshToken: "r", expiresAtEpochSeconds: expiresAt)
        let store = InMemorySecureSessionStore(initial: session)
        let manager = SessionManager(store: store, nowEpochSeconds: { now })
        if let refresher { manager.attach(refresher: refresher) }
        return (manager, store)
    }

    private func renewed(_ token: String, expiresAt: Int64 = 100_000) -> SessionRefreshOutcome {
        .renewed(Session(userID: "u1", accessToken: token, refreshToken: "r2", expiresAtEpochSeconds: expiresAt))
    }

    // MARK: - authorization()

    func testFreshTokenIsUsedWithoutRefreshing() async {
        let refresher = StubRefresher([renewed("new")])
        let (manager, _) = makeManager(expiresAt: 100_000, refresher: refresher)

        let authorization = await manager.authorization()
        XCTAssertEqual(authorization, .token("stale"))
        XCTAssertEqual(refresher.attempts, 0)
    }

    /// The leeway is the whole point: a token with seconds left is renewed *before* the
    /// request rather than after the 401 it would otherwise earn.
    func testTokenInsideLeewayIsRenewedBeforeUse() async {
        let refresher = StubRefresher([renewed("new")])
        // 30s of life left, well inside the 120s leeway.
        let (manager, store) = makeManager(expiresAt: 1_030, refresher: refresher)

        let authorization = await manager.authorization()
        XCTAssertEqual(authorization, .token("new"))
        XCTAssertEqual(refresher.attempts, 1)
        XCTAssertEqual(store.load()?.accessToken, "new")
        XCTAssertEqual(manager.state, .signedIn(userID: "u1"))
    }

    /// The core regression. An expired token must produce a renewed one, not a sign-in screen.
    func testExpiredTokenIsRenewedRatherThanEjectingTheUser() async {
        let refresher = StubRefresher([renewed("new")])
        let (manager, _) = makeManager(expiresAt: 500, refresher: refresher)

        let authorization = await manager.authorization()
        XCTAssertEqual(authorization, .token("new"))
        XCTAssertNotEqual(manager.state, .needsReauth)
    }

    /// A network failure is not a signed-out user.
    func testTransportFailureDoesNotSignTheUserOut() async {
        let refresher = StubRefresher([.unavailable])
        let (manager, store) = makeManager(expiresAt: 500, refresher: refresher)

        let authorization = await manager.authorization()
        XCTAssertEqual(authorization, .unavailable)
        XCTAssertNotEqual(manager.state, .needsReauth)
        XCTAssertNotNil(store.load(), "an offline refresh must not discard the stored session")
    }

    func testRejectedRefreshTokenNeedsReauth() async {
        let refresher = StubRefresher([.rejected])
        let (manager, _) = makeManager(expiresAt: 500, refresher: refresher)

        let authorization = await manager.authorization()
        XCTAssertEqual(authorization, .needsReauth)
    }

    // MARK: - restoreRefreshing()

    /// `restore()` alone marks any expired session `.needsReauth`. Since an access token lives
    /// one hour, that fired on essentially every cold launch after the first.
    func testColdLaunchWithExpiredTokenRenewsInsteadOfDemandingSignIn() async {
        let refresher = StubRefresher([renewed("new")])
        let (manager, _) = makeManager(expiresAt: 500, refresher: refresher)

        await manager.restoreRefreshing()

        XCTAssertEqual(manager.state, .signedIn(userID: "u1"))
    }

    /// Launching offline holding a stale token is not evidence the session is dead.
    func testColdLaunchOfflineKeepsTheUserSignedIn() async {
        let refresher = StubRefresher([.unavailable])
        let (manager, _) = makeManager(expiresAt: 500, refresher: refresher)

        await manager.restoreRefreshing()

        XCTAssertEqual(manager.state, .signedIn(userID: "u1"))
    }

    func testColdLaunchWithRejectedRefreshTokenAsksForSignIn() async {
        let refresher = StubRefresher([.rejected])
        let (manager, _) = makeManager(expiresAt: 500, refresher: refresher)

        await manager.restoreRefreshing()

        XCTAssertEqual(manager.state, .needsReauth)
    }

    func testColdLaunchWithNoStoredSessionIsSignedOut() async {
        let manager = SessionManager(store: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })
        await manager.restoreRefreshing()
        XCTAssertEqual(manager.state, .signedOut)
    }

    // MARK: - authorized(), the request wrapper

    func testSuccessfulRequestPassesTheRenewedToken() async {
        let refresher = StubRefresher([renewed("new")])
        let (manager, _) = makeManager(expiresAt: 500, refresher: refresher)

        var seen: [String] = []
        let result: Result<String, OmenApiError> = await manager.authorized { token in
            seen.append(token)
            return .success("ok")
        }

        XCTAssertEqual(seen, ["new"])
        XCTAssertEqual(try? result.get(), "ok")
    }

    /// A 401 on a token that looked alive — revoked, rotated, clock skew — forces one refresh
    /// and one retry.
    func testUnauthorizedForcesOneRefreshAndOneRetry() async {
        let refresher = StubRefresher([renewed("second")])
        let (manager, _) = makeManager(expiresAt: 100_000, refresher: refresher)

        var seen: [String] = []
        let result: Result<String, OmenApiError> = await manager.authorized { token in
            seen.append(token)
            return token == "stale" ? .failure(.unauthorized) : .success("ok")
        }

        XCTAssertEqual(seen, ["stale", "second"], "exactly one retry, with the renewed token")
        XCTAssertEqual(try? result.get(), "ok")
        XCTAssertNotEqual(manager.state, .needsReauth)
    }

    /// One retry, never a loop. A freshly-minted token being refused is a real authorization
    /// problem, and the second 401 is believed.
    func testSecondUnauthorizedIsBelievedAndDoesNotLoop() async {
        let refresher = StubRefresher([renewed("second")])
        let (manager, _) = makeManager(expiresAt: 100_000, refresher: refresher)

        var attempts = 0
        let result: Result<String, OmenApiError> = await manager.authorized { _ in
            attempts += 1
            return .failure(.unauthorized)
        }

        XCTAssertEqual(attempts, 2)
        XCTAssertEqual(result, .failure(.unauthorized))
        XCTAssertEqual(manager.state, .needsReauth)
    }

    /// The rule that keeps an offline user out of the sign-in screen: a refresh that could not
    /// reach the server resolves to `.network`, which call sites render as a retry.
    func testOfflineRefreshSurfacesNetworkNotUnauthorized() async {
        let refresher = StubRefresher([.unavailable])
        let (manager, _) = makeManager(expiresAt: 500, refresher: refresher)

        let result: Result<String, OmenApiError> = await manager.authorized { _ in .success("unreached") }

        XCTAssertEqual(result, .failure(.network))
        XCTAssertNotEqual(manager.state, .needsReauth)
    }

    // MARK: - Coalescing

    /// Supabase rotates the refresh token on every successful refresh. The Command Center
    /// fires three reads at once; without coalescing, two of them would present a token the
    /// server had already retired and sign out a user whose session was fine.
    func testConcurrentCallersShareOneRefreshRoundTrip() async {
        let repository = SingleRefreshCountingRepository(
            session: Session(userID: "u1", accessToken: "new", refreshToken: "r2", expiresAtEpochSeconds: 100_000)
        )
        let refresher = AuthRepositorySessionRefresher(repository: repository)
        let session = Session(userID: "u1", accessToken: "stale", refreshToken: "r", expiresAtEpochSeconds: 500)
        let manager = SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
        manager.attach(refresher: refresher)

        async let a = manager.authorization()
        async let b = manager.authorization()
        async let c = manager.authorization()
        let results = await [a, b, c]

        XCTAssertEqual(results, [.token("new"), .token("new"), .token("new")])
        XCTAssertEqual(repository.refreshCount, 1, "three concurrent callers must share one refresh")
    }
}

/// `FakeAuthRepository` does not count refreshes, so this narrow double stands in for the
/// coalescing test only.
@MainActor
private final class SingleRefreshCountingRepository: AuthRepository {
    private let session: Session
    private(set) var refreshCount = 0

    init(session: Session) { self.session = session }

    func refresh() async -> AuthOutcome {
        refreshCount += 1
        // Yield so a non-coalescing implementation would let its other callers in here too.
        await Task.yield()
        return .success(session: session)
    }

    func requestEmailOtp(email: String) async -> AuthOutcome { .unsupported }
    func verifyEmailOtp(email: String, code: String) async -> AuthOutcome { .unsupported }
    func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome { .unsupported }
    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> AuthOutcome { .unsupported }
    func startPasskeyAuthentication() async -> PasskeyStartResult<PasskeyAuthenticationOptions> { .needsReauth }
    func signInWithPasskey(challengeID: String, assertion: PasskeyResult.Assertion) async -> AuthOutcome { .unsupported }
    func startPasskeyRegistration() async -> PasskeyStartResult<PasskeyRegistrationOptions> { .needsReauth }
    func registerPasskey(challengeID: String, credential: PasskeyRegistrationResult.Credential) async -> AuthOutcome { .unsupported }
    func listPasskeys() async -> PasskeyListOutcome { .needsReauth }
    func deletePasskey(id: String) async -> PasskeyManagementOutcome { .needsReauth }
    func signOut() async {}
}
