package com.slopssaloon.omen.app.feature.help

import com.slopssaloon.omen.app.screenshot.ScreenshotScenarios
import com.slopssaloon.omen.core.designsystem.component.OmenHelpTopic
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M6-ContextualHelp. These assertions exist because the content was ported from a web map that
 * contains two things native must never say. Review catches that once; a test catches it every
 * time.
 *
 * **Why this lives in `androidTest`.** `:app` has no JVM unit-test source set, and adding one
 * means editing `app/build.gradle.kts` to add `testImplementation` dependencies — a
 * founder-gated package-file change this task did not carry authority for. These are pure
 * data assertions and would run fine on the JVM; move them when a source set exists. The iOS
 * twin, `OmenContextualHelpTests`, runs without a device today.
 */
class ContextualHelpContentTest {

    /** Every individual string, for bans that must hold everywhere including short labels. */
    private val allText: List<String> = ContextualHelpContent.all().flatMap { topic ->
        listOf(topic.title, topic.summary) + topic.tips.flatMap { listOf(it.label, it.body) }
    }

    /**
     * Each *claim* the copy makes, as the reader encounters it. A tip's label and body are one
     * unit: "ESPN" is a heading for the sentence under it, not a standalone assertion.
     */
    private val claims: List<String> = ContextualHelpContent.all().flatMap { topic ->
        listOf(topic.summary) + topic.tips.map { "${it.label} — ${it.body}" }
    }

    @Test
    fun noDestinationMentionsDraftAssistant() {
        // Cut from 1.0 (facts-of-record #9). The web PAGE_HELP still advertises it.
        allText.forEach {
            assertFalse(
                "Draft Assistant is cut from 1.0 and must not appear in native help copy: \"$it\"",
                it.lowercase().contains("draft assistant"),
            )
        }
    }

    @Test
    fun espnIsOfferedAsAWebConnectionRatherThanAnInAppOne() {
        // ESPN connects, and Omen wants people to connect it — the league is linked once on the
        // website and then appears in the app. Only the *mechanism* differs from Sleeper, so the
        // rule is about where help points, not whether ESPN is mentioned.
        claims.filter { it.lowercase().contains("espn") }.forEach {
            assertTrue(
                "Native help may only describe ESPN as a website connection: \"$it\"",
                it.lowercase().contains("website"),
            )
        }

        // The check above would also pass if someone deleted ESPN outright to satisfy it. That
        // would be the wrong fix: it would strand every ESPN user with no path at all. Pin the
        // encouragement, not just the correction.
        assertTrue(
            "Connect help must still tell ESPN users how to connect",
            ContextualHelpContent.topic(OmenHelpDestination.Connect).tips.any { it.label == "ESPN" },
        )
    }

    @Test
    fun noDestinationAsksForAProviderPasswordOrCookie() {
        // Onboarding contract §5: a store build must never ask for a password or raw cookie.
        // Help copy ships in the store build.
        allText.forEach {
            val lowered = it.lowercase()
            assertFalse("Help copy must not mention cookies: \"$it\"", lowered.contains("cookie"))
            if (lowered.contains("password")) {
                assertTrue(
                    "The only permitted password sentence is the promise Omen never asks for one: \"$it\"",
                    lowered.contains("never"),
                )
            }
        }
    }

    @Test
    fun everyShippedDestinationHasATopic() {
        // Six since 2026-08-29: Trade and League gained topics when their screens shipped.
        assertEquals(6, OmenHelpDestination.entries.size)
        OmenHelpDestination.entries.forEach { destination ->
            val topic = ContextualHelpContent.topic(destination)
            assertTrue("$destination has no title", topic.title.isNotBlank())
            assertTrue("$destination has no summary", topic.summary.isNotBlank())
            assertTrue("$destination has no tips", topic.tips.isNotEmpty())
        }
    }

    @Test
    fun tradeAndLeagueHaveTopicsNowThatTheirScreensShip() {
        // This test used to assert their ABSENCE, with the note "delete this test when those
        // screens ship, and add their topics." `M5` slices F and G shipped on 2026-08-29, so
        // the assertion is inverted rather than deleted — a destination with a real screen and
        // no help is the gap this now guards against.
        val names = OmenHelpDestination.entries.map { it.name }
        assertTrue(names.contains("Trade"))
        assertTrue(names.contains("League"))
    }

    @Test
    fun noTopicExceedsTheShortExplanationCap() {
        // Spec §4: anything longer belongs in Help + Support, not in a contextual surface.
        ContextualHelpContent.all().forEach {
            assertTrue(
                "\"${it.title}\" is too long for a contextual surface — route it to Help Center",
                it.tips.size <= OmenHelpTopic.MAX_TIPS,
            )
        }
    }

    @Test
    fun screenshotRegistryIncludesContextualHelpEvidence() {
        assertTrue(ScreenshotScenarios.isKnown("contextual-help.omen"))
        assertTrue(ScreenshotScenarios.isKnown("contextual-help.connect"))
    }

    /**
     * Help copy is one of the places where a platform split is a defect, not a platform
     * difference. This pins the sentences that must stay identical to the iOS table in
     * `mobile/ios/OmenIOS/OmenIOS/App/Help/OmenContextualHelpContent.swift`.
     */
    @Test
    fun providerCopyMatchesTheIosTableAndTheConnectFlow() {
        val connect = ContextualHelpContent.topic(OmenHelpDestination.Connect)
        assertEquals(
            "Yahoo connections are paused while we wait on Yahoo to restore our data access.",
            connect.tips.first { it.label == "Yahoo" }.body,
        )
        assertEquals(
            "ESPN needs your browser to connect securely. Connect it once on the Omen website and it'll show up here.",
            connect.tips.first { it.label == "ESPN" }.body,
        )
    }

    /**
     * The Yahoo attribution wording is contractual. If someone "improves" this sentence, the app
     * stops satisfying the API Access and Use Agreement, so the exact string is pinned - and it
     * must stay identical to the iOS constant in `OmenHelpSupportView.swift`.
     */
    @Test
    fun yahooAttributionSentenceIsTheContractualWording() {
        assertEquals("Fantasy data provided by Yahoo Fantasy.", OMEN_YAHOO_ATTRIBUTION_TEXT)
    }

    /**
     * Attribution must not claim Yahoo data while Yahoo is on hold and no Yahoo data can be
     * displayed. It is tied to the availability decision so it turns on with Yahoo, not before.
     */
    @Test
    fun yahooAttributionIsHiddenWhileYahooIsOnHold() {
        assertFalse(omenShowsYahooAttribution())
    }
}
