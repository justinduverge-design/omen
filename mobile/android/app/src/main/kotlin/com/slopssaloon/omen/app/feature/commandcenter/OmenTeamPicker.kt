package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.slopssaloon.omen.app.feature.api.LeagueCarouselViewModel
import com.slopssaloon.omen.core.designsystem.component.OmenChip
import com.slopssaloon.omen.core.designsystem.component.OmenChipTone
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import kotlinx.coroutines.launch

/**
 * One horizontal row of the user's teams, on the screens that are *about* one team.
 * iOS mirror: `App/CommandCenter/OmenTeamPicker.swift`.
 *
 * Founder sketch, 2026-09-04, left margin: "maybe we can create a small widget of the following
 * pages that lets the user pick other teams."
 *
 * Omen, Trade and League each answer a question about **one** league, and until this existed the
 * only way to change which one was to go back to Command Center, swipe the carousel, and come
 * back. Three taps and a screen change to answer "what about my other team?".
 *
 * ## Why it shares the carousel's view model
 *
 * Enumerating leagues makes live provider calls, so a picker with its own view model would pay
 * for the directory three more times — once per tab — and could disagree with Command Center
 * about which league is active while it did. Sharing one instance means the directory is already
 * loaded by the time any of these screens renders, the tap costs exactly one write, and there is
 * only ever one answer to "which league is active".
 *
 * ## Why it is not the carousel
 *
 * The carousel swipes because its pages carry a whole matchup each. These screens want a glance
 * and a tap: the row is short, every team is visible at once, and picking one is a single action
 * rather than a settle. Same commit underneath ([LeagueCarouselViewModel.commit]), different
 * gesture, because the two screens are asking different things of the user.
 */
@Composable
fun OmenTeamPicker(
    viewModel: LeagueCarouselViewModel,
    userId: String?,
    onContextChanged: (List<String>) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()

    // Loads only if Command Center has not already — the shared view model makes this a no-op
    // on the common path, and the guard exists for a deep link that lands here first.
    LaunchedEffect(userId) {
        if (viewModel.viewState is LeagueCarouselViewModel.ViewState.Loading) viewModel.load(userId)
    }

    val pages = viewModel.allPages
    // One league is not a choice. Rendering a row with a single chip would be a control that can
    // only ever confirm what the screen already says.
    if (pages.size <= 1) return

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        Text("Your Teams", style = OmenTheme.typography.label.toTextStyle())
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        ) {
            pages.forEach { page ->
                val state = when {
                    page.isActive -> ", the league Omen is using"
                    viewModel.committingPageId == page.id -> ", switching"
                    else -> ""
                }
                OmenChip(
                    // The team, not the league: these screens are about a roster, and the team
                    // name is what the user calls it. The league rides in the content
                    // description, which is where a long name belongs anyway.
                    label = page.displayTeamName,
                    tone = chipTone(page.platform),
                    selected = page.isActive,
                    enabled = viewModel.committingPageId == null,
                    onClick = {
                        scope.launch { viewModel.commit(page)?.let(onContextChanged) }
                    },
                    modifier = Modifier.semantics {
                        contentDescription = "${page.displayTeamName}, ${page.displayLeagueName}, " +
                            "${platformDisplayName(page.platform)}$state"
                    },
                )
            }
        }
    }
}

/**
 * Each chip carries its provider's colour, so the row doubles as the answer to "which of these
 * is my ESPN team" without a second line of text.
 */
private fun chipTone(platform: String): OmenChipTone = when (platform) {
    "espn" -> OmenChipTone.Espn
    "yahoo" -> OmenChipTone.Yahoo
    "sleeper" -> OmenChipTone.Sleeper
    else -> OmenChipTone.Neutral
}
