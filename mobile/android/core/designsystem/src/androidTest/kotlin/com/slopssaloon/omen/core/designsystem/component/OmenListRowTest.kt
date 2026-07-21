package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OmenListRowTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun interactiveRowPresentsContentAndAnAction() {
        composeRule.setContent {
            OmenTheme {
                OmenListRow(
                    title = "Sunday Slate",
                    subtitle = "Sleeper · 12 teams",
                    onClick = {},
                )
            }
        }

        composeRule.onNode(hasContentDescription("Sunday Slate")).assertHasClickAction()
        composeRule.onNodeWithText("Sleeper · 12 teams").assertExists()
    }
}
