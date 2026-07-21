package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.ui.test.hasStateDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Device evidence that the six registry states remain distinct and announce their status. */
@RunWith(AndroidJUnit4::class)
class OmenStateSurfaceTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun stateSurfacesExposeDistinctHonestStates() {
        composeRule.setContent {
            OmenTheme {
                OmenStateSurface(OmenStateSurfaceKind.Empty, "No lineup", "Choose a league.")
                OmenStateSurface(OmenStateSurfaceKind.Loading, "Analyzing your matchup…", "Checking roster signals.", reducedMotion = true)
                OmenStateSurface(OmenStateSurfaceKind.Error, "Unable to refresh", "Try again.")
                OmenStateSurface(OmenStateSurfaceKind.Disconnected, "League disconnected", "Reconnect to continue.")
                OmenStateSurface(OmenStateSurfaceKind.Stale, "Showing your last sync", "This data may be out of date.")
                OmenStateSurface(OmenStateSurfaceKind.Mock, "Demo analysis", "This is sample data.")
            }
        }

        listOf("Empty", "Loading", "Error", "Disconnected", "Stale", "Mock").forEach { state ->
            composeRule.onNode(hasStateDescription(state)).assertExists()
        }
        composeRule.onNodeWithText("Analyzing your matchup…").assertExists()
        composeRule.onNodeWithText("Demo analysis").assertExists()
    }
}
