package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.res.painterResource
import com.slopssaloon.omen.R
import com.slopssaloon.omen.app.feature.api.LeagueCarouselViewModel
import com.slopssaloon.omen.core.designsystem.component.OmenContextStrip
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.app.feature.help.OmenHelpButton
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformCompactStrip
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformConnectionCard
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformRowState
import com.slopssaloon.omen.core.designsystem.component.OmenConnectionStatus

/**
 * Registry §3.2 approved **screen assembly** (feature layer). Rebuilt for v1.1 per
 * mobile-visual-briefs §1.1 to orient and prioritize the selected roster's week — it does
 * NOT duplicate Omen's full decision workspace. The full DecisionBrief lives on the Omen
 * destination, not here.
 *
 * v1.1 hierarchy:
 *   1. Header (page title + profile control)
 *   2. Persistent OmenContextStrip (approved node 25:2)
 *   3. OmenMatchupHero / Matchup Spine (approved node 25:26)
 *   4. Waiver Watch — approved M4-CC-WaiverWatch composition
 *   5. Ledger preview — approved node 72:2
 *   6. League Pulse — approved node 74:2
 *
 * Callers own the [OmenCommandCenterState] and choose an honest fixture (demo mode vs
 * real signed-in user). This composition never selects a "connected" fixture on its own —
 * exposing a demo-connected provider claim to a real user would violate facts-of-record
 * #7 (mock/demo data must be visibly labeled, never presented as live).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OmenCommandCenterScreen(
    state: OmenCommandCenterState,
    modifier: Modifier = Modifier,
    onSwitchContext: (() -> Unit)? = null,
    onOpenMatchup: (() -> Unit)? = null,
    onOpenAccount: (() -> Unit)? = null,
    /**
     * M5-NativeConnect. Supplied only when a connect path exists; when null the screen shows
     * no call to action it cannot honor.
     */
    onConnect: (() -> Unit)? = null,
    onOpenOmen: (() -> Unit)? = null,
    onOpenLedger: ((OmenLedgerEntry) -> Unit)? = null,
    onOpenLeague: (() -> Unit)? = null,
    onConnectPlatform: ((OmenPlatform) -> Unit)? = null,
    /**
     * The league carousel — provider chips over a swipeable matchup-per-league stack.
     *
     * Null keeps this composition working exactly as before, which is what every fixture,
     * preview and screenshot scenario passes. When supplied it REPLACES the context strip and
     * the single Matchup Hero, because those two were the halves the carousel merges: the
     * strip named one league, the hero showed that league's week, and the swipe now does both
     * for every league at once. iOS mirror: `OmenCommandCenterScreen.carousel`.
     */
    carousel: LeagueCarouselViewModel? = null,
    userId: String? = null,
    /** Only meaningful alongside [carousel]. Re-reads the surfaces the server named. */
    onContextChanged: ((List<String>) -> Unit)? = null,
) {
    // Drives the tap-through detail sheet. The sheet carries the existing
    // OmenPlatformConnectionCard content — that content is moved off the main surface, not new.
    var detailRow by remember { mutableStateOf<OmenPlatformRowState?>(null) }
    // Which of the three secondary widgets is showing. Opens on Waiver Watch: it is the only
    // one of the three that is ever time-critical, and a user who never swipes should land on
    // the page that can expire.
    var widgetPage by remember { mutableStateOf(OmenWidgetPage.Waiver) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(
                PaddingValues(
                    horizontal = OmenTheme.spacing.step16,
                    vertical = OmenTheme.spacing.step24,
                )
            ),
        // `sectionStack` is right for a page of stacked sections and far too much for one
        // with two carousels that both need to be on screen. The carousel layout uses a
        // tighter rhythm; the legacy stacked layout keeps the original.
        verticalArrangement = Arrangement.spacedBy(
            if (carousel == null) OmenTheme.spacing.sectionStack else OmenTheme.spacing.step24,
        ),
    ) {
        HeaderBlock(state.greeting, onOpenAccount)
        // The vertical platform status strip is suppressed when the carousel is present.
        // Founder, 2026-09-04: "you still have Sleeper, Yahoo and ESPN going down on three
        // columns — it should just be horizontal, and the icons should represent the leagues
        // that are connected. If they don't have that, then it doesn't pop up."
        //
        // The strip listed all three providers unconditionally, so two thirds of it was
        // usually the word "Disconnected" occupying the fold above the matchup. The carousel's
        // chip row answers the same question better: it names only what the user actually has,
        // horizontally, and each chip filters to that provider's leagues rather than merely
        // reporting a status.
        //
        // What the strip also carried, and where it went: last-sync time and
        // reconnect-required now surface on the affected league's own carousel page (a page
        // that cannot read says so on its own card), and full connection management stays in
        // Account, which is where the ESPN consent copy already sends users to disconnect.
        if (carousel == null) {
            // Visual brief §1.1 position 3 (amended 2026-08-14) · Figma `73:2`.
            OmenPlatformCompactStrip(
                rows = state.platforms,
                onOpenDetail = { detailRow = it },
                onConnect = onConnectPlatform?.let { handler -> { row -> handler(row.platform) } },
            )
        }
        // Both branches are real: fixtures, previews and the screenshot workflow have no
        // session and must keep rendering their labelled honest states.
        if (carousel != null) {
            OmenLeagueCarousel(
                viewModel = carousel,
                userId = userId,
                demoMatchup = state.matchup,
                onOpenMatchup = onOpenMatchup,
                onConnect = onConnect,
                onAddLeague = onConnect,
                onContextChanged = { onContextChanged?.invoke(it) },
            )
        } else {
            OmenContextStrip(state = state.context, onSwitch = onSwitchContext)
            OmenMatchupHero(state = state.matchup, onOpen = onOpenMatchup)
        }
        // Honest-state doctrine: the screen already tells a disconnected user to connect a
        // league. Before M5-NativeConnect there was no way to act on it. Shown only when the
        // shell has no verified context AND a connect path exists, so it cannot advertise a
        // dead end or sit beside a real league name. The carousel subsumes it — it has its own
        // empty state with the same button — so it is suppressed rather than shown twice.
        if (onConnect != null && carousel == null && state.context is OmenContextStripState.Empty) {
            OmenButton(text = "Connect a league", onClick = onConnect)
        }
        // Founder sketch, 2026-09-04: the three sections below the matchup become one paged
        // widget. Paged only when the carousel is live — every fixture, preview and screenshot
        // scenario keeps the stacked layout, which is what those captures are of, and a paged
        // screenshot would show one third of the page.
        if (carousel != null) {
            OmenWidgetPager(
                selection = widgetPage,
                onSelect = { widgetPage = it },
                // Each page keeps its existing composition verbatim — this change moves the
                // sections, it does not rewrite them.
                waiver = { WaiverWatch(state.waiverWatch, onOpenOmen, showLabel = false) },
                ledger = { LedgerPreview(state.ledger, onOpenLedger, showLabel = false) },
                pulse = { LeaguePulse(state.leaguePulse, onOpenLeague, showLabel = false) },
            )
        } else {
            WaiverWatch(state = state.waiverWatch, onOpenOmen = onOpenOmen)
            LedgerPreview(state = state.ledger, onOpenLedger = onOpenLedger)
            LeaguePulse(state = state.leaguePulse, onOpenLeague = onOpenLeague)
        }
    }

    // Figma `73:2`: "Android opens the detail sheet as a ModalBottomSheet".
    val row = detailRow
    if (row != null) {
        ModalBottomSheet(onDismissRequest = { detailRow = null }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(OmenTheme.spacing.step16),
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16),
            ) {
                Text(
                    text = row.platformName,
                    style = OmenTheme.typography.h2.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                )
                OmenPlatformConnectionCard(
                    platform = row.platform,
                    status = row.status,
                    description = row.resolvedLastSyncText?.let { "Last sync $it" }
                        ?: "No sync recorded.",
                    actionLabel = if (row.isConnected) "Manage league" else "Connect",
                    onAction = { onConnectPlatform?.invoke(row.platform) },
                )
            }
        }
    }
}

