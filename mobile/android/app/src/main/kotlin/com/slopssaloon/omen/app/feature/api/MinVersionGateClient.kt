package com.slopssaloon.omen.app.feature.api

import org.json.JSONObject

/**
 * O7 — server-driven minimum-version gate. iOS mirror:
 * `App/Api/MinVersionGateClient.swift`.
 *
 * Deliberately unauthenticated: the check runs at launch, before sign-in, so it cannot
 * depend on a bearer token.
 */
sealed interface MinVersionGateResult {
    data object Ok : MinVersionGateResult
    data class UpdateRequired(val minimumVersion: String) : MinVersionGateResult

    /**
     * Any failure — network, non-2xx, unreadable body. Callers MUST treat this identically
     * to [Ok]. This gate exists to block a known-bad build, never to add a new way to get
     * locked out of the app.
     */
    data object Unavailable : MinVersionGateResult
}

fun interface MinVersionGateChecking {
    suspend fun check(platform: String, currentVersion: String): MinVersionGateResult
}

class MinVersionGateClient(
    apiBaseUrl: String,
    private val fetcher: OmenHttpFetcher = OkHttpFetcher(),
) : MinVersionGateChecking {
    private val base = apiBaseUrl.trimEnd('/')

    override suspend fun check(platform: String, currentVersion: String): MinVersionGateResult {
        val url = "$base/api/system/min-version?platform=$platform&version=$currentVersion"
        // Empty access token: the route is public and ignores Authorization. Reusing the
        // shared fetcher seam keeps the test fakes identical to every other API test.
        //
        // `runCatching` rather than trusting the fetcher's own handling: `OkHttpFetcher`
        // catches `IOException` only, and builds the `Request` outside that try — a
        // malformed base URL throws `IllegalArgumentException` instead. This check runs
        // unconditionally at launch, before sign-in, so an escaping exception would crash
        // the app rather than fail open, which is the one thing this gate must never do.
        // The iOS twin already collapses every error; this makes the guarantee symmetric.
        val (status, payload) = runCatching { fetcher.fetch(url, "GET", "", null) }.getOrNull()
            ?: return MinVersionGateResult.Unavailable

        if (status !in 200..299) return MinVersionGateResult.Unavailable

        val json = runCatching { JSONObject(payload) }.getOrNull()
            ?: return MinVersionGateResult.Unavailable

        if (!json.optBoolean("update_required", false)) return MinVersionGateResult.Ok

        val minimumVersion = json.optString("minimum_version").takeIf { it.isNotBlank() && it != "null" }
            ?: return MinVersionGateResult.Unavailable

        return MinVersionGateResult.UpdateRequired(minimumVersion)
    }
}
