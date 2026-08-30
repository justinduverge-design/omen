package com.slopssaloon.omen.app.feature.api

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `players-search.v1` — the Trade autocomplete. Swift twin: `TradeCompareTests.swift`'s
 * player-search cases.
 *
 * These exist because the route was never called at all, and then was called wrongly. Both
 * platforms hand-built the query string and both got it wrong in opposite directions: iOS
 * percent-encoded the `?` into the path and 404'd every request; Android concatenated it into
 * the URL, which appeared to work until a name contained a space. The first two tests pin the
 * URL, which is the part real use exposes and unit tests usually skip.
 */
class PlayerSearchTest {

    /** Records the URL it was asked for so the assertions can read it. */
    private class RecordingFetcher(private val body: String = "[]") : OmenHttpFetcher {
        var lastUrl: String? = null
        var calls = 0

        override suspend fun fetch(
            url: String,
            method: String,
            accessToken: String?,
            body: String?,
        ): Pair<Int, String> {
            lastUrl = url
            calls += 1
            return 200 to this.body
        }
    }

    private fun repository(fetcher: OmenHttpFetcher) =
        ApiPlayerSearchRepository(OmenApiClient("https://api.example.com", fetcher))

    @Test
    fun `search builds a real query string rather than concatenating the raw text`() = runTest {
        val fetcher = RecordingFetcher()
        repository(fetcher).search("justin jefferson")

        // The space must be encoded. Raw concatenation would emit a URL with a literal space
        // in it — malformed, and rejected by OkHttp before it ever left the device.
        assertEquals(
            "https://api.example.com/api/players/search?q=justin+jefferson",
            fetcher.lastUrl,
        )
    }

    @Test
    fun `an ampersand in a name cannot inject another parameter`() = runTest {
        val fetcher = RecordingFetcher()
        repository(fetcher).search("smith&position=QB")

        val url = requireNotNull(fetcher.lastUrl)
        // One `?` and no bare `&` — the name is a value, not a second parameter.
        assertEquals(1, url.count { it == '?' })
        assertTrue("query was injectable: $url", url.endsWith("q=smith%26position%3DQB"))
    }

    @Test
    fun `a short query is not sent at all`() = runTest {
        val fetcher = RecordingFetcher()
        val result = repository(fetcher).search("j")

        // The route would answer 400, and a one-character keystroke would still spend one of
        // the 30-per-minute-per-IP budget. Answer locally instead.
        assertEquals(0, fetcher.calls)
        assertEquals(emptyList<PlayerSearchResult>(), (result as OmenApiResult.Success).value)
    }

    @Test
    fun `a row missing an id is skipped rather than blanking the whole picker`() {
        val rows = PlayerSearchResult.parseList(
            """[{"id":"1","name":"Justin Jefferson","position":"WR","team":"MIN"},
                {"name":"No Id","position":"RB","team":"SF"},
                {"id":"3","name":"Van Jefferson","position":"WR","team":"WAS"}]""",
        )

        assertEquals(listOf("Justin Jefferson", "Van Jefferson"), rows?.map { it.name })
    }

    @Test
    fun `subtitle omits a stray separator when the provider gives neither half`() {
        val both = PlayerSearchResult("1", "Justin Jefferson", "WR", "MIN")
        val teamOnly = PlayerSearchResult("2", "Free Agent", null, "FA")
        val neither = PlayerSearchResult("3", "Unknown", null, null)

        assertEquals("WR · MIN", both.subtitle)
        assertEquals("FA", teamOnly.subtitle)
        // Not " · " — a lone separator under a name reads as a rendering bug.
        assertNull(neither.subtitle)
    }
}
