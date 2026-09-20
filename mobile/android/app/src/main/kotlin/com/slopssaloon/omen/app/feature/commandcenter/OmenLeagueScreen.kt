package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.app.feature.api.LeagueViewModel
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.app.feature.shell.OmenScreenContext
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * The League destination — the scout's nest. iOS mirror:
 * `App/CommandCenter/OmenLeagueScreen.swift`.
 *
 * ## What changed here, and why it is a rebuild rather than a re-skin
 *
 * This screen was M5 slice F: a matchup spine, a playoff-picture card, a rank table and "Around
 * the League", built against the ratified `M1-Screen-League` contract before the canvas existed.
 * `design/native-visual-lock-2026-09-13/` draws the destination as the **scout's nest** — a
 * screen about the other eleven managers rather than about you — and fact-of-record #16 as
 * amended 2026-09-13 fixes its section order: **strip → The Table → Trade targets → Waiver →
 * Activity**.
 *
 * Those are not the same screen with different paint. The old composition had no trade-target
 * section at all, put your own matchup at full card size at the top, and had no route to the
 * wire. So this file now does what it should always have done: it **resolves** the League
 * destination's state and hands it to [OmenLeagueTableScreen], which is the built artboard.
 *
 * **Sections still render independently**, because `league-overview.v1` reports them
 * independently — that rule survived the rebuild intact and is now expressed as an
 * [OmenScoutSection] per section rather than as four `if` branches.
 *
 * Per the scope correction carried by the contract, this screen has **no seasonal entry point
 * beyond the week it is showing**.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OmenLeagueScreen(
    state: LeagueViewModel.ViewState,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
    onConnect: (() -> Unit)? = null,
    /**
     * The switcher bar's context, resolved by the caller that fetched the league. A screen that
     * resolved its own could disagree with the table it is displaying.
     */
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    /**
     * The wire, when the caller has actually read `waiver-analysis.v1`.
     *
     * **Null, and its absence removes the link rather than disabling it.** A "The wire ›"
     * affordance that opens an empty screen is the same lie as an avatar that opens nothing.
     */
    wire: OmenScoutWireState? = null,
    /** Trade targets, when something has read other managers' rosters. See [tradeTargetsUnread]. */
    tradeTargets: OmenScoutSection<List<OmenScoutTradeTarget>> = tradeTargetsUnread,
    /** The waiver section's summary card on the Table screen. */
    waiverSummary: OmenScoutSection<OmenDeskWaiverMove> = waiverUnread,
) {
    var showingWire by remember { mutableStateOf(false) }

    when (state) {
        is LeagueViewModel.ViewState.Loaded -> OmenLeagueTableScreen(
            state = omenScoutTableState(
                overview = state.overview,
                waiver = waiverSummary,
                tradeTargets = tradeTargets,
                notice = null,
                footnote = null,
                // A retry belongs only where retrying could change the answer. When the whole
                // read failed the failure surface below carries it instead.
                retryTitle = null,
            ),
            modifier = modifier,
            context = context,
            onOpenAccount = onOpenAccount,
            onOpenWaiver = if (wire == null) null else { { showingWire = true } },
        )

        else -> Column(
            modifier = modifier
                .fillMaxSize()
                .background(OmenTheme.color.bg)
                .padding(OmenTheme.spacing.step24),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step24),
        ) {
            when (state) {
                // Idle and Loading are the same surface on purpose: before the first request
                // resolves there is nothing truthful to show but a spinner, and an empty state
                // would claim the user has no league.
                LeagueViewModel.ViewState.Idle,
                LeagueViewModel.ViewState.Loading,
                -> OmenStateSurface(
                    kind = OmenStateSurfaceKind.Loading,
                    title = "Reading your league",
                    message = "The table and the wire come from your provider.",
                )
                LeagueViewModel.ViewState.Demo -> OmenStateSurface(
                    kind = OmenStateSurfaceKind.Mock,
                    title = "Demo league",
                    message = "Demo mode shows no live league. Sign in with a connected league to see your own.",
                )
                is LeagueViewModel.ViewState.Failed -> LeagueFailure(state.error, onRetry, onConnect)
                is LeagueViewModel.ViewState.Loaded -> Unit
            }
        }
    }

    if (showingWire && wire != null) {
        ModalBottomSheet(
            onDismissRequest = { showingWire = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = OmenTheme.color.bg,
        ) {
            OmenLeagueWireScreen(
                state = wire,
                context = context,
                onOpenAccount = onOpenAccount,
            )
        }
    }
}

// MARK: The two sections `league-overview.v1` does not carry

/**
 * `league-overview.v1` carries standings, matchup and activity. It does **not** carry other
 * managers' rosters, which is what a trade target is derived from — so until a caller has read
 * them, the section says so in words rather than rendering an empty list.
 *
 * An empty list and an unread one look identical and mean opposite things. That distinction is
 * the whole subject of `LeagueDegraded`, so this screen must not be the place that quietly gets
 * it wrong.
 */
val tradeTargetsUnread: OmenScoutSection<List<OmenScoutTradeTarget>> = OmenScoutSection.Unread(
    capability = "Opponent rosters",
    sentence = "Omen has not read the other managers' rosters for this league, so it cannot say whose roster shape fits yours.",
)

/** Same rule for the Waiver card, until a caller has read `waiver-analysis.v1`. */
val waiverUnread: OmenScoutSection<OmenDeskWaiverMove> = OmenScoutSection.Unread(
    capability = "Waivers",
    sentence = "Omen has not read this league's wire yet.",
)

@Composable
private fun LeagueFailure(
    error: OmenApiError,
    onRetry: (() -> Unit)?,
    onConnect: (() -> Unit)?,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        OmenStateSurface(
            kind = if (error is OmenApiError.Unauthorized) {
                OmenStateSurfaceKind.Disconnected
            } else {
                OmenStateSurfaceKind.Error
            },
            title = "Omen couldn't load your league",
            message = LeagueViewModel.messageFor(error),
        )
        onRetry?.let {
            OmenButton(
                text = "Try again",
                onClick = it,
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Md,
            )
        }
        if (error is OmenApiError.Unauthorized) {
            onConnect?.let {
                OmenButton(
                    text = "Connect a league",
                    onClick = it,
                    variant = OmenButtonVariant.Primary,
                    size = OmenButtonSize.Md,
                )
            }
        }
    }
}
