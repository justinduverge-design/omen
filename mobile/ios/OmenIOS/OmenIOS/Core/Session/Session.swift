import Foundation

/// Mirrors Android `core/session/Session.kt`. Tokens are redacted from any string description so
/// they can never land in a log line or crash report by accident (M0c §8).
struct Session: Equatable {
    let userID: String
    let accessToken: String
    let refreshToken: String
    let expiresAtEpochSeconds: Int64

    func isExpired(now: Int64) -> Bool {
        expiresAtEpochSeconds <= now
    }
}

extension Session: CustomStringConvertible, CustomDebugStringConvertible {
    var description: String {
        "Session(userID: \(userID), expiresAt: \(expiresAtEpochSeconds), tokens: <redacted>)"
    }

    var debugDescription: String { description }
}
