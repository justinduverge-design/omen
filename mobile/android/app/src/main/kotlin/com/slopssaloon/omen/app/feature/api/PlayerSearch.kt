package com.slopssaloon.omen.app.feature.api

import org.json.JSONArray

/**
 * `GET /api/players/search` -> `players-search.v1`. iOS mirror: `App/Api/PlayerSearch.swift`.
 *
 * The Trade destination shipped on both platforms with a bare text field: the user typed a name
 * freehand and pressed Add. **This route already existed** — documented in `api-routes.md` as
 * "Free Trade Analyzer autocomplete", public Sleeper data, no auth, max 10 rows — and neither
 * native client ever called it. The founder found it in the first minutes of real use:
 * *"players' names don't pop up... it's like the page wasn't wired."* He was right.
 *
 * Same defect class as `F-SCR-01`: a capability the backend already serves that the native
 * clients do not consume.
 */
data class PlayerSearchResult(
    val id: String,
    val name: String,
    val position: String?,
    val team: String?,
    /** Present only for a correction candidate, never an automatic identity resolution. */
    val matchType: String? = null,
) {
    val isFuzzySuggestion: Boolean get() = matchType == "fuzzy"
    /**
     * "WR - MIN", omitted entirely when the provider gives neither rather than rendering a
     * stray separator against an empty half.
     */
    val subtitle: String?
        get() {
            val parts = listOfNotNull(position, team).map { it.trim() }.filter { it.isNotEmpty() }
            return if (parts.isEmpty()) null else parts.joinToString(" \u00B7 ")
        }

    companion object {
        /**
         * The payload is a bare array. A row missing `id` or `name` is skipped rather than
         * failing the whole list — one malformed player must not blank the picker.
         */
        fun parseList(json: String): List<PlayerSearchResult>? = runCatching {
            val array = JSONArray(json)
            (0 until array.length()).mapNotNull { index ->
                val row = array.optJSONObject(index) ?: return@mapNotNull null
                val id = row.optString("id").takeIf { it.isNotEmpty() } ?: return@mapNotNull null
                val name = row.optString("name").takeIf { it.isNotEmpty() } ?: return@mapNotNull null
                PlayerSearchResult(
                    id = id,
                    name = name,
                    position = row.optString("position").takeIf { it.isNotEmpty() },
                    team = row.optString("team").takeIf { it.isNotEmpty() },
                    matchType = row.optString("match_type").takeIf { it.isNotEmpty() },
                )
            }
        }.getOrNull()
    }
}

interface PlayerSearchRepository {
    suspend fun search(query: String): OmenApiResult<List<PlayerSearchResult>>
}

class ApiPlayerSearchRepository(private val client: OmenApiClient) : PlayerSearchRepository {
    override suspend fun search(query: String): OmenApiResult<List<PlayerSearchResult>> {
        val trimmed = query.trim()
        // Below the minimum the route would 400. Answering locally keeps a one-character
        // keystroke from spending one of the 30-per-minute-per-IP budget.
        if (trimmed.length < MIN_QUERY_LENGTH) return OmenApiResult.Success(emptyList())

        // Public route — no bearer, same posture as `POST /api/trade/compare`.
        return client.getOptionalAuth(
            path = "api/players/search",
            accessToken = null,
            query = mapOf("q" to trimmed),
            decode = PlayerSearchResult::parseList,
        )
    }

    companion object {
        const val MIN_QUERY_LENGTH = 2
    }
}

class StubPlayerSearchRepository(
    private val result: OmenApiResult<List<PlayerSearchResult>>,
) : PlayerSearchRepository {
    override suspend fun search(query: String): OmenApiResult<List<PlayerSearchResult>> = result
}
