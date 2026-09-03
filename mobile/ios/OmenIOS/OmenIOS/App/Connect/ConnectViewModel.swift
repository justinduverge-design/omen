import Foundation

/// M5-NativeConnect — drives onboarding steps 4–6 (choose provider → connect or recover →
/// first useful destination).
@MainActor
final class ConnectViewModel: ObservableObject {
    @Published private(set) var state: ConnectState = .notStarted
    @Published private(set) var selectedProvider: ConnectProvider?
    @Published var username: String = ""

    /// A status line under the ESPN steps — "not yet", or "we couldn't check".
    ///
    /// Deliberately not a `retryableError` state: the ESPN handoff finishes on a computer, so
    /// "no league yet" is almost always a user who is mid-way through, not a failure. Pushing
    /// them to the error screen would lose the steps they are following.
    @Published private(set) var espnCheckNotice: String?

    /// What the ESPN sign-in sheet has observed. Drives whether Connect is offered.
    @Published private(set) var espnSignInProgress: EspnSignInProgress = .signedOut(diagnostic: "")

    /// The league to connect. Pre-filled the moment ESPN's URL reveals one, and editable
    /// throughout — ESPN has no page Omen can rely on the user landing on, so a field the user
    /// can fill is the floor this flow stands on rather than a fallback bolted to the side.
    ///
    /// The server's `normalizeEspnLeagueId` accepts a bare id, a `leagueId=` fragment, or a whole
    /// league URL, so anything a user can plausibly paste here works.
    @Published var espnLeagueId: String = ""

    /// The ESPN cookie jar for the current sign-in sheet. Recreated per attempt so a cancelled
    /// attempt leaves nothing behind, and held here rather than in view state so the read happens
    /// at the moment of the tap.
    private(set) var espnCookieStore: EspnCookieReading?

    /// How many times the user has been offered a retry after an unreadable session. The Wave 1
    /// contract allows one, then routes to the desktop path rather than looping.
    private var espnUnreadableRetries = 0

    /// The ESPN session, held only between sign-in and the connect that consumes it.
    ///
    /// Discovery made this necessary: the session has to survive from sign-in, through the
    /// league lookup, to the connect the user picks. It is in memory only, never published, and
    /// cleared on connect, cancel, failure, and start-over. `espnCookieStore` used to be the sole
    /// holder; this is the same lifetime, moved one step later so the picker can exist.
    private var espnSession: (espnS2: String, swid: String)?

    private let repository: ConnectRepository
    private let sessionManager: SessionManager
    private let authSession: ProviderAuthSessionPresenting
    private let makeRequestId: () -> String

    /// The id for the connect attempt currently being retried.
    ///
    /// Spec §7 requires that a retry of the *same* attempt be idempotent. Generating a fresh
    /// id on every tap would defeat the backend's replay guard, so the id is minted once per
    /// league selection and reused until that attempt succeeds or the user picks again.
    private var pendingRequestId: String?

    init(
        repository: ConnectRepository,
        sessionManager: SessionManager,
        // Nil rather than a default expression: `ASWebAuthenticationProviderSession` is
        // main-actor isolated, and a default argument is evaluated in the *caller's* context,
        // which is not guaranteed to be. Constructing it here is.
        authSession: ProviderAuthSessionPresenting? = nil,
        makeRequestId: @escaping () -> String = ConnectViewModel.defaultRequestId
    ) {
        self.repository = repository
        self.sessionManager = sessionManager
        self.authSession = authSession ?? ASWebAuthenticationProviderSession()
        self.makeRequestId = makeRequestId
    }

    /// The app-scheme the server's Yahoo callback redirects to. Matches `CFBundleURLSchemes`
    /// in `Info.plist` and `NATIVE_CALLBACK_URL` in `src/routes/yahoo.js`.
    static let callbackScheme = "com.slopssaloon.omen"

    /// Matches the backend's `NATIVE_REQUEST_ID_PATTERN` — `[A-Za-z0-9_-]{16,128}`. A UUID with
    /// hyphens stripped is 32 safe characters, comfortably inside the range.
    static func defaultRequestId() -> String {
        UUID().uuidString.replacingOccurrences(of: "-", with: "")
    }

    var canSubmitUsername: Bool {
        !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !state.isBusy
    }

    func selectProvider(_ provider: ConnectProvider) {
        switch provider.availability {
        case .available:
            // Sleeper's next step is the username field the picker already renders beneath
            // itself; Yahoo's is a browser round trip that has to be started explicitly.
            if provider == .yahoo {
                selectedProvider = provider
                Task { await connectYahoo() }
            } else if provider == .espn {
                // Consent first, always. W1-A's binding constraint: the user is told what is about
                // to open before it opens, and declining writes no state.
                selectedProvider = provider
                espnCheckNotice = nil
                espnUnreadableRetries = 0
                state = .espnConsent
            } else {
                selectedProvider = provider
                state = .notStarted
            }
        case .onHold, .useWeb:
            // Not an error and not a dead end — the view renders the provider's own reason and
            // a safe next action from `availability`.
            selectedProvider = provider
            espnCheckNotice = nil
            state = .unsupportedOnMobile(provider: provider)
        }
    }

