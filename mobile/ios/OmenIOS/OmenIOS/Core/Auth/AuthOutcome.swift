import Foundation

/// Mirrors Android `core/auth/AuthOutcome.kt`'s `RetryableCode`. Only a numeric-status-derived
/// category ever reaches the UI — raw provider error text stays server-side (M0c §8).
enum RetryableCode: Equatable {
    case network
    case timeout
    case server
    case unknown
}

/// Mirrors Android `core/auth/AuthOutcome.kt`. The result of a single repository call — opaque
/// by construction, never a raw HTTP status or provider error string.
enum AuthOutcome: Equatable {
    case success(session: Session)
    case otpSent
    case canceled
    case invalidCode
    case needsReauth
    case unsupported
    case retryableError(code: RetryableCode)
}
