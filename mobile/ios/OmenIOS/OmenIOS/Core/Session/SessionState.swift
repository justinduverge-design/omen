import Foundation

/// Mirrors Android `core/session/SessionState.kt`. `.needsReauth` is distinct from `.signedOut`
/// so the UI can say "you were signed in, sign in again" rather than showing the cold-start
/// welcome screen. Independent of any fantasy-provider connection/sync state.
enum SessionState: Equatable {
    case loading
    case signedOut
    case signedIn(userID: String)
    case needsReauth
}
