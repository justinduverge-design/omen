package com.slopssaloon.omen.core.auth

/**
 * In-app account deletion (App Store Review Guideline 5.1.1, M0c §2.3).
 *
 * Tied to the existing authenticated web flow `DELETE /api/user/delete`, which requires the
 * confirmation phrase to **exactly** equal [REQUIRED_PHRASE]. The phrase is a product guardrail
 * (facts-of-record / sprint guardrails) — do not change it without fresh founder approval.
 */
object AccountDeletion {
    const val REQUIRED_PHRASE: String = "DELETE MY OMEN DATA"

    /** Exact match — mirrors the backend's strict `!==` check (no trimming, case-sensitive). */
    fun isConfirmed(input: String): Boolean = input == REQUIRED_PHRASE
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
