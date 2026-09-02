package com.slopssaloon.omen.core.auth

import com.slopssaloon.omen.core.session.SessionRefreshOutcome
import com.slopssaloon.omen.core.session.SessionRefreshing

/**
 * Production [SessionRefreshing], over [AuthRepository.refresh].
 *
 * iOS mirror: `App/Api/AuthRepositorySessionRefresher.swift`. Serialization of concurrent
 * refreshes lives in `SessionManager` (a `Mutex`) rather than here, so a caller that queues
 * behind an in-flight refresh can take the freshly stored token instead of starting a second
 * round trip against a refresh token Supabase has already rotated.
 */
class AuthRepositorySessionRefresher(
    private val repository: AuthRepository,
) : SessionRefreshing {
    override suspend fun refreshedSession(): SessionRefreshOutcome =
        when (val outcome = repository.refresh()) {
            is AuthOutcome.Success -> SessionRefreshOutcome.Renewed(outcome.session)
            // Transport-level only. The refresh token was never judged, so neither is the user.
            is AuthOutcome.RetryableError -> SessionRefreshOutcome.Unavailable
            else -> SessionRefreshOutcome.Rejected
        }
}