@Composable
private fun HeaderBlock(greeting: String, onOpenAccount: (() -> Unit)?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
        ) {
            Text(
                text = "Command Center",
                style = OmenTheme.typography.eyebrow.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
            Text(
                text = greeting,
                // `h2` on one line, not `h1` across two. At h1 the headline took roughly a
                // quarter of the screen and pushed the second carousel off the fold — the
                // founder wants the matchup AND the widget pager visible together, and the
                // headline is the only block on this screen that is purely narration.
                style = OmenTheme.typography.h2.toTextStyle(),
                color = OmenTheme.color.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        // M6-ContextualHelp. Sits beside the profile control so help is reachable from the
        // header without competing with it for the eye.
        OmenHelpButton(OmenHelpDestination.CommandCenter)
        if (onOpenAccount != null) {
            OmenIconButton(
                contentDescription = "Account and profile",
                onClick = onOpenAccount,
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_nav_account),
                    contentDescription = null,
                )
            }
        }
    }
}

@Composable
private fun WaiverWatch(
    state: OmenWaiverWatchState,
    onOpenOmen: (() -> Unit)?,
    // False inside the widget pager, which supplies the heading itself — two headings stacked
    // would read as two sections.
    showLabel: Boolean = true,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        if (showLabel) SectionLabel("Waiver Watch")
        when (state) {
            is OmenWaiverWatchState.Urgent -> UrgentWaiverBriefing(state, onOpenOmen)
            is OmenWaiverWatchState.Calm -> CalmWaiverList(state, onOpenOmen)
            OmenWaiverWatchState.Pending -> WaiverStatusCard(
                title = "Claim pending",
                message = "Omen has identified an opportunity. Claim outcome is not yet known.",
            )
            OmenWaiverWatchState.Processed -> WaiverStatusCard(
                title = "Waivers processed",
                message = "Your league’s waivers have processed. Review current opportunities.",
                onOpenOmen = onOpenOmen,
            )
            OmenWaiverWatchState.AvailabilityUnknown -> WaiverStatusCard(
                title = "Availability needs confirmation",
                message = "Omen cannot confirm availability for this league.",
            )
            OmenWaiverWatchState.NoCredibleMove -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "No credible move",
                message = "No waiver move stands out for this roster right now.",
            )
            OmenWaiverWatchState.NotConnected -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Disconnected,
                title = "Personalized waiver moves need a league",
                // The Try Demo pointer was removed 2026-08-30 with W3. Copy that names an
                // affordance the user cannot see is an unverified claim about the product's own
                // surface — an abort class 1 candidate, not a cosmetic mismatch.
                message = "Connect a league to see roster-aware opportunities Omen can act on.",
            )
            OmenWaiverWatchState.OffSeason -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Long-horizon waiver context",
                message = "Omen will surface relevant roster opportunities without weekly waiver urgency.",
            )
        }
    }
}

