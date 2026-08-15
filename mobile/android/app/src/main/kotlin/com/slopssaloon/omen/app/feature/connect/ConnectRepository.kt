package com.slopssaloon.omen.app.feature.connect

import com.slopssaloon.omen.app.feature.api.OmenApiClient
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.app.feature.api.OmenApiResult
import org.json.JSONObject
import java.util.Calendar

/**
 * M5-NativeConnect — the Sleeper connect seam. iOS mirror: `App/Connect/ConnectRepository.swift`.
 *
 * Two shipped authenticated routes:
 * - `POST /api/platforms/sleeper/resolve` — username → account + leagues
 * - `POST /api/platforms/sleeper/connect` — bind a chosen league
 */
interface ConnectRepository {
    suspend fun resolveSleeper(username: String, accessToken: String): Result<ResolvedSleeperAccount>
    suspend fun connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String,
    ): Result<Unit>
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
                val id = row.optString("id").takeIf { it.isNotEmpty() } ?: continue
                add(
                    SleeperLeague(
                        id = id,
                        // `sleeperLeagueSummary()` returns name/team_name nullable — a drifting
                        // roster lookup still yields the league. An unnamed league gets a
                        // neutral label rather than an unidentifiable empty row.
                        name = row.optString("name").takeIf { it.isNotEmpty() && it != "null" }
                            ?: "Untitled league",
                        season = row.optInt("season")
                            .takeIf { it > 0 } ?: Calendar.getInstance().get(Calendar.YEAR),
                        scoringFormat = row.optString("scoring_format")
                            .takeIf { it.isNotEmpty() && it != "null" },
                        teamName = row.optString("team_name")
                            .takeIf { it.isNotEmpty() && it != "null" },
                    ),
                )
            }
        }
        ResolvedSleeperAccount(username = root.optString("username"), leagues = leagues)
    }.getOrNull()
}

/** Test double. Records request ids so tests can prove idempotency behavior. */
class StubConnectRepository(
    private val resolveResult: Result<ResolvedSleeperAccount> =
        Result.failure(ConnectException(ConnectFailure.Network)),
    private val connectResult: Result<Unit> =
        Result.failure(ConnectException(ConnectFailure.Network)),
) : ConnectRepository {
    val requestIds = mutableListOf<String>()

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
