import Foundation

/// Mirrors Android `core/session/SessionManager.kt`. Owns the single source of truth for
/// `SessionState`; `nowEpochSeconds` is injected so expiry logic is deterministically testable.
@MainActor
final class SessionManager: ObservableObject {
    static let demoUserID = "demo-local"

    @Published private(set) var state: SessionState = .loading

    /// Renew this many seconds *before* the token actually dies. A request that starts with
    /// five seconds left can easily land after expiry, and the round trip back to sign-in
    /// costs the user far more than a proactive refresh costs us.
    static let refreshLeewaySeconds: Int64 = 120

    private let store: SecureSessionStore
    private let nowEpochSeconds: () -> Int64
    private let preferences: UserDefaults

    /// Set once at app construction (`OmenIOSApp`). Nil in unit tests and SwiftUI previews,
    /// where `authorization()` degrades to reading the stored token directly.
    private var refresher: SessionRefreshing?

    init(
        store: SecureSessionStore,
        nowEpochSeconds: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970) },
        preferences: UserDefaults = .standard
    ) {
        self.store = store
        self.nowEpochSeconds = nowEpochSeconds
        self.preferences = preferences
    }

    /// The session currently in the secure store, if any. Used by flows (like account deletion)
    /// that need the raw access token rather than just the redacted `SessionState`.
    var currentSession: Session? {
        store.load()
    }

    /// Installs the token-renewal seam. Called once from `OmenIOSApp`, after the auth
    /// repository exists — the repository reads the same secure store this manager writes, so
    /// it cannot be constructed before the manager and has to be attached rather than injected.
    func attach(refresher: SessionRefreshing) {
        self.refresher = refresher
    }

    func restore() {
        guard let session = store.load() else {
            state = .signedOut
            return
        }
        state = session.isExpired(now: nowEpochSeconds()) ? .needsReauth : .signedIn(userID: session.userID)
    }

    /// Cold-start restore that renews before it judges.
    ///
    /// Plain `restore()` marks any expired session `.needsReauth` on the spot. A Supabase
    /// access token lives one hour, so a stored session is expired on essentially every cold
    /// launch after the first — that one line was the most reliable way for a signed-in user
    /// to be handed a sign-in screen. Here an expired-but-refreshable session gets its refresh
    /// first, and only a server-rejected refresh token ejects anyone.
    func restoreRefreshing() async {
        guard let session = store.load() else {
            state = .signedOut
            return
        }
        guard needsRefresh(session) else {
            state = .signedIn(userID: session.userID)
            return
        }
        switch await authorization() {
        case .token:
            // `onAuthenticated` already moved the state to `.signedIn`.
            break
        case .unavailable:
            // Offline at launch holding a stale token. That is not evidence the session is
            // dead — show the shell and let the first request that reaches the server decide.
            state = .signedIn(userID: session.userID)
        case .needsReauth:
            state = .needsReauth
        }
    }

    /// A bearer good for at least `refreshLeewaySeconds` more, renewing first if needed.
    ///
    /// Every authenticated request in the app goes through here. Before it existed, callers
    /// read `currentSession?.accessToken` raw and `AuthRepository.refresh()` — which was fully
    /// implemented — was never called from anywhere in the app.
    func authorization() async -> SessionAuthorization {
        guard let session = store.load() else { return .needsReauth }
        guard needsRefresh(session) else { return .token(session.accessToken) }
        guard let refresher else {
            // No renewal seam wired (tests, previews). Honest fallback: hand back what we have
            // rather than inventing a re-auth the caller cannot resolve.
            return session.isExpired(now: nowEpochSeconds()) ? .needsReauth : .token(session.accessToken)
        }
        return await apply(await refresher.refreshedSession())
    }

    /// Forces renewal even when the stored token still looks alive. Used only on the
    /// 401-retry path, where the server has already contradicted our clock.
    func forceRefresh() async -> SessionAuthorization {
        guard store.load() != nil else { return .needsReauth }
        guard let refresher else { return .needsReauth }
        return await apply(await refresher.refreshedSession())
    }

    private func apply(_ outcome: SessionRefreshOutcome) -> SessionAuthorization {
        switch outcome {
        case .renewed(let session):
            onAuthenticated(session)
            return .token(session.accessToken)
        case .unavailable:
            return .unavailable
        case .rejected:
            return .needsReauth
        }
    }

    private func needsRefresh(_ session: Session) -> Bool {
        session.expiresAtEpochSeconds <= nowEpochSeconds() + Self.refreshLeewaySeconds
    }

    func onAuthenticated(_ session: Session) {
        try? store.save(session)
        state = .signedIn(userID: session.userID)
    }

    /// A failed refresh keeps the stored session data (so a retry can still read the stale
    /// refresh token) but surfaces `.needsReauth` to the UI immediately.
    func onRefreshFailed() {
        state = .needsReauth
    }

    /// Demo identity is never persisted to secure storage.
    func onDemo() {
        state = .signedIn(userID: Self.demoUserID)
    }

    func signOut() {
        store.clear()
        state = .signedOut
    }

    func hasDismissedPasskeyPairing(for userID: String) -> Bool {
        preferences.bool(forKey: passkeyPairingKey(for: userID))
    }

    func dismissPasskeyPairing(for userID: String) {
        preferences.set(true, forKey: passkeyPairingKey(for: userID))
    }

    private func passkeyPairingKey(for userID: String) -> String {
        "com.slopssaloon.omen.passkey-pairing-dismissed.\(userID)"
    }
}
