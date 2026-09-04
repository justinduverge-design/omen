package com.slopssaloon.omen.app.feature.connect

import com.slopssaloon.omen.app.feature.api.OmenApiClient
import com.slopssaloon.omen.app.feature.api.OmenHttpFetcher
import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * **W1-A acceptance, Android half: `espn_s2` and `SWID` must appear in zero emitted bytes outside
 * the requests authorized to carry them** — proved by provoking a real failure and searching the
 * bytes, not by review. iOS twin: `OmenIOSTests/EspnEmittedBytesTests.swift`.
 *
 * Drives the **real** [ApiConnectRepository] and the **real** [ConnectViewModel] through a whole
 * ESPN connect, including a provoked 500 and the retry after it, with a recorder wired in where
 * OkHttp normally sits — then searches every URL, bearer and body the app handed to the transport.
 *
 * **What it covers, and what it cannot.** Omen's own HTTP emissions. It does **not** cover the
 * `WebView`'s traffic to ESPN, which necessarily carries the cookie: that is the browser being a
 * browser, and it is the mechanism, not a leak.
 *
 * **This suite was verified to fail, on this platform.** A leak was deliberately injected — the
 * session appended to the directory read's query string — and 4 of these 5 tests failed, each
 * naming the offending request. The iOS twin was verified the same way (5 of 6). Doing it on both
 * rather than assuming the iOS result transfers matters, because the seams differ: Android records
 * the bearer separately and has no header map at this layer. A passing safety test never shown to
 * fail is a decoration, and this repo has been bitten by exactly that once already.
 */
class EspnEmittedBytesTest {

    private val espnS2Sentinel = "ESPN_S2_SENTINEL_ZZZ_0123456789"
    private val swidSentinel = "{SWID-SENTINEL-ZZZ-0123456789}"

    private data class Emission(
        val method: String,
        val url: String,
        val accessToken: String?,
        val body: String?,
    ) {
        /** Every byte handed to the transport, as one searchable string. */
        val allBytes: String get() = "$method $url\nAuthorization: $accessToken\n${body.orEmpty()}"
    }

    private class RecordingFetcher : OmenHttpFetcher {
        val emissions = mutableListOf<Emission>()
        val statusOverrides = mutableMapOf<String, Int>()
        val bodies = mutableMapOf<String, String>()

        override suspend fun fetch(
            url: String,
            method: String,
            accessToken: String?,
            body: String?,
        ): Pair<Int, String> {
            emissions.add(Emission(method, url, accessToken, body))
            val status = statusOverrides.entries.firstOrNull { url.contains(it.key) }?.value ?: 200
            val payload = bodies.entries.firstOrNull { url.contains(it.key) }?.value ?: "{}"
            return status to payload
        }
    }

    private class SentinelCookieReader(private val session: Pair<String, String>) : EspnCookieReader {
        override fun hasSession() = true
        override fun takeSession() = session
        override fun sessionDiagnostic() = "espn_s2: www.espn.com · SWID: www.espn.com"
        override fun clear() = Unit
    }

    private fun sessionManager() = SessionManager(
        InMemorySecureSessionStore(Session("u1", "omen-bearer", "r", 9_999_999_999)),
    ) { 1_000 }

    /** A full connect with a **provoked failure** and the retry after it. */
    private suspend fun runFullFlowProvokingAFailure(): List<Emission> {
        val fetcher = RecordingFetcher()
        fetcher.bodies["api/platforms/espn/leagues"] = """
            {"status":"ok","platform":"espn","leagues":[
              {"league_id":"13338821","league_name":"Slops Saloon FF Showdown","season":2026,
               "team_id":"3","team_name":"Titans"}
            ]}
        """.trimIndent()
        fetcher.bodies["api/leagues"] = """
            {"contract_version":"league-directory.v1","platforms":[
              {"platform":"espn","connection_state":"connected","discovery":"bound_only","notice":null,
               "leagues":[{"league_id":"13338821","league_name":null,"season":2026,"scoring_format":null,
                           "team_id":"3","team_name":"Titans","is_active":true}]}
            ]}
        """.trimIndent()

        val repository = ApiConnectRepository(OmenApiClient("https://example.invalid", fetcher))
        val viewModel = ConnectViewModel(repository, sessionManager(), StubProviderAuthSession())
        viewModel.selectProvider(ConnectProvider.Espn)
        viewModel.beginEspnSignIn(SentinelCookieReader(espnS2Sentinel to swidSentinel))
        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn("13338821", "3"))