@Composable
private fun UrgentWaiverBriefing(state: OmenWaiverWatchState.Urgent, onOpenOmen: (() -> Unit)?) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        Text(state.deadlineText, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        OmenCard(variant = OmenCardVariant.Preview) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
                Box(Modifier.fillMaxWidth().height(OmenTheme.spacing.step4).background(OmenTheme.color.accent))
                Text("Best Move", style = OmenTheme.typography.eyebrow.toTextStyle(), color = OmenTheme.color.accent)
                OpportunityContent(state.bestMove)
            }
        }
        OmenLinkButton("Review Omen’s waiver analysis", onOpenOmen)
        if (state.longHorizonMoves.isNotEmpty()) {
            Text("For the long horizon", style = OmenTheme.typography.eyebrow.toTextStyle(), color = OmenTheme.color.textSecondary)
            state.longHorizonMoves.take(2).forEach { OpportunityRow(it) }
        }
    }
}

@Composable
private fun CalmWaiverList(state: OmenWaiverWatchState.Calm, onOpenOmen: (() -> Unit)?) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
        state.opportunities.forEachIndexed { index, opportunity ->
            OpportunityRow(opportunity, rank = index + 1)
        }
        OmenLinkButton("See full waiver analysis", onOpenOmen)
    }
}

@Composable
private fun WaiverStatusCard(title: String, message: String, onOpenOmen: (() -> Unit)? = null) {
    OmenCard(variant = OmenCardVariant.Outlined) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            Text(title, style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
            Text(message, style = OmenTheme.typography.body.toTextStyle(), color = OmenTheme.color.textSecondary)
            if (onOpenOmen != null) OmenLinkButton("Review Omen’s waiver analysis", onOpenOmen)
        }
    }
}

@Composable
private fun OpportunityRow(opportunity: OmenWaiverOpportunity, rank: Int? = null) {
    OmenCard(
        variant = OmenCardVariant.Outlined,
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = opportunity.accessibilityLabel(rank)
        },
    ) { OpportunityContent(opportunity, rank) }
}

