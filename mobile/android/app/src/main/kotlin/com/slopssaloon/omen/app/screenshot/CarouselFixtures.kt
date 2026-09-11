package com.slopssaloon.omen.app.screenshot

import com.slopssaloon.omen.app.feature.api.LeagueCarouselViewModel
import com.slopssaloon.omen.app.feature.api.LeagueDirectory
import com.slopssaloon.omen.app.feature.api.LeagueDirectoryRepository
import com.slopssaloon.omen.app.feature.api.LeagueOverview
import com.slopssaloon.omen.app.feature.api.LeagueRepository
import com.slopssaloon.omen.app.feature.api.LeagueSelectionResult
import com.slopssaloon.omen.app.feature.api.LeagueStandings
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.app.feature.api.OmenApiResult
import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager

/**
 * A real multi-league account, faked. No network.
 *
 * Why this exists: every other Command Center fixture builds the screen with `carousel = null`,
 * which is a genuinely different branch — stacked sections, no pager, no filter chips. The
 * founder's account runs the other branch, so until this fixture existed, every layout change
 * to the carousel was verified by one person looking at one phone. Three clipping bugs shipped
 * that way.
 *
 * One fixture, two consumers, on purpose:
 *   - `ScreenshotScenarios` renders it, for the end-of-batch visual check;
 *   - `OmenLeagueCarouselLayoutTest` measures it, for the cheap inner loop.
 * They must stay the same fixture. Two fixtures drift, and then the screenshot and the
 * assertion are describing different screens.
 *
 * The content is deliberately hostile — see [HOSTILE_SIGNAL] and the long team names. Polite
 * fixtures are how the clipping bugs got through: the demo league's one-line signal and short
 * names fit anything.
 */
object CarouselFixtures {

    /**
     * Three lines at phone width — the maximum `WhatToWatchRail` renders, and roughly what a
     * real signal reaches once it says something worth reading.
     *
     * Note this is NOT what the app currently produces. `LeagueOverview.watchLine` emits only
     * "Projected within N points." — one subtraction, and only while a game is live. The
     * founder's 2026-09-10 note that this is uninformative is a contract gap, not a copy one.
     * The fixture carries the length the surface has to survive regardless.
     */
    const val HOSTILE_SIGNAL: String =
        "Opponent still has two starters on Monday night and needs 31.2 from them; " +
            "your kicker and defense are already final, so this comes down to their " +
            "RB2 volume after halftime."

    /**
     * Provider order is the SERVER's, and the client renders it without re-sorting
     * (`LeagueCarouselTest` proves that separately). Four ESPN, one Sleeper, one Yahoo is the
     * count-descending-then-alphabetical order the server produces, so a fixture in this order
     * is what a correct server actually sends.
     */
    fun directory(): LeagueDirectory = LeagueDirectory(
        contractVersion = "league-directory.v1",
        season = 2026,
        selectionPersistence = "explicit",
        followPersistence = "explicit",
        active = LeagueDirectory.Active(
            platform = "espn",
            leagueId = "e1",
            leagueName = "EB Football",
            teamId = "t1",
            teamName = "Dat Sauce Inc.",
            scoringFormat = "PPR",
        ),
        platforms = listOf(
            group(
                "espn",
                league("e1", "EB Football", "Dat Sauce Inc.", active = true),
                // ESPN routinely omits a league name; the page falls back to "League e2".
                league("e2", null, "Justin's Absolutely Enormous Fantasy Team Name"),
                league("e3", "The Money League (Championship Or Bust Edition)", "Goat Squad"),
                league("e4", "Dynasty Devils", "Rebuild Year Again"),
            ),
            group("sleeper", league("s1", "Slops Saloon Invitational", "Bad Beats Only")),
            group("yahoo", league("y1", "Work League", "Cubicle Kings")),
        ),
    )

    private fun league(
        id: String,
        name: String?,
        team: String?,
        active: Boolean = false,
    ) = LeagueDirectory.League(
        leagueId = id,
        leagueName = name,
        season = 2026,
        scoringFormat = "PPR",
        teamId = "t-$id",
        teamName = team,
        isActive = active,
        isFollowed = true,
    )

    private fun group(platform: String, vararg leagues: LeagueDirectory.League) =
        LeagueDirectory.PlatformGroup(
            platform = platform,
            connectionState = "connected",
            discovery = "full",
            notice = null,
            leagues = leagues.toList(),
        )

    /** A live matchup carrying the long signal, long names, and both projection columns. */
    fun liveOverview(platform: String, leagueId: String, leagueName: String?): LeagueOverview =
        overview(
            platform, leagueId, leagueName,
            status = LeagueOverview.Matchup.Status.Live,
            you = side("Justin's Absolutely Enormous Fantasy Team Name", "6-1", 64.8, 119.6),
            them = side("G.O.A.T. SQUAD (Championship Or Bust Edition)", "5-2", 58.1, 114.2),
        )

