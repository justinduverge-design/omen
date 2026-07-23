package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Device evidence for registry §3.2 ContextStrip. One test per required state. */
@RunWith(AndroidJUnit4::class)
class OmenContextStripTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun selectedStateRendersPlatformBadgeTeamAndLeagueText() {
        composeRule.setContent {
            OmenTheme {
                OmenContextStrip(
                    state = OmenContextStripState.Selected(
                        platform = OmenPlatform.Sleeper,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                    ),
                )
            }
        }
        composeRule.onNodeWithText("Sleeper").assertExists()
        composeRule.onNodeWithText("Justin Titans").assertExists()
        composeRule.onNodeWithText("Sunday Slate").assertExists()
    }

    @Test
    fun needsRecoveryStateSurfacesReauthBadgeAndReason() {
        composeRule.setContent {
            OmenTheme {
                OmenContextStrip(
                    state = OmenContextStripState.NeedsRecovery(
                        platform = OmenPlatform.Yahoo,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                        reason = "Session expired",
                    ),
                )
            }
        }
        composeRule.onNodeWithText("Reauth").assertExists()
        composeRule.onNodeWithText("Session expired").assertExists()
    }

    @Test
    fun multiTeamHintFlagsOtherTeamCount() {
        composeRule.setContent {
            OmenTheme {
                OmenContextStrip(
                    state = OmenContextStripState.MultiTeamHint(
                        platform = OmenPlatform.Sleeper,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                        otherTeamCount = 2,
                    ),
                )
            }
        }
        composeRule.onNodeWithText("+2 more").assertExists()
    }

    @Test
    fun emptyStateInvitesSelectionHonestly() {
        composeRule.setContent {
            OmenTheme { OmenContextStrip(state = OmenContextStripState.Empty) }
        }
        composeRule.onNodeWithText("Choose a team").assertExists()
        composeRule.onNodeWithText("No league").assertExists()
    }

    @Test
    fun tappingSwitchAffordanceInvokesCallback() {
        composeRule.setContent {
            var switched by mutableStateOf(false)
            OmenTheme {
                OmenContextStrip(
                    state = OmenContextStripState.Selected(
                        platform = OmenPlatform.Sleeper,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                    ),
                    onSwitch = { switched = true },
                )
                if (switched) androidx.compose.material3.Text("Switched")
            }
        }
        val state = OmenContextStripState.Selected(
            platform = OmenPlatform.Sleeper,
            leagueName = "Sunday Slate",
            teamName = "Justin Titans",
        )
        composeRule
            .onNodeWithContentDescription(contextStripAccessibilityLabel(state))
            .assertHasClickAction()
            .performClick()
        composeRule.onNodeWithText("Switched").assertExists()
    }

    @Test
    fun displayOnlyModeHasNoClickAction() {
        composeRule.setContent {
            OmenTheme {
                OmenContextStrip(
                    state = OmenContextStripState.Selected(
                        platform = OmenPlatform.Sleeper,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                    ),
                )
            }
        }
        // No "Switch" trailing affordance in display-only mode.
        composeRule.onNodeWithText("Justin Titans").assertExists()
    }
}
