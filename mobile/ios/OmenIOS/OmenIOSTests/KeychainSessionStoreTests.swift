import XCTest
@testable import Omen

/// Exercises the real Keychain-backed `KeychainSessionStore` (S5 — mobile token storage review).
/// `SessionManagerTests` already covers `SessionManager` against the `InMemorySecureSessionStore`
/// fake; this file is the missing piece — proof the *production* store actually round-trips
/// through Keychain Services, and that no token ever lands in plaintext `UserDefaults`.
final class KeychainSessionStoreTests: XCTestCase {
    /// Each test gets its own Keychain account and clears itself via `addTeardownBlock`
    /// regardless of pass/fail, so tests never share state and never leak a leftover item.
    private func makeStore() -> KeychainSessionStore {
        let store = KeychainSessionStore(service: "com.slopssaloon.omen.session.test", account: UUID().uuidString)
        addTeardownBlock { store.clear() }
        return store
    }

    func testLoadReturnsNilWhenNothingSaved() {
        XCTAssertNil(makeStore().load())
    }

    func testSaveAndLoadRoundTrips() throws {
        let store = makeStore()
        let session = Session(userID: "u1", accessToken: "access-token-abc", refreshToken: "refresh-token-xyz", expiresAtEpochSeconds: 2_000)

        try store.save(session)

        XCTAssertEqual(store.load(), session)
    }

    func testSaveOverwritesPreviousSession() throws {
        let store = makeStore()
        try store.save(Session(userID: "old", accessToken: "a1", refreshToken: "r1", expiresAtEpochSeconds: 1_000))

        try store.save(Session(userID: "new", accessToken: "a2", refreshToken: "r2", expiresAtEpochSeconds: 2_000))

        XCTAssertEqual(store.load()?.userID, "new")
    }

    func testClearRemovesSession() throws {
        let store = makeStore()
        try store.save(Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 2_000))

        store.clear()

        XCTAssertNil(store.load())
    }

    /// The regression guard S5 exists to establish: a saved session's token material must never
    /// be recoverable by scanning plaintext `UserDefaults`, which is where a naive or reverted
    /// implementation would put it.
    func testSavedTokensNeverAppearInUserDefaults() throws {
        let store = makeStore()
        let accessToken = "access-token-\(UUID().uuidString)"
        let refreshToken = "refresh-token-\(UUID().uuidString)"
        try store.save(Session(userID: "u1", accessToken: accessToken, refreshToken: refreshToken, expiresAtEpochSeconds: 2_000))

        let defaultsDump = "\(UserDefaults.standard.dictionaryRepresentation())"

        XCTAssertFalse(defaultsDump.contains(accessToken))
        XCTAssertFalse(defaultsDump.contains(refreshToken))
    }
}
