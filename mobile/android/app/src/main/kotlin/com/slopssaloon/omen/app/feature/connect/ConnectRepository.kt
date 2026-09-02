package com.slopssaloon.omen.app.feature.connect

import com.slopssaloon.omen.app.feature.api.OmenApiClient
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.app.feature.api.OmenApiResult
import com.slopssaloon.omen.app.feature.api.optStringOrNull
import org.json.JSONObject
import java.util.Calendar

/**
 * M5-NativeConnect — the native connect seam. iOS mirror: `App/Connect/ConnectRepository.swift`.
 *
 * Sleeper (username → leagues → bind):
 * - `POST /api/platforms/sleeper/resolve`
 * - `POST /api/platforms/sleeper/connect`
 *
 * Yahoo (browser OAuth → leagues → bind). Every route already shipped; the client half is what
 * was missing:
 * - `POST /api/yahoo/auth` with `native_return: true` → `{ url }`, and the server's callback
 *   redirects to `com.slopssaloon.omen://auth/callback?status=connected|cancelled`
 * - `GET  /api/yahoo/leagues`
 * - `POST /api/yahoo/league`
 */
interface ConnectRepository {
    suspend fun resolveSleeper(username: String, accessToken: String): Result<ResolvedSleeperAccount>
    suspend fun connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String,
    ): Result<Unit>

    /**
     * Starts a Yahoo authorization and returns the URL to open in the system browser.
     *
     * The CSRF `state` is minted and stored server-side against the user's `oauth_state` row
     * and consumed on callback, so the client neither generates nor validates it. Asking for
     * `native_return` is what makes the callback come back to the app scheme, not the website.
     */
    suspend fun startYahooAuthorization(accessToken: String): Result<String>

    /**
     * The leagues Yahoo will let Omen read for this user. Also the connection proof: it can
     * only answer once tokens are actually stored, which is why the app confirms with this
     * rather than trusting the `status=connected` it was handed on a deep link.
     */
    suspend fun yahooLeagues(accessToken: String): Result<List<YahooLeague>>

    /** Binds the chosen league to the Yahoo connection. */
    suspend fun bindYahooLeague(id: String, accessToken: String): Result<Unit>
}

/** Carries a [ConnectFailure] so callers get actionable copy rather than a raw throwable. */
class ConnectException(val failure: ConnectFailure) : Exception(failure.message)

class ApiConnectRepository(private val client: OmenApiClient) : ConnectRepository {

    override suspend fun resolveSleeper(
        username: String,
        accessToken: String,
    ): Result<ResolvedSleeperAccount> {
        val body = JSONObject().put("sleeper_username", username).toString()
        return when (
            val result = client.post("api/platforms/sleeper/resolve", accessToken, body, ::parseResolve)
        ) {
            is OmenApiResult.Success -> {
                val account = result.value
                if (account.leagues.isEmpty()) {
                    Result.failure(ConnectException(ConnectFailure.NoLeaguesForSeason))
                } else {
                    Result.success(account.copy(username = account.username.ifEmpty { username }))
                }
            }
            // The route answers 400 for an unknown username specifically; other 4xx are still
            // a rejection from the user's point of view.
            is OmenApiResult.Failure ->
                Result.failure(ConnectException(map(result.error, ConnectFailure.UsernameNotFound)))
        }
    }