    // MARK: - ESPN

    /// Consent accepted. Opens ESPN's own sign-in in the in-app web view.
    func beginEspnSignIn(cookieStore: EspnCookieReading? = nil) {
        espnSignInProgress = .signedOut(diagnostic: "")
        espnCookieStore = cookieStore ?? EspnWebCookieStore()
        state = .espnSigningIn
    }

    /// Connect is offered once ESPN has a session and a league has been named — by detection or
    /// by the user. Both halves are required: a league id without a session cannot connect, and a
    /// session without a league has nothing to connect to.
    var canConnectEspn: Bool {
        espnSignInProgress.isSignedIn
            && !espnLeagueId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !state.isBusy
    }

    /// Reported by the sheet as the user moves through ESPN. Never auto-connects: reaching
    /// `.ready` only enables the button.
    func espnSignInProgressed(_ progress: EspnSignInProgress) {
        guard case .espnSigningIn = state else { return }
        espnSignInProgress = progress

        // Pre-fill, never overwrite. Once the user has typed or corrected a league id, ESPN
        // navigating somewhere else must not silently swap it out from under them.
        if let detected = progress.detectedLeagueId,
           espnLeagueId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            espnLeagueId = detected
        }

        // The moment ESPN has a session, ask it what leagues the account plays in. This is what
        // turns "go find your league id in a URL" into a list — the user should never have to
        // hunt for an id we can simply ask for. Runs once; the guard is `espnSession`.
        if progress.isSignedIn, espnSession == nil {
            Task { await discoverEspnLeagues() }
        }
    }

    /// Captures the session and asks ESPN for the account's leagues.
    ///
    /// A failure here is **not** a failed connection — nothing has been connected yet. It falls
    /// back to the manual league-id field rather than throwing the user out of the flow, because
    /// a lookup Omen could not perform is Omen's problem, not the user's.
    func discoverEspnLeagues() async {
        guard let cookieStore = espnCookieStore, espnSession == nil else { return }
        guard let session = await cookieStore.takeSession() else { return }
        espnSession = session
        guard let accessToken = await bearer() else { return }

        state = .discoveringEspnLeagues
        switch await repository.discoverEspnLeagues(
            espnS2: session.espnS2,
            swid: session.swid,
            accessToken: accessToken
        ) {
        case .success(let leagues) where !leagues.isEmpty:
            state = .choosingEspnLeague(leagues)
        case .success:
            espnCheckNotice = EspnHandoffCopy.noLeaguesFound
            state = .espnSigningIn
        case .failure:
            espnCheckNotice = EspnHandoffCopy.discoveryUnavailable
            state = .espnSigningIn
        }
    }

    /// The user picked a league from the list ESPN reported.
    func connectEspnLeague(_ option: EspnLeagueOption) async {
        guard let session = espnSession, !state.isBusy else { return }
        guard let accessToken = await bearer() else { return }

        state = .validatingEspnConnection(leagueId: option.id)
        let capture = EspnCapture(
            espnS2: session.espnS2,
            swid: session.swid,
            leagueId: option.id,
            teamId: option.teamId
        )

        switch await repository.connectEspn(capture, accessToken: accessToken) {
        case .success:
            clearEspnSession()
            await confirmEspnFromServer(leagueId: option.id)
        case .failure(let failure):
            failEspnSignIn(with: failure)
        }
    }

    /// Drops every in-memory trace of the ESPN session. Called on success, failure, cancel, and
    /// start-over — there is no path that keeps one.
    private func clearEspnSession() {
        espnSession = nil
        espnCookieStore = nil
        espnSignInProgress = .signedOut(diagnostic: "")
    }

    /// The user pressed Connect. This is the only moment the session is read, and the only
    /// request it is ever placed in.
    func confirmEspnConnection() async {
        guard canConnectEspn, let cookieStore = espnCookieStore else { return }
        let leagueId = espnLeagueId.trimmingCharacters(in: .whitespacesAndNewlines)
        // Only trust a detected team when it belongs to the league actually being connected.
        // Sending team 3 from a league the user browsed away from binds the wrong team silently.
        let teamId = espnSignInProgress.detectedLeagueId == leagueId
            ? espnSignInProgress.detectedTeamId
            : nil
        guard let accessToken = await bearer() else { return }

        state = .validatingEspnConnection(leagueId: leagueId)

        // `??` cannot be used here: its right side is an autoclosure, which may not be async.
        var session = espnSession
        if session == nil { session = await cookieStore.takeSession() }
        guard let session else {
            return failEspnSignIn(with: .espnSessionUnreadable)
        }

        let capture = EspnCapture(
            espnS2: session.espnS2,
            swid: session.swid,
            leagueId: leagueId,
            teamId: teamId
        )

        switch await repository.connectEspn(capture, accessToken: accessToken) {
        case .success:
            // The sheet's jar is dropped the instant it is no longer needed. Nothing in the app
            // holds an ESPN session past this line.
            clearEspnSession()
            await confirmEspnFromServer(leagueId: leagueId)
        case .failure(let failure):
            failEspnSignIn(with: failure)
        }
    }

    /// After a successful connect, the league label comes from the server rather than from
    /// anything the client scraped — the same read the "I connected ESPN" button uses.
    private func confirmEspnFromServer(leagueId: String) async {
        guard let accessToken = await bearer() else { return }
        switch await repository.espnConnection(accessToken: accessToken) {
        case .success(let connection):
            state = .espnConnected(connection ?? EspnConnection(leagueName: nil, teamName: nil))
        case .failure:
            // The connect itself succeeded, so this is not a failure the user should see as one.
            state = .espnConnected(EspnConnection(leagueName: nil, teamName: nil))
        }
    }

    /// Contract §W1-A failure table: one retry on an unreadable session, then the desktop path.
    /// Never a loop, and never copy that blames the user.
    private func failEspnSignIn(with failure: ConnectFailure) {
        clearEspnSession()

        if failure == .espnSessionUnreadable {
            espnUnreadableRetries += 1
            if espnUnreadableRetries > 1 {
                espnCheckNotice = EspnHandoffCopy.signInFellBack
                state = .unsupportedOnMobile(provider: .espn)
                return
            }
        }
        state = .retryableError(failure)
    }

    /// Backing out of ESPN's sign-in. Normal, not an error, and nothing is written.
    ///
    /// **Guarded, and the guard is the whole point.** The sign-in sheet is a `fullScreenCover`
    /// bound to `state == .espnSigningIn`, so *any* move off that state dismisses it — and
    /// SwiftUI reports every dismissal through the same setter, with no way to tell the user
    /// swiping it away from the app navigating onward. Ungurded, a **successful** discovery
    /// dismissed the sheet and then immediately cancelled itself: on a real phone the ESPN
    /// sheet flashed red for a second and the user landed on "Nothing was connected."
    ///
    /// It hid until the discovery route was deployed, because before that discovery failed and
    /// fell back to `.espnSigningIn` — the sheet never closed, so the setter never fired.
    ///
    /// Cancelling a sign-in that is no longer on screen is meaningless, so this is a no-op then.
    /// The guard lives here rather than in the view's binding so no future call site can get it
    /// wrong, and so it is testable without a view.
    func cancelEspnSignIn() {
        guard state == .espnSigningIn else { return }
        clearEspnSession()
        state = .canceled
    }

    /// "I connected ESPN" — re-reads the server after the user finished on a computer.
    ///
    /// This is a **read**, not a connect. The app has no ESPN credential path and never asks
    /// for one (onboarding contract §2/§5); the whole action is `GET /api/leagues` plus a
    /// decision about where to send the user next. A connection with usable team context
    /// routes on; anything else leaves the steps on screen with an honest status line, so a
    /// user who tapped too early is not thrown back to the provider picker.
    func checkEspnConnection() async {
        guard !state.isBusy else { return }
        espnCheckNotice = nil
        guard let accessToken = await bearer() else { return }

        state = .checkingEspnConnection
        switch await repository.espnConnection(accessToken: accessToken) {
        case .success(let connection):
            if let connection {
                state = .espnConnected(connection)
            } else {
                espnCheckNotice = EspnHandoffCopy.notConnectedYet
                state = .unsupportedOnMobile(provider: .espn)
            }
        case .failure:
            // The reason is never shown verbatim: `ConnectFailure` messages are written for
            // provider operations the user started, and none of them is true here.
            espnCheckNotice = EspnHandoffCopy.checkUnavailable
            state = .unsupportedOnMobile(provider: .espn)
        }
    }

    /// Spec §6: "Cancellation is normal, not an error."
    func cancel() {
        pendingRequestId = nil
        espnCheckNotice = nil
        espnCookieStore = nil
        state = .canceled
    }

    /// Returns to the provider picker without treating the exit as a failure.
    func startOver() {
        pendingRequestId = nil
        espnCheckNotice = nil
        clearEspnSession()
        espnLeagueId = ""
        espnUnreadableRetries = 0
        selectedProvider = nil
        state = .notStarted
    }

    func resolveUsername() async {
        let trimmed = username.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !state.isBusy else { return }
        guard let accessToken = await bearer() else { return }

        state = .resolvingAccount
        switch await repository.resolveSleeper(username: trimmed, accessToken: accessToken) {
        case .success(let account):
            state = .choosingLeague(account)
        case .failure(let failure):
            state = .retryableError(failure)
        }
    }

    func selectLeague(_ league: SleeperLeague) async {
        guard case .choosingLeague(let account) = state else { return }
        pendingRequestId = makeRequestId()
        await connect(league: league, username: account.username)
    }

    /// Retries the *same* attempt, reusing its request id so the backend replay guard still
    /// applies. Falls back to a fresh id only if there is no attempt in flight.
    func retryConnect(league: SleeperLeague, username: String) async {
        if pendingRequestId == nil { pendingRequestId = makeRequestId() }
        await connect(league: league, username: username)
    }

    /// Renews an expiring access token before a connect round trip and sets the matching
    /// failure state when there isn't one.
    ///
    /// Connect is where a stale token used to be most expensive: the user had just typed their
    /// username, and a one-hour-old session turned that into "sign in again" with the typing
    /// discarded. `authorization()` renews first. A transport failure is reported as a network
    /// problem — **not** as re-auth, which would throw away a session that is still valid.
    private func bearer() async -> String? {
        switch await sessionManager.authorization() {
        case .token(let token):
            return token
        case .unavailable:
            state = .retryableError(.network)
            return nil
        case .needsReauth:
            state = .needsReauth
            return nil
        }
    }

    // MARK: - Yahoo

    /// Yahoo's whole flow: authorize in the system browser, confirm with the server what was
    /// actually connected, then let the user pick the league to bind.
    ///
    /// The `status=connected` on the deep link is **not** treated as proof. Any app on the
    /// device can fire that URL at us, and more usefully, a user can approve in Yahoo while the
    /// token exchange fails behind them. `yahooLeagues` is the confirmation, because it can
    /// only answer once tokens are genuinely stored — which is also why there is no
    /// "I've connected" button for the user to press on Omen's behalf.
    func connectYahoo() async {
        guard !state.isBusy else { return }
        guard let accessToken = await bearer() else { return }

        state = .startingYahooAuthorization
        let authorizationURL: URL
        switch await repository.startYahooAuthorization(accessToken: accessToken) {
        case .success(let url):
            authorizationURL = url
        case .failure(let failure):
            state = .retryableError(failure)
            return
        }

        state = .awaitingYahooReturn
        switch await authSession.authorize(url: authorizationURL, callbackScheme: Self.callbackScheme) {
        case .canceled:
            // Contract §6: backing out of a provider's own sign-in is normal, not an error.
            state = .canceled
            return
        case .failed:
            state = .retryableError(.server)
            return
        case .returned(let callbackURL):
            // A `status=cancelled` return means the user pressed Yahoo's own decline button.
            // Same meaning as dismissing the sheet, so it reads the same way.
            if Self.callbackStatus(callbackURL) == "cancelled" {
                state = .canceled
                return
            }
        }

        await confirmYahooConnection()
    }

    /// Re-reads the connection from the server. Also the retry target after a transient
    /// failure, so a user who really is connected is not sent back through the browser.
    func confirmYahooConnection() async {
        guard let accessToken = await bearer() else { return }

        state = .confirmingYahooConnection
        switch await repository.yahooLeagues(accessToken: accessToken) {
        case .success(let leagues):
            // One league is not a choice. Binding it directly removes a screen whose only
            // possible answer was already known.
            if leagues.count == 1, let only = leagues.first {
                await bindYahooLeague(only)
            } else {
                state = .choosingYahooLeague(leagues)
            }
        case .failure(let failure):
            state = .retryableError(failure)
        }
    }

    func bindYahooLeague(_ league: YahooLeague) async {
        guard let accessToken = await bearer() else { return }

        state = .bindingYahooLeague(league: league)
        switch await repository.bindYahooLeague(id: league.id, accessToken: accessToken) {
        case .success:
            state = .yahooConnected(league: league)
        case .failure(let failure):
            state = .retryableError(failure)
        }
    }

    /// Reads `status` off the server's native-return deep link. Returns nil when the URL is not
    /// one — the same scheme carries Supabase's sign-in callback, which has `code`/`state`.
    static func callbackStatus(_ url: URL) -> String? {
        URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "status" })?
            .value
    }

    private func connect(league: SleeperLeague, username: String) async {
        guard let accessToken = await bearer() else { return }
        guard let requestId = pendingRequestId else { return }

        state = .validatingConnection(league: league)
        let result = await repository.connectSleeper(
            username: username,
            leagueId: league.id,
            requestId: requestId,
            accessToken: accessToken
        )

        switch result {
        case .success:
            pendingRequestId = nil
            state = .connected(league: league)
        case .failure(let failure):
            state = .retryableError(failure)
        }
    }
}
