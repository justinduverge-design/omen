package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.leagueSubtitle
import com.slopssaloon.omen.app.feature.commandcenter.switcherErrorMessage
import com.slopssaloon.omen.app.feature.commandcenter.switcherRowAccessibilityLabel
import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Visual briefs §10.2/§10.3 — the team/league switcher.
 * Swift twin: `LeagueSwitcherTests.swift`. The two must map the same rows the same way.
 *
 * The regression this file exists to prevent is the one the founder actually hit: the
 * backend endpoints existed and were deployed, `OmenContextStrip` supported a switch
 * gesture, and the real app still gave a user with a connected league no way to choose it —
 * because `onSwitchContext` was never passed at the call site, so the affordance did not
 * render. Every unit was fine; the wiring between them was the whole defect.
 */
class LeagueSwitcherTest {

    /** A manager holding a live session, so `authorized` hands the repository a bearer. */
    private fun signedIn(): SessionManager = SessionManager(
        InMemorySecureSessionStore(Session("u1", "token", "r", 100_000)),
    ) { 1_000 }

    /** No stored session — the shape a signed-out (or demo) caller presents. */
    private fun signedOut(): SessionManager = SessionManager(InMemorySecureSessionStore()) { 1_000 }

    private val directoryJson = """
    {
      "contract_version": "league-directory.v1",
      "season": 2026,
      "selection_persistence": "provider_binding_only",
      "active": {"platform":"sleeper","league_id":"L-alpha","league_name":"Dynasty Dogs","season":2026,"scoring_format":"half_ppr","team_id":"3","team_name":"Justin Titans"},
      "platforms": [
        {"platform":"sleeper","connection_state":"connected","discovery":"full","notice":null,"leagues":[
          {"league_id":"L-alpha","league_name":"Dynasty Dogs","season":2026,"scoring_format":"half_ppr","team_id":"3","team_name":"Justin Titans","is_active":true},
          {"league_id":"L-zeta","league_name":"Family League","season":2026,"scoring_format":"ppr","team_id":"7","team_name":"Titans Too","is_active":false}]},
        {"platform":"espn","connection_state":"connected","discovery":"bound_only","notice":"ESPN does not expose a league list to Omen, so only the connected league is shown.","leagues":[
          {"league_id":"884411","league_name":null,"season":2026,"scoring_format":null,"team_id":"9","team_name":"Sunday Scaries","is_active":false}]},
        {"platform":"yahoo","connection_state":"not_connected","discovery":"unavailable","notice":null,"leagues":[]}
      ]
    }
    """.trimIndent()

    private fun directory(): LeagueDirectory =
        requireNotNull(LeagueDirectory.parse(directoryJson)) { "directory failed to parse" }

    @Test
    fun `directory decodes server nulls without failing`() {
        val d = directory()

        assertEquals("league-directory.v1", d.contractVersion)
        assertEquals("provider_binding_only", d.selectionPersistence)
        assertEquals(listOf("sleeper", "espn", "yahoo"), d.platforms.map { it.platform })

        // ESPN's league carries a null name and null scoring format on purpose — ESPN
        // exposes no league list, and its scoring rules are unverified. Treating either as
        // required would turn an honest response into a decode failure.
        val espn = d.platforms.single { it.platform == "espn" }
        assertNull(espn.leagues[0].leagueName)
        assertNull(espn.leagues[0].scoringFormat)
        assertEquals("bound_only", espn.discovery)
    }

    @Test
    fun `a league row with no id is dropped rather than given an invented identity`() {
        val d = requireNotNull(
            LeagueDirectory.parse(
                """{"platforms":[{"platform":"sleeper","leagues":[{"league_name":"No Id"},{"league_id":"ok","league_name":"Fine"}]}]}""",
            ),
        )
        assertEquals(listOf("ok"), d.platforms[0].leagues.map { it.leagueId })
    }

    @Test
    fun `selection result carries the surfaces to refresh`() {
        val result = requireNotNull(
            LeagueSelectionResult.parse(
                """{"contract_version":"league-active-selection.v1","selection_persistence":"provider_binding_only",
                    "active":{"platform":"sleeper","league_id":"L-zeta","team_id":"7"},
                    "refresh":["command_center","omen","league","waiver_watch","ledger"]}""",
            ),
        )
        // §10.3 names the affected surfaces server-side rather than letting the client guess.
        assertEquals(listOf("command_center", "omen", "league", "waiver_watch", "ledger"), result.refresh)
        assertEquals("L-zeta", result.activeLeagueId)
    }

    private fun selectionSuccess() = OmenApiResult.Success(
        LeagueSelectionResult(
            contractVersion = "league-active-selection.v1",
            selectionPersistence = "provider_binding_only",
            activePlatform = "sleeper",
            activeLeagueId = "L-zeta",
            refresh = listOf("command_center", "omen"),
        ),
    )

    @Test
    fun `select sends platform league and team and returns refresh targets`() = runBlocking {
        val repo = StubLeagueDirectoryRepository(OmenApiResult.Success(directory()), selectionSuccess())
        val vm = LeagueSwitcherViewModel(repo, signedIn())

        val refresh = vm.select("sleeper", "L-zeta", "7")

        assertEquals(listOf("command_center", "omen"), refresh)
        assertEquals(listOf(Triple("sleeper", "L-zeta", "7")), repo.calls)
    }

