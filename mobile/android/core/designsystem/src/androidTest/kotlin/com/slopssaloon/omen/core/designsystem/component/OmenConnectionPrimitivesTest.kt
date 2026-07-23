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

/**
 * Device evidence for registry §3.2 identity + connection compositions — PlayerRow /
 * PlayerChip, ConnectionStatusBadge, PlatformConnectionCard. Assertions target the
 * redundant text carriers required by the "color is never alone" invariant
 * (registry §1, §2.3, §4).
 */
@RunWith(AndroidJUnit4::class)
class OmenConnectionPrimitivesTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun playerRowRendersPositionNameAndSubline() {
        composeRule.setContent {
            OmenTheme {
                OmenPlayerRow(
                    name = "Christian McCaffrey",
                    position = OmenPosition.RB,
                    team = "SF",
                    meta = "Q vs Dal, 4:25p ET",
                )
            }
        }
        composeRule.onNodeWithText("Christian McCaffrey").assertExists()
        composeRule.onNodeWithText("RB").assertExists()
        composeRule.onNodeWithText("SF · Q vs Dal, 4:25p ET").assertExists()
    }

    @Test
    fun interactivePlayerRowInvokesAction() {
        composeRule.setContent {
            var tapped by mutableStateOf(false)
            OmenTheme {
                OmenPlayerRow(
                    name = "Justin Jefferson",
                    position = OmenPosition.WR,
                    team = "MIN",
                    onClick = { tapped = true },
                )
                if (tapped) androidx.compose.material3.Text("Tapped")
            }
        }
        composeRule
            .onNodeWithContentDescription("Justin Jefferson")
            .assertHasClickAction()
            .performClick()
        composeRule.onNodeWithText("Tapped").assertExists()
    }

    @Test
    fun playerChipFoldsPositionIntoLabel() {
        composeRule.setContent {
            OmenTheme { OmenPlayerChip(name = "Kelce", position = OmenPosition.TE) }
        }
        composeRule.onNodeWithText("TE · Kelce").assertExists()
    }

    @Test
    fun connectionStatusBadgeLabelsEveryStateInWords() {
        composeRule.setContent {
            OmenTheme {
                androidx.compose.foundation.layout.Column {
                    OmenConnectionStatusBadge(status = OmenConnectionStatus.Connected)
                    OmenConnectionStatusBadge(status = OmenConnectionStatus.Disconnected)
                    OmenConnectionStatusBadge(status = OmenConnectionStatus.NeedsReauth)
                    OmenConnectionStatusBadge(status = OmenConnectionStatus.Error)
                    OmenConnectionStatusBadge(status = OmenConnectionStatus.Pending)
                    OmenConnectionStatusBadge(status = OmenConnectionStatus.Recovering)
                }
            }
        }
        composeRule.onNodeWithText("Connected").assertExists()
        composeRule.onNodeWithText("Disconnected").assertExists()
        composeRule.onNodeWithText("Reauth needed").assertExists()
        composeRule.onNodeWithText("Error").assertExists()
        composeRule.onNodeWithText("Pending").assertExists()
        composeRule.onNodeWithText("Recovering").assertExists()
    }

    @Test
    fun platformConnectionCardShowsBadgesDescriptionAndActionTogether() {
        composeRule.setContent {
            var reconnected by mutableStateOf(false)
            OmenTheme {
                OmenPlatformConnectionCard(
                    platform = OmenPlatform.Yahoo,
                    status = OmenConnectionStatus.NeedsReauth,
                    description = "Reconnect to restore this week's roster.",
                    actionLabel = "Reconnect Yahoo",
                    onAction = { reconnected = true },
                )
                if (reconnected) androidx.compose.material3.Text("Reconnected")
            }
        }
        composeRule.onNodeWithText("Yahoo").assertExists()
        composeRule.onNodeWithText("Reauth needed").assertExists()
        composeRule.onNodeWithText("Reconnect to restore this week's roster.").assertExists()
        composeRule.onNodeWithText("Reconnect Yahoo").performClick()
        composeRule.onNodeWithText("Reconnected").assertExists()
    }

    @Test
    fun platformConnectionCardWithoutActionRendersWithoutButton() {
        composeRule.setContent {
            OmenTheme {
                OmenPlatformConnectionCard(
                    platform = OmenPlatform.Sleeper,
                    status = OmenConnectionStatus.Connected,
                    description = "Last synced 4 minutes ago.",
                )
            }
        }
        composeRule.onNodeWithText("Sleeper").assertExists()
        composeRule.onNodeWithText("Connected").assertExists()
        composeRule.onNodeWithText("Last synced 4 minutes ago.").assertExists()
    }
}
