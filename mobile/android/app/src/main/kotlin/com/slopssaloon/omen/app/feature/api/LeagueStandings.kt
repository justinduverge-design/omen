package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import org.json.JSONObject

/**
 * M5-Native-API-Client slice C — `GET /api/league/standings` → `league-standings.v1`.
 * iOS mirror: `App/Api/LeagueStandings.swift`.
 *
 * This is the route that carries the provider identity `dashboard-summary.v1` does not:
 * `league_name` on the envelope, and `team_name` + `is_current_user` on every row, for all three
 * providers (`adapters/sleeper.js`, `adapters/espn.js`, `services/yahoo.js` each set the flag).
 *
 * Unlike the dashboard summary — which reads our own rows — this makes a **live provider call**.
 * It is slower, it can fail on its own, and it correctly returns an empty `standings` array
 * during the off-season. Nothing on the Command Center may block on it.
 */
data class LeagueStandings(
    val contractVersion: String,
    val platform: String,
    val leagueName: String?,
    val standings: List<Team>,
) {
    data class Team(
        val teamName: String?,
        val isCurrentUser: Boolean,
        val rank: Int?,
    )

    /** The caller's own team, if the provider identified one. */
    val currentUserTeam: Team? get() = standings.firstOrNull { it.isCurrentUser }

    /**
     * Maps the provider string to the design-system platform. An unrecognized provider yields
     * null rather than a guess, which keeps the context strip empty instead of badging a league
     * with the wrong platform mark.
     */
    val omenPlatform: OmenPlatform?
        get() = when (platform.lowercase()) {
            "sleeper" -> OmenPlatform.Sleeper
            "espn" -> OmenPlatform.Espn
            "yahoo" -> OmenPlatform.Yahoo
            else -> null
        }

    /**
     * The context strip this standings response can honestly support.
     *
     * Returns null — meaning "leave the strip as it is" — unless we have a real platform, a real
     * league name, and a team the provider marked as the caller's. A partial answer would mean
     * printing a placeholder next to a real one, which is the invention this mapping prevents.
     */
    val contextStrip: OmenContextStripState?
        get() {
            val platform = omenPlatform ?: return null
            val league = leagueName?.takeIf { it.isNotEmpty() } ?: return null
            val team = currentUserTeam?.teamName?.takeIf { it.isNotEmpty() } ?: return null
            return OmenContextStripState.Selected(
                platform = platform,
                leagueName = league,
                teamName = team,
            )
        }

    companion object {
        fun parse(json: String): LeagueStandings? = runCatching {
            val root = JSONObject(json)
            val rows = root.optJSONArray("standings")
            val teams = buildList {
                for (i in 0 until (rows?.length() ?: 0)) {
                    val row = rows?.optJSONObject(i) ?: continue
                    add(
                        Team(
                            teamName = row.optString("team_name").takeIf { it.isNotEmpty() },
                            // A missing flag means "not known to be mine", never "mine".
                            isCurrentUser = row.optBoolean("is_current_user", false),
                            rank = if (row.has("rank")) row.optInt("rank") else null,
                        ),
                    )
                }
            }

            LeagueStandings(
                contractVersion = root.optString("contract_version"),
                platform = root.optString("platform"),
                leagueName = root.optString("league_name")
                    .takeIf { it.isNotEmpty() && it != "null" },
                standings = teams,
            )
        }.getOrNull()
    }
}
