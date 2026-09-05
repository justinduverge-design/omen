package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.component.OmenChip
import com.slopssaloon.omen.core.designsystem.component.OmenChipTone
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import kotlinx.coroutines.launch

/**
 * The second Command Center swipe — Waiver Watch, the Ledger and League Pulse as one paged
 * widget instead of three stacked sections.
 * iOS mirror: `App/CommandCenter/OmenWidgetPager.swift`.
 *
 * Founder sketch, 2026-09-04: "in the next box it should switch between the other widgets."
 *
 * ## Why labelled tabs and not dots
 *
 * Paging buys back roughly two screens of vertical space, and it costs discoverability: a user
 * who never swipes never learns the Ledger is there. Dots would make that worse — they say
 * "there is more" without saying what. The tab row names all three at once, so the two that
 * are not showing are still *known* to exist. A deliberate trade, chosen over the tighter
 * dots-only version.
 *
 * ## Why the tabs are also the control
 *
 * Tapping a tab jumps to it, so the widget works for someone who reads labels and never swipes
 * at all. A swipe-only carousel has one input; this has two.
 */
enum class OmenWidgetPage(val tabLabel: String, val sectionTitle: String) {
    /**
     * Short tab labels so three fit a phone width without scrolling. "League Pulse" is the
     * section's real name and does not fit beside the other two, so the tab is "Pulse" and the
     * section keeps its full name inside the page.
     */
    Waiver("Waiver", "Waiver Watch"),
    Ledger("Ledger", "The Ledger"),
    Pulse("Pulse", "League Pulse"),
}

@Composable
fun OmenWidgetPager(
    selection: OmenWidgetPage,
    onSelect: (OmenWidgetPage) -> Unit,
    waiver: @Composable () -> Unit,
    ledger: @Composable () -> Unit,
    pulse: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    val pages = OmenWidgetPage.entries
    val pagerState = rememberPagerState(initialPage = pages.indexOf(selection)) { pages.size }
    val scope = rememberCoroutineScope()

    // Two-way: a swipe updates the tabs, and a tab tap animates the pager. `settledPage` so a
    // half-drag does not flicker the tab row back and forth.
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.settledPage }.collect { onSelect(pages[it]) }
    }
    LaunchedEffect(selection) {
        val target = pages.indexOf(selection)
        if (pagerState.currentPage != target) pagerState.animateScrollToPage(target)
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            pages.forEachIndexed { index, page ->
                OmenChip(
                    label = page.tabLabel,
                    tone = OmenChipTone.Omen,
                    selected = selection == page,
                    onClick = { scope.launch { pagerState.animateScrollToPage(index) } },
                    modifier = Modifier.semantics {
                        contentDescription = "${page.sectionTitle}, ${index + 1} of ${pages.size}"
                        selected = selection == page
                    },
                )
            }
        }

        HorizontalPager(
            state = pagerState,
            // Sized so this pager and the matchup carousel above it share one screen — the
            // founder wants both on the fold, and 340 put this one under it. Every page scrolls
            // internally, so a tall waiver briefing is reachable rather than clipped.
            modifier = Modifier.fillMaxWidth().height(260.dp),
            pageSpacing = OmenTheme.spacing.step8,
        ) { index ->
            val page = pages[index]
            Column(
                // Scrolls within its own page rather than clipping: a long Ledger must not
                // become unreachable just because it shares a fixed-height pager with two
                // shorter siblings.
                modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
            ) {
                Text(page.sectionTitle, style = OmenTheme.typography.label.toTextStyle())
                when (page) {
                    OmenWidgetPage.Waiver -> waiver()
                    OmenWidgetPage.Ledger -> ledger()
                    OmenWidgetPage.Pulse -> pulse()
                }
            }
        }
    }
}
