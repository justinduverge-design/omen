package com.slopssaloon.omen.app.feature.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * M5-Native-API-Client slice A — the shared product API transport. iOS mirror:
 * `App/Api/OmenApiClient.swift`.
 *
 * Follows the shape already proven by [com.slopssaloon.omen.app.auth.OkHttpAccountRepository]:
 * base URL from `AppEnvironment`, bearer from the stored session, typed outcome, and `org.json`
 * rather than a serialization dependency. This is the only place that knows how an Omen API
 * request is assembled.
 */
sealed interface OmenApiError {
    /** Transport never completed — offline, DNS, TLS, timeout. */
    data object Network : OmenApiError

    /** 401/403. Routing this to re-auth belongs to the caller, not this layer. */
    data object Unauthorized : OmenApiError

    /** Any other non-2xx. Carries the status so callers can log a code without a body. */
    data class Server(val status: Int) : OmenApiError

    /** 2xx with a body this app cannot read as the declared contract. */
    data object Decode : OmenApiError
}

/** Success or a typed failure. Mirrors the Swift `Result<T, OmenApiError>` call sites. */
sealed interface OmenApiResult<out T> {
    data class Success<T>(val value: T) : OmenApiResult<T>
    data class Failure(val error: OmenApiError) : OmenApiResult<Nothing>

    fun successOrNull(): T? = (this as? Success)?.value
}

/**
 * Seam for tests: returns the HTTP status and raw body for a request, or null on transport
 * failure. Keeps the fakes in tests readable without a MockWebServer dependency.
 */
fun interface OmenHttpFetcher {
    suspend fun fetch(url: String, method: String, accessToken: String?, body: String?): Pair<Int, String>?
}

class OkHttpFetcher(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .callTimeout(20, TimeUnit.SECONDS)
        .build(),
) : OmenHttpFetcher {
    private val jsonMedia = "application/json".toMediaType()

    override suspend fun fetch(
        url: String,
        method: String,
        accessToken: String?,
        body: String?,
    ): Pair<Int, String>? = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url)
            .addHeader("Accept", "application/json")
            .apply {
                // The bearer is set here and nowhere else. It is never logged, never placed in
                // a URL, and never included in an error value — OmenApiError carries a status
                // only. Omitted entirely when absent: `POST /api/trade/compare` is free and
                // public and answers an unauthenticated caller with a 200 neutral result, and
                // `Authorization: Bearer ` with an empty value is a malformed header.
                if (!accessToken.isNullOrEmpty()) addHeader("Authorization", "Bearer $accessToken")
            }
            .apply {
                if (method == "POST") post((body ?: "{}").toRequestBody(jsonMedia)) else get()
            }
            .build()

        try {
            client.newCall(request).execute().use { response ->
                response.code to (response.body?.string().orEmpty())
            }
        } catch (_: IOException) {
            null
        }
    }
}

/** Reads authenticated Omen product routes. */
class OmenApiClient(
    apiBaseUrl: String,
    private val fetcher: OmenHttpFetcher = OkHttpFetcher(),
) {
    private val base = apiBaseUrl.trimEnd('/')

    /**
     * Authenticated GET returning a decoded contract payload. [path] is contract-relative and
     * must not start with a slash, matching `OkHttpAccountRepository`'s URL construction.
     */
    suspend fun <T> get(path: String, accessToken: String, decode: (String) -> T?): OmenApiResult<T> =
        send(path, "GET", accessToken, null, decode)

    /** Authenticated POST. The live Omen route is called with `{}` per the gated contract. */
    suspend fun <T> post(
        path: String,
        accessToken: String,
        body: String = "{}",
        decode: (String) -> T?,
    ): OmenApiResult<T> = send(path, "POST", accessToken, body, decode)

    /**
     * POST where the token is genuinely optional — see the header note in [OkHttpFetcher].
     * iOS mirror: `post(_:optionalAccessToken:body:as:)`.
     */
    suspend fun <T> postOptionalAuth(
        path: String,
        accessToken: String?,
        body: String = "{}",
        decode: (String) -> T?,
    ): OmenApiResult<T> = send(path, "POST", accessToken, body, decode)

    /**
     * GET where the token is genuinely optional, with query parameters.
     * iOS mirror: `get(_:optionalAccessToken:query:as:)`.
     *
     * [query] values are percent-encoded here and nowhere else. Interpolating them into [path]
     * would appear to work on this platform — URLs are assembled by string concatenation in
     * [send] — right up until a player name contains a space or an `&`. iOS had the mirror-image
     * bug for the mirror-image reason: `URL.appendingPathComponent` encoded the whole
     * `search?q=…` string as ONE path segment and 404'd every request. Neither client should
     * ever hand-build a query string again.
     */
    suspend fun <T> getOptionalAuth(
        path: String,
        accessToken: String?,
        query: Map<String, String> = emptyMap(),
        decode: (String) -> T?,
    ): OmenApiResult<T> = send(pathWithQuery(path, query), "GET", accessToken, null, decode)

    private fun pathWithQuery(path: String, query: Map<String, String>): String {
        if (query.isEmpty()) return path
        val encoded = query.entries.joinToString("&") { (key, value) ->
            "${URLEncoder.encode(key, "UTF-8")}=${URLEncoder.encode(value, "UTF-8")}"
        }
        return "$path?$encoded"
    }

    private suspend fun <T> send(
        path: String,
        method: String,
        accessToken: String?,
        body: String?,
        decode: (String) -> T?,
    ): OmenApiResult<T> {
        val response = fetcher.fetch("$base/$path", method, accessToken, body)
            ?: return OmenApiResult.Failure(OmenApiError.Network)
        val (status, payload) = response

        return when {
            status in 200..299 -> {
                val decoded = runCatching { decode(payload) }.getOrNull()
                if (decoded == null) {
                    OmenApiResult.Failure(OmenApiError.Decode)
                } else {
                    OmenApiResult.Success(decoded)
                }
            }
            status == 401 || status == 403 -> OmenApiResult.Failure(OmenApiError.Unauthorized)
            else -> OmenApiResult.Failure(OmenApiError.Server(status))
        }
    }
}