        val option = EspnLeagueOption("13338821", "Slops Saloon FF Showdown", 2026, "3", "Titans")

        // Provoke a real failure. Error paths are where a value escapes, because that is where
        // things get logged, reported and interpolated.
        fetcher.statusOverrides["api/platforms/espn/connect"] = 500
        viewModel.connectEspnLeague(option)

        fetcher.statusOverrides.remove("api/platforms/espn/connect")
        viewModel.beginEspnSignIn(SentinelCookieReader(espnS2Sentinel to swidSentinel))
        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn("13338821", "3"))
        viewModel.connectEspnLeague(option)

        return fetcher.emissions
    }

    /** The clause itself. */
    @Test
    fun `the espn session appears in no emitted byte outside the authorized requests`() = runTest {
        val emissions = runFullFlowProvokingAFailure()
        assertTrue("the flow should emit several requests", emissions.size > 3)

        // **Two paths are authorized, not one.** `/espn/connect` always was; `/espn/leagues` was
        // added 2026-09-03 for discovery, after the Wave 1 contract was written — so the
        // contract's literal "the single connect request" is one request out of date. Named here
        // rather than absorbed; see `Direction/decision_log.md`, 2026-09-03.
        val authorized = listOf("api/platforms/espn/connect", "api/platforms/espn/leagues")

        emissions.filter { it.allBytes.contains(espnS2Sentinel) || it.allBytes.contains(swidSentinel) }
            .forEach { emission ->
                assertTrue(
                    "ESPN session leaked into an unauthorized request: ${emission.method} ${emission.url}",
                    authorized.any { emission.url.contains(it) },
                )
            }
    }

    /**
     * A session in a URL is leaked to every proxy and server log on the path, even when the
     * request is otherwise authorized to carry it in a body.
     */
    @Test
    fun `the espn session never appears in a url`() = runTest {
        runFullFlowProvokingAFailure().forEach { emission ->
            assertFalse("espn_s2 in a URL: ${emission.url}", emission.url.contains(espnS2Sentinel))
            assertFalse("SWID in a URL: ${emission.url}", emission.url.contains(swidSentinel))
        }
    }

    /** The bearer is Omen's, never the provider's — a "pass it along" lands here first. */
    @Test
    fun `the espn session never rides in the authorization bearer`() = runTest {
        runFullFlowProvokingAFailure().forEach { emission ->
            assertFalse(emission.accessToken.orEmpty().contains(espnS2Sentinel))
            assertFalse(emission.accessToken.orEmpty().contains(swidSentinel))
        }
    }

    /**
     * The read-back after connecting is the request most likely to be handed the session "while
     * we have it". It must be a plain authenticated GET with no body at all.
     */
    @Test
    fun `the directory read-back carries only the omen bearer`() = runTest {
        val reads = runFullFlowProvokingAFailure().filter { it.url.contains("api/leagues") }

        assertTrue("the flow should re-read the directory after connecting", reads.isNotEmpty())
        reads.forEach { read ->
            assertEquals("GET", read.method)
            assertTrue("a directory read must have no body", read.body.isNullOrEmpty())
            assertFalse(read.allBytes.contains(espnS2Sentinel))
            assertFalse(read.allBytes.contains(swidSentinel))
        }
    }

    /** The clause's "provoke a real failure" half: the failure emitted nothing extra. */
    @Test
    fun `a provoked server failure emits nothing extra carrying the session`() = runTest {
        val carriers = runFullFlowProvokingAFailure()
            .filter { it.allBytes.contains(espnS2Sentinel) || it.allBytes.contains(swidSentinel) }

        // Two discoveries and two connects across the run, and nothing else. If a failure handler
        // ever starts reporting the request that failed, this count moves and the test says so.
        assertEquals(
            "unexpected session-carrying requests: ${carriers.map { it.url }}",
            4,
            carriers.size,
        )
        carriers.forEach { assertEquals("POST", it.method) }
    }
}
