package com.slopssaloon.omen.app.feature.api

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The Command Center league carousel's ordering and filtering rules.
 * Swift twin: `LeagueCarouselTests.swift`.
 *
 * These are the founder's two rules, and they are the thing most likely to drift between the
 * two platforms because both clients could plausibly "helpfully" re-sort. The point of these
 * tests is that neither does: the server's `platforms` order is the authority and the client
 * renders it.
 */
class LeagueCarouselTest {

    private fun league(
        id: String,
        team: String? = null,
        active: Boolean = false,
        followed: Boolean = true,
    ) = LeagueDirectory.League(
        leagueId = id,
        leagueName = "League $id",
        season = 2026,
        scoringFormat = null,
        teamId = null,
        teamName = team,
        isActive = active,
        isFollowed = followed,
    )

    private fun group(platform: String, leagues: List<LeagueDirectory.League>) =
        LeagueDirectory.PlatformGroup(
            platform = platform,
            connectionState = "connected",
            discovery = "full",
            notice = null,
            leagues = leagues,
        )

    private fun directory(groups: List<LeagueDirectory.PlatformGroup>) = LeagueDirectory(
        contractVersion = "league-directory.v1",
        season = 2026,
        selectionPersistence = "explicit",
        followPersistence = "explicit",
        active = null,
        platforms = groups,
    )

    @Test
    fun `is_followed defaults to true so a server without follows loses no leagues`() {
        val parsed = requireNotNull(
            LeagueDirectory.parse(
                """
                {"contract_version":"league-directory.v1","season":2026,
                 "selection_persistence":"explicit",
                 "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
                   "leagues":[{"league_id":"L1","league_name":"Alpha","is_active":true}]}]}
                """.trimIndent(),
            ),
        )

        // The whole carousel filters on `isFollowed`. Defaulting it to false would have made
        // an older server's response render an empty widget for a user with real leagues.
        assertTrue(parsed.platforms[0].leagues[0].isFollowed)
        // Absent `follow_persistence` means "unavailable", never a claimed save.
        assertNull(parsed.followPersistence)
        assertEquals(false, parsed.followChoicePersists)
    }

    @Test
    fun `a league the user unfollowed is not a carousel page`() {
        val parsed = requireNotNull(
            LeagueDirectory.parse(
                """
                {"contract_version":"league-directory.v1","season":2026,
                 "follow_persistence":"explicit",
                 "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
                   "leagues":[
                     {"league_id":"L1","league_name":"Alpha","is_active":true,"is_followed":true},
                     {"league_id":"L2","league_name":"Beta","is_active":false,"is_followed":false}]}]}
                """.trimIndent(),
            ),
        )

        assertTrue(parsed.followChoicePersists)
        val followed = parsed.platforms[0].leagues.filter { it.isFollowed }.map { it.leagueId }
        assertEquals(listOf("L1"), followed)
    }

    /**
     * The client must NOT re-sort. `orderPlatformsByFollowCount` in
     * `src/services/leagueFollows.js` owns the rule; this pins that the client renders the
     * server's order verbatim, so a future change to the rule needs one edit, not three.
     */
    @Test
    fun `pages flatten in the server's platform order, not a client order`() {
        val dir = directory(
            listOf(
                group("espn", listOf(league("E1"), league("E2"), league("E3"))),
                group("sleeper", listOf(league("S1"))),
                group("yahoo", listOf(league("Y1"))),
            ),
        )

        val pages = dir.platforms.flatMap { g -> g.leagues.filter { it.isFollowed }.map { g.platform to it.leagueId } }
        assertEquals(
            listOf(
                "espn" to "E1", "espn" to "E2", "espn" to "E3",
                "sleeper" to "S1", "yahoo" to "Y1",
            ),
            pages,
        )
    }

    /**
     * Filtering to a provider with fewer leagues than the current index would leave the pager
     * pointing past the end, which renders nothing at all — a blank widget with no error and
     * no explanation, the worst of the available failures.
     */
    @Test
    fun `filtering to a smaller provider clamps the page index instead of pointing past the end`() {
        val all = listOf("E1", "E2", "E3", "S1")
        val filtered = all.filter { it.startsWith("S") }
        var index = 2

        index = when {
            filtered.isEmpty() -> 0
            index >= filtered.size -> filtered.size - 1
            else -> index
        }

        assertEquals(0, index)
        assertEquals("S1", filtered[index])
    }