    @Test
    fun `a failed selection returns null so the caller cannot refresh into a stale context`() = runBlocking {
        val repo = StubLeagueDirectoryRepository(
            OmenApiResult.Success(directory()),
            OmenApiResult.Failure(OmenApiError.Server(502)),
        )
        val vm = LeagueSwitcherViewModel(repo, signedIn())

        // §10.3: a failed switch must never leave the old context looking new. Returning
        // null is what stops the caller re-reading and relabelling it.
        assertNull(vm.select("sleeper", "L-zeta", "7"))
        assertEquals(OmenApiError.Server(502), vm.selectionError)
    }

    @Test
    fun `an unreadable directory fails honestly rather than falling back to a fixture`() = runBlocking {
        val vm = LeagueSwitcherViewModel(
            StubLeagueDirectoryRepository(OmenApiResult.Failure(OmenApiError.Network)),
            signedIn(),
        )

        vm.load()

        // facts-of-record #7: showing demo leagues to a real user during an outage is
        // exactly the mock/live mixing the doctrine forbids.
        val state = vm.viewState
        assertTrue("expected Failed, got $state", state is LeagueSwitcherViewModel.ViewState.Failed)
        assertEquals(OmenApiError.Network, (state as LeagueSwitcherViewModel.ViewState.Failed).error)
    }

    @Test
    fun `a missing access token is unauthorized rather than a crash`() = runBlocking {
        val vm = LeagueSwitcherViewModel(
            StubLeagueDirectoryRepository(OmenApiResult.Success(directory())),
            signedOut(),
        )

        vm.load()

        assertEquals(
            OmenApiError.Unauthorized,
            (vm.viewState as LeagueSwitcherViewModel.ViewState.Failed).error,
        )
    }

    @Test
    fun `accessibility label carries team league and platform even when labels truncate`() {
        val sleeper = directory().platforms.single { it.platform == "sleeper" }

        val selected = switcherRowAccessibilityLabel(sleeper, sleeper.leagues[0])
        assertTrue(selected, selected.contains("Justin Titans"))
        assertTrue(selected, selected.contains("Dynasty Dogs"))
        assertTrue(selected, selected.contains("Sleeper"))
        // §10.2 forbids a colour-only selection cue, so the state is in the label too.
        assertTrue(selected, selected.contains("selected"))

        assertFalse(switcherRowAccessibilityLabel(sleeper, sleeper.leagues[1]).contains("selected"))
    }

    @Test
    fun `an espn league with no name still produces a usable label and subtitle`() {
        val espn = directory().platforms.single { it.platform == "espn" }

        val label = switcherRowAccessibilityLabel(espn, espn.leagues[0])
        assertTrue(label, label.contains("Sunday Scaries"))
        assertFalse(label, label.lowercase().contains("null"))
        assertEquals("League 884411 · ESPN", leagueSubtitle(espn, espn.leagues[0]))
    }

    @Test
    fun `error copy never exposes a status code or provider detail`() {
        listOf(OmenApiError.Network, OmenApiError.Decode, OmenApiError.Server(502), OmenApiError.Unauthorized)
            .forEach { error ->
                val message = switcherErrorMessage(error)
                assertFalse(message, message.contains("502"))
                assertFalse(message, message.lowercase().contains("token"))
                assertFalse(message, message.lowercase().contains("cookie"))
                assertTrue(message.isNotEmpty())
            }
        assertTrue(switcherErrorMessage(OmenApiError.Unauthorized).contains("Sign in"))
    }

    // MARK: F-DEV-02 — the switch that "did not take". Swift twin: `LeagueSwitcherTests`.
    //
    // This fixture already IS the founder's situation: Sleeper active with two leagues, ESPN
    // connected with its one bound league. He picked ESPN and Omen kept using Sleeper. The
    // switch was not ignored — the server bound the league inside ESPN — but nothing records
    // which PROVIDER he chose until the reviewed selection column is applied, so every surface
    // falls back to a tie-break that puts Sleeper first. The server reports exactly that in
    // `selection_persistence`, and both sheets decoded the field and then ignored it.

    @Test
    fun `a cross-provider choice is flagged as unable to persist`() {
        val directory = directory()

        assertEquals("provider_binding_only", directory.selectionPersistence)
        assertTrue(directory.platforms.count { it.leagues.isNotEmpty() } > 1)
        assertTrue(directory.crossProviderChoiceCannotPersist)
    }

    @Test
    fun `the warning disappears once the server can persist the choice`() {
        // Applying the column flips the server to `explicit`. The warning must go on its own —
        // no client release, no flag anyone has to remember to remove.
        val applied = directory().copy(selectionPersistence = "explicit")

        assertFalse(applied.crossProviderChoiceCannotPersist)
    }

    @Test
    fun `a single provider is not warned about cross-provider persistence`() {
        // One provider has nothing to cross. Warning there would describe a limit the user
        // cannot reach, which is its own kind of dishonesty.
        val base = directory()
        val onlyOne = base.copy(
            platforms = base.platforms.filter { it.leagues.isNotEmpty() }.take(1),
        )

        assertFalse(onlyOne.crossProviderChoiceCannotPersist)
    }

    @Test
    fun `demo is not reported as an expired session`() = runBlocking {
        // Demo has no session, so the token lookup failed and the sheet told a demo user
        // "Your session expired. Sign in again" — false, and on the one path Apple's reviewer
        // is told to take. Demo and signed-out look identical from the token alone; they must
        // not read the same to a user. Swift twin: `testDemoIsNotReportedAsAnExpiredSession`.
        val repo = StubLeagueDirectoryRepository(OmenApiResult.Success(directory()), selectionSuccess())
        // No token, exactly as in demo — the old code turned that into Unauthorized.
        val model = LeagueSwitcherViewModel(repo, signedOut())

        model.load(SessionManager.DEMO_USER_ID)

        assertEquals(LeagueSwitcherViewModel.ViewState.Demo, model.viewState)
    }
}
