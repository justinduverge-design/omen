package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.app.feature.api.PlayerSearchResult
import com.slopssaloon.omen.app.feature.api.TradePlayer
import com.slopssaloon.omen.app.feature.api.TradeCompare
import com.slopssaloon.omen.app.feature.api.TradeOffer
import com.slopssaloon.omen.app.feature.api.TradeViewModel
import com.slopssaloon.omen.core.designsystem.component.OmenBadge
import com.slopssaloon.omen.core.designsystem.component.OmenBadgeTone
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.component.OmenTextField
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import androidx.compose.ui.unit.dp
import java.util.Locale

/**
 * M5 slice G — the Trade destination. iOS mirror: `App/CommandCenter/OmenTradeScreen.swift`.
 *
 * Two properties are load-bearing and deliberate:
 *
 * 1. **The verdict comes from the server and only from the server.** The screen reads
 *    `verdict_state`, never `verdict`, and never derives a call from `net_value`.
 * 2. **`insufficient_data` is a first-class answer, not an error.** §9.4: name incomplete
 *    input, do not force a verdict.
 */
@Composable
fun OmenTradeScreen(
    state: TradeViewModel.ViewState,
    offer: TradeOffer,
    modifier: Modifier = Modifier,
    /** Autocomplete state for the side currently being typed into. Idle hides the surface. */
    searchState: TradeViewModel.SearchState = TradeViewModel.SearchState.Idle,
    searchingSide: TradeViewModel.Side? = null,
    onQueryChanged: ((String, TradeViewModel.Side) -> Unit)? = null,
    onAdd: ((String, TradeViewModel.Side) -> Unit)? = null,
    /** Picking a row keeps position/team/id; typing a name keeps only the name. */
    onAddResult: ((PlayerSearchResult, TradeViewModel.Side) -> Unit)? = null,
    onRemove: ((Int, TradeViewModel.Side) -> Unit)? = null,
    onCompare: (() -> Unit)? = null,
) {
    var sendDraft by remember { mutableStateOf("") }
    var receiveDraft by remember { mutableStateOf("") }
    // Picking a player closes the keyboard, matching iOS. There the open keyboard was an
    // outright trap the founder hit on a real device (no Done, no tap-out, no scroll dismiss);
    // Android always had the system back button, so this is parity rather than a rescue.
    val focusManager = LocalFocusManager.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(OmenTheme.spacing.step24),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step24),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            Text(
                text = "Trade",
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                text = if (offer.leagueContext == null) {
                    "Standard scoring. Connect a league to use your own settings."
                } else {
                    "Using your connected league's scoring and roster."
                },
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }

        TradeSide(
            title = "You send",
            players = offer.send,
            draft = sendDraft,
            // The surface belongs to one side at a time, so two filled fields can never show
            // one list between them and drop a player onto the wrong half of the offer.
            searchState = if (searchingSide == TradeViewModel.Side.Send) {
                searchState
            } else {
                TradeViewModel.SearchState.Idle
            },
            onPick = { result ->
                onAddResult?.invoke(result, TradeViewModel.Side.Send)
                sendDraft = ""
                focusManager.clearFocus()
            },
            onDraftChange = {
                sendDraft = it
                onQueryChanged?.invoke(it, TradeViewModel.Side.Send)
            },
            onAdd = { name ->
                onAdd?.invoke(name, TradeViewModel.Side.Send)
                sendDraft = ""
                focusManager.clearFocus()
            },
            onRemove = { onRemove?.invoke(it, TradeViewModel.Side.Send) },
        )

        TradeSide(
            title = "You receive",
            players = offer.receive,
            draft = receiveDraft,
            searchState = if (searchingSide == TradeViewModel.Side.Receive) {
                searchState
            } else {
                TradeViewModel.SearchState.Idle
            },
            onPick = { result ->
                onAddResult?.invoke(result, TradeViewModel.Side.Receive)
                receiveDraft = ""
                focusManager.clearFocus()
            },
            onDraftChange = {
                receiveDraft = it
                onQueryChanged?.invoke(it, TradeViewModel.Side.Receive)
            },
            onAdd = { name ->
                onAdd?.invoke(name, TradeViewModel.Side.Receive)
                receiveDraft = ""
                focusManager.clearFocus()
            },
            onRemove = { onRemove?.invoke(it, TradeViewModel.Side.Receive) },
        )

        OmenButton(
            text = "Compare",
            onClick = { onCompare?.invoke() },
            variant = OmenButtonVariant.Primary,
            size = OmenButtonSize.Lg,
            enabled = offer.isComparable,
        )
        if (!offer.isComparable) {
            // Says which half is missing rather than leaving a dead button unexplained.
            Text(
                text = when {
                    offer.send.isEmpty() && offer.receive.isEmpty() ->
                        "Add at least one player to each side."
                    offer.send.isEmpty() -> "Add a player you'd send."
                    else -> "Add a player you'd receive."
                },
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }

        when (state) {
            // Deliberately nothing. A verdict surface before the user has asked would be
            // answering a question nobody put.
            TradeViewModel.ViewState.Idle -> Unit
            TradeViewModel.ViewState.Loading -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Loading,
                title = "Weighing the offer",
                message = "Omen is comparing both sides.",
            )
            TradeViewModel.ViewState.Demo -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Mock,
                title = "Demo mode",
                message = "Sign in to compare a real offer. Demo mode issues no verdict.",
            )
            is TradeViewModel.ViewState.Failed -> Column(
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
            ) {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Error,
                    title = "Omen couldn't compare this",
                    message = TradeViewModel.messageFor(state.error),
                )
                OmenButton(
                    text = "Try again",
                    onClick = { onCompare?.invoke() },
                    variant = OmenButtonVariant.Secondary,
                    size = OmenButtonSize.Md,
                )
            }
            is TradeViewModel.ViewState.Loaded -> TradeVerdictCard(state.result)
        }
    }
}

