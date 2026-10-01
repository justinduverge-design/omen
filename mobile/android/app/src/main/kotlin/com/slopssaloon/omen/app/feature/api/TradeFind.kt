package com.slopssaloon.omen.app.feature.api

import org.json.JSONArray
import org.json.JSONObject

// ---------------------------------------------------------------------------------------------
// T3, "reviewing what Omen found" — the Compose half.
//
// `GET /api/trade/find` -> `trade-find.v1`. Built against the documented shape read from
// `src/services/tradeFind.js` (`buildCandidateRecord` / `findLeagueTradeCandidates`) and
// `src/routes/trade.js`'s `/find` handler, on the open, unmerged `feat/t2-find-a-trade-generator`
// branch -- read-only reference per this task's brief. The route is not on `main` yet; this is
// the same build-ahead-of-merge practice `ApiTradeRepository`/`TradeCompare.kt` already establish
// for `trade-compare.v2` and `trade-roster.v1`. iOS mirror: `App/Api/TradeFind.swift`.
//
// Screen contract: `Blueprints/specs/design/screen-contracts/TradeFindReview-v1.md`.
// ---------------------------------------------------------------------------------------------

/** One side of a candidate offer. iOS mirror: `TradeFindPlayer`. */
data class TradeFindPlayer(
    val name: String,
    val position: String?,
    val team: String?,
    val playerKey: String?,
    val projectedPoints: Double?,
) {
    /** "WR - MIA", position alone, team alone, or "Unranked" -- never "WR - undefined". */
    val meta: String
        get() = when {
            !position.isNullOrEmpty() && !team.isNullOrEmpty() -> "$position · $team"
            !position.isNullOrEmpty() -> position
            !team.isNullOrEmpty() -> team
            else -> "Unranked"
        }

    /** "14.8 pts", or "--" where no projection exists -- never a fabricated number. */
    val pointsLabel: String
        get() = projectedPoints?.takeIf { it.isFinite() }?.let { "%.1f pts".format(it) } ?: "—"

    companion object {
        fun parse(json: JSONObject): TradeFindPlayer = TradeFindPlayer(
            name = json.optStringOrNull("name") ?: "Unknown",
            position = json.optStringOrNull("position"),
            team = json.optStringOrNull("team"),
            playerKey = json.optStringOrNull("player_key"),
            projectedPoints = if (json.has("projected_points") && !json.isNull("projected_points")) {
                json.optDouble("projected_points")
            } else {
                null
            },
        )
    }
}

/** `needEvidenceFor`'s own four statuses, decoded verbatim and never re-derived on the client. */
data class TradeFindNeed(val status: String, val have: Int?, val required: Int?) {
    companion object {
        fun parse(json: JSONObject?): TradeFindNeed {
            if (json == null) return TradeFindNeed("not_tracked", null, null)
            return TradeFindNeed(
                status = json.optStringOrNull("status") ?: "not_tracked",
                have = if (json.has("have") && !json.isNull("have")) json.optInt("have") else null,
                required = if (json.has("required") && !json.isNull("required")) json.optInt("required") else null,
            )
        }
    }
}

data class TradeFindPositionNeed(val position: String, val need: TradeFindNeed) {
    companion object {
        fun parse(json: JSONObject?): TradeFindPositionNeed {
            if (json == null) return TradeFindPositionNeed("UNK", TradeFindNeed("not_tracked", null, null))
            return TradeFindPositionNeed(
                position = json.optStringOrNull("position") ?: "UNK",
                need = TradeFindNeed.parse(json.optJSONObject("need")),
            )
        }
    }
}

/**
 * One candidate's full reasoning, decoded and re-encoded **verbatim**. This file never computes
 * a new value from it -- only reads it for display and forwards it unchanged to the save
 * interface -- per the contract's data-binding note that `reasoning` is passed "byte-for-byte
 * from the T2 response -- never regenerated client-side" and T4's own rule that reasoning is
 * "retained verbatim... not regenerated at read time."
 */
