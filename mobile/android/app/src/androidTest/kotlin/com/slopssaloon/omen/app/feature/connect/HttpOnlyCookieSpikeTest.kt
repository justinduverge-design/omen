package com.slopssaloon.omen.app.feature.connect

import android.webkit.CookieManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Platform-fact guard, Android half: **does `CookieManager` expose HttpOnly cookie values to the
 * app?**
 *
 * The iOS twin of this file is `OmenIOSTests/HttpOnlyCookieSpikeTests.swift`, and it exists
 * because this exact question has now been answered wrongly twice in this repo — once by
 * inference (`2026-07-07-espn-ios-cookie-sync-research.md` §C reasoned from WebKit test fixtures
 * that `WKHTTPCookieStore` would redact HttpOnly; it does not) and once by mistaking API presence
 * for capability (`2026-08-15-espn-mobile-feasibility-memo.md`: the Safari extension `cookies` API
 * is present on iOS, converts, and builds — and returns empty for every HttpOnly read).
 *
 * That memo's own words: *"The build succeeding made it look verified. It wasn't; it was only
 * compiled."* The Android ESPN port must not be written on an assumption. This runs first.
 *
 * **No ESPN, no account, no credential.** HttpOnly is enforced by the WebView's cookie store, not
 * by ESPN, so a synthetic cookie answers the question and this stays re-runnable forever.
 */
@RunWith(AndroidJUnit4::class)
class HttpOnlyCookieSpikeTest {

    private val probeUrl = "https://spike.invalid/"
    private val sentinel = "SPIKE_SENTINEL_VALUE_0123456789"

    @Before
    fun clearJar() {
        val manager = CookieManager.getInstance()
        manager.removeAllCookies(null)
        manager.flush()
    }

    /**
     * Control. Establishes the harness works — a normal cookie must round-trip, or a negative
     * result on the HttpOnly one proves nothing about HttpOnly.
     *
     * The iOS spike's first run returned "not readable" and was wrong for exactly this reason:
     * the store had silently dropped every write. Only the control caught it.
     */
    @Test
    fun spikeControl_normalCookieRoundTripsThroughCookieManager() {
        val manager = CookieManager.getInstance()
        manager.setCookie(probeUrl, "spike_normal=$sentinel; Path=/")
        manager.flush()

        val jar = manager.getCookie(probeUrl)
        assertNotNull("CONTROL FAILED — the harness cannot round-trip even a normal cookie", jar)
        assertTrue("CONTROL FAILED — normal cookie value missing: $jar", jar.contains(sentinel))
    }

    /**
     * The actual question.
     *
     * Written to report rather than to assert a hoped-for answer: the point of a spike is to learn
     * the fact. The verdict is the logged line; a red X here means the harness broke.
     */
    @Test
    fun spike_doesCookieManagerExposeAnHttpOnlyCookieValue() {
        val manager = CookieManager.getInstance()
        manager.setCookie(probeUrl, "spike_http_only=$sentinel; Path=/; Secure; HttpOnly")
        manager.flush()

        val jar = manager.getCookie(probeUrl).orEmpty()
        val readable = jar.contains(sentinel)

        val verdict = when {
            readable -> "READABLE — CookieManager returned the HttpOnly value in full."
            jar.contains("spike_http_only") -> "PRESENT BUT REDACTED — named without its value."
            else -> "NOT READABLE — CookieManager withheld the HttpOnly cookie entirely."
        }

        println(
            """
            ============================================================
            SPIKE RESULT — Android CookieManager vs HttpOnly
            $verdict
            Jar contents (names only): ${jar.split(";").map { it.substringBefore("=").trim() }}
            ============================================================
            """.trimIndent()
        )

        // Recorded as an assertion so the answer is in the run's verdict, not only its log.
        // If Android cannot read HttpOnly, the ESPN Android port has no mechanism and this
        // failing is the correct, load-bearing signal — not a flake to route around.
        assertTrue(
            "Android cannot read HttpOnly cookies — the ESPN Android port has no mechanism. $verdict",
            readable
        )
    }

    /**
     * Guards the shape the port would actually rely on: `getCookie` returns one header string for
     * a URL, so both ESPN values have to be parsed out of it rather than fetched by name.
     */
    @Test
    fun spike_bothEspnShapedCookiesSurviveInOneJarString() {
        val manager = CookieManager.getInstance()
        manager.setCookie(probeUrl, "espn_s2=S2VALUE; Path=/; HttpOnly")
        manager.setCookie(probeUrl, "SWID={SWIDVALUE}; Path=/")
        manager.flush()

        val jar = manager.getCookie(probeUrl).orEmpty()
        assertTrue("espn_s2 missing from jar: $jar", jar.contains("espn_s2=S2VALUE"))
        assertTrue("SWID missing from jar: $jar", jar.contains("SWID={SWIDVALUE}"))
        // Cross-check that a name-collision cannot silently substitute one for the other.
        assertFalse(jar.contains("espn_s2={SWIDVALUE}"))
    }
}
