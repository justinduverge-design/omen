package com.slopssaloon.omen.app.feature.api

import org.json.JSONObject

/**
 * `GET /api/leagues` → `league-directory.v1` and `POST /api/leagues/active` →
 * `league-active-selection.v1`. iOS mirror: `App/Api/LeagueDirectory.swift`.
 *
 * Serves the approved team/league switcher sheet (visual briefs §10.2). Until this
 * existed, `OmenContextStrip` could render a switch affordance with nothing behind it —
 * and in the real app `onSwitchContext` was never passed, so the control did not render
 * at all and a user with a connected league had no way to choose it.
 *
 * Every field except the platform key is nullable, for the reason already recorded on
 * [MovesHistory]: the server emits `null` per field rather than omitting the object.
 * `leagueName` is null for an ESPN league because ESPN exposes no league list, and
 * `scoringFormat` is null for Yahoo because its rules are unreadable. Treating either as
 * required would turn an ordinary honest response into a decode failure.
 */
data class LeagueDirectory(
    val contractVersion: String?,
    val season: Int?,
    /**
     * `"explicit"` once the reviewed selection column is applied, `"provider_binding_only"`
     * until then. Read so the sheet never promises a cross-provider choice the server has
     * told us it cannot yet persist.
     */
    val selectionPersistence: String?,
    val active: Active?,
    val platforms: List<PlatformGroup>,
) {
    data class Active(
        val platform: String?,
        val leagueId: String?,
        val leagueName: String?,
        val teamId: String?,
        val teamName: String?,
        val scoringFormat: String?,
    )

    data class PlatformGroup(
        val platform: String,
        /** `"connected"`, `"reconnect_required"`, or `"not_connected"`. */
        val connectionState: String?,
        /** `"full"`, `"bound_only"`, or `"unavailable"`. ESPN is always `bound_only`. */
        val discovery: String?,
        /**
         * Server-authored explanation for a partial or empty group. Rendered verbatim — the
         * app must not invent its own reason for a provider's state.
         */
        val notice: String?,
        val leagues: List<League>,
    )

    data class League(
        val leagueId: String,
        val leagueName: String?,
        val season: Int?,
        val scoringFormat: String?,
        val teamId: String?,
        val teamName: String?,
        val isActive: Boolean,
    )

    companion object {
        fun parse(json: String): LeagueDirectory? = runCatching {
            val root = JSONObject(json)
            val groupsJson = root.optJSONArray("platforms")
            val groups = buildList {
                for (i in 0 until (groupsJson?.length() ?: 0)) {
                    val group = groupsJson?.optJSONObject(i) ?: continue
                    // A group with no platform key has no stable identity and is dropped
                    // rather than rendered under an invented heading.
                    val platform = group.optStringOrNull("platform") ?: continue
                    val leaguesJson = group.optJSONArray("leagues")
                    val leagues = buildList {
                        for (j in 0 until (leaguesJson?.length() ?: 0)) {
                            val row = leaguesJson?.optJSONObject(j) ?: continue
                            val id = row.optStringOrNull("league_id") ?: continue
                            add(
                                League(
                                    leagueId = id,
                                    leagueName = row.optStringOrNull("league_name"),
                                    season = row.optIntOrNull("season"),
                                    scoringFormat = row.optStringOrNull("scoring_format"),
                                    teamId = row.optStringOrNull("team_id"),
                                    teamName = row.optStringOrNull("team_name"),
                                    isActive = row.optBoolean("is_active", false),
                                ),
                            )
                        }
                    }
                    add(
                        PlatformGroup(
                            platform = platform,
                            connectionState = group.optStringOrNull("connection_state"),
                            discovery = group.optStringOrNull("discovery"),
                            notice = group.optStringOrNull("notice"),
                            leagues = leagues,
                        ),
                    )
                }
            }

            val activeJson = root.optJSONObject("active")
            LeagueDirectory(
                contractVersion = root.optStringOrNull("contract_version"),
                season = root.optIntOrNull("season"),
                selectionPersistence = root.optStringOrNull("selection_persistence"),
                active = activeJson?.let {
                    Active(
                        platform = it.optStringOrNull("platform"),
                        leagueId = it.optStringOrNull("league_id"),
                        leagueName = it.optStringOrNull("league_name"),
                        teamId = it.optStringOrNull("team_id"),
                        teamName = it.optStringOrNull("team_name"),
                        scoringFormat = it.optStringOrNull("scoring_format"),
                    )
                },
                platforms = groups,
            )
        }.getOrNull()
    }
}

/** `POST /api/leagues/active` → `league-active-selection.v1`. */
data class LeagueSelectionResult(
    val contractVersion: String?,
    val selectionPersistence: String?,
    val activePlatform: String?,
    val activeLeagueId: String?,
    /**
     * §10.3: the surfaces the caller must re-read after switching. Carried rather than
     * hardcoded client-side so the server stays the authority on what a switch affects.
     */
    val refresh: List<String>,
) {
    companion object {
        fun parse(json: String): LeagueSelectionResult? = runCatching {
            val root = JSONObject(json)
            val active = root.optJSONObject("active")
            val refreshJson = root.optJSONArray("refresh")
            LeagueSelectionResult(
                contractVersion = root.optStringOrNull("contract_version"),
                selectionPersistence = root.optStringOrNull("selection_persistence"),
                activePlatform = active?.optStringOrNull("platform"),
                activeLeagueId = active?.optStringOrNull("league_id"),
                refresh = buildList {
                    for (i in 0 until (refreshJson?.length() ?: 0)) {
                        refreshJson?.optString(i)?.takeIf { it.isNotEmpty() }?.let { add(it) }
                    }
                },
            )
        }.getOrNull()
    }
}

/**
 * `org.json` returns coerced defaults (`0`, `""`, `false`) for absent or null keys, which is
 * exactly how a missing value becomes a fabricated one. These read null as null. Duplicated
 * per file rather than shared because the existing helpers in `MovesHistory.kt` and
 * `OmenDecision.kt` are file-private; hoisting them is a separate tidy-up.
 */
private fun JSONObject.optStringOrNull(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf { it.isNotEmpty() }

private fun JSONObject.optIntOrNull(key: String): Int? = if (has(key) && !isNull(key)) optInt(key) else null
