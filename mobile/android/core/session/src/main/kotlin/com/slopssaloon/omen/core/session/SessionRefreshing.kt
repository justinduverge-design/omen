package com.slopssaloon.omen.core.session

/**
 * What a refresh attempt concluded.
 *
 * Three cases, because collapsing them to two is precisely the bug this seam was added to fix:
 * **a network failure is not a signed-out user.** Only [Rejected] — the server judging the
 * refresh token and refusing it — is evidence the session is over.
 */
sealed interface SessionRefreshOutcome {
    data class Renewed(val session: Session) : SessionRefreshOutcome

    /** Transport never completed: offline, DNS, TLS, timeout. Session untouched. */
    data object Unavailable : SessionRefreshOutcome

    /** The refresh token itself was refused. The user has to sign in again. */
    data object Rejected : SessionRefreshOutcome
}

/**
 * The seam [SessionManager] uses to renew an access token. Implemented in `core/auth` over
 * `AuthRepository.refresh()`; kept as an interface here so `core/session` does not have to know
 * about GoTrue, and so tests can drive expiry deterministically.
 */
fun interface SessionRefreshing {
    suspend fun refreshedSession(): SessionRefreshOutcome
}

/** A token good for the caller's purposes, or the reason there isn't one. */
sealed interface SessionAuthorization {
    data class Token(val accessToken: String) : SessionAuthorization

    /** Transient. The stored session is still believed valid — retry, don't sign out. */
    data object Unavailable : SessionAuthorization

    data object NeedsReauth : SessionAuthorization
}