@Composable
private fun OpportunityContent(opportunity: OmenWaiverOpportunity, rank: Int? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
        Text(
            text = listOfNotNull(rank?.toString(), "${opportunity.playerName} · ${opportunity.position}").joinToString("  "),
            style = OmenTheme.typography.h2.toTextStyle(),
            color = OmenTheme.color.textPrimary,
        )
        Text(opportunity.team, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        Text(opportunity.availability, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        Text(opportunity.reason, style = OmenTheme.typography.body.toTextStyle(), color = OmenTheme.color.textPrimary)
    }
}

@Composable
private fun OmenLinkButton(title: String, onOpenOmen: (() -> Unit)?) {
    if (onOpenOmen != null) {
        OmenButton(
            text = "$title →",
            onClick = onOpenOmen,
            variant = OmenButtonVariant.Link,
            size = OmenButtonSize.Lg,
        )
    }
}

private fun OmenWaiverOpportunity.accessibilityLabel(rank: Int?): String = listOfNotNull(
    rank?.let { "Opportunity $it" }, playerName, position, team, availability, reason,
).joinToString(", ")

@Composable
private fun LedgerPreview(
    state: OmenLedgerPreviewState,
    onOpenLedger: ((OmenLedgerEntry) -> Unit)?,
    showLabel: Boolean = true,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            // "See all" survives into the paged layout — it is the only route from the preview
            // to the full Ledger, and dropping it in the move would strand the section.
            horizontalArrangement = if (showLabel) Arrangement.SpaceBetween else Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (showLabel) SectionLabel("The Ledger")
            if (state is OmenLedgerPreviewState.Entries && state.entries.isNotEmpty() && onOpenLedger != null) {
                OmenButton(
                    text = "See all →",
                    onClick = { onOpenLedger(state.entries.first()) },
                    variant = OmenButtonVariant.Link,
                    size = OmenButtonSize.Md,
                )
            }
        }
        when (state) {
            is OmenLedgerPreviewState.Entries -> state.entries.take(3).forEach { entry ->
                OmenListRow(
                    title = "${entry.period} · ${entry.callType}",
                    subtitle = "${entry.summary}\n${entry.outcome}",
                    onClick = onOpenLedger?.let { callback -> { callback(entry) } },
                    leadingContent = {
                        Box(
                            Modifier
                                .width(OmenTheme.spacing.step4)
                                .height(OmenTheme.spacing.step48)
                                .background(OmenTheme.color.accent)
                        )
                    },
                    modifier = Modifier.semantics(mergeDescendants = true) {
                        contentDescription = entry.accessibilityLabel
                    },
                )
            }
            OmenLedgerPreviewState.Empty -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "No Ledger entries yet",
                message = "Omen’s recent recommendations will appear here as immutable snapshots.",
            )
            OmenLedgerPreviewState.NotConnected -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Disconnected,
                title = "The Ledger needs a league",
                message = "Connect a league to keep an evidence-bound record of Omen’s recommendations.",
            )
            OmenLedgerPreviewState.Loading -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Loading,
                title = "Loading the Ledger",
                message = "Reading your recorded moves.",
            )
            is OmenLedgerPreviewState.Error -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Error,
                title = "The Ledger didn’t load",
                message = state.message,
            )
        }
    }
}

@Composable
private fun LeaguePulse(
    state: OmenLeaguePulseState,
    onOpenLeague: (() -> Unit)?,
    showLabel: Boolean = true,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (showLabel) Arrangement.SpaceBetween else Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (showLabel) SectionLabel("League Pulse")
            if (onOpenLeague != null) {
                OmenButton(
                    text = "League →",
                    onClick = onOpenLeague,
                    variant = OmenButtonVariant.Link,
                    size = OmenButtonSize.Md,
                )
            }
        }
        when (state) {
            is OmenLeaguePulseState.Available -> OmenCard(variant = OmenCardVariant.Outlined) {
                Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                    Text(state.position, style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                    // Omitted rather than guessed when the payload cannot support them.
                    state.cutLine?.let {
                        Text(it, style = OmenTheme.typography.body.toTextStyle(), color = OmenTheme.color.textSecondary)
                    }
                    state.activity?.let {
                        Text("Around the League", style = OmenTheme.typography.eyebrow.toTextStyle(), color = OmenTheme.color.textSecondary)
                        Text(it, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
                    }
                }
            }
            is OmenLeaguePulseState.OffSeason -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Off-season league context",
                message = state.summary,
            )
            OmenLeaguePulseState.Loading -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Loading,
                title = "Reading your league standings",
                message = "This one comes from your provider, so it lands a moment after the rest.",
            )
            OmenLeaguePulseState.Unavailable -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Standings didn't come back",
                message = "Omen won't show a stale rank. Pull to refresh, or try again when your league updates.",
            )
            OmenLeaguePulseState.NotConnected -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Disconnected,
                title = "League Pulse needs a league",
                message = "Connect a league to see verified standings. League activity stays empty until a real feed exists.",
            )
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = OmenTheme.typography.label.toTextStyle(),
        color = OmenTheme.color.textSecondary,
    )
}