data class TradeFindReasoning(
    val fillsNeedFor: List<String>,
    val userReceives: TradeFindPositionNeed,
    val opponentReceives: TradeFindPositionNeed,
    val evidence: List<String>,
) {
    companion object {
        fun parse(json: JSONObject?): TradeFindReasoning {
            if (json == null) {
                return TradeFindReasoning(
                    emptyList(),
                    TradeFindPositionNeed.parse(null),
                    TradeFindPositionNeed.parse(null),
                    emptyList(),
                )
            }
            return TradeFindReasoning(
                fillsNeedFor = json.optJSONArray("fills_need_for").toStringList(),
                userReceives = TradeFindPositionNeed.parse(json.optJSONObject("user_receives")),
                opponentReceives = TradeFindPositionNeed.parse(json.optJSONObject("opponent_receives")),
                evidence = json.optJSONArray("evidence").toStringList(),
            )
        }
    }
}

/** One trade candidate -- `buildCandidateRecord`'s own shape. */
data class TradeFindCandidate(
    val id: String,
    val opponentTeamId: String?,
    val opponentTeamName: String?,
    val give: TradeFindPlayer,
    val receive: TradeFindPlayer,
    val userLineupDelta: Double?,
    val opponentLineupDelta: Double?,
    val reasoning: TradeFindReasoning,
) {
    /**
     * "vs Davante's Inferno", or the honest fallback the data-binding notes call for --
     * `buildCandidateRecord` allows `opponent_team_name` to be null.
     */
    val opponentDisplayName: String
        get() = opponentTeamName?.trim()?.takeIf { it.isNotEmpty() } ?: "another team in your league"

    companion object {
        fun parse(json: JSONObject): TradeFindCandidate = TradeFindCandidate(
            id = json.optStringOrNull("id") ?: java.util.UUID.randomUUID().toString(),
            opponentTeamId = json.optStringOrNull("opponent_team_id"),
            opponentTeamName = json.optStringOrNull("opponent_team_name"),
            give = TradeFindPlayer.parse(json.optJSONObject("give") ?: JSONObject()),
            receive = TradeFindPlayer.parse(json.optJSONObject("receive") ?: JSONObject()),
            userLineupDelta = if (json.has("user_lineup_delta") && !json.isNull("user_lineup_delta")) {
                json.optDouble("user_lineup_delta")
            } else {
                null
            },
            opponentLineupDelta = if (json.has("opponent_lineup_delta") && !json.isNull("opponent_lineup_delta")) {
                json.optDouble("opponent_lineup_delta")
            } else {
                null
            },
            reasoning = TradeFindReasoning.parse(json.optJSONObject("reasoning")),
        )
    }
}

data class TradeFindDegradedTeam(val teamId: String?, val teamName: String?, val reason: String?) {
    companion object {
        fun parse(json: JSONObject): TradeFindDegradedTeam = TradeFindDegradedTeam(
            teamId = json.optStringOrNull("team_id"),
            teamName = json.optStringOrNull("team_name"),
            reason = json.optStringOrNull("reason"),
        )
    }
}