    /** Before kickoff: scores are projections, and `watchLine` is null by contract. */
    fun pregameOverview(platform: String, leagueId: String, leagueName: String?): LeagueOverview =
        overview(
            platform, leagueId, leagueName,
            status = LeagueOverview.Matchup.Status.Pregame,
            you = side("Bad Beats Only", "0-0", null, 121.4),
            them = side("Cubicle Kings", "0-0", null, 118.9),
        )

    /** One provider failing must not blank the leagues that answered. */
    fun noMatchupOverview(platform: String, leagueId: String, leagueName: String?): LeagueOverview =
        overview(
            platform, leagueId, leagueName,
            status = LeagueOverview.Matchup.Status.NoMatchup,
            you = null,
            them = null,
        )

    private fun side(name: String, record: String, points: Double?, projected: Double?) =
        LeagueOverview.Matchup.Side(
            teamId = null,
            teamName = name,
            record = record,
            points = points,
            projected = projected,
        )

    private fun overview(
        platform: String,
        leagueId: String,
        leagueName: String?,
        status: LeagueOverview.Matchup.Status,
        you: LeagueOverview.Matchup.Side?,
        them: LeagueOverview.Matchup.Side?,
    ) = LeagueOverview(
        contractVersion = "league-overview.v1",
        platform = platform,
        leagueId = leagueId,
        leagueName = leagueName,
        season = 2026,
        week = 7,
        matchup = LeagueOverview.Matchup(
            status = status,
            you = you,
            opponent = them,
            unavailableReason = if (status == LeagueOverview.Matchup.Status.NoMatchup) {
                "This league is on a bye."
            } else {
                null
            },
        ),
        standings = LeagueOverview.Standings(
            status = LeagueOverview.Standings.Status.Unavailable,
            playoffPicture = null,
            teams = emptyList(),
        ),
        activity = LeagueOverview.Activity(
            status = LeagueOverview.Activity.Status.Unavailable,
            unavailableFamilies = emptyList(),
            items = emptyList(),
        ),
    )

    /**
     * @param failingPlatform a provider whose overview read fails, so the fixture can prove a
     * single bad provider does not take the whole carousel down with it.
     */
    class FakeLeagueRepository(private val failingPlatform: String? = null) : LeagueRepository {
        override suspend fun fetchStandings(accessToken: String): OmenApiResult<LeagueStandings> =
            OmenApiResult.Failure(OmenApiError.Network)

        override suspend fun fetchOverview(
            accessToken: String,
            platform: String?,
            leagueId: String?,
        ): OmenApiResult<LeagueOverview> {
            val p = platform ?: "espn"
            if (p == failingPlatform) return OmenApiResult.Failure(OmenApiError.Network)
            val id = leagueId ?: "e1"
            return OmenApiResult.Success(
                when (p) {
                    "yahoo" -> noMatchupOverview(p, id, "Work League")
                    "sleeper" -> pregameOverview(p, id, "Slops Saloon Invitational")
                    else -> liveOverview(p, id, if (id == "e2") null else "EB Football")
                }
            )
        }
    }

    class FakeDirectoryRepository(private val value: LeagueDirectory = directory()) :
        LeagueDirectoryRepository {
        override suspend fun fetchDirectory(accessToken: String): OmenApiResult<LeagueDirectory> =
            OmenApiResult.Success(value)

        override suspend fun selectLeague(
            accessToken: String,
            platform: String,
            leagueId: String,
            teamId: String?,
        ): OmenApiResult<LeagueSelectionResult> = OmenApiResult.Success(
            LeagueSelectionResult(
                contractVersion = "league-directory.v1",
                selectionPersistence = "explicit",
                activePlatform = platform,
                activeLeagueId = leagueId,
                // The server names what a switch invalidates; the fixture names the same
                // surfaces so a committed swipe exercises the real refresh path.
                refresh = listOf("command_center", "omen", "trade"),
            )
        )
    }

    fun sessionManager(): SessionManager = SessionManager(
        InMemorySecureSessionStore(
            Session(
                userId = "fixture",
                accessToken = "t",
                refreshToken = "r",
                expiresAtEpochSeconds = 9_999_999_999,
            ),
        ),
        nowEpochSeconds = { 1_000 },
    )

    fun viewModel(failingPlatform: String? = null) = LeagueCarouselViewModel(
        directoryRepository = FakeDirectoryRepository(),
        leagueRepository = FakeLeagueRepository(failingPlatform),
        sessionManager = sessionManager(),
    )
}
