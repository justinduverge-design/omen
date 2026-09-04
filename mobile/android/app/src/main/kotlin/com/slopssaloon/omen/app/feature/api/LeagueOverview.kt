package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLeaguePulseState
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import org.json.JSONObject
import kotlin.math.abs

/**
 * `GET /api/league/overview` → `league-overview.v1`. iOS mirror: `App/Api/LeagueOverview.swift`.
 *
 * The League destination's payload. Distinct from `league-standings.v1`, which is unchanged
 * because the Command Center context strip consumes it.
 *
 * The defining property is that **every section carries its own status and fails
 * independently** — a dead matchup read arrives as `matchup.status == "unavailable"` beside
 * live standings. Nothing here infers a section's health from whether its array is empty.
 */
data class LeagueOverview(
    val contractVersion: String,
    val platform: String,
    /** Carried so Trade personalizes against the same league this screen shows. */
    val leagueId: String?,
    val leagueName: String?,
    val season: Int?,
    val week: Int?,
    val matchup: Matchup,
    val standings: Standings,
    val activity: Activity,
) {
    data class Matchup(
        val status: Status,
        val you: Side?,
        val opponent: Side?,
        val unavailableReason: String?,
    ) {
        enum class Status(val wire: String) {
            Pregame("pregame"),
            Live("live"),
            Final("final"),
            NoMatchup("no_matchup"),
            Unavailable("unavailable"),
            ;

            companion object {
                /**
                 * An unrecognized value degrades to [Unavailable] rather than failing the parse.
                 * This contract is expected to grow, and one new status must not blank a screen
                 * whose other sections parsed fine.
                 */
                fun from(raw: String?): Status =
                    entries.firstOrNull { it.wire == raw } ?: Unavailable
            }
        }

        data class Side(
            val teamId: String?,
            val teamName: String?,
            val record: String?,
            val points: Double?,
            val projected: Double?,
        )
    }

    data class Standings(
        val status: Status,
        val playoffPicture: PlayoffPicture?,
        /** Provider rank order, preserved exactly. Omen never reorders a league (§14.1). */
        val teams: List<LeagueStandings.Team>,
    ) {
        enum class Status(val wire: String) {
            Available("available"),
            OffSeason("off_season"),
            Unavailable("unavailable"),
            ;

            companion object {
                fun from(raw: String?): Status = entries.firstOrNull { it.wire == raw } ?: Unavailable
            }
        }

        /**
         * Current position only. [cutLineNote] is null and [settingsKnown] false until a
         * provider path reads playoff settings — no probability, no clinch or elimination.
         */
        data class PlayoffPicture(
            val rank: Int,
            val teamCount: Int,
            val line: String,
            val cutLineNote: String?,
            val settingsKnown: Boolean,
        )
    }

    /**
     * v1 ships no activity signals. `Empty` with `unavailableFamilies == ["transactions"]` is
     * the honest shape, not a placeholder: the screen can say *which* half is missing. The
     * waiver/trade integration fills [items] and flips [status]; nothing else changes.
     */
    data class Activity(
        val status: Status,
        val unavailableFamilies: List<String>,
        val items: List<Item>,
    ) {
        enum class Status(val wire: String) {
            Available("available"),
            Empty("empty"),
            Partial("partial"),
            Unavailable("unavailable"),
            ;

            companion object {
                fun from(raw: String?): Status = entries.firstOrNull { it.wire == raw } ?: Unavailable
            }
        }

        data class Item(val category: String, val text: String, val source: String)
    }

    // ---------------------------------------------------------------------
    // Command Center + League mappings
    // ---------------------------------------------------------------------

    /** An unrecognized provider yields null rather than a guess. */
    val omenPlatform: OmenPlatform?
        get() = when (platform.lowercase()) {
            "sleeper" -> OmenPlatform.Sleeper
            "espn" -> OmenPlatform.Espn
            "yahoo" -> OmenPlatform.Yahoo
            else -> null
        }

    /**
     * Same rule as `LeagueStandings.contextStrip`: a real platform and a team the provider
     * marked as the caller's — or nothing.
     *
     * The league **name** used to be required too, which meant every ESPN user fell through to
     * the Empty state and was told to "Choose a team" while their league sat connected. The
     * name is what a provider is most likely to omit, and it is the least load-bearing of the
     * three: the strip's job is to say which team you are looking at.
     */
    val contextStrip: OmenContextStripState?
        get() {
            val resolved = omenPlatform ?: return null
            val team = standings.teams.firstOrNull { it.isCurrentUser }
                ?.teamName?.takeIf { it.isNotBlank() } ?: return null
            return OmenContextStripState.Selected(resolved, leagueName?.takeIf { it.isNotBlank() }, team)
        }

    /**
     * The Matchup Hero this payload can honestly support.
     *
     * The hero's populated states existed with no real-data path — the only production path
     * returned NoMatchup unconditionally, so no connected user could ever see a matchup.
     *
     * Returns null for "leave the caller's current state alone".
     */
    val matchupHero: OmenMatchupHeroState?
        get() {
            val mine = heroTeam(matchup.you, matchup.status) ?: return null
            val theirs = heroTeam(matchup.opponent, matchup.status) ?: return null

            return when (matchup.status) {
                // No kickoff time is carried by this contract. Say what is true.
                Matchup.Status.Pregame -> OmenMatchupHeroState.BeforeGames(
                    selectedTeam = mine,
                    opponent = theirs,
                    startTime = "Not started",
                    whatToWatch = watchLine,
                )
                // `projectedFinish` was hardwired to null — the hero has always had a slot
                // for it and the contract has always carried the numbers.
                Matchup.Status.Live -> OmenMatchupHeroState.Live(
                    selectedTeam = mine,
                    opponent = theirs,
                    projectedFinish = projectedFinishText,
                    whatToWatch = watchLine,
                )
                Matchup.Status.Final -> OmenMatchupHeroState.Final(
                    selectedTeam = mine,
                    opponent = theirs,
                    resultSummary = resultSummary,
                    whatToWatch = null,
                )
                Matchup.Status.NoMatchup, Matchup.Status.Unavailable -> null
            }
        }

    /**
     * `OmenMatchupTeam` takes non-null strings, so absence renders as an empty record (the row
     * omits it) and an em dash for a score we were not given — never a zero, which would read
     * as "they scored nothing".
     *
     * **`projected` was parsed and then thrown away.** The contract has carried it since
     * `league-overview.v1` shipped and nothing read it, so before the week started every hero
     * showed an em dash on both sides — the one moment a projection is the ONLY number that
     * exists. Which number leads depends on the phase:
     *
     *  - `Pregame`: the projection IS the score, suffixed `proj` so it can never read as
     *    points already earned;
     *  - `Live`: real points lead and the projected finish rides the centre rule instead
     *    (see [projectedFinishText]) — two numbers in one slot would be unreadable;
     *  - `Final`: points only. A projection after the whistle is noise.
     *
     * iOS mirror: `LeagueOverview.scoreText(for:phase:)`.
     */
    private fun heroTeam(side: Matchup.Side?, phase: Matchup.Status): OmenMatchupTeam? {
        val name = side?.teamName?.takeIf { it.isNotEmpty() } ?: return null
        return OmenMatchupTeam(
            name = name,
            record = side.record.orEmpty(),
            scoreText = scoreText(side, phase),
            projectedText = projectedText(side, phase),
        )
    }

    private fun scoreText(side: Matchup.Side, phase: Matchup.Status): String {
        // An em dash, never "0.0". Before kickoff nobody has scored, and a zero states as fact
        // that they scored nothing.
        if (phase == Matchup.Status.Pregame) return "—"
        return side.points?.let { formatPoints(it) } ?: "—"
    }

    /**
     * Null past the whistle and whenever the provider gave no projection — which is what
     * removes the column entirely rather than drawing an empty one.
     */
    private fun projectedText(side: Matchup.Side, phase: Matchup.Status): String? {
        if (phase == Matchup.Status.Final) return null
        return side.projected?.let { formatPoints(it) }
    }

    /**
     * The centre rule during a live game: where both teams are heading, not where they are.
     *
     * Null unless the provider gave a projection for BOTH sides. One-sided is worse than none
     * — a rule reading "119.6–" invites the reader to fill in the blank themselves.
     */
    private val projectedFinishText: String?
        get() {
            val mine = matchup.you?.projected ?: return null
            val theirs = matchup.opponent?.projected ?: return null
            return "${formatPoints(mine)}–${formatPoints(theirs)} proj"
        }

    /** Deterministic and checkable against the payload it came from. */
    private val watchLine: String?
        get() {
            if (matchup.status != Matchup.Status.Live) return null
            // Prefer the PROJECTED margin, which is what "projected within" actually means.
            // This line used to compute the margin from `points` — the current score — and
            // label it "Projected", which described the present and called it the future.
            val myProjected = matchup.you?.projected
            val theirProjected = matchup.opponent?.projected
            if (myProjected != null && theirProjected != null) {
                return "Projected within ${formatPoints(abs(myProjected - theirProjected))} points."
            }
            val mine = matchup.you?.points ?: return null
            val theirs = matchup.opponent?.points ?: return null
            // Relabelled to say what it really is.
            return "Within ${formatPoints(abs(mine - theirs))} points right now."
        }

    private val resultSummary: String
        get() {
            val mine = matchup.you?.points ?: return "Final"
            val theirs = matchup.opponent?.points ?: return "Final"
            if (mine == theirs) return "Tied ${formatPoints(mine)}–${formatPoints(theirs)}"
            val verb = if (mine > theirs) "Won" else "Lost"
            return "$verb ${formatPoints(mine)}–${formatPoints(theirs)}"
        }

    /** League Pulse from this payload. The server has already computed the position line. */
    val leaguePulse: OmenLeaguePulseState?
        get() = when (standings.status) {
            Standings.Status.OffSeason ->
                OmenLeaguePulseState.OffSeason("Standings return when the regular season starts.")
            Standings.Status.Unavailable -> OmenLeaguePulseState.Unavailable
            Standings.Status.Available -> {
                val picture = standings.playoffPicture
                if (picture == null) {
                    OmenLeaguePulseState.Unavailable
                } else {
                    OmenLeaguePulseState.Available(
                        position = picture.line,
                        // Absent unless the server actually read playoff settings.
                        cutLine = picture.cutLineNote?.takeIf { picture.settingsKnown },
                        activity = activity.items.firstOrNull()?.text,
                    )
                }
            }
        }

    companion object {
        /** One decimal, locale-independent — a comma decimal separator would misread as a list. */
        private fun formatPoints(value: Double): String = String.format(java.util.Locale.US, "%.1f", value)

        fun parse(json: String): LeagueOverview? = runCatching {
            val root = JSONObject(json)

            LeagueOverview(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                platform = root.optStringOrNull("platform").orEmpty(),
                leagueId = root.optStringOrNull("league_id"),
                leagueName = root.optStringOrNull("league_name"),
                season = root.optInt("season").takeIf { root.has("season") },
                week = root.optInt("week").takeIf { root.has("week") },
                matchup = parseMatchup(root.optJSONObject("matchup")),
                standings = parseStandings(root.optJSONObject("standings")),
                activity = parseActivity(root.optJSONObject("activity")),
            )
        }.getOrNull()

        private fun parseMatchup(obj: JSONObject?): Matchup = Matchup(
            status = Matchup.Status.from(obj?.optStringOrNull("status").orEmpty()),
            you = parseSide(obj?.optJSONObject("you")),
            opponent = parseSide(obj?.optJSONObject("opponent")),
            unavailableReason = obj?.optStringOrNull("unavailable_reason").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
        )

        private fun parseSide(obj: JSONObject?): Matchup.Side? {
            if (obj == null) return null
            return Matchup.Side(
                teamId = obj.optStringOrNull("team_id"),
                teamName = obj.optStringOrNull("team_name"),
                record = obj.optStringOrNull("record"),
                points = if (obj.has("points") && !obj.isNull("points")) obj.optDouble("points") else null,
                projected = if (obj.has("projected") && !obj.isNull("projected")) obj.optDouble("projected") else null,
            )
        }

        private fun parseStandings(obj: JSONObject?): Standings {
            val rows = obj?.optJSONArray("teams")
            val teams = buildList {
                for (i in 0 until (rows?.length() ?: 0)) {
                    val row = rows?.optJSONObject(i) ?: continue
                    add(
                        LeagueStandings.Team(
                            teamName = row.optStringOrNull("team_name"),
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

            val pictureJson = obj?.optJSONObject("playoff_picture")
            val picture = if (pictureJson == null) {
                null
            } else {
                Standings.PlayoffPicture(
                    rank = pictureJson.optInt("rank"),
                    teamCount = pictureJson.optInt("team_count"),
                    line = pictureJson.optStringOrNull("line").orEmpty(),
                    cutLineNote = pictureJson.optStringOrNull("cut_line_note"),
                    settingsKnown = pictureJson.optBoolean("settings_known", false),
                )
            }

            return Standings(
                status = Standings.Status.from(obj?.optStringOrNull("status").orEmpty()),
                playoffPicture = picture,
                teams = teams,
            )
        }

        private fun parseActivity(obj: JSONObject?): Activity {
            val families = obj?.optJSONArray("unavailable_families")
            val items = obj?.optJSONArray("items")

            return Activity(
                status = Activity.Status.from(obj?.optStringOrNull("status").orEmpty()),
                unavailableFamilies = buildList {
                    for (i in 0 until (families?.length() ?: 0)) {
                        families?.optString(i)?.takeIf { it.isNotEmpty() }?.let { add(it) }
                    }
                },
                items = buildList {
                    for (i in 0 until (items?.length() ?: 0)) {
                        val row = items?.optJSONObject(i) ?: continue
                        add(
                            Activity.Item(
                                category = row.optStringOrNull("category").orEmpty(),
                                text = row.optStringOrNull("text").orEmpty(),
                                source = row.optStringOrNull("source").orEmpty(),
                            ),
                        )
                    }
                },
            )
        }
    }
}