/** `GET /api/trade/find` -> `trade-find.v1`. iOS mirror: `TradeFindResponse`. */
data class TradeFindResponse(
    val contractVersion: String,
    /** `"ok"` | `"degraded"` | `"unavailable"`. */
    val status: String,
    val platform: String,
    val leagueId: String?,
    val teamId: String?,
    val week: Int?,
    /** Present only when `status == "unavailable"`. */
    val reason: String?,
    val teamsConsidered: Int,
    val teamsSkippedForCap: List<TradeFindDegradedTeam>,
    val degradedTeams: List<TradeFindDegradedTeam>,
    val budgetExceeded: Boolean,
    val candidates: List<TradeFindCandidate>,
) {
    /**
     * Acceptance check: "the degraded banner renders if and only if `degraded_teams.length > 0
     * || bounds.teams_skipped_for_cap.length > 0 || budget_exceeded === true`".
     */
    val showsDegradedBanner: Boolean
        get() = degradedTeams.isNotEmpty() || teamsSkippedForCap.isNotEmpty() || budgetExceeded

    /**
     * The reconstructed total of every OTHER team Omen categorized this scan -- scanned, capped,
     * or degraded -- for "5 of 6 teams scanned". Not a server field on its own: `teams_considered`
     * and the two skip/degrade counts are, and their sum is the honest total.
     */
    val totalOtherTeams: Int
        get() = teamsConsidered + teamsSkippedForCap.size + degradedTeams.size

    companion object {
        fun parse(raw: String): TradeFindResponse? = runCatching {
            val root = JSONObject(raw)
            val bounds = root.optJSONObject("bounds")
            TradeFindResponse(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                status = root.optStringOrNull("status") ?: "unavailable",
                platform = root.optStringOrNull("platform").orEmpty(),
                leagueId = root.optStringOrNull("league_id"),
                teamId = root.optStringOrNull("team_id"),
                week = if (root.has("week") && !root.isNull("week")) root.optInt("week") else null,
                reason = root.optStringOrNull("reason"),
                teamsConsidered = bounds?.optInt("teams_considered") ?: 0,
                teamsSkippedForCap = bounds?.optJSONArray("teams_skipped_for_cap").toObjectList(TradeFindDegradedTeam::parse),
                degradedTeams = root.optJSONArray("degraded_teams").toObjectList(TradeFindDegradedTeam::parse),
                budgetExceeded = root.optBoolean("budget_exceeded", false),
                candidates = root.optJSONArray("candidates").toObjectList(TradeFindCandidate::parse),
            )
        }.getOrNull()
    }
}

private fun JSONArray?.toStringList(): List<String> {
    if (this == null) return emptyList()
    return buildList {
        for (i in 0 until length()) {
            optString(i, null)?.let { add(it) }
        }
    }
}

private fun <T> JSONArray?.toObjectList(parse: (JSONObject) -> T): List<T> {
    if (this == null) return emptyList()
    return buildList {
        for (i in 0 until length()) {
            optJSONObject(i)?.let { add(parse(it)) }
        }
    }
}

// MARK: - Save action (T4 does not exist yet)

/**
 * The interface this screen calls, per the contract's "Save action interface":
 * `save_action(candidate_id, reasoning) -> { status: "saved" | "error" }`.
 *
 * TODO(T4): wire to a real save/persist endpoint once `T4-SavedTradeQueue` builds one. This
 * screen's own "do not touch" line is explicit -- it must not build a save/persist mechanism
 * itself -- so the only implementation shipped here is a local stub with no network call.
 */
interface TradeFindSaveAction {
    suspend fun save(candidateId: String, reasoning: TradeFindReasoning): TradeFindSaveOutcome
}

enum class TradeFindSaveOutcome { Saved, Error }

/** TODO(T4): replace with a real repository call once the save/queue endpoint exists. */
class StubTradeFindSaveAction(private val outcome: TradeFindSaveOutcome = TradeFindSaveOutcome.Saved) : TradeFindSaveAction {
    override suspend fun save(candidateId: String, reasoning: TradeFindReasoning): TradeFindSaveOutcome = outcome
}

// MARK: - Repository

/**
 * Deliberately its own interface rather than an addition to [TradeRepository] (`Repositories.kt`)
 * -- `/find` is a new, unmerged route with its own contract version, and this keeps T3 from
 * touching a file the rest of the Trade destination shares.
 */
interface TradeFindRepository {
    suspend fun find(
        platform: String,
        leagueId: String,
        teamId: String,
        week: Int?,
        accessToken: String,
    ): OmenApiResult<TradeFindResponse>
}

class ApiTradeFindRepository(private val client: OmenApiClient) : TradeFindRepository {
    override suspend fun find(
        platform: String,
        leagueId: String,
        teamId: String,
        week: Int?,
        accessToken: String,
    ): OmenApiResult<TradeFindResponse> {
        val query = buildMap {
            put("platform", platform)
            put("league_id", leagueId)
            put("team_id", teamId)
            week?.let { put("week", it.toString()) }
        }
        return client.getOptionalAuth("api/trade/find", accessToken, query, TradeFindResponse::parse)
    }
}

class StubTradeFindRepository(private val result: OmenApiResult<TradeFindResponse>) : TradeFindRepository {
    override suspend fun find(
        platform: String,
        leagueId: String,
        teamId: String,
        week: Int?,
        accessToken: String,
    ): OmenApiResult<TradeFindResponse> = result
}
