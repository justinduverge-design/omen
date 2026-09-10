package com.slopssaloon.omen.core.designsystem.component

import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * JVM cover for [matchupHeroAccessibilityLabel]. The device tests in `androidTest` cover what
 * the hero *renders*; this covers what it *announces*, which needs no emulator.
 *
 * The pre-game label read `scoreText` for both sides. Before kickoff `scoreText` is an em dash
 * by design — nobody has scored, and a "0.0" would read as a real score of nothing — so once
 * the PROJ column shipped on 2026-09-04 this label announced "projected —" while the screen
 * showed 100.7. iOS mirror: `OmenMatchupHeroTests`.
 */
class MatchupHeroLabelTest {

    @Test
    fun `compact team label uses initials for multi word names`() {
        assertTrue(omenCompactTeamLabel("Justin Titans") == "JT")
        assertTrue(omenCompactTeamLabel("The Wildly Unreasonable Playoff Machines") == "TWU")
    }

    @Test
    fun `compact team label uses first three characters for one word names`() {
        assertTrue(omenCompactTeamLabel("Scaries") == "SCA")
        assertTrue(omenCompactTeamLabel("RedLanternCorps") == "RED")
    }

    @Test
    fun `compact team label ignores punctuation between words`() {
        assertTrue(omenCompactTeamLabel("Puk Around & Find Out") == "PAF")
        assertTrue(omenCompactTeamLabel("Nico's Nine Lives") == "NNL")
    }

    @Test
    fun `pregame label announces the projection, not the em dash in the score slot`() {
        val label = matchupHeroAccessibilityLabel(
            OmenMatchupHeroState.BeforeGames(
                selectedTeam = OmenMatchupTeam("Puk Around & Find Out", "0-0", "—", "100.7"),
                opponent = OmenMatchupTeam("Pregame Nick", "0-0", "—", "95.8"),
                startTime = "Not started",
                whatToWatch = null,
            ),
        )

        assertTrue(label, label.contains("projected 100.7"))
        assertTrue(label, label.contains("projected 95.8"))
        assertTrue(label, !label.contains("projected —"))
    }

    /** The pre-column shape: no `projectedText`, so `scoreText` still carries the projection. */
    @Test
    fun `a caller with no projection falls back to the score slot as before`() {
        val label = matchupHeroAccessibilityLabel(
            OmenMatchupHeroState.BeforeGames(
                selectedTeam = OmenMatchupTeam("Justin Titans", "6–1", "119.6"),
                opponent = OmenMatchupTeam("Marcus Team", "5–2", "114.2"),
                startTime = "Sun 1:00p ET",
                whatToWatch = null,
            ),
        )

        assertTrue(label, label.contains("projected 119.6"))
        assertTrue(label, label.contains("projected 114.2"))
    }
}
