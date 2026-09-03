import Foundation

/// Mirrors Android `core/auth/AccountDeletion.kt` and the backend check in
/// `src/routes/userPrivacy.js`. All three move together — the server is the enforcer, so a
/// client that disagrees with it simply cannot delete an account.
///
/// **Shortened from "DELETE MY OMEN DATA" on 2026-09-03 (founder).** The long phrase made an
/// already-deliberate action tedious, and on a phone it fought autocapitalize and autocorrect
/// the whole way. Matching is now case-insensitive and trimmed, which the long phrase
/// deliberately was not: with one short word, strictness stops being a safety property and
/// becomes a way to fail someone who typed "Delete". The guardrail was never the casing — it is
/// that the user types a word at all rather than tapping once.
enum AccountDeletion {
    static let requiredPhrase = "delete"

    static func isConfirmed(_ input: String) -> Bool {
        input.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == requiredPhrase
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
