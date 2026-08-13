import Foundation

/// Mirrors Android `core/session/SessionManager.kt`. Owns the single source of truth for
/// `SessionState`; `nowEpochSeconds` is injected so expiry logic is deterministically testable.
@MainActor
final class SessionManager: ObservableObject {
    static let demoUserID = "demo-local"

    @Published private(set) var state: SessionState = .loading

    private let store: SecureSessionStore
    private let nowEpochSeconds: () -> Int64
    private let preferences: UserDefaults

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

    func restore() {
        guard let session = store.load() else {
            state = .signedOut
            return
        }
        state = session.isExpired(now: nowEpochSeconds()) ? .needsReauth : .signedIn(userID: session.userID)
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
