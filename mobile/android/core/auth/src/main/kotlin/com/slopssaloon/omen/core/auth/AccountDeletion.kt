package com.slopssaloon.omen.core.auth

/**
 * In-app account deletion (App Store Review Guideline 5.1.1, M0c §2.3).
 *
 * Tied to the authenticated flow `DELETE /api/user/delete`. The server is the enforcer, so this
 * and the iOS mirror must agree with `src/routes/userPrivacy.js` — a client that disagrees
 * simply cannot delete an account.
 *
 * **Shortened from "DELETE MY OMEN DATA" on 2026-09-03 (founder).** The long phrase made an
 * already-deliberate action tedious, and on a phone it fought autocapitalize and autocorrect the
 * whole way. Matching is now case-insensitive and trimmed, which the long phrase deliberately
 * was not: with one short word, strictness stops being a safety property and becomes a way to
 * fail someone who typed "Delete". The guardrail was never the casing — it is that the user
 * types a word at all rather than tapping once.
 */
object AccountDeletion {
    const val REQUIRED_PHRASE: String = "delete"

    fun isConfirmed(input: String): Boolean = input.trim().lowercase() == REQUIRED_PHRASE
}

/** Result of a deletion request. Opaque and safe — never carries raw provider/server text. */
sealed interface AccountDeletionOutcome {
    data object Deleted : AccountDeletionOutcome
    data object InvalidConfirmation : AccountDeletionOutcome
    data object Unauthorized : AccountDeletionOutcome
    data class RetryableError(val code: RetryableCode) : AccountDeletionOutcome
}

/**
 * Authenticated account-deletion boundary. The concrete HTTP implementation lives in the app
 * module (`OkHttpAccountRepository`); [mapDeleteStatus] keeps the status→outcome mapping pure
 * and unit-tested here.
 */
interface AccountRepository {
    suspend fun deleteAccount(accessToken: String, confirmation: String): AccountDeletionOutcome
}

/** Pure mapping from the delete endpoint's HTTP status to a safe outcome. */
fun mapDeleteStatus(status: Int): AccountDeletionOutcome = when {
    status in 200..299 -> AccountDeletionOutcome.Deleted
    status == 400 || status == 422 -> AccountDeletionOutcome.InvalidConfirmation
    status == 401 || status == 403 -> AccountDeletionOutcome.Unauthorized
    status == 408 || status == 504 -> AccountDeletionOutcome.RetryableError(RetryableCode.TIMEOUT)
    status in 500..599 -> AccountDeletionOutcome.RetryableError(RetryableCode.SERVER)
    else -> AccountDeletionOutcome.RetryableError(RetryableCode.UNKNOWN)
}
