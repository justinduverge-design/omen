package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.material3.Text
import androidx.compose.ui.test.hasStateDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Device evidence for registry §3.1's Card/Surface variants and error-state semantics. */
@RunWith(AndroidJUnit4::class)
class OmenCardTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun solidCardPreservesItsContent() {
        composeRule.setContent {
            OmenTheme {
                OmenCard { Text("Weekly Omen") }
            }
        }

        composeRule.onNodeWithText("Weekly Omen").assertExists()
    }

    @Test
    fun errorCardExposesAnErrorStateToTalkBack() {
        composeRule.setContent {
            OmenTheme {
                OmenCard(variant = OmenCardVariant.Error) { Text("Unable to refresh") }
            }
        }

        composeRule.onNode(hasStateDescription("Error")).assertExists()
        composeRule.onNodeWithText("Unable to refresh").assertExists()
    }
}
