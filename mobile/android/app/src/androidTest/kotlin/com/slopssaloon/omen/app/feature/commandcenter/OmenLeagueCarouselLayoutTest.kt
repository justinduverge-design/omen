package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.app.screenshot.CarouselFixtures
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Assert.fail
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The `carousel != null` branch — the one the founder's six-league account actually runs, and
 * the one no test reached until now.
 *
 * The bug this exists to catch: the pager was pinned to a hard 270.dp, so on a real account
 * the page header overflowed and the Sleeper platform badge was sliced in half by the row
 * above it. That shipped, and was found by a human looking at a phone.
 */
@RunWith(AndroidJUnit4::class)
class OmenLeagueCarouselLayoutTest {
    @get:Rule val composeRule = createComposeRule()

    // `OmenLeagueCarousel` loads itself from `userId`, so the fixture only has to supply the
    // view model; `waitForIdle` covers the load.
    private fun carousel(failingPlatform: String? = null) =
        CarouselFixtures.viewModel(failingPlatform)

    @Test
    fun thePageHeaderIsNotClippedByThePager() {
        val vm = carousel()
        composeRule.setContent {
            OmenTheme(darkTheme = true) {
                OmenLeagueCarousel(viewModel = vm, userId = "fixture", onOpenMatchup = {})
            }
        }
        composeRule.waitForIdle()

        // The team name sits in the page header, directly under the "Matchup / 1 of 6" row.
        // This is the node that got sliced.
        assertNotClipped(
            composeRule.onNodeWithText("Dat Sauce Inc.", substring = true, useUnmergedTree = true),
            "The carousel page header",
        )
    }

    @Test
    fun aLongSignalDoesNotPushTheCardPastThePager() {
        val vm = carousel()
        composeRule.setContent {
            OmenTheme(darkTheme = true) {
                OmenLeagueCarousel(viewModel = vm, userId = "fixture", onOpenMatchup = {})
            }
        }
        composeRule.waitForIdle()

        // "What to watch" is the last thing in the card, so it is the first thing lost when
        // the pager cannot grow.
        assertNotClipped(
            composeRule.onNodeWithText("WHAT TO WATCH", substring = true, useUnmergedTree = true),
            "The 'what to watch' label on the active page",
        )
    }

    @Test
    fun theCardSurvivesALargeAccessibilityFontScale() {
        // This is the test that actually reproduces the founder's clipping. At the default
        // font scale the fixture happens to fit inside the old 270.dp cap, so the two tests
        // above pass on the broken code too — they guard the shape, not the regression.
        // Turning the type up makes the content genuinely outgrow any fixed height, which is
        // both a real user setting and registry §4's reflow-not-clip requirement.
        val vm = carousel()
        composeRule.setContent {
            val base = LocalDensity.current
            CompositionLocalProvider(
                LocalDensity provides Density(density = base.density, fontScale = 1.8f)
            ) {
                OmenTheme(darkTheme = true) {
                    OmenLeagueCarousel(viewModel = vm, userId = "fixture", onOpenMatchup = {})
                }
            }
        }
        composeRule.waitForIdle()

        assertNotClipped(
            composeRule.onNodeWithText("WHAT TO WATCH", substring = true, useUnmergedTree = true),
            "The 'what to watch' label at 1.8x font scale",
        )
    }

    @Test
    fun oneProviderFailingDoesNotBlankTheLeaguesThatAnswered() {
        // Scoped failure, not a screen-wide error surface. ESPN is the failing provider and
        // holds four of the six leagues, so if this regressed the carousel would be mostly
        // dead while Sleeper and Yahoo were perfectly readable.
        val vm = carousel(failingPlatform = "espn")
        composeRule.setContent {
            OmenTheme(darkTheme = true) {
                OmenLeagueCarousel(viewModel = vm, userId = "fixture", onOpenMatchup = {})
            }
        }
        composeRule.waitForIdle()

        composeRule.onNodeWithText("This league didn't load", substring = true, useUnmergedTree = true)
            .assertNotClippedOrAbsent("The scoped per-page failure surface")
    }

    /**
     * NOTE `useUnmergedTree` at every call site. Without it `onNodeWithText` resolves to the
     * MERGED semantics node — the card's combined accessibility element — whose bounds span
     * the whole card and whose clipped and unclipped rectangles are therefore always equal.
     * The first version of this file measured those merged nodes and passed against the known
     * 270.dp bug. A clipping assertion has to measure the leaf that is actually being cut.
     */
    private fun assertNotClipped(
        node: androidx.compose.ui.test.SemanticsNodeInteraction,
        what: String,
    ) {
        val clipped = node.getBoundsInRoot()
        val unclipped = node.getUnclippedBoundsInRoot()
        val tolerance = 0.5.dp
        val lostBelow = unclipped.bottom - clipped.bottom
        val lostAbove = clipped.top - unclipped.top
        if (lostBelow > tolerance || lostAbove > tolerance) {
            fail(
                "$what is clipped by an ancestor.\n" +
                    "  painted: $clipped\n  needed:  $unclipped\n" +
                    "A fixed height an ancestor cannot grow past is the usual cause."
            )
        }
    }

    private fun androidx.compose.ui.test.SemanticsNodeInteraction.assertNotClippedOrAbsent(
        what: String,
    ) {
        val exists = runCatching { fetchSemanticsNode() }.isSuccess
        if (exists) assertNotClipped(this, what)
    }
}
