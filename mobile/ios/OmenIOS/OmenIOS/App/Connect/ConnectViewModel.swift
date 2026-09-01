import Foundation

/// M5-NativeConnect — drives onboarding steps 4–6 (choose provider → connect or recover →
/// first useful destination).
@MainActor
final class ConnectViewModel: ObservableObject {
    @Published private(set) var state: ConnectState = .notStarted
    @Published var username: String = ""

    private let repository: ConnectRepository
    private let sessionManager: SessionManager
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
        makeRequestId: @escaping () -> String = ConnectViewModel.defaultRequestId
    ) {
        self.repository = repository
        self.sessionManager = sessionManager
        self.makeRequestId = makeRequestId
    }

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
            state = .notStarted
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
