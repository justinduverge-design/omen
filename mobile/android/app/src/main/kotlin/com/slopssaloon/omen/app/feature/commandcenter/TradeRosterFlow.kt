package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.app.feature.api.TradeViewModel
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import kotlinx.coroutines.launch

/**
 * Hosts J4's `TradeBuild` -> `TradeRoster` roster-picking flow. Compose mirror of
 * `TradeRosterFlowView.swift`.
 *
 * `OmenTradeRosterScreen` (and `OmenTradeBuildScreen`) deliberately model no loading state and no
 * retry — `TradeRoster.dc.html`'s own rule: a permanent provider limit is not an outage. This
 * composable is where that loading/failure surface actually lives, ahead of either journey
 * screen: a plain progress state while `GET /api/trade/roster` is in flight, and a retryable
 * error surface for a genuine transport failure (distinct from the server's own honest 200
 * "unavailable" answer, which routes into `OmenTradeRosterScreen`'s `PermanentlyUnavailable` case
 * exactly as designed, with no retry offered for it either).
 */
@Composable
fun TradeRosterFlow(
    tradeViewModel: TradeViewModel,
    userId: String,
    onOpenAccount: (() -> Unit)? = null,
    onDismiss: (() -> Unit)? = null,
) {
    val scope = rememberCoroutineScope()
    var showingRoster by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { tradeViewModel.loadRoster(userId) }

    when (val state = tradeViewModel.rosterBrowseState) {
        is TradeViewModel.RosterBrowseState.Idle, is TradeViewModel.RosterBrowseState.Loading -> {
            if (showingRoster) showingRoster = false
            OmenTradeBuildScreen(
                state = tradeViewModel.rosterBuildState,
                onOpenAccount = onOpenAccount,
                onPrimaryAction = {},
            )
        }

        is TradeViewModel.RosterBrowseState.Failed -> {
            if (showingRoster) showingRoster = false
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(OmenTheme.spacing.step16),
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16, Alignment.CenterVertically),
            ) {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Error,
                    title = "Omen couldn't load your league's teams",
                    message = TradeViewModel.messageFor(state.error),
                )
                OmenButton(
                    text = "Try again",
                    onClick = { scope.launch { tradeViewModel.loadRoster(userId) } },
                    variant = OmenButtonVariant.Secondary,
                    size = OmenButtonSize.Md,
                )
            }
        }

        is TradeViewModel.RosterBrowseState.Loaded -> {
            if (!showingRoster) {
                OmenTradeBuildScreen(
                    state = tradeViewModel.rosterBuildState,
                    onOpenAccount = onOpenAccount,
                    onSelectPartner = { id ->
                        tradeViewModel.selectPartnerTeam(id)
                        showingRoster = true
                    },
                    onPrimaryAction = { showingRoster = true },
                )
            } else {
                val rosterState = tradeViewModel.rosterScreenState
                if (rosterState == null) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) { CircularProgressIndicator() }
                } else {
                    OmenTradeRosterScreen(
                        state = rosterState,
                        onOpenAccount = onOpenAccount,
                        onSelectPartner = { tradeViewModel.selectPartnerTeam(it) },
                        onAddPlayer = { playerId ->
                            val loaded = state.response
                            val team = loaded.teams.firstOrNull { it.id == tradeViewModel.selectedPartnerTeamId }
                            val player = team?.players?.firstOrNull { it.id == playerId }
                            if (player != null) {
                                tradeViewModel.addFromRoster(player)
                                onDismiss?.invoke()
                            }
                        },
                    )
                }
            }
        }
    }
}
