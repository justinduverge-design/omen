import Foundation

/// M5-NativeConnect — drives onboarding steps 4–6 (choose provider → connect or recover →
/// first useful destination).
@MainActor
final class ConnectViewModel: ObservableObject {
    @Published private(set) var state: ConnectState = .notStarted
    @Published var username: String = ""

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
                Task { await connectYahoo() }
            } else {
                state = .notStarted
            }
        case .onHold, .useWeb:
            // Not an error and not a dead end — the view renders the provider's own reason and
            // a safe next action from `availability`.
            state = .unsupportedOnMobile(provider: provider)
        }
    }

    /// Spec §6: "Cancellation is normal, not an error."
    func cancel() {
        pendingRequestId = nil
        state = .canceled
    }

    /// Returns to the provider picker without treating the exit as a failure.
    func startOver() {
        pendingRequestId = nil
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