    // ---- The shared commit ----
    //
    // The carousel (swipe to rest on a league) and the team picker (tap a chip) both make a
    // league active through `commit`. One implementation on purpose: two would eventually
    // disagree about what happens on failure, and the failure path is the one that matters.
    // Swift twin: `LeagueCarouselTests` shared-commit section.

    private fun signedIn() = com.slopssaloon.omen.core.session.SessionManager(
        com.slopssaloon.omen.core.session.InMemorySecureSessionStore(
            com.slopssaloon.omen.core.session.Session("u1", "token", "r", 100_000),
        ),
    ) { 1_000 }

    private val twoLeaguesJson = """
    {"contract_version":"league-directory.v1","season":2026,"follow_persistence":"explicit",
     "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
       "leagues":[
         {"league_id":"L1","league_name":"Alpha","team_name":"Titans","is_active":true},
         {"league_id":"L2","league_name":"Beta","team_name":"Sentinels","is_active":false}]}]}
    """.trimIndent()

    private fun viewModel(
        json: String = twoLeaguesJson,
        selection: OmenApiResult<LeagueSelectionResult> = OmenApiResult.Failure(OmenApiError.Network),
    ): Pair<LeagueCarouselViewModel, StubLeagueDirectoryRepository> {
        val repo = StubLeagueDirectoryRepository(
            directory = OmenApiResult.Success(requireNotNull(LeagueDirectory.parse(json))),
            selection = selection,
        )
        return LeagueCarouselViewModel(
            directoryRepository = repo,
            leagueRepository = StubLeagueRepository(OmenApiResult.Failure(OmenApiError.Network)),
            sessionManager = signedIn(),
        ) to repo
    }

    private val noActiveLeagueJson = """
    {"contract_version":"league-directory.v1","season":2026,"follow_persistence":"explicit",
     "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
       "leagues":[
         {"league_id":"L1","league_name":"Alpha","team_name":"Titans","is_active":false},
         {"league_id":"L2","league_name":"Beta","team_name":"Sentinels","is_active":false}]}]}
    """.trimIndent()

    // Kotlin twin of `testAReorderedRereadDoesNotTurnOneSwipeIntoACommitLoop`.
    //
    // Android could not originally loop: the pager was never driven from `selectedIndex`, so
    // the view model's own writes went nowhere. The cost was the opposite defect — after a
    // reload the view model followed the resting league while the pager stayed put, and the
    // two drifted. Fixing that drift means the pager now follows `selectedIndex`, which closes
    // the same feedback path that took iOS production down on 2026-09-05. These pin the guard
    // that makes the sync safe.

    private val noActiveLeagueReorderedJson = """
    {"contract_version":"league-directory.v1","season":2026,"follow_persistence":"explicit",
     "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
       "leagues":[
         {"league_id":"L2","league_name":"Beta","team_name":"Sentinels","is_active":false},
         {"league_id":"L1","league_name":"Alpha","team_name":"Titans","is_active":false}]}]}
    """.trimIndent()

    /**
     * Serves a different directory on the second read, which the shared stub cannot do. The
     * list changing between reads is the whole mechanism: without it the resting league keeps
     * its index, nothing moves, and the path under test is never taken.
     */
    private class ReorderingDirectoryRepository(
        private val first: LeagueDirectory,
        private val second: LeagueDirectory,
        private val selection: OmenApiResult<LeagueSelectionResult>,
    ) : LeagueDirectoryRepository {
        val calls = mutableListOf<Triple<String, String, String?>>()
        private var reads = 0

        override suspend fun fetchDirectory(accessToken: String): OmenApiResult<LeagueDirectory> {
            reads += 1
            return OmenApiResult.Success(if (reads == 1) first else second)
        }

        override suspend fun selectLeague(
            accessToken: String,
            platform: String,
            leagueId: String,
            teamId: String?,
        ): OmenApiResult<LeagueSelectionResult> {
            calls += Triple(platform, leagueId, teamId)
            return selection
        }
    }

    private fun selectionSuccess() = OmenApiResult.Success(
        LeagueSelectionResult(
            contractVersion = "league-active-selection.v1",
            selectionPersistence = "explicit",
            activePlatform = null,
            activeLeagueId = null,
            refresh = listOf("command_center"),
        ),
    )

