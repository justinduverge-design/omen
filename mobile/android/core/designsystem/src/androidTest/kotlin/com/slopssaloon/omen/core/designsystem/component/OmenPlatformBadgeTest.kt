package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OmenPlatformBadgeTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun rendersProviderLabelForEveryPlatform() {
        composeRule.setContent {
            OmenTheme {
                OmenPlatformBadge(OmenPlatform.Sleeper)
            }
        }
        composeRule.onNodeWithText("Sleeper").assertExists()
    }

    @Test
    fun yahooBadgeAlwaysShowsTextLabel() {
        composeRule.setContent {
            OmenTheme {
                OmenPlatformBadge(OmenPlatform.Yahoo)
            }
        }
        composeRule.onNodeWithText("Yahoo").assertExists()
    }

    @Test
    fun espnBadgeAlwaysShowsTextLabel() {
        composeRule.setContent {
            OmenTheme {
                OmenPlatformBadge(OmenPlatform.Espn)
            }
        }
        composeRule.onNodeWithText("ESPN").assertExists()
    }
}
