package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OmenConfirmationDialogTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun rendersTitleMessageAndBothActions() {
        composeRule.setContent {
            OmenTheme {
                OmenConfirmationDialog(
                    visible = true,
                    title = "Leave draft?",
                    message = "Your picks will be lost.",
                    confirmLabel = "Leave",
                    cancelLabel = "Stay",
                    onConfirm = {},
                    onDismiss = {},
                )
            }
        }
        composeRule.onNodeWithText("Leave draft?").assertExists()
        composeRule.onNodeWithText("Your picks will be lost.").assertExists()
        composeRule.onNodeWithText("Leave").assertExists()
        composeRule.onNodeWithText("Stay").assertExists()
    }

    @Test
    fun confirmFiresOnConfirmAndCancelFiresOnDismiss() {
        var confirmed = 0
        var dismissed = 0
        composeRule.setContent {
            OmenTheme {
                OmenConfirmationDialog(
                    visible = true,
                    title = "Delete lineup?",
                    message = "This cannot be undone.",
                    confirmLabel = "Delete",
                    cancelLabel = "Cancel",
                    onConfirm = { confirmed++ },
                    onDismiss = { dismissed++ },
                    variant = OmenConfirmationVariant.Destructive,
                )
            }
        }
        composeRule.onNodeWithText("Delete").performClick()
        composeRule.onNodeWithText("Cancel").performClick()
        assertEquals(1, confirmed)
        assertEquals(1, dismissed)
    }

    @Test
    fun invisibleDialogDoesNotRender() {
        composeRule.setContent {
            OmenTheme {
                OmenConfirmationDialog(
                    visible = false,
                    title = "Never shown",
                    message = "Hidden",
                    confirmLabel = "OK",
                    cancelLabel = "No",
                    onConfirm = {},
                    onDismiss = {},
                )
            }
        }
        composeRule.onNodeWithText("Never shown").assertDoesNotExist()
    }

    @Test
    fun variantsAreDistinctValues() {
        assertTrue(OmenConfirmationVariant.Default != OmenConfirmationVariant.Destructive)
    }

    @Test
    fun controllableVisibilityShowsAndHides() {
        composeRule.setContent {
            OmenTheme {
                var visible by remember { mutableStateOf(true) }
                OmenConfirmationDialog(
                    visible = visible,
                    title = "Toggle me",
                    message = "Body",
                    confirmLabel = "Yes",
                    cancelLabel = "No",
                    onConfirm = { visible = false },
                    onDismiss = { visible = false },
                )
            }
        }
        composeRule.onNodeWithText("Toggle me").assertExists()
        composeRule.onNodeWithText("Yes").performClick()
        composeRule.onNodeWithText("Toggle me").assertDoesNotExist()
    }
}
