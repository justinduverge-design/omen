package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.api.LeagueCarouselViewModel
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenChip
import com.slopssaloon.omen.core.designsystem.component.OmenChipTone
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformBadge
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * The Command Center league carousel — provider filter chips over a swipeable stack of matchup
 * cards, one card per league the user follows.
 * iOS mirror: `App/CommandCenter/OmenLeagueCarousel.swift`.
 *
 * **This is the switcher and the Matchup Hero, merged.** They were two controls answering
 * halves of one question: the strip said which league you were on, the hero showed that
 * league's week, and changing leagues meant opening a modal list that showed neither. Here the
 * swipe IS the switch, and every page you pass shows you its own week on the way.
 *
 * Composition rules this honours, each load-bearing:
 *  - built from approved `Omen*` primitives only;
 *  - the page indicator is a **glyph-and-count line, not colour alone** — the same rule §10.2
 *    applies to the switcher's selected row;
 *  - every page carries the league AND team name, because "which team am I looking at" is the
 *    question the strip existed to answer and must not be lost in the merge;
 *  - a page that cannot load says so on its own card. One dead provider must not blank the
 *    widget for the leagues that work.
 */
@Composable
fun OmenLeagueCarousel(
    viewModel: LeagueCarouselViewModel,
    userId: String?,
    modifier: Modifier = Modifier,
    /**
     * Demo has one mock league and no directory, so the caller supplies the labelled fixture
     * hero rather than this composable inventing one.
     */
    demoMatchup: OmenMatchupHeroState? = null,
    onOpenMatchup: (() -> Unit)? = null,
    onConnect: (() -> Unit)? = null,
    /**
     * Add League. Rendered as a trailing chip in the same row as the provider filters rather
     * than a line of its own above them: it belongs to the same family of controls, and a full
     * row above the fold is expensive on a screen whose job is to get the user to their
     * matchup.
     */
    onAddLeague: (() -> Unit)? = null,
    /** The surfaces §10.3 says to re-read once a swipe has changed the active league. */
    onContextChanged: (List<String>) -> Unit = {},
) {
    val scope = rememberCoroutineScope()
    LaunchedEffect(userId) { viewModel.load(userId) }

    // Layout follows the founder's 2026-09-04 sketch, top to bottom: the league chips sit
    // ABOVE the Matchup heading, not inside a "Your Leagues" section of their own. They are
    // the screen's provider row — the thing the old vertical platform strip used to be — so
    // they belong directly under the page header, and the matchup is what they act on.
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        if (viewModel.viewState is LeagueCarouselViewModel.ViewState.Loaded) {
            ChipRow(viewModel = viewModel, onAddLeague = onAddLeague)
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Matchup", style = OmenTheme.typography.label.toTextStyle())
            // "2 of 5" rather than a row of dots. Dots stop being countable past about four,
            // and a user with five leagues is exactly who this widget is for.
            if (viewModel.pages.size > 1) {
                Text(
                    "${viewModel.selectedIndex + 1} of ${viewModel.pages.size}",
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    modifier = Modifier.clearAndSetSemantics { },
                )
            }
        }

        when (val state = viewModel.viewState) {
            is LeagueCarouselViewModel.ViewState.Loading -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Loading,
                title = "Reading your leagues",
                message = "Omen is asking each connected platform which leagues you are in.",
            )

            // Demo has exactly one mock league, so it gets one labelled card and no chips — a
            // filter row over a single page would be a control with nothing to do.
            is LeagueCarouselViewModel.ViewState.Demo -> if (demoMatchup != null) {
                Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                    Text("DEMO LEAGUE", style = OmenTheme.typography.eyebrow.toTextStyle())
                    OmenMatchupHero(state = demoMatchup, onOpen = onOpenMatchup)
                }
            } else {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Mock,
                    title = "Demo league",
                    message = "Demo mode runs one mock league, so there is nothing to swipe through.",
                )
            }

            is LeagueCarouselViewModel.ViewState.Empty -> Column(
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
            ) {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Empty,
                    title = "No leagues connected yet",
                    message = "Connect a league and Omen can read your real roster, then tell " +
                        "you the one move that matters this week.",
                )
                if (onConnect != null) {
                    OmenButton(
                        text = "Connect a league",
                        onClick = onConnect,
                        variant = OmenButtonVariant.Primary,
                        size = OmenButtonSize.Md,
                    )
                }
            }

            is LeagueCarouselViewModel.ViewState.Failed -> Column(
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
            ) {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Error,
                    title = "Omen could not read your leagues",
                    message = carouselErrorMessage(state.error),
                )
                OmenButton(
                    text = "Try again",
                    onClick = { scope.launch { viewModel.load(userId) } },
                    variant = OmenButtonVariant.Secondary,
                    size = OmenButtonSize.Md,
                )
            }

            is LeagueCarouselViewModel.ViewState.Loaded -> LoadedCarousel(
                viewModel = viewModel,
                onAddLeague = onAddLeague,
                onOpenMatchup = onOpenMatchup,
                onContextChanged = onContextChanged,
            )
        }
    }
}

@Composable
private fun LoadedCarousel(
    viewModel: LeagueCarouselViewModel,
    onAddLeague: (() -> Unit)?,
    onOpenMatchup: (() -> Unit)?,
    onContextChanged: (List<String>) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val pages = viewModel.pages
    val pagerState = rememberPagerState(
        initialPage = viewModel.selectedIndex.coerceIn(0, maxOf(0, pages.size - 1)),
        pageCount = { pages.size },
    )

    // `settledPage` rather than `currentPage`: committing mid-drag would write a selection for
    // a league the user is still swiping past, and dragging across five pages would fire five
    // verified provider writes to land where one reaches.
    LaunchedEffect(pagerState, pages.size) {
        snapshotFlow { pagerState.settledPage }.collect { index ->
            viewModel.selectIndex(index)
            viewModel.loadCurrentPage()
            viewModel.commitSelection()?.let(onContextChanged)
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 260.dp),
            pageSpacing = OmenTheme.spacing.step8,
        ) { index ->
            pages.getOrNull(index)?.let { page ->
                PageCard(
                    viewModel = viewModel,
                    page = page,
                    position = "${index + 1} of ${pages.size}",
                    onOpenMatchup = onOpenMatchup,
                )
            }
        }
    }
}

