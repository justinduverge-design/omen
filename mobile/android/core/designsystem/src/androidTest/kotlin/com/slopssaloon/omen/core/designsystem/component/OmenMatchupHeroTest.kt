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

/** Device evidence for registry §3.2 MatchupHero. One test per required temporal state. */
@RunWith(AndroidJUnit4::class)
class OmenMatchupHeroTest {

    @get:Rule
    val composeRule = createComposeRule()

    private val myTeam = OmenMatchupTeam(name = "Justin Titans", record = "6–1", scoreText = "64.8")
    private val theirTeam = OmenMatchupTeam(name = "Marcus Team", record = "5–2", scoreText = "58.1")

    @Test
    fun liveStateRendersBothScoresAndOptionalProjectedFinish() {
        composeRule.setContent {
            OmenTheme {
                OmenMatchupHero(
                    state = OmenMatchupHeroState.Live(
                        selectedTeam = myTeam,
                        opponent = theirTeam,
                        projectedFinish = "119.6–114.2",
                        whatToWatch = "Opponent has two players remaining Monday night.",
                    ),
                )
            }
        }
        composeRule.onNodeWithText("LIVE").assertExists()
        composeRule.onNodeWithText("64.8").assertExists()
        composeRule.onNodeWithText("58.1").assertExists()
        composeRule.onNodeWithText("Projected finish: 119.6–114.2").assertExists()
        composeRule.onNodeWithText("WHAT TO WATCH").assertExists()
    }

    @Test
    fun beforeGamesStateLabelsProjectionAndStartTime() {
        composeRule.setContent {
            OmenTheme {
                OmenMatchupHero(
                    state = OmenMatchupHeroState.BeforeGames(
                        selectedTeam = OmenMatchupTeam("Justin Titans", "6–1", "119.6"),
                        opponent = OmenMatchupTeam("Marcus Team", "5–2", "114.2"),
                        startTime = "Sun 1:00p ET",
                        whatToWatch = null,
                    ),
                )
            }
        }
        composeRule.onNodeWithText("MATCHUP · Sun 1:00p ET").assertExists()
        composeRule.onNodeWithText("Projected: 119.6–114.2").assertExists()
    }

    @Test
    fun finalStateRendersPlainResultSummary() {
        composeRule.setContent {
            OmenTheme {
                OmenMatchupHero(
                    state = OmenMatchupHeroState.Final(
                        selectedTeam = myTeam,
                        opponent = theirTeam,
                        resultSummary = "You won 128.4 to 121.7.",
                        whatToWatch = null,
                    ),
                )
            }
        }
        composeRule.onNodeWithText("FINAL").assertExists()
        composeRule.onNodeWithText("You won 128.4 to 121.7.").assertExists()
    }

    @Test
    fun noMatchupStateRendersReasonWithoutFabricatedScores() {
        composeRule.setContent {
            OmenTheme {
                OmenMatchupHero(state = OmenMatchupHeroState.NoMatchup(reason = "No matchup this week — bye."))
            }
        }
        composeRule.onNodeWithText("MATCHUP").assertExists()
        composeRule.onNodeWithText("No matchup this week — bye.").assertExists()
    }

    @Test
    fun tappingLiveHeroInvokesOnOpen() {
        composeRule.setContent {
            var opened by mutableStateOf(false)
            OmenTheme {
                OmenMatchupHero(
                    state = OmenMatchupHeroState.Live(
                        selectedTeam = myTeam,
                        opponent = theirTeam,
                        projectedFinish = null,
                        whatToWatch = null,
                    ),
                    onOpen = { opened = true },
                )
                if (opened) androidx.compose.material3.Text("Opened")
            }
        }
        val state = OmenMatchupHeroState.Live(
            selectedTeam = myTeam,
            opponent = theirTeam,
            projectedFinish = null,
            whatToWatch = null,
        )
        composeRule
            .onNodeWithContentDescription(matchupHeroAccessibilityLabel(state))
            .assertHasClickAction()
            .performClick()
        composeRule.onNodeWithText("Opened").assertExists()
    }
}
