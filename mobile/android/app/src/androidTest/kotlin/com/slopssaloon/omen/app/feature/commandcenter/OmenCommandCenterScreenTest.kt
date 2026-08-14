package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.app.screenshot.ScreenshotScenarioHost
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OmenCommandCenterScreenTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun demoUrgentWaiverWatchReplacesThePlaceholder() {
        var openedOmen = false
        composeRule.setContent {
            OmenCommandCenterScreen(
                state = OmenCommandCenterFixtures.demoConnected,
                onOpenOmen = { openedOmen = true },
            )
        }

        assertTrue(
            composeRule.onAllNodesWithText("Review Omen’s waiver analysis", substring = true)
                .fetchSemanticsNodes().isNotEmpty()
        )
        assertEquals(0, composeRule.onAllNodesWithText("Waiver Watch is landing next").fetchSemanticsNodes().size)
        composeRule.onNodeWithText("Review Omen’s waiver analysis", substring = true).performClick()
        assertTrue(openedOmen)
    }

    @Test
    fun everyRequiredHonestWaiverWatchStateRendersItsApprovedMessage() {
        val cases = listOf(
            OmenWaiverWatchState.Pending to "Omen has identified an opportunity. Claim outcome is not yet known.",
            OmenWaiverWatchState.Processed to "Your league’s waivers have processed. Review current opportunities.",
            OmenWaiverWatchState.AvailabilityUnknown to "Omen cannot confirm availability for this league.",
            OmenWaiverWatchState.NoCredibleMove to "No waiver move stands out for this roster right now.",
            OmenWaiverWatchState.NotConnected to "Personalized waiver moves need a league",
            OmenWaiverWatchState.OffSeason to "Long-horizon waiver context",
        )

        var waiverWatch by mutableStateOf<OmenWaiverWatchState>(OmenWaiverWatchState.Pending)
        composeRule.setContent {
            OmenCommandCenterScreen(
                state = OmenCommandCenterFixtures.demoConnected.copy(waiverWatch = waiverWatch),
            )
        }

        for ((state, expectedText) in cases) {
            composeRule.runOnIdle { waiverWatch = state }
            assertTrue(composeRule.onAllNodesWithText(expectedText).fetchSemanticsNodes().isNotEmpty())
        }
    }

    @Test
    fun demoRendersApprovedLedgerAndLeaguePulseAndRoutesTheirActions() {
        var openedLedger = false
        var openedLeague = false
        composeRule.setContent {
            OmenCommandCenterScreen(
                state = OmenCommandCenterFixtures.demoConnected,
                onOpenLedger = { openedLedger = true },
                onOpenLeague = { openedLeague = true },
            )
        }

        assertEquals(0, composeRule.onAllNodesWithText("The Ledger is landing next").fetchSemanticsNodes().size)
        assertEquals(0, composeRule.onAllNodesWithText("League Pulse is landing next").fetchSemanticsNodes().size)
        composeRule.onNodeWithText("See all →").performScrollTo().performClick()
        composeRule.onNodeWithText("League →").performScrollTo().performClick()
        assertTrue(openedLedger)
        assertTrue(openedLeague)
        assertTrue(composeRule.onAllNodesWithText("No demo league activity feed", substring = true).fetchSemanticsNodes().isNotEmpty())
    }

    @Test
    fun screenshotShellIncludesContextualAccountControl() {
        composeRule.setContent { ScreenshotScenarioHost("command-center.demo-connected") }
        composeRule.onNodeWithContentDescription("Account and profile").assertIsDisplayed()
    }
}
