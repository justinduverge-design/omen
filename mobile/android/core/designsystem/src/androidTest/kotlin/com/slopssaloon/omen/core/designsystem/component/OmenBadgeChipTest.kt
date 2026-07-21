package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.semantics.SemanticsActions
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Device evidence for registry §3.1 Badge tones and interactive/display Chip states. */
@RunWith(AndroidJUnit4::class)
class OmenBadgeChipTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun badgeExposesItsStatusLabel() {
        composeRule.setContent {
            OmenTheme { OmenBadge(label = "Live", tone = OmenBadgeTone.Live) }
        }

        composeRule.onNodeWithText("Live").assertExists()
    }

    @Test
    fun interactiveChipInvokesItsActionAndDisabledChipDoesNot() {
        composeRule.setContent {
            var clicked by mutableStateOf(false)
            OmenTheme {
                OmenChip(label = "RB", tone = OmenChipTone.Rb, onClick = { clicked = true })
                OmenChip(label = "WR", tone = OmenChipTone.Wr, enabled = false, onClick = {})
                if (clicked) androidx.compose.material3.Text("Clicked")
            }
        }

        composeRule
            .onNodeWithContentDescription("RB")
            .assertHasClickAction()
            .performSemanticsAction(SemanticsActions.OnClick) { it() }
        composeRule.onNodeWithText("Clicked").assertExists()
        composeRule.onNodeWithContentDescription("WR").assertIsNotEnabled()
    }
}