@Composable
private fun TradeSide(
    title: String,
    players: List<TradePlayer>,
    draft: String,
    searchState: TradeViewModel.SearchState,
    onPick: (PlayerSearchResult) -> Unit,
    onDraftChange: (String) -> Unit,
    onAdd: (String) -> Unit,
    onRemove: (Int) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        Text(
            text = title,
            style = OmenTheme.typography.label.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )

        players.forEachIndexed { index, player ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(OmenTheme.color.surface1)
                    .padding(OmenTheme.spacing.step12)
                    .semantics {
                        contentDescription =
                            "${player.name}, activate remove to take out of the offer"
                    },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = player.name,
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                    modifier = Modifier.weight(1f),
                )
                OmenButton(
                    text = "Remove",
                    onClick = { onRemove(index) },
                    variant = OmenButtonVariant.Link,
                    size = OmenButtonSize.Sm,
                )
            }
        }

        // Sits directly under the field it belongs to, and only for the side being typed into.
        // `F-BAR-34`: each outcome gets its own surface. A failure never renders as an empty
        // list, because "no results" is a claim about the player, not about the request.
        when (searchState) {
            is TradeViewModel.SearchState.Idle -> Unit

            is TradeViewModel.SearchState.Searching -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Loading,
                title = "Searching",
                message = "Looking up players.",
            )

            is TradeViewModel.SearchState.Results -> Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(OmenTheme.color.surface1),
            ) {
                searchState.rows.forEach { player ->
                    OmenListRow(
                        title = player.name,
                        subtitle = player.subtitle,
                        onClick = { onPick(player) },
                    )
                }
            }

            is TradeViewModel.SearchState.Empty -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "No player matches \u201C${searchState.query}\u201D",
                message = "Check the spelling, or type the full name and press Add.",
            )

            is TradeViewModel.SearchState.Failed -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Error,
                title = TradeViewModel.searchTitleFor(searchState.error),
                message = TradeViewModel.searchMessageFor(searchState.error),
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
            verticalAlignment = Alignment.Bottom,
        ) {
            OmenTextField(
                value = draft,
                onValueChange = onDraftChange,
                label = "Add a player",
                placeholder = "Player name",
                modifier = Modifier.weight(1f),
            )
            OmenButton(
                text = "Add",
                onClick = { onAdd(draft) },
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Md,
            )
        }
    }
}

@Composable
private fun TradeVerdictCard(result: TradeCompare) {
    // `insufficient_data` is an honest non-answer, not a failure, so it does not take the risk
    // tone. Nothing here is coloured by whether the verdict is good news.
    val tone = when (result.verdictState) {
        TradeCompare.VerdictState.FavorsYou -> OmenBadgeTone.Success
        TradeCompare.VerdictState.YouGiveUpTooMuch -> OmenBadgeTone.Risk
        TradeCompare.VerdictState.CloseNeedsContext -> OmenBadgeTone.Neutral
        TradeCompare.VerdictState.InsufficientData -> OmenBadgeTone.Unavailable
    }

    OmenCard(
        variant = OmenCardVariant.Outlined,
        modifier = Modifier.semantics {
            contentDescription = "${result.headline}. ${result.subhead}"
        },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
            OmenBadge(
                label = if (result.analysisContext.isPersonalized) "Personalized" else "Standard scoring",
                tone = tone,
            )
            Text(
                text = result.headline,
                style = OmenTheme.typography.h2.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                text = result.subhead,
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )

            // Shown only when the server actually evaluated the offer. Printing a net value
            // beside "Omen can't call this one" would contradict the verdict.
            if (result.evaluability.isEvaluable && result.netValue != null) {
                Text(
                    text = String.format(Locale.US, "Net value %+.1f", result.netValue),
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }

            result.explanation?.takeIf { it.isNotEmpty() }?.let {
                Text(
                    text = it,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }

            // The server says when it could not personalize. Naming the reason beats silently
            // returning a neutral answer the user thinks is personalized.
            result.analysisContext.unavailableReason?.let {
                Text(
                    text = unavailableCopy(it),
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                )
            }
        }
    }
}

private fun unavailableCopy(reason: String): String = when (reason) {
    "unauthenticated" -> "Sign in to compare this with your league's settings."
    "provider_unsupported" -> "This provider doesn't support personalized trade analysis yet."
    else -> "Omen used standard scoring for this one."
}
