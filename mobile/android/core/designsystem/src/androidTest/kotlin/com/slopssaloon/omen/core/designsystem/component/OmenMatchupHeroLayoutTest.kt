package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Layout assertions for the matchup card — the surface that has shipped clipped twice.
 *
 * These use hostile content on purpose. The demo fixtures are polite: short team names and a
 * one-line "what to watch". Every clipping bug the founder has reported came from content
 * that was longer than the fixture, so a test built on the polite fixture would have passed
 * while the app was visibly broken on a real account.
 */
@RunWith(AndroidJUnit4::class)
class OmenMatchupHeroLayoutTest {
    @get:Rule val composeRule = createComposeRule()

    /** Three lines — the maximum `WhatToWatchRail` allows, and what a real signal reaches. */
    private val longSignal =
        "Opponent still has two starters on Monday night and needs 31.2 from them; " +
            "your kicker and defense are already final, so this game comes down to " +
            "their RB2 volume after halftime."

    private val hostile = OmenMatchupHeroState.Live(
        selectedTeam = OmenMatchupTeam(
            name = "Justin's Absolutely Enormous Fantasy Team Name",
            record = "6-1",
            scoreText = "64.8",
            projectedText = "119.6",
        ),
        opponent = OmenMatchupTeam(
            name = "G.O.A.T. SQUAD (Championship Or Bust Edition)",
            record = "5-2",
            scoreText = "58.1",
            projectedText = "114.2",
        ),
        whatToWatch = longSignal,
    )

    @Test
    fun longSignalIsNotClippedOnAPhoneWidthCard() {
        composeRule.setContent {
            OmenTheme(darkTheme = true) {
                Box(Modifier.width(360.dp)) {
                    OmenMatchupHero(state = hostile, modifier = Modifier.fillMaxWidth())
                }
            }
        }

        composeRule.onNodeWithText(longSignal, substring = true)
            .assertNotClipped("The 'what to watch' signal")
        composeRule.onNodeWithText("WHAT TO WATCH").assertNotClipped("The 'what to watch' label")
    }

    @Test
    fun longSignalSurvivesTheLargestAccessibilityFontScale() {
        // The layout has to reflow, not clip — registry §4 "Dynamic Type: all type roles
        // scale; layouts reflow, no clipped text". This is also where switching the Command
        // Center's scroll off is most likely to strand content, so it is worth proving the
        // card itself never becomes the thing that overflows.
        composeRule.setContent {
            val base = LocalDensity.current
            CompositionLocalProvider(
                LocalDensity provides Density(density = base.density, fontScale = 2.0f)
            ) {
                OmenTheme(darkTheme = true) {
                    Box(Modifier.width(360.dp)) {
                        OmenMatchupHero(state = hostile, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }

        composeRule.onNodeWithText(longSignal, substring = true)
            .assertNotClipped("The 'what to watch' signal at 2x font scale")
    }

    @Test
    fun aShortCardDoesNotReserveTheTallCardsHeight() {
        // The inverse of clipping, and the founder's "tighten up the box" note. A card with
        // no signal must not be padded out to the height of one that has three lines —
        // that dead space is what a fixed floor produces.
        val short = OmenMatchupHeroState.Live(
            selectedTeam = OmenMatchupTeam("DT", "6-1", "64.8", "119.6"),
            opponent = OmenMatchupTeam("Rivals", "5-2", "58.1", "114.2"),
            whatToWatch = null,
        )

        composeRule.setContent {
            OmenTheme(darkTheme = true) {
                Box(Modifier.width(360.dp)) {
                    OmenMatchupHero(state = short, modifier = Modifier.fillMaxWidth())
                }
            }
        }

        val height = composeRule.onNodeWithText("DT", substring = true)
            .getUnclippedBoundsInRoot()
        // Not an exact number — a brittle pixel assertion would fail on every type tweak.
        // The claim is only that the row sits in the upper half of a card that is no longer
        // floored at 220dp.
        assert(height.top < 200.dp) {
            "The matchup row starts at ${height.top}, which means the card is reserving " +
                "height it is not using."
        }
    }
}