/**
 * Immutable view state for [OmenCommandCenterScreen]. Feature callers build one of these
 * from whatever data source is authoritative for the session (demo fixtures for
 * Try-Demo users; honest disconnected/loading state for real users until live wiring
 * lands). The screen renders honestly for every combination without inspecting the
 * source.
 */
data class OmenCommandCenterState(
    val greeting: String,
    val context: OmenContextStripState,
    /** Fixed provider order (Sleeper, Yahoo, ESPN) — never connection-sorted. Empty hides the strip. */
    val platforms: List<OmenPlatformRowState> = emptyList(),
    val matchup: OmenMatchupHeroState,
    val waiverWatch: OmenWaiverWatchState = OmenWaiverWatchState.NotConnected,
    val ledger: OmenLedgerPreviewState = OmenLedgerPreviewState.NotConnected,
    val leaguePulse: OmenLeaguePulseState = OmenLeaguePulseState.NotConnected,
)

sealed interface OmenLedgerPreviewState {
    data class Entries(val entries: List<OmenLedgerEntry>) : OmenLedgerPreviewState
    data object Empty : OmenLedgerPreviewState
    data object NotConnected : OmenLedgerPreviewState

    /**
     * Slice E. The Ledger loads on its own request after the shell is already on screen, so it
     * needs its own in-flight and failure states. Both render through `OmenStateSurface`;
     * neither substitutes a fixture (facts-of-record #7).
     */
    data object Loading : OmenLedgerPreviewState
    data class Error(val message: String) : OmenLedgerPreviewState
}

data class OmenLedgerEntry(
    val id: String,
    val period: String,
    val callType: String,
    val summary: String,
    val outcome: String,
) {
    val accessibilityLabel: String = listOf(period, callType, summary, outcome).joinToString(", ")
}

sealed interface OmenLeaguePulseState {
    /**
     * [cutLine] and [activity] are nullable on purpose: `league-standings.v1` carries no playoff
     * settings and no transaction feed, so neither can be stated without inventing one.
     */
    data class Available(
        val position: String,
        val cutLine: String? = null,
        val activity: String? = null,
    ) : OmenLeaguePulseState
    data class OffSeason(val summary: String) : OmenLeaguePulseState

    /**
     * The standings request is genuinely in flight. This is the ONLY League Pulse state that may
     * render a spinner. It exists because [Unavailable] used to be drawn with
     * `OmenStateSurfaceKind.Loading`, which put a progress indicator on a resting state — the
     * section spun forever on every healthy league.
     */
    data object Loading : OmenLeaguePulseState

    /** We asked and got no usable answer. A resting state, not a pending one. */
    data object Unavailable : OmenLeaguePulseState
    data object NotConnected : OmenLeaguePulseState
}

/**
 * View-only Waiver Watch contract. Callers supply only verified data or an explicit state;
 * this layer never infers a provider, availability, or waiver deadline.
 */
sealed interface OmenWaiverWatchState {
    data class Urgent(
        val deadlineText: String,
        val bestMove: OmenWaiverOpportunity,
        val longHorizonMoves: List<OmenWaiverOpportunity> = emptyList(),
    ) : OmenWaiverWatchState

    data class Calm(val opportunities: List<OmenWaiverOpportunity>) : OmenWaiverWatchState
    data object Pending : OmenWaiverWatchState
    data object Processed : OmenWaiverWatchState
    data object AvailabilityUnknown : OmenWaiverWatchState
    data object NoCredibleMove : OmenWaiverWatchState
    data object NotConnected : OmenWaiverWatchState
    data object OffSeason : OmenWaiverWatchState
}

