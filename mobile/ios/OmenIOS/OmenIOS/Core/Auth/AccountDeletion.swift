import Foundation

/// Mirrors Android `core/auth/AccountDeletion.kt`. The confirmation phrase is an exact,
/// case-sensitive match with no trimming — mirrors the backend's strict `!==` check in
/// `src/routes/userPrivacy.js`. Changing this phrase needs a fresh founder decision (M0c §2.3).
enum AccountDeletion {
    static let requiredPhrase = "DELETE MY OMEN DATA"

    static func isConfirmed(_ input: String) -> Bool {
        input == requiredPhrase
    }
}

enum AccountDeletionOutcome: Equatable {
    case deleted
    case invalidConfirmation
    case unauthorized
    case retryableError(code: RetryableCode)
}

/// Production implementation is `URLSessionAccountRepository` (App layer).
protocol AccountRepository {
    func deleteAccount(accessToken: String, confirmation: String) async -> AccountDeletionOutcome
}

/// Mirrors Android `core/auth/AccountDeletion.kt`'s `mapDeleteStatus`.
func mapDeleteStatus(_ status: Int) -> AccountDeletionOutcome {
    switch status {
    case 200...299:
        return .deleted
    case 400, 422:
        return .invalidConfirmation
    case 401, 403:
        return .unauthorized
    case 408, 504:
        return .retryableError(code: .timeout)
    case 500...599:
        return .retryableError(code: .server)
    default:
        return .retryableError(code: .unknown)
    }
}
