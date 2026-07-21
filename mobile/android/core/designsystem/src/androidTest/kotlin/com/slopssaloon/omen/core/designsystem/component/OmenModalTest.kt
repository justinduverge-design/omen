package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.material3.Text
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** On-device evidence that the approved native sheet surface presents its named content. */
@RunWith(AndroidJUnit4::class)
class OmenModalTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun modalSheetPresentsTitleAndContent() {
        composeRule.setContent {
            OmenTheme {
                OmenModalSheet(visible = true, onDismissRequest = {}, title = "Choose a league") {
                    Text("Sunday Slate")
                }
            }
        }

        composeRule.onNodeWithText("Choose a league").assertExists()
        composeRule.onNodeWithText("Sunday Slate").assertExists()
    }
}
