package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.animation.core.animateDpAsState
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
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
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

/** Floor, so a page mid-load does not collapse the pager to nothing. */
private val MIN_PAGE_HEIGHT = 96.dp

/** Ceiling, so a long Ledger cannot push the matchup off the fold. It scrolls past this. */
private val MAX_PAGE_HEIGHT = 260.dp

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

        // Height follows the page you are ON, not the tallest of the three.
        //
        // A shared fixed height was fine while all three pages printed a briefing. Once
        // Waiver became a deadline line and a link, 200.dp reserved roughly 300.dp of empty
        // space under it — found by the screenshot gate on 2026-09-10, and invisible to every
        // clipping assertion because nothing was clipped, it was simply blank.
        //
        // Measured per page, capped, and animated so a swipe between a short page and a long
        // one does not snap. The cap keeps a very long Ledger from pushing the matchup off
        // the fold; that page still scrolls inside itself.
        val measured = remember { mutableStateMapOf<Int, Int>() }
        val density = LocalDensity.current
        val currentHeight = measured[pagerState.currentPage]
            ?.let { with(density) { it.toDp() } }
            ?.coerceIn(MIN_PAGE_HEIGHT, MAX_PAGE_HEIGHT)
            ?: MIN_PAGE_HEIGHT
        val animatedHeight by animateDpAsState(currentHeight, label = "widgetPagerHeight")

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxWidth().height(animatedHeight),
            pageSpacing = OmenTheme.spacing.step8,
        ) { index ->
            val page = pages[index]
            Column(
                // Scrolls within its own page rather than clipping: a long Ledger must not
                // become unreachable just because it shares a height with two shorter
                // siblings. The scroll only engages once the content passes MAX_PAGE_HEIGHT.
                modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
            ) {
                Column(
                    // Inner column, measured OUTSIDE the scroll: a scrollable parent offers
                    // its child unbounded height, so this reports the page's intrinsic height
                    // rather than whatever the pager is currently imposing.
                    modifier = Modifier
                        .fillMaxWidth()
                        .onSizeChanged { measured[index] = it.height },
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
}
