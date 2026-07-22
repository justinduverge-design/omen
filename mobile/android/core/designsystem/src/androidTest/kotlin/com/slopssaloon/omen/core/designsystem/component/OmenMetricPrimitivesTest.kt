package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Device evidence for registry §3.2 metric primitives — ConfidenceBar, RiskPanel,
 * MetricStrip, SignalList. Assertions target the redundant text carriers required by the
 * "color is never alone" invariant (registry §1, §2.3, §4).
 */
@RunWith(AndroidJUnit4::class)
class OmenMetricPrimitivesTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun confidenceBarClampsAndReadsScoreAloud() {
        composeRule.setContent {
            OmenTheme { OmenConfidenceBar(score = 145, label = "Confidence") }
        }
        // Clamped to 100 in both the visible numeric label and the accessibility label.
        composeRule.onNodeWithText("100").assertExists()
        composeRule.onNodeWithContentDescription("Confidence 100 out of 100").assertExists()
    }

    @Test
    fun confidenceBarNegativeScoreClampsToZero() {
        composeRule.setContent {
            OmenTheme { OmenConfidenceBar(score = -20) }
        }
        composeRule.onNodeWithText("0").assertExists()
        composeRule.onNodeWithContentDescription("Confidence 0 out of 100").assertExists()
    }

    @Test
    fun riskPanelBadgesEachLevelWithWords() {
        composeRule.setContent {
            OmenTheme {
                OmenRiskPanel(level = OmenRiskLevel.High, reasons = listOf("Starter ruled out."))
            }
        }
        composeRule.onNodeWithText("High risk").assertExists()
        composeRule.onNodeWithText("Starter ruled out.").assertExists()
    }

    @Test
    fun metricStripRendersValueDeltaAndOptionalConfidence() {
        composeRule.setContent {
            OmenTheme {
                OmenMetricStrip(
                    items = listOf(
                        OmenMetricItem(
                            label = "Projected",
                            value = "142.6",
                            delta = "+4.1",
                            deltaDirection = OmenMetricDelta.Positive,
                            confidence = 72,
                        ),
                        OmenMetricItem(label = "Ceiling", value = "168.2"),
                    ),
                )
            }
        }
        composeRule.onNodeWithText("Projected").assertExists()
        composeRule.onNodeWithText("142.6").assertExists()
        composeRule.onNodeWithText("+4.1").assertExists()
        // Confidence subline renders the score text redundantly.
        composeRule.onNodeWithContentDescription("Confidence 72 out of 100").assertExists()
        composeRule.onNodeWithText("Ceiling").assertExists()
    }

    @Test
    fun signalListLabelsEverySourceInWords() {
        composeRule.setContent {
            OmenTheme {
                OmenSignalList(
                    signals = listOf(
                        OmenSignalItem(label = "Yahoo roster", source = OmenSignalSource.Live),
                        OmenSignalItem(label = "Opponent projections", source = OmenSignalSource.Stub),
                        OmenSignalItem(label = "Weather", source = OmenSignalSource.Mock),
                        OmenSignalItem(label = "Vegas totals", source = OmenSignalSource.Unavailable),
                    ),
                )
            }
        }
        composeRule.onNodeWithText("Live").assertExists()
        composeRule.onNodeWithText("Stub").assertExists()
        composeRule.onNodeWithText("Mock").assertExists()
        composeRule.onNodeWithText("Unavailable").assertExists()
        composeRule.onNodeWithText("Yahoo roster").assertExists()
    }
}
