package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLeaguePulseState
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
        val wins: Int? = null,
        val losses: Int? = null,
        /**
         * F-SCR-01. `league-standings.v1` has always carried these — the Sleeper adapter uses
         * `points_for` as the standings tiebreaker and the web app renders both — while neither
         * native client decoded them.
         */
        val pointsFor: Double? = null,
        val pointsAgainst: Double? = null,
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
     * Returns null — meaning "leave the strip as it is" — unless we have a real platform and a
     * team the provider marked as the caller's. A placeholder next to a real value is the
     * invention this mapping prevents; an omitted optional line is not the same thing.
     *
     * The league name was required here too until 2026-09-02, which sent every ESPN user to the
     * Empty state — "Choose a team" — while their league was connected and their team known.
     */
    val contextStrip: OmenContextStripState?
        get() {
            val platform = omenPlatform ?: return null
            val team = currentUserTeam?.teamName?.takeIf { it.isNotBlank() } ?: return null
            return OmenContextStripState.Selected(
                platform = platform,
                leagueName = leagueName?.takeIf { it.isNotBlank() },
                teamName = team,
            )
        }

    /**
     * League Pulse, derived from the standings this response already carries.
     *
     * League Pulse used to come from `dashboard-summary.v1`'s tool status alone, which returned
     * Unavailable for every healthy league — while this payload, already fetched for the context
     * strip, carried the rank and team count the section needed. The data was in hand and
     * discarded.
     *
     * Returns null for "leave the caller's current state alone", matching [contextStrip]. Cut line
     * and activity stay null on purpose: this contract carries no playoff settings and no
     * transaction feed, so neither can be stated without inventing one.
     */
    val leaguePulse: OmenLeaguePulseState?
        get() {
            if (standings.isEmpty()) return null
            val team = currentUserTeam ?: return null
            val rank = team.rank?.takeIf { it > 0 } ?: return null

            val record = if (team.wins != null && team.losses != null) {
                " · ${team.wins}-${team.losses}"
            } else {
                ""
            }
            return OmenLeaguePulseState.Available(
                position = "${ordinal(rank)} of ${standings.size}$record",
            )
        }

    companion object {
        /**
         * English ordinal. Handles the 11/12/13 exception, which the naive last-digit rule gets
         * wrong — a 12-team league is exactly where that bug would show.
         */
        fun ordinal(n: Int): String {
            val suffix = when {
                n % 100 in 11..13 -> "th"
                n % 10 == 1 -> "st"
                n % 10 == 2 -> "nd"
                n % 10 == 3 -> "rd"
                else -> "th"
            }
            return "$n$suffix"
        }

        fun parse(json: String): LeagueStandings? = runCatching {
            val root = JSONObject(json)
            val rows = root.optJSONArray("standings")
            val teams = buildList {
                for (i in 0 until (rows?.length() ?: 0)) {
                    val row = rows?.optJSONObject(i) ?: continue
                    add(
                        Team(
                            teamName = row.optStringOrNull("team_name"),
                            // A missing flag means "not known to be mine", never "mine".
                            isCurrentUser = row.optBoolean("is_current_user", false),
                            rank = if (row.has("rank")) row.optInt("rank") else null,
                            wins = if (row.has("wins")) row.optInt("wins") else null,
                            losses = if (row.has("losses")) row.optInt("losses") else null,
                            pointsFor = if (row.has("points_for")) row.optDouble("points_for") else null,
                            pointsAgainst = if (row.has("points_against")) row.optDouble("points_against") else null,
                        ),
                    )
                }
            }

            LeagueStandings(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                platform = root.optStringOrNull("platform").orEmpty(),
                leagueName = root.optStringOrNull("league_name"),
                standings = teams,
            )
        }.getOrNull()
    }
}