/**
 * One horizontal row naming **only the providers the user actually has**, plus Add League.
 * Founder, 2026-09-04: "if they don't have that, then it doesn't pop up."
 *
 * This replaced a vertical strip that listed all three providers unconditionally, so a user
 * with one connection spent two rows of the fold reading the word "Disconnected" about products
 * they do not use. iOS mirror: `OmenLeagueCarousel.chipRow`.
 */
@Composable
private fun ChipRow(viewModel: LeagueCarouselViewModel, onAddLeague: (() -> Unit)?) {
    val scope = rememberCoroutineScope()
    // The filter chips need two or more providers to mean anything, but Add League is useful to
    // a user with one — so the row renders whenever either half has something to say, and each
    // half decides for itself.
    if (viewModel.chips.size <= 2 && onAddLeague == null) return

    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        // All · then each provider that actually has a followed league, in the server's order
        // — most leagues first, ties alphabetical.
        if (viewModel.chips.size > 2) viewModel.chips.forEach { chip ->
            val count = viewModel.leagueCountFor(chip)
            val noun = if (count == 1) "league" else "leagues"
            OmenChip(
                label = chipLabel(chip),
                tone = chipTone(chip),
                selected = viewModel.selectedPlatform == chip,
                onClick = {
                    viewModel.selectPlatform(chip)
                    scope.launch { viewModel.loadCurrentPage() }
                },
                modifier = Modifier.semantics {
                    contentDescription = "${chipLabel(chip)}, $count $noun"
                },
            )
        }
        if (onAddLeague != null) {
            // "+ League" rather than a bare "+": a lone glyph beside three named filters reads
            // as a fourth filter, and the label costs one word.
            OmenChip(
                label = "+ League",
                tone = OmenChipTone.Neutral,
                onClick = onAddLeague,
                modifier = Modifier.semantics { contentDescription = "Add a league" },
            )
        }
    }
}

@Composable
private fun PageCard(
    viewModel: LeagueCarouselViewModel,
    page: LeagueCarouselViewModel.Page,
    position: String,
    onOpenMatchup: (() -> Unit)?,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
        // Full names live here even when the visible labels truncate, per §10.2.
        val active = if (page.isActive) ", the league Omen is using" else ""
        OmenListRowHeader(
            page = page,
            committing = viewModel.committingPageId == page.id,
            contentDescription = "${page.displayTeamName}, ${page.displayLeagueName}, " +
                "${platformDisplayName(page.platform)}$active. $position.",
        )

        when (val state = viewModel.stateFor(page)) {
            is LeagueCarouselViewModel.PageState.Loading -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Loading,
                title = "Reading this league's week",
                message = "Omen is asking ${platformDisplayName(page.platform)} for this matchup.",
            )
            is LeagueCarouselViewModel.PageState.Loaded ->
                OmenMatchupHero(state = state.hero, onOpen = onOpenMatchup)
            // Scoped to this page on purpose. One provider failing must not blank the leagues
            // that answered.
            is LeagueCarouselViewModel.PageState.Unavailable -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Error,
                title = "This league didn't load",
                message = state.message,
            )
        }
    }
}

@Composable
private fun OmenListRowHeader(
    page: LeagueCarouselViewModel.Page,
    committing: Boolean,
    contentDescription: String,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics(mergeDescendants = true) { this.contentDescription = contentDescription },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        OmenPlatformBadge(platform = omenPlatform(page.platform))
        Column(modifier = Modifier.fillMaxWidth(0.8f)) {
            Text(
                page.displayTeamName,
                style = OmenTheme.typography.h2.toTextStyle(),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                page.displayLeagueName,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        // A glyph, not a colour — §10.2's rule, and the reason the user can tell "the league
        // I'm reading" from "the league Omen is reasoning about" while a swipe is settling.
        if (committing) {
            Text("…", style = OmenTheme.typography.body.toTextStyle())
        } else if (page.isActive) {
            Text("✓", style = OmenTheme.typography.body.toTextStyle())
        }
    }
}

/** Each provider chip carries its own platform colour; All is neutral so it cannot be mistaken
 * for a fourth provider. */
private fun chipTone(chip: String): OmenChipTone = when (chip) {
    "espn" -> OmenChipTone.Espn
    "yahoo" -> OmenChipTone.Yahoo
    "sleeper" -> OmenChipTone.Sleeper
    else -> OmenChipTone.Neutral
}

private fun chipLabel(chip: String): String =
    if (chip == LeagueCarouselViewModel.ALL_PLATFORMS) "All" else platformDisplayName(chip)

private fun omenPlatform(platform: String): OmenPlatform = when (platform) {
    "espn" -> OmenPlatform.Espn
    "yahoo" -> OmenPlatform.Yahoo
    else -> OmenPlatform.Sleeper
}

/**
 * Never surfaces a provider message or a bare status code — the user gets an action, and no
 * credential or raw provider error can ride along (§10.3).
 */
private fun carouselErrorMessage(error: OmenApiError): String = when (error) {
    OmenApiError.Unauthorized -> "Your session expired. Sign in again to see your leagues."
    else -> "Omen could not reach your leagues just now. Try again in a moment."
}
