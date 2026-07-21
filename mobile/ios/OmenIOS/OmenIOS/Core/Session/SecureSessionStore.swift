import Foundation

/// Mirrors Android `core/session/SecureSessionStore.kt`. The production implementation is
/// `KeychainSessionStore`; `InMemorySecureSessionStore` is the deterministic fake used by tests
/// and SwiftUI previews.
protocol SecureSessionStore {
    func save(_ session: Session) throws
    func load() -> Session?
    func clear()
}

final class InMemorySecureSessionStore: SecureSessionStore {
    private var stored: Session?

    init(initial: Session? = nil) {
        stored = initial
    }

    func save(_ session: Session) throws {
        stored = session
    }

    func load() -> Session? {
        stored
    }

    func clear() {
        stored = nil
    }
}
