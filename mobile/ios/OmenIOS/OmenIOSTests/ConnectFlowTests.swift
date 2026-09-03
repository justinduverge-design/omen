import WebKit
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

    /// **All three providers now connect in the app.** ESPN was `.useWeb` until 2026-09-02, on
    /// two grounds that both fell: the mechanism (disproven by `HttpOnlyCookieSpikeTests` —
    /// `WKHTTPCookieStore` does return HttpOnly values) and the §87 WebView ban (lifted for ESPN
    /// by the founder, with the guideline 5.2.2 exposure accepted).
    func testAllThreeProvidersConnectInTheApp() {
        XCTAssertEqual(ConnectProvider.sleeper.availability, .available)
        XCTAssertEqual(ConnectProvider.yahoo.availability, .available)
        XCTAssertEqual(ConnectProvider.espn.availability, .available)
    }

    /// Choosing ESPN must land on consent — never straight into ESPN's sign-in. W1-A binds this:
    /// the user is told what is about to open while they can still decline.
    func testChoosingEspnShowsConsentBeforeAnythingOpens() {
        let viewModel = ConnectViewModel(repository: StubConnectRepository(), sessionManager: sessionManager())

        viewModel.selectProvider(.espn)

        XCTAssertEqual(viewModel.state, .espnConsent)
        // Nothing has been created yet — declining here must leave no trace.
        XCTAssertNil(viewModel.espnCookieStore)
    }

    /// Declining consent returns to the picker and writes nothing.
    func testDecliningEspnConsentWritesNoState() {
        let viewModel = ConnectViewModel(repository: StubConnectRepository(), sessionManager: sessionManager())
        viewModel.selectProvider(.espn)

        viewModel.startOver()

        XCTAssertEqual(viewModel.state, .notStarted)
        XCTAssertNil(viewModel.selectedProvider)
        XCTAssertNil(viewModel.espnCookieStore)
    }

    /// The consent sentence is what App Review reads. It must name who the user signs in to, and
    /// carry the non-affiliation disclaimer Disney's ToU §2.B.vii requires.
    func testEspnConsentCopySaysWhoTheUserSignsInToAndDisclaimsAffiliation() {
        let copy = EspnHandoffCopy.consentBody

        XCTAssertTrue(copy.contains("ESPN's own sign-in"))
        XCTAssertTrue(copy.contains("never sees your ESPN password"))
        XCTAssertTrue(copy.lowercased().contains("not affiliated with"))
        XCTAssertTrue(copy.lowercased().contains("disconnect"))
        // No claim that ESPN knows about, approves of, or partnered with Omen.
        for banned in ["partner", "endorsed by omen", "approved", "official"] {
            XCTAssertFalse(copy.lowercased().contains(banned), "consent must not imply association: \(banned)")
        }
    }

    func testEspnSetupURLPointsToThePublicHandoffGuide() {
        XCTAssertEqual(ConnectProvider.espnSetupURL.absoluteString, "https://slopssaloon.com/espn-connect")
    }

    // MARK: - ESPN in-app sign-in (W1-A)

    /// Test double for the sheet's cookie jar. Holds fixed values so a test can assert what was
    /// sent without a live ESPN session.
    @MainActor
    private final class FakeEspnCookieStore: EspnCookieReading {
        var session: (espnS2: String, swid: String)?
        private(set) var takeCount = 0
        let dataStore = WKWebsiteDataStore.nonPersistent()

        init(session: (espnS2: String, swid: String)? = ("S2VALUE", "{SWIDVALUE}")) {
            self.session = session
        }

        func hasSession() async -> Bool { session != nil }
        func sessionDiagnostic() async -> String { session == nil ? "espn_s2: not found" : "espn_s2: www.espn.com" }
        func takeSession() async -> (espnS2: String, swid: String)? {
            takeCount += 1
            return session
        }
    }

    /// `store` is optional rather than defaulted for the same reason `ConnectViewModel.init`
    /// documents: a default argument is evaluated in the *caller's* context, which is not
    /// guaranteed to be the main actor, and `FakeEspnCookieStore` is main-actor isolated.
    @MainActor
    private func espnReadyViewModel(
        repository: StubConnectRepository,
        store: FakeEspnCookieStore? = nil
    ) async -> ConnectViewModel {
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)
        viewModel.beginEspnSignIn(cookieStore: store ?? FakeEspnCookieStore())
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: "123456", detectedTeamId: "7"))
        // Sign-in kicks discovery off in a detached Task, which makes ordering nondeterministic
        // in a test. Awaiting it here settles that; the call is idempotent (it guards on
        // `espnSession`), so it is a no-op if the Task already won the race.
        await viewModel.discoverEspnLeagues()
        return viewModel
    }

    /// The happy path: consent → sign-in → user presses Connect → connected.
    func testConnectingEspnSendsTheSessionOnceAndReportsTheLeague() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .success(())
        repository.espnConnectionResult = .success(
            EspnConnection(leagueName: "Las Vegas PPR", teamName: "Team Slops")
        )
        let store = FakeEspnCookieStore()
        let viewModel = await espnReadyViewModel(repository: repository, store: store)

        await viewModel.confirmEspnConnection()

        guard case .espnConnected(let connection) = viewModel.state else {
            return XCTFail("expected espnConnected, got \(viewModel.state)")
        }
        XCTAssertEqual(connection.teamName, "Team Slops")

        // Exactly one attempt, carrying the league and team the page named, with a session.
        XCTAssertEqual(repository.recorder.espnConnectAttempts.count, 1)
        XCTAssertEqual(repository.recorder.espnConnectAttempts.first?.leagueId, "123456")
        XCTAssertEqual(repository.recorder.espnConnectAttempts.first?.teamId, "7")
        XCTAssertEqual(repository.recorder.espnConnectAttempts.first?.sentSession, true)
        // Read once by discovery and then reused for the connect — never re-read, and never
        // polled. If this becomes 2, the session is being pulled out of the jar again after
        // discovery already had it, which widens the window it exists in.
        XCTAssertEqual(store.takeCount, 1)
    }

    /// **The point of W1-A's second half.** Signing in should produce a list, not a homework
    /// assignment — the user should never hunt for a league id in a URL when ESPN will tell us.
    func testSigningInDiscoversTheAccountsLeaguesWithoutTheUserTypingAnything() async {
        var repository = StubConnectRepository()
        repository.espnDiscoverResult = .success([
            EspnLeagueOption(id: "1", name: "Slops Saloon FF Showdown", season: 2026, teamId: "3", teamName: "The Titans of Slopsilonia"),
            EspnLeagueOption(id: "2", name: "Everything Backwards", season: 2026, teamId: "5", teamName: "Justin's Scary Team"),
        ])
        let viewModel = await espnReadyViewModel(repository: repository)

        guard case .choosingEspnLeague(let options) = viewModel.state else {
            return XCTFail("expected a league picker, got \(viewModel.state)")
        }
        XCTAssertEqual(options.count, 2)
        XCTAssertEqual(repository.recorder.espnDiscoveries, 1)
        // Nothing is connected yet — discovery must not bind a league on the user's behalf.
        XCTAssertTrue(repository.recorder.espnConnectAttempts.isEmpty)
    }

    /// Picking from the list connects that league, with the team ESPN reported for it.
    func testPickingADiscoveredLeagueConnectsThatLeagueAndItsTeam() async {
        var repository = StubConnectRepository()
        let option = EspnLeagueOption(id: "13338821", name: "Slops Saloon FF Showdown", season: 2026, teamId: "3", teamName: "The Titans of Slopsilonia")
        repository.espnDiscoverResult = .success([option])
        repository.espnConnectResult = .success(())
        repository.espnConnectionResult = .success(EspnConnection(leagueName: "Slops Saloon FF Showdown", teamName: "The Titans of Slopsilonia"))
        let viewModel = await espnReadyViewModel(repository: repository)

        await viewModel.connectEspnLeague(option)

        guard case .espnConnected = viewModel.state else {
            return XCTFail("expected espnConnected, got \(viewModel.state)")
        }
        XCTAssertEqual(repository.recorder.espnConnectAttempts.count, 1)
        XCTAssertEqual(repository.recorder.espnConnectAttempts.first?.leagueId, "13338821")
        XCTAssertEqual(repository.recorder.espnConnectAttempts.first?.teamId, "3")
        XCTAssertNil(viewModel.espnCookieStore, "session must be dropped once connected")
    }

    /// Discovery failing is not a failed connection — nothing was connected. The user falls back
    /// to typing an id rather than being thrown out of the flow for Omen's lookup problem.
    func testDiscoveryFailingFallsBackToManualEntryRatherThanFailingTheConnection() async {
        var repository = StubConnectRepository()
        repository.espnDiscoverResult = .failure(.network)
        let viewModel = await espnReadyViewModel(repository: repository)

        XCTAssertEqual(viewModel.state, .espnSigningIn)
        XCTAssertEqual(viewModel.espnCheckNotice, EspnHandoffCopy.discoveryUnavailable)
    }

    /// An account with no football leagues is an honest empty answer, not an error.
    func testAnAccountWithNoFootballLeaguesIsNotReportedAsAFailure() async {
        var repository = StubConnectRepository()
        repository.espnDiscoverResult = .success([])
        let viewModel = await espnReadyViewModel(repository: repository)

        XCTAssertEqual(viewModel.state, .espnSigningIn)
        XCTAssertEqual(viewModel.espnCheckNotice, EspnHandoffCopy.noLeaguesFound)
    }

    /// ESPN omits league names often enough that a blank row is a real outcome.
    func testALeagueWithNoNameStillRendersSomethingTheUserCanPick() {
        let unnamed = EspnLeagueOption(id: "7", name: nil, season: 2026, teamId: nil, teamName: nil)
        XCTAssertEqual(unnamed.displayName, "Untitled ESPN league")
        XCTAssertEqual(unnamed.subtitle, "2026")

        let bare = EspnLeagueOption(id: "8", name: "Named", season: nil, teamId: nil, teamName: nil)
        XCTAssertNil(bare.subtitle, "an empty subtitle must be absent, not a placeholder")
    }

    /// Header copy has to survive the one-league case without reading like a bug.
    func testFoundLeaguesHeadingIsSingularForOneLeague() {
        XCTAssertEqual(EspnHandoffCopy.foundLeaguesTitle(1), "Found your league")
        XCTAssertEqual(EspnHandoffCopy.foundLeaguesTitle(3), "Found 3 leagues")
    }

    /// **The security assertion.** Once the connect returns, the app must be holding no ESPN
    /// session at all — not for a retry, not for convenience.
    func testTheEspnSessionIsDroppedAsSoonAsItHasBeenSent() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .success(())
        let viewModel = await espnReadyViewModel(repository: repository)

        await viewModel.confirmEspnConnection()

        XCTAssertNil(viewModel.espnCookieStore, "the app must not retain an ESPN session after connecting")
    }

    /// Omen never submits for the user, and a half-formed request is worse than no request.
    /// Neither half alone is enough: a signed-out user with a league id typed in has nothing to
    /// authenticate with, and a signed-in user with no league has nothing to connect to.
    func testConnectDoesNothingWithoutBothASessionAndALeague() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .success(())
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)
        viewModel.beginEspnSignIn(cookieStore: FakeEspnCookieStore())

        // Signed out, league id typed anyway.
        viewModel.espnLeagueId = "123456"
        XCTAssertFalse(viewModel.canConnectEspn)
        await viewModel.confirmEspnConnection()
        XCTAssertTrue(repository.recorder.espnConnectAttempts.isEmpty)

        // Signed in, no league anywhere — the state a real phone reached on ESPN's own pages.
        viewModel.espnLeagueId = "   "
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: nil, detectedTeamId: nil))
        XCTAssertFalse(viewModel.canConnectEspn)
        await viewModel.confirmEspnConnection()
        XCTAssertTrue(repository.recorder.espnConnectAttempts.isEmpty)
        XCTAssertEqual(viewModel.state, .espnSigningIn)
    }

    /// **The fix for the two dead ends found on a real phone.** ESPN's landing pages do not carry
    /// a `leagueId`, so a signed-in user could be stranded with a permanently disabled button.
    /// Typing the id must be enough on its own.
    func testASignedInUserCanConnectByTypingTheLeagueIdWhenEspnRevealsNothing() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .success(())
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)
        viewModel.beginEspnSignIn(cookieStore: FakeEspnCookieStore())
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: nil, detectedTeamId: nil))

        viewModel.espnLeagueId = " 998877 "
        XCTAssertTrue(viewModel.canConnectEspn)
        await viewModel.confirmEspnConnection()

        XCTAssertEqual(repository.recorder.espnConnectAttempts.count, 1)
        // Trimmed — a trailing space from a paste must not become part of the id.
        XCTAssertEqual(repository.recorder.espnConnectAttempts.first?.leagueId, "998877")
    }

    /// Detection pre-fills an empty field and must never overwrite what the user typed.
    func testDetectionPreFillsButNeverOverwritesTheUsersOwnEntry() {
        let viewModel = ConnectViewModel(repository: StubConnectRepository(), sessionManager: sessionManager())
        viewModel.selectProvider(.espn)
        viewModel.beginEspnSignIn(cookieStore: FakeEspnCookieStore())

        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: "111", detectedTeamId: nil))
        XCTAssertEqual(viewModel.espnLeagueId, "111")

        viewModel.espnLeagueId = "222"
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: "333", detectedTeamId: nil))
        XCTAssertEqual(viewModel.espnLeagueId, "222", "ESPN navigating must not swap the user's entry")
    }

    /// A detected team belongs to the league it was detected in. If the user connects a different
    /// league, sending that team would silently bind the wrong one.
    func testADetectedTeamIsDroppedWhenTheUserConnectsADifferentLeague() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .success(())
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)
        viewModel.beginEspnSignIn(cookieStore: FakeEspnCookieStore())
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: "111", detectedTeamId: "7"))

        viewModel.espnLeagueId = "999"
        await viewModel.confirmEspnConnection()

        XCTAssertEqual(repository.recorder.espnConnectAttempts.first?.leagueId, "999")
        XCTAssertNil(repository.recorder.espnConnectAttempts.first?.teamId)
    }

    /// Contract §W1-A failure table: an unreadable session gets **one** retry, then the desktop
    /// path. Never a loop, and the copy never blames the user.
    func testAnUnreadableSessionRetriesOnceThenRoutesToTheDesktopPath() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .failure(.espnSessionUnreadable)
        let viewModel = await espnReadyViewModel(repository: repository)

        await viewModel.confirmEspnConnection()
        guard case .retryableError(let first) = viewModel.state else {
            return XCTFail("first unreadable session should be retryable, got \(viewModel.state)")
        }
        XCTAssertEqual(first, .espnSessionUnreadable)
        XCTAssertFalse(first.message.lowercased().contains("you didn't"), "must not blame the user")

        // Second attempt: same failure, and now it hands over to the desktop helper rather than
        // offering the same broken button again.
        viewModel.beginEspnSignIn(cookieStore: FakeEspnCookieStore())
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: "123456", detectedTeamId: nil))
        await viewModel.confirmEspnConnection()

        guard case .unsupportedOnMobile(let provider) = viewModel.state else {
            return XCTFail("second failure should route to the desktop path, got \(viewModel.state)")
        }
        XCTAssertEqual(provider, .espn)
        XCTAssertEqual(viewModel.espnCheckNotice, EspnHandoffCopy.signInFellBack)
    }

    /// A league ESPN will not serve is a different problem from an unreadable session, and gets
    /// its own sentence and its own next action.
    func testAnUnreachableLeagueIsNotReportedAsASessionProblem() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .failure(.espnLeagueUnreachable)
        let viewModel = await espnReadyViewModel(repository: repository)

        await viewModel.confirmEspnConnection()

        guard case .retryableError(let failure) = viewModel.state else {
            return XCTFail("expected retryableError, got \(viewModel.state)")
        }
        XCTAssertEqual(failure, .espnLeagueUnreachable)
        XCTAssertNotEqual(failure.message, ConnectFailure.espnSessionUnreadable.message)
    }

    /// **Regression: a successful discovery used to cancel itself.** The sheet is bound to
    /// `state == .espnSigningIn`, so moving to `.discoveringEspnLeagues` dismisses it — and
    /// SwiftUI reports that dismissal through the same setter as a user swipe. The result on a
    /// real phone was the ESPN sheet flashing red for a second and the user landing on "Nothing
    /// was connected", with their leagues already fetched and thrown away.
    func testDismissalCausedByMovingOnDoesNotCancelTheFlow() async {
        var repository = StubConnectRepository()
        repository.espnDiscoverResult = .success([
            EspnLeagueOption(id: "1", name: "Slops Saloon FF Showdown", season: 2026, teamId: "3", teamName: "Titans"),
        ])
        let viewModel = await espnReadyViewModel(repository: repository)

        guard case .choosingEspnLeague = viewModel.state else {
            return XCTFail("expected the picker, got \(viewModel.state)")
        }

        // Exactly what the dismissing cover does on its way out.
        viewModel.cancelEspnSignIn()

        guard case .choosingEspnLeague = viewModel.state else {
            return XCTFail("a dismissal caused by moving on must not cancel: \(viewModel.state)")
        }
    }

    /// Backing out of ESPN's sign-in is normal. No error state, and no session left behind.
    func testCancellingEspnSignInIsNotAnError() async {
        let viewModel = await espnReadyViewModel(repository: StubConnectRepository())

        viewModel.cancelEspnSignIn()

        XCTAssertEqual(viewModel.state, .canceled)
        XCTAssertNil(viewModel.espnCookieStore)
    }

    /// **`EspnCapture` must never render its session values.** It is the one type in the app that
    /// holds them, and anything that stringifies it — a `print`, a crash frame, an `XCTAssert`
    /// message — would otherwise put a live ESPN session into a log.
    func testEspnCaptureRedactsItselfWhenPrinted() {
        let capture = EspnCapture(espnS2: "SECRET_S2", swid: "{SECRET_SWID}", leagueId: "123456", teamId: "7")

        for rendered in ["\(capture)", capture.description, capture.debugDescription, String(describing: capture)] {
            XCTAssertFalse(rendered.contains("SECRET_S2"), "capture leaked espn_s2: \(rendered)")
            XCTAssertFalse(rendered.contains("SECRET_SWID"), "capture leaked SWID: \(rendered)")
            XCTAssertTrue(rendered.contains("redacted"))
        }
        // The non-secret half is still there, because a redacted type nobody can debug gets
        // replaced with one that logs everything.
        XCTAssertTrue(capture.description.contains("123456"))
    }

    /// The session must never reach `ConnectState`, which is `Equatable` and gets interpolated
    /// into test-failure messages and crash frames.
    func testConnectStateNeverCarriesTheEspnSession() async {
        var repository = StubConnectRepository()
        repository.espnConnectResult = .success(())
        let store = FakeEspnCookieStore(session: ("SECRET_S2", "{SECRET_SWID}"))
        let viewModel = await espnReadyViewModel(repository: repository, store: store)

        let midFlight = "\(ConnectState.validatingEspnConnection(leagueId: "123456"))"
        XCTAssertFalse(midFlight.contains("SECRET_S2"))
        XCTAssertFalse(midFlight.contains("SECRET_SWID"))

        await viewModel.confirmEspnConnection()
        let final = "\(viewModel.state)"
        XCTAssertFalse(final.contains("SECRET_S2"))
        XCTAssertFalse(final.contains("SECRET_SWID"))
    }

    /// **The diagnostic must never carry a cookie value.** Run against a real WebKit jar rather
    /// than a stub, because the stub is my own string and proves nothing — this puts an actual
    /// HttpOnly cookie in front of the real reader and checks what comes out.
    ///
    /// A value, a prefix, or even a length would all be leaks: a length is a hint, and the whole
    /// point of `facts-of-record #6` is that none of this reaches a screen or a log.
    @MainActor
    func testTheSessionDiagnosticReportsPresenceAndHostButNeverAValue() async {
        let dataStore = WKWebsiteDataStore.nonPersistent()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = dataStore
        // Attached so the store starts its network process; without this the writes are dropped.
        let webView = WKWebView(frame: .zero, configuration: configuration)

        let secret = "SENTINEL_SESSION_VALUE_9876543210"
        let cookie = HTTPCookie.cookies(
            withResponseHeaderFields: ["Set-Cookie": "espn_s2=\(secret); Path=/; Domain=www.espn.com; Secure; HttpOnly"],
            for: URL(string: "https://www.espn.com/")!
        ).first!
        await dataStore.httpCookieStore.setCookie(cookie)

        let diagnostic = await EspnWebCookieStore(dataStore: dataStore).sessionDiagnostic()

        XCTAssertFalse(diagnostic.contains(secret), "diagnostic leaked the cookie value: \(diagnostic)")
        XCTAssertFalse(diagnostic.contains(secret.prefix(6)), "diagnostic leaked a value prefix")
        XCTAssertFalse(diagnostic.contains("\(secret.count)"), "diagnostic leaked the value length")
        // It still has to be useful, or it is decoration.
        XCTAssertTrue(diagnostic.contains("www.espn.com"), "diagnostic must name where it looked")
        XCTAssertTrue(diagnostic.contains("SWID: not found"), "diagnostic must name the missing half")

        withExtendedLifetime(webView) {}
    }

    // MARK: - ESPN page parsing

    func testLeagueAndTeamAreReadFromTheEspnPageUrl() {
        let url = URL(string: "https://fantasy.espn.com/football/team?leagueId=123456&teamId=7&seasonId=2026")
        let ids = EspnWebSignIn.leagueAndTeam(from: url)

        XCTAssertEqual(ids.leagueId, "123456")
        XCTAssertEqual(ids.teamId, "7")
    }

    /// ESPN's sign-in redirects through identity hosts. A league id on one of those must never be
    /// treated as a league page — the host check is what makes that impossible.
    func testANonEspnHostIsNeverTreatedAsALeaguePage() {
        let cases = [
            "https://evil.example.com/x?leagueId=123456",
            "https://espn.com.evil.example/x?leagueId=123456",
        ]
        for raw in cases {
            let ids = EspnWebSignIn.leagueAndTeam(from: URL(string: raw))
            XCTAssertNil(ids.leagueId, "must ignore \(raw)")
        }
    }

    /// The entry page must not itself be a league page.
    ///
    /// `/football/team` was the first choice and a real device rejected it: with no `leagueId`,
    /// ESPN renders "Invalid league ID" right after a successful sign-in, so the flow dead-ended
    /// on ESPN's own error screen.
    /// The entry URL's job is to make ESPN ask for a sign-in; the after-sign-in URL's job is to
    /// be somewhere useful once it has one. They must be different pages — collapsing them is the
    /// mistake that produced "Invalid league ID" immediately after a successful login.
    func testTheSignInEntryAndTheLandingPageAreDistinct() {
        XCTAssertNotEqual(EspnWebSignIn.entryURL, EspnWebSignIn.afterSignInURL)

        // Neither may carry a league of its own — a hard-coded league id here would connect
        // somebody else's league.
        XCTAssertNil(EspnWebSignIn.leagueAndTeam(from: EspnWebSignIn.entryURL).leagueId)
        XCTAssertNil(EspnWebSignIn.leagueAndTeam(from: EspnWebSignIn.afterSignInURL).leagueId)

        // Both must be ESPN, or the sheet sends the user off-site to sign in.
        for url in [EspnWebSignIn.entryURL, EspnWebSignIn.afterSignInURL] {
            XCTAssertEqual(url.host?.hasSuffix("espn.com"), true, "\(url) is not an ESPN host")
        }

        // `/football/welcome` is ESPN's new-user signup pitch. It stranded an existing manager on
        // a "Create a League" screen, and must not come back as either URL.
        for url in [EspnWebSignIn.entryURL, EspnWebSignIn.afterSignInURL] {
            XCTAssertFalse(url.path.contains("welcome"), "\(url) is the new-user signup page")
        }
    }

    /// ESPN client-routes between fantasy pages and sometimes carries the ids in the fragment.
    func testLeagueIdIsAlsoReadFromTheUrlFragment() {
        let url = URL(string: "https://fantasy.espn.com/football/welcome#/team?leagueId=4242&teamId=3")
        let ids = EspnWebSignIn.leagueAndTeam(from: url)

        XCTAssertEqual(ids.leagueId, "4242")
        XCTAssertEqual(ids.teamId, "3")
    }

    /// The server accepts `league_id` as well as `leagueId` (`normalizeEspnLeagueId`), and ESPN
    /// has used both shapes. A page with neither yields nothing rather than a guess.
    func testLeagueIdParsingMatchesTheServersAcceptedShapes() {
        XCTAssertEqual(
            EspnWebSignIn.leagueAndTeam(from: URL(string: "https://www.espn.com/x?league_id=99")).leagueId,
            "99"
        )
        XCTAssertNil(
            EspnWebSignIn.leagueAndTeam(from: URL(string: "https://fantasy.espn.com/football/team")).leagueId
        )
    }

    /// A stale cookie under one ESPN domain scope can coexist with a valid one under another, and
    /// the server rejects the stale value without saying why. Preference order must match the
    /// extension's, or the phone and the desktop helper disagree about the same account.
    func testCookieSelectionPrefersTheSameDomainOrderAsTheDesktopHelper() {
        func cookie(_ domain: String, _ value: String) -> HTTPCookie {
            HTTPCookie(properties: [
                .name: "espn_s2", .value: value, .domain: domain, .path: "/",
            ])!
        }
        let jar = [
            cookie(".espn.com", "STALE"),
            cookie("fantasy.espn.com", "ALSO_STALE"),
            cookie("www.espn.com", "FRESH"),
        ]

        XCTAssertEqual(EspnWebCookieStore.best(named: "espn_s2", in: jar), "FRESH")
        // Case-insensitive, because ESPN sends `SWID` and callers say `swid`.
        XCTAssertNil(EspnWebCookieStore.best(named: "SWID", in: jar))
    }

    /// An empty-valued cookie is not a session. Treating one as present is how a user gets
    /// "connected" with credentials the server will reject.
    func testAnEmptyCookieValueIsNotTreatedAsASession() {
        let empty = HTTPCookie(properties: [
            .name: "espn_s2", .value: "", .domain: "www.espn.com", .path: "/",
        ])!
        XCTAssertNil(EspnWebCookieStore.best(named: "espn_s2", in: [empty]))
    }

    // MARK: - ESPN handoff

    /// The ESPN screen is store-facing copy. Apple reads it, and so does anyone deciding
    /// whether Omen is asking for their ESPN account. Onboarding contract §2/§5: no password,
    /// no raw cookie entry, no credential vocabulary at all.
    func testEspnHandoffCopyNeverUsesCredentialVocabulary() {
        let surfaces = [EspnHandoffCopy.title, EspnHandoffCopy.subtitle,
                        EspnHandoffCopy.openSetupTitle, EspnHandoffCopy.checkConnectionTitle,
                        EspnHandoffCopy.checkAgainTitle, EspnHandoffCopy.notConnectedYet,
                        EspnHandoffCopy.checkUnavailable, EspnHandoffCopy.consentTitle,
                        EspnHandoffCopy.consentBody, EspnHandoffCopy.consentContinueTitle,
                        EspnHandoffCopy.signInWaiting, EspnHandoffCopy.signInReady,
                        EspnHandoffCopy.signInConnectTitle, EspnHandoffCopy.signInFellBack]
            + EspnHandoffCopy.steps.flatMap { [$0.title, $0.detail] }

        for copy in surfaces {
            let lowered = copy.lowercased()
            for banned in ["cookie", "espn_s2", "swid", "token", "session value", "credential"] {
                XCTAssertFalse(lowered.contains(banned), "\(banned) must not appear in: \(copy)")
            }
            // The single permitted use of "password" is the promise that Omen never sees one —
            // the same carve-out `OmenContextualHelpTests` makes, for the same reason.
            if lowered.contains("password") {
                XCTAssertTrue(
                    lowered.contains("never"),
                    "the only permitted password sentence is the promise Omen never sees one: \(copy)"
                )
            }
        }
    }

    /// The steps have to describe the whole errand, including the part that happens on a
    /// computer and the part that happens back in the app. A step list that stops at "install
    /// the helper" is what sent testers back to the picker not knowing if it had worked.
    func testEspnHandoffStepsCoverTheWholeErrandInOrder() {
        let steps = EspnHandoffCopy.steps

        XCTAssertEqual(steps.map(\.index), Array(1...steps.count))
        XCTAssertTrue(steps.contains { $0.detail.contains("slopssaloon.com/espn-connect") })
        XCTAssertTrue(steps.contains { $0.title.lowercased().contains("helper") })
        // The user presses Connect, not Omen.
        XCTAssertTrue(steps.contains { $0.detail.lowercased().contains("yourself") })
        XCTAssertTrue(steps.last?.title.contains(EspnHandoffCopy.checkConnectionTitle) == true)
    }

    /// A connected ESPN league routes on. `EspnConnection` is the only ESPN shape the app
    /// holds, and it carries a league label and a team label — never an id or a secret.
    func testCheckingEspnConnectionRoutesOnWhenTheServerReportsATeam() async {
        var repository = StubConnectRepository()
        repository.espnConnectionResult = .success(
            EspnConnection(leagueName: "Slops Invitational", teamName: "Team Slops")
        )
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)

        await viewModel.checkEspnConnection()

        guard case .espnConnected(let connection) = viewModel.state else {
            return XCTFail("expected espnConnected, got \(viewModel.state)")
        }
        XCTAssertEqual(connection.teamName, "Team Slops")
        XCTAssertNil(viewModel.espnCheckNotice)
        XCTAssertEqual(repository.recorder.espnConnectionChecks, 1)
    }

    /// ESPN does not expose a league list to Omen, so `league_name` is routinely null on a
    /// perfectly healthy connection. The headline must not render empty.
    func testEspnConnectedHeadlineFallsBackWhenEspnGivesNoLeagueName() {
        XCTAssertEqual(
            EspnConnection(leagueName: nil, teamName: "Team Slops").displayLeagueName,
            "Your ESPN league"
        )
        XCTAssertEqual(
            EspnConnection(leagueName: "Slops Invitational", teamName: nil).displayLeagueName,
            "Slops Invitational"
        )
    }

    /// Tapping the check button before finishing on a computer is the *expected* case, not a
    /// failure. The steps must stay on screen with a status line — being dumped on the error
    /// surface would lose the instructions the user is following.
    func testCheckingTooEarlyKeepsTheStepsOnScreenWithAnHonestStatus() async {
        var repository = StubConnectRepository()
        repository.espnConnectionResult = .success(nil)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)

        await viewModel.checkEspnConnection()

        guard case .unsupportedOnMobile(let provider) = viewModel.state else {
            return XCTFail("expected to stay on the ESPN handoff, got \(viewModel.state)")
        }
        XCTAssertEqual(provider, .espn)
        XCTAssertEqual(viewModel.espnCheckNotice, EspnHandoffCopy.notConnectedYet)
    }

    /// A failed *check* is not a failed connection. Reporting it as one would tell a user their
    /// ESPN setup broke when in fact Omen could not be reached.
    func testAFailedCheckReportsTheCheckFailingRatherThanTheConnection() async {
        var repository = StubConnectRepository()
        repository.espnConnectionResult = .failure(.network)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)

        await viewModel.checkEspnConnection()

        guard case .unsupportedOnMobile = viewModel.state else {
            return XCTFail("expected to stay on the ESPN handoff, got \(viewModel.state)")
        }
        XCTAssertEqual(viewModel.espnCheckNotice, EspnHandoffCopy.checkUnavailable)
    }

    /// Re-selecting ESPN clears a stale "not yet" line, so a fresh visit does not open on the
    /// result of a check the user made minutes ago.
    func testReturningToTheEspnStepsClearsAStaleStatusLine() async {
        var repository = StubConnectRepository()
        repository.espnConnectionResult = .success(nil)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)
        await viewModel.checkEspnConnection()
        XCTAssertNotNil(viewModel.espnCheckNotice)

        viewModel.startOver()
        XCTAssertNil(viewModel.espnCheckNotice)

        viewModel.selectProvider(.espn)
        XCTAssertNil(viewModel.espnCheckNotice)
    }

    /// The check is a read. It must never reach a connect route — an ESPN connection is made
    /// on the web form by the user, and the app has no path that could create one.
    func testCheckingEspnNeverCallsAConnectRoute() async {
        var repository = StubConnectRepository()
        repository.espnConnectionResult = .success(nil)
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)

        await viewModel.checkEspnConnection()

        XCTAssertTrue(repository.recorder.requestIds.isEmpty)
        XCTAssertTrue(repository.recorder.boundYahooLeagueIds.isEmpty)
    }

    /// Spec §6: no bare "Loading…". The ESPN check is a wait like any other and says so.
    func testEspnCheckIsBusyAndNamesWhatItIsDoing() {
        XCTAssertTrue(ConnectState.checkingEspnConnection.isBusy)
        XCTAssertEqual(
            ConnectState.checkingEspnConnection.progressLabel,
            "Checking whether your ESPN league reached Omen\u{2026}"
        )
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

    func testEspnNativeCopyDoesNotAskForCredentialsOrCookies() {
        let copy = ConnectView.espnConsentText.lowercased()

        XCTAssertTrue(copy.contains("desktop helper"))
        XCTAssertTrue(copy.contains("review"))
        XCTAssertFalse(copy.contains("password"))
        XCTAssertFalse(copy.contains("cookie"))
        XCTAssertFalse(copy.contains("espn_s2"))
        XCTAssertFalse(copy.contains("swid"))
        XCTAssertFalse(copy.contains("token"))
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