    override suspend fun connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String,
    ): Result<Unit> {
        val body = JSONObject()
            .put("sleeper_username", username)
            .put("league_id", leagueId)
            // Spec §7: idempotent connect. The backend replays a completed request for ten
            // minutes and 409s an in-flight duplicate, so an app resume or double-tap cannot
            // create a second connection.
            .put("request_id", requestId)
            .toString()

        return when (
            val result = client.post("api/platforms/sleeper/connect", accessToken, body) { it }
        ) {
            is OmenApiResult.Success -> Result.success(Unit)
            is OmenApiResult.Failure -> {
                val error = result.error
                val failure = if (error is OmenApiError.Server && error.status == 409) {
                    ConnectFailure.AlreadyInProgress
                } else {
                    map(error, ConnectFailure.Server)
                }
                Result.failure(ConnectException(failure))
            }
        }
    }

    // ---- Yahoo ----

    override suspend fun startYahooAuthorization(accessToken: String): Result<String> {
        val body = JSONObject().put("native_return", true).toString()
        return when (val result = client.post("api/yahoo/auth", accessToken, body, ::parseAuthUrl)) {
            is OmenApiResult.Success -> Result.success(result.value)
            is OmenApiResult.Failure -> {
                val error = result.error
                // 503 is `requireYahooEnabled` — the Fantasy Sports API entitlement is off.
                // A product state with its own sentence, not "a problem on our side".
                val failure = if (error is OmenApiError.Server && error.status == 503) {
                    ConnectFailure.ProviderUnavailable
                } else {
                    map(error, ConnectFailure.Server)
                }
                Result.failure(ConnectException(failure))
            }
        }
    }

    override suspend fun yahooLeagues(accessToken: String): Result<List<YahooLeague>> =
        when (val result = client.get("api/yahoo/leagues", accessToken, ::parseYahooLeagues)) {
            is OmenApiResult.Success ->
                if (result.value.isEmpty()) {
                    Result.failure(ConnectException(ConnectFailure.NoLeaguesForSeason))
                } else {
                    Result.success(result.value)
                }
            // The route answers 401 for `yahoo_token_expired` — from the user's point of view
            // that is "Yahoo didn't finish connecting", not "your Omen session died". Routing
            // it to re-auth would sign out a good Omen session over a Yahoo problem.
            is OmenApiResult.Failure -> Result.failure(
                ConnectException(
                    if (result.error is OmenApiError.Unauthorized) {
                        ConnectFailure.ProviderNotConnected
                    } else {
                        map(result.error, ConnectFailure.ProviderNotConnected)
                    },
                ),
            )
        }

    override suspend fun bindYahooLeague(id: String, accessToken: String): Result<Unit> {
        val body = JSONObject().put("leagueId", id).toString()
        return when (val result = client.post("api/yahoo/league", accessToken, body) { it }) {
            is OmenApiResult.Success -> Result.success(Unit)
            is OmenApiResult.Failure -> Result.failure(
                ConnectException(
                    if (result.error is OmenApiError.Unauthorized) {
                        ConnectFailure.ProviderNotConnected
                    } else {
                        map(result.error, ConnectFailure.Server)
                    },
                ),
            )
        }
    }

    /**
     * Never hands an arbitrary string to the browser. A non-http(s) answer means something is
     * wrong on our side, not the user's, so it decodes to null and surfaces as a server error.
     */
    private fun parseAuthUrl(json: String): String? = runCatching {
        JSONObject(json).optString("url").takeIf { it.startsWith("https://") || it.startsWith("http://") }
    }.getOrNull()

    private fun parseYahooLeagues(json: String): List<YahooLeague>? = runCatching {
        val rows = JSONObject(json).optJSONArray("leagues")
        buildList {
            for (i in 0 until (rows?.length() ?: 0)) {
                val row = rows?.optJSONObject(i) ?: continue
                val id = row.optStringOrNull("league_id") ?: continue
                add(
                    YahooLeague(
                        id = id,
                        // `getUserLeagues()` returns name/season nullable — a Yahoo payload
                        // shape that drifts still yields the league key, which is the only
                        // field the bind needs.
                        name = row.optStringOrNull("name")
                            ?: "Untitled league",
                        season = row.optInt("season").takeIf { it > 0 },
                    ),
                )
            }
        }
    }.getOrNull()

    private fun map(error: OmenApiError, notFoundMeans: ConnectFailure): ConnectFailure = when (error) {
        is OmenApiError.Network -> ConnectFailure.Network
        is OmenApiError.Unauthorized, is OmenApiError.Decode -> ConnectFailure.Server
        is OmenApiError.Server -> if (error.status in 400..499) notFoundMeans else ConnectFailure.Server
    }

    private fun parseResolve(json: String): ResolvedSleeperAccount? = runCatching {
        val root = JSONObject(json)
        val rows = root.optJSONArray("leagues")
        val leagues = buildList {
            for (i in 0 until (rows?.length() ?: 0)) {
                val row = rows?.optJSONObject(i) ?: continue
                val id = row.optStringOrNull("id") ?: continue
                add(
                    SleeperLeague(
                        id = id,
                        // `sleeperLeagueSummary()` returns name/team_name nullable — a drifting
                        // roster lookup still yields the league. An unnamed league gets a
                        // neutral label rather than an unidentifiable empty row.
                        name = row.optStringOrNull("name")
                            ?: "Untitled league",
                        season = row.optInt("season")
                            .takeIf { it > 0 } ?: Calendar.getInstance().get(Calendar.YEAR),
                        scoringFormat = row.optStringOrNull("scoring_format"),
                        teamName = row.optStringOrNull("team_name"),
                    ),
                )
            }
        }
        ResolvedSleeperAccount(username = root.optStringOrNull("username").orEmpty(), leagues = leagues)
    }.getOrNull()
}

/** Test double. Records request ids so tests can prove idempotency behavior. */
class StubConnectRepository(
    private val resolveResult: Result<ResolvedSleeperAccount> =
        Result.failure(ConnectException(ConnectFailure.Network)),
    private val connectResult: Result<Unit> =
        Result.failure(ConnectException(ConnectFailure.Network)),
    private val yahooAuthResult: Result<String> =
        Result.failure(ConnectException(ConnectFailure.Network)),
    private val yahooLeaguesResult: Result<List<YahooLeague>> =
        Result.failure(ConnectException(ConnectFailure.Network)),
    private val yahooBindResult: Result<Unit> =
        Result.failure(ConnectException(ConnectFailure.Network)),
) : ConnectRepository {
    val requestIds = mutableListOf<String>()
    val boundYahooLeagueIds = mutableListOf<String>()

    override suspend fun startYahooAuthorization(accessToken: String) = yahooAuthResult

    override suspend fun yahooLeagues(accessToken: String) = yahooLeaguesResult

    override suspend fun bindYahooLeague(id: String, accessToken: String): Result<Unit> {
        boundYahooLeagueIds.add(id)
        return yahooBindResult
    }

    override suspend fun resolveSleeper(username: String, accessToken: String) = resolveResult

    override suspend fun connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String,
    ): Result<Unit> {
        requestIds.add(requestId)
        return connectResult
    }
}
