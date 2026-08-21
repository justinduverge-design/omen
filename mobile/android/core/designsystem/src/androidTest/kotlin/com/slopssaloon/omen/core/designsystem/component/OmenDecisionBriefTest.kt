package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.filterToOne
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Device evidence for registry §3.2 DecisionBrief shell (Batch 3). One test per required
 * state surface — success/empty/loading/error/disconnected/stale/mock/off-season — plus the
 * feedback-slot contract. Assertions target the redundant text carriers so meaning
 * survives grayscale (registry §1, §2.3, §4).
 */
@RunWith(AndroidJUnit4::class)
class OmenDecisionBriefTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val payload = OmenDecisionBriefPayload(
        verdict = "Start Christian McCaffrey",
        move = "Bench Ken Walker for the RB1 slot.",
        impact = "+4.1 projected over your bench.",
        confidence = 72,
        risk = OmenRiskLevel.Low,
        riskReasons = listOf("Full practice Friday."),
        explanation = listOf("49ers implied 27 vs a bottom-5 defense."),
        metrics = listOf(OmenMetricItem(label = "Projected", value = "22.4", delta = "+4.1", deltaDirection = OmenMetricDelta.Positive)),
        signals = listOf(OmenSignalItem(label = "Yahoo roster snapshot", source = OmenSignalSource.Live)),
        alternatives = listOf(OmenDecisionBriefAlternative(name = "Ken Walker III", position = OmenPosition.RB, team = "SEA")),
    )

    @Test
    fun successRendersVerdictMoveConfidenceRiskAndAlternatives() {
        composeRule.setContent {
            OmenTheme { OmenDecisionBrief(state = OmenDecisionBriefState.Success(payload)) }
        }
        composeRule.onNodeWithText("Start Christian McCaffrey").assertExists()
        composeRule.onNodeWithText("Bench Ken Walker for the RB1 slot.").assertExists()
        composeRule.onNodeWithContentDescription("Confidence 72 out of 100").assertExists()
        composeRule.onNodeWithText("Low risk").assertExists()
        composeRule.onNodeWithText("Also considered").assertExists()
        composeRule.onNodeWithText("Ken Walker III").assertExists()
    }

    @Test
    fun emptyStateRendersHonestCopyNotFakeAdvice() {
        composeRule.setContent {
            OmenTheme {
                OmenDecisionBrief(state = OmenDecisionBriefState.Empty("Your lineup is already optimal."))
            }
        }
        composeRule.onNodeWithText("Nothing to recommend right now").assertExists()
        composeRule.onNodeWithText("Your lineup is already optimal.").assertExists()
    }

    @Test
    fun loadingStateUsesContextualCopyNotLoadingEllipsis() {
        composeRule.setContent {
            OmenTheme { OmenDecisionBrief(state = OmenDecisionBriefState.Loading) }
        }
        composeRule.onNodeWithText("Analyzing your matchup…").assertExists()
    }

    @Test
    fun errorStateShowsMessageAndInvokesRetry() {
        composeRule.setContent {
            var retried by mutableStateOf(false)
            OmenTheme {
                OmenDecisionBrief(
                    state = OmenDecisionBriefState.Error(
                        message = "The recommendation engine timed out.",
                        onRetry = { retried = true },
                    ),
                )
                if (retried) androidx.compose.material3.Text("Retried")
            }
        }
        composeRule.onNodeWithText("Unable to build this recommendation").assertExists()
        composeRule.onNodeWithText("The recommendation engine timed out.").assertExists()
        composeRule.onNodeWithText("Try again").assertHasClickAction().performClick()
        composeRule.onNodeWithText("Retried").assertExists()
    }

    @Test
    fun disconnectedStateRoutesToConnectCta() {
        composeRule.setContent {
            var connected by mutableStateOf(false)
            OmenTheme {
                OmenDecisionBrief(
                    state = OmenDecisionBriefState.Disconnected(onConnect = { connected = true }),
                )
                if (connected) androidx.compose.material3.Text("Connecting")
            }
        }
        // "Connect a league" appears on both the state-surface title and the CTA button;
        // filter to the one with a click action.
        composeRule.onAllNodesWithText("Connect a league")
            .filterToOne(hasClickAction())
            .performClick()
        composeRule.onNodeWithText("Connecting").assertExists()
    }

    @Test
    fun staleStateBannersLastSyncAndRendersPayload() {
        composeRule.setContent {
            OmenTheme {
                OmenDecisionBrief(
                    state = OmenDecisionBriefState.Stale(payload, lastSynced = "12 minutes ago"),
                )
            }
        }
        composeRule.onNodeWithText("Stale").assertExists()
        composeRule.onNodeWithText("Showing your last sync · 12 minutes ago").assertExists()
        composeRule.onNodeWithText("Start Christian McCaffrey").assertExists()
    }

    @Test
    fun mockStateLabelsFixtureDataAndRendersPayload() {
        composeRule.setContent {
            OmenTheme { OmenDecisionBrief(state = OmenDecisionBriefState.Mock(payload)) }
        }
        composeRule.onNodeWithText("Mock").assertExists()
        composeRule.onNodeWithText("Fixture data — not live advice.").assertExists()
        composeRule.onNodeWithText("Start Christian McCaffrey").assertExists()
    }

    @Test
    fun demoStateLabelsSampleDataAndRendersPayload() {
        composeRule.setContent {
            OmenTheme { OmenDecisionBrief(state = OmenDecisionBriefState.Demo(payload)) }
        }
        composeRule.onNodeWithText("Demo").assertExists()
        composeRule.onNodeWithText("Sample data — not live advice.").assertExists()
        composeRule.onNodeWithText("Start Christian McCaffrey").assertExists()
    }

    @Test
    fun offSeasonStateHasItsOwnCopy() {
        composeRule.setContent {
            OmenTheme { OmenDecisionBrief(state = OmenDecisionBriefState.OffSeason) }
        }
        composeRule.onNodeWithText("Omen is off this week").assertExists()
    }

    @Test
    fun feedbackSlotRendersInsideSuccessPayload() {
        composeRule.setContent {
            OmenTheme {
                OmenDecisionBrief(
                    state = OmenDecisionBriefState.Success(payload),
                    feedbackSlot = { androidx.compose.material3.Text("Feedback goes here") },
                )
            }
        }
        composeRule.onNodeWithText("Feedback goes here").assertExists()
    }
}
