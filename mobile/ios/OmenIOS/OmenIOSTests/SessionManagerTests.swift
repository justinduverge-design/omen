import XCTest
@testable import OmenIOS

/// Mirrors Android `SessionManagerTest.kt` (6 tests).
@MainActor
final class SessionManagerTests: XCTestCase {
    func testRestoreSignedOutWhenEmpty() {
        let manager = SessionManager(store: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })
        manager.restore()
        XCTAssertEqual(manager.state, .signedOut)
    }

    func testRestoreSignedInForFreshSession() {
        let session = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 2_000)
        let manager = SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
        manager.restore()
        XCTAssertEqual(manager.state, .signedIn(userID: "u1"))
    }

    func testRestoreNeedsReauthForExpiredSession() {
        let session = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 500)
        let manager = SessionManager(store: InMemorySecureSessionStore(initial: session), nowEpochSeconds: { 1_000 })
        manager.restore()
        XCTAssertEqual(manager.state, .needsReauth)
    }

    func testOnAuthenticatedPersistsAndSignsIn() {
        let store = InMemorySecureSessionStore()
        let manager = SessionManager(store: store, nowEpochSeconds: { 1_000 })
        let session = Session(userID: "u2", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 2_000)

        manager.onAuthenticated(session)

        XCTAssertEqual(manager.state, .signedIn(userID: "u2"))
        XCTAssertEqual(store.load(), session)
    }

    func testSignOutClearsStore() {
        let session = Session(userID: "u3", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 2_000)
        let store = InMemorySecureSessionStore(initial: session)
        let manager = SessionManager(store: store, nowEpochSeconds: { 1_000 })
        manager.restore()

        manager.signOut()

        XCTAssertEqual(manager.state, .signedOut)
        XCTAssertNil(store.load())
    }

    func testRefreshFailureSurfacesNeedsReauth() {
        let manager = SessionManager(store: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })
        manager.onRefreshFailed()
        XCTAssertEqual(manager.state, .needsReauth)
    }
}
