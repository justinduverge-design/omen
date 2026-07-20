package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasStateDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertEquals

/** On-device behavior and TalkBack-semantics evidence for registry §3.1 field controls. */
@RunWith(AndroidJUnit4::class)
class OmenFieldTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun textFieldUpdatesValueAndAnnouncesItsError() {
        var value by mutableStateOf("")
        composeRule.setContent {
            OmenTheme {
                OmenFormField(label = "Email", errorMessage = "Enter a valid email") {
                    OmenTextField(
                        value = value,
                        onValueChange = { value = it },
                        label = "Email",
                        variant = OmenTextFieldVariant.Email,
                        isError = true,
                    )
                }
            }
        }

        composeRule.onNode(hasSetTextAction()).performTextInput("a@omen.test")
        composeRule.runOnIdle { assertEquals("a@omen.test", value) }
        composeRule.onNodeWithText("Enter a valid email").assertExists()
        composeRule.onNode(hasText("Email").and(hasStateDescription("Error"))).assertExists()
    }

    @Test
    fun disabledTextFieldIsNotEditable() {
        composeRule.setContent {
            OmenTheme {
                OmenTextField(
                    value = "Locked",
                    onValueChange = {},
                    label = "Team name",
                    enabled = false,
                )
            }
        }

        composeRule.onNodeWithText("Locked").assertIsNotEnabled()
    }

    @Test
    fun pickerPublishesSelectionAndSelectedState() {
        var selected by mutableStateOf("Standard")
        composeRule.setContent {
            OmenTheme {
                OmenPicker(
                    label = "Scoring format",
                    selectedOption = selected,
                    options = listOf("Standard", "PPR"),
                    onOptionSelected = { selected = it },
                )
            }
        }

        composeRule.onNodeWithText("Standard").performClick()
        composeRule.onNodeWithText("PPR").performClick()

        assertEquals("PPR", selected)
        composeRule.onNodeWithText("PPR").assertExists()
    }
}