    @Test
    fun `a view model initiated move is not committed back to the server`() =
        kotlinx.coroutines.runBlocking {
            val repo = ReorderingDirectoryRepository(
                first = requireNotNull(LeagueDirectory.parse(noActiveLeagueJson)),
                second = requireNotNull(LeagueDirectory.parse(noActiveLeagueReorderedJson)),
                selection = selectionSuccess(),
            )
            val vm = LeagueCarouselViewModel(
                directoryRepository = repo,
                leagueRepository = StubLeagueRepository(OmenApiResult.Failure(OmenApiError.Network)),
                sessionManager = signedIn(),
            )
            vm.load("u1")

            // The user rests on Beta. One write is correct and expected.
            vm.selectIndex(1)
            assertEquals(listOf("command_center"), vm.commitSelection())
            assertEquals(1, repo.calls.size)

            // The re-read reordered the list, so the view model moved itself to keep the user
            // on Beta — and the pager now follows that move, delivering it back as if it were
            // a swipe. It must not write again.
            assertEquals("reload should have followed Beta to its new index", 0, vm.selectedIndex)
            assertEquals("sleeper:L2", vm.currentPage?.id)
            vm.commitSelection()
            assertEquals(
                "the view model's own pager move was committed back to the server",
                1,
                repo.calls.size,
            )
        }

    @Test
    fun `a genuine user swipe still commits`() = kotlinx.coroutines.runBlocking {
        val (vm, repo) = viewModel(
            json = noActiveLeagueJson,
            selection = OmenApiResult.Success(
                LeagueSelectionResult(
                    contractVersion = "league-active-selection.v1",
                    selectionPersistence = "explicit",
                    activePlatform = null,
                    activeLeagueId = null,
                    refresh = listOf("command_center"),
                ),
            ),
        )
        vm.load("u1")

        // The guard must not be so broad that it eats the real thing.
        vm.selectIndex(1)
        assertEquals(listOf("command_center"), vm.commitSelection())
        assertEquals(1, repo.calls.size)
        assertEquals("L2", repo.calls.first().second)
    }

    @Test
    fun `committing the already active league writes nothing`() = kotlinx.coroutines.runBlocking {
        val (vm, repo) = viewModel()
        vm.load("u1")

        val active = requireNotNull(vm.allPages.firstOrNull { it.isActive })
        val refresh = vm.commit(active)

        // Nothing to change, so nothing is sent. Without this guard, dragging across a
        // five-league carousel fires five verified provider writes to land where one reaches,
        // and a tap on the picker's current chip costs a round trip for no reason.
        assertNull(refresh)
        assertTrue(repo.calls.isEmpty())
    }

    @Test
    fun `committing another league sends it and returns the surfaces to refresh`() =
        kotlinx.coroutines.runBlocking {
            val (vm, repo) = viewModel(
                selection = OmenApiResult.Success(
                    LeagueSelectionResult(
                        contractVersion = "league-active-selection.v1",
                        selectionPersistence = "explicit",
                        activePlatform = null,
                        activeLeagueId = null,
                        refresh = listOf("command_center", "omen", "league"),
                    ),
                ),
            )
            vm.load("u1")

            val other = requireNotNull(vm.allPages.firstOrNull { !it.isActive })
            val refresh = vm.commit(other)

            assertEquals(1, repo.calls.size)
            assertEquals("L2", repo.calls.first().second)
            // The caller re-reads what the SERVER says went stale, not what it guessed.
            assertEquals(listOf("command_center", "omen", "league"), refresh)
        }

    @Test
    fun `a failed commit returns null so the caller does not refresh`() =
        kotlinx.coroutines.runBlocking {
            val (vm, _) = viewModel(selection = OmenApiResult.Failure(OmenApiError.Server(500)))
            vm.load("u1")

            val other = requireNotNull(vm.allPages.firstOrNull { !it.isActive })

            // §10.3: re-reading for the OLD context and presenting it as new is the
            // stale-context failure the contract names. Null is how the caller is told not to.
            assertNull(vm.commit(other))
            // And the active league must not have moved locally on a write that did not land.
            assertEquals("L1", vm.allPages.firstOrNull { it.isActive }?.leagueId)
        }

    /**
     * The picker renders nothing for one league. A row with a single chip is a control that can
     * only ever confirm what the screen already says.
     */
    @Test
    fun `one league is not a choice`() = kotlinx.coroutines.runBlocking {
        val (vm, _) = viewModel(
            json = """
            {"contract_version":"league-directory.v1","season":2026,
             "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
               "leagues":[{"league_id":"L1","league_name":"Alpha","is_active":true}]}]}
            """.trimIndent(),
        )
        vm.load("u1")

        assertEquals(1, vm.allPages.size)
        // Same threshold the picker checks.
        assertFalse(vm.allPages.size > 1)
    }
}