data class OmenWaiverOpportunity(
    val playerName: String,
    val position: String,
    val team: String,
    val availability: String,
    val reason: String,
)

/**
 * Fixture registry. Every fixture is explicitly labelled by its variable name; none of
 * these mints a "connected provider" claim for a real user. The screenshot workflow and
 * the `Try Demo` session both consume these; a real signed-in user without connected
 * context sees [realDisconnected] until live wiring exists.
 */
object OmenCommandCenterFixtures {
    val demoConnected: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Demo · Sunday. Week 7 is in play.",
        context = OmenContextStripState.Selected(
            platform = OmenPlatform.Sleeper,
            leagueName = "Demo Slate (mock league)",
            teamName = "Demo Titans",
        ),
        platforms = listOf(
            OmenPlatformRowState(OmenPlatform.Sleeper, OmenConnectionStatus.Connected, "4m ago"),
            OmenPlatformRowState(OmenPlatform.Yahoo, OmenConnectionStatus.Disconnected),
            OmenPlatformRowState(OmenPlatform.Espn, OmenConnectionStatus.Disconnected),
        ),
        matchup = OmenMatchupHeroState.Live(
            // Both columns populated, because a live matchup is exactly when PROJ and SCORE
            // together are the point.
            selectedTeam = OmenMatchupTeam("Demo Titans", "6–1", "64.8", projectedText = "119.6"),
            opponent = OmenMatchupTeam("Demo Rivals", "5–2", "58.1", projectedText = "114.2"),
            projectedFinish = "119.6–114.2",
            whatToWatch = "Opponent has two demo players remaining Monday night.",
        ),
        waiverWatch = OmenWaiverWatchState.Urgent(
            deadlineText = "Demo deadline · Wed 3:00 AM",
            bestMove = OmenWaiverOpportunity(
                playerName = "Tyrone Tracy Jr.", position = "RB", team = "NYG",
                availability = "Available in this demo league", reason = "Immediate help at RB during a thin Week 7.",
            ),
            longHorizonMoves = listOf(
                OmenWaiverOpportunity("Demo Player A", "WR", "ATL", "Available", "Dynasty upside."),
                OmenWaiverOpportunity("Demo Player B", "TE", "SEA", "Available", "Future opportunity."),
            ),
        ),
        ledger = OmenLedgerPreviewState.Entries(
            listOf(
                OmenLedgerEntry(
                    id = "demo-start-sit-week-6", period = "DEMO WEEK 6", callType = "START/SIT",
                    summary = "Start DeVonta Smith over Chris Olave",
                    outcome = "Smith 18.4 · Olave 11.2 · Demo outcome aligned.",
                ),
                OmenLedgerEntry(
                    id = "demo-waiver-week-6", period = "DEMO WEEK 6", callType = "WAIVER",
                    summary = "Add Tyrone Tracy Jr.", outcome = "Demo claim pending.",
                ),
            ),
        ),
        leaguePulse = OmenLeaguePulseState.Available(
            position = "Demo: 3rd of 12 · In a playoff spot",
            cutLine = "Demo standing · 2 games clear of the cut line",
            activity = "No demo league activity feed — this section stays honest until one exists.",
        ),
    )

    /**
     * Honest disconnected state — what a real signed-in user without a connected league
     * sees. No fabricated provider status, no fake matchup, no "manage league" no-op CTA.
     */
    val realDisconnected: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "No game plan yet.",
        context = OmenContextStripState.Empty,
        platforms = listOf(
            OmenPlatformRowState(OmenPlatform.Sleeper, OmenConnectionStatus.Disconnected),
            OmenPlatformRowState(OmenPlatform.Yahoo, OmenConnectionStatus.Disconnected),
            OmenPlatformRowState(OmenPlatform.Espn, OmenConnectionStatus.Disconnected),
        ),
        matchup = OmenMatchupHeroState.NoMatchup(
            reason = "No matchup yet — connect Sleeper or ESPN to see your team's week.",
        ),
    )

    /**
     * Honest loading state — while the app is restoring session or the dashboard-summary
     * call is in flight.
     */
    val realLoading: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Restoring your session…",
        context = OmenContextStripState.Empty,
        matchup = OmenMatchupHeroState.NoMatchup(reason = "Loading…"),
        ledger = OmenLedgerPreviewState.Loading,
        leaguePulse = OmenLeaguePulseState.Loading,
    )
}
