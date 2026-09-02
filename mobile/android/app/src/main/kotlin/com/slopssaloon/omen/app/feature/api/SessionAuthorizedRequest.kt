package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.session.SessionAuthorization
import com.slopssaloon.omen.core.session.SessionManager

/**
 * Runs an authenticated request with the token lifetime handled for the caller.
 *
 * iOS mirror: `App/Api/SessionAuthorizedRequest.swift`. Two halves, both required:
 *
 * - **Before** the call, `authorization()` renews a token that is expired or within
 *   `REFRESH_LEEWAY_SECONDS` of it.
 * - **After** a 401 on a token that looked alive — revoked, rotated, or clock skew — forces
 *   exactly one refresh and one retry. A second 401 is believed. One retry, never a loop.
 *
 * A transport failure resolves to [OmenApiError.Network], never [OmenApiError.Unauthorized]: an
 * offline user is not a signed-out user, and the call site renders a retry rather than a
 * sign-in wall.
 *
 * [operation] must be safe to run twice. Every route this is used with is either a GET or an
 * idempotent POST carrying its own `request_id`.
 */
suspend fun <T> SessionManager.authorized(
    operation: suspend (String) -> OmenApiResult<T>,
): OmenApiResult<T> {
    val token = when (val authorization = authorization()) {
        is SessionAuthorization.Token -> authorization.accessToken
        SessionAuthorization.Unavailable -> return OmenApiResult.Failure(OmenApiError.Network)
        SessionAuthorization.NeedsReauth -> {
            onRefreshFailed()
            return OmenApiResult.Failure(OmenApiError.Unauthorized)
        }
    }

    val first = operation(token)
    if (first !is OmenApiResult.Failure || first.error !is OmenApiError.Unauthorized) return first

    val renewed = when (val retry = forceRefresh()) {
        is SessionAuthorization.Token -> retry.accessToken
        SessionAuthorization.Unavailable -> return OmenApiResult.Failure(OmenApiError.Network)
        SessionAuthorization.NeedsReauth -> {
            onRefreshFailed()
            return OmenApiResult.Failure(OmenApiError.Unauthorized)
        }
    }

    val second = operation(renewed)
    if (second is OmenApiResult.Failure && second.error is OmenApiError.Unauthorized) {
        // A token minted seconds ago being refused is a real authorization problem, not a
        // lifetime problem. Believe it.
        onRefreshFailed()
    }
    return second
}
