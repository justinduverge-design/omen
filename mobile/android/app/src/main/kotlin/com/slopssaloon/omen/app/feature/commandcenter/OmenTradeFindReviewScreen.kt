package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.invisibleToUser
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.api.TradeFindCandidate
import com.slopssaloon.omen.app.feature.api.TradeFindPlayer
import com.slopssaloon.omen.app.feature.api.TradeFindPositionNeed
import com.slopssaloon.omen.app.feature.api.TradeFindReviewViewModel
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.app.feature.shell.OmenScreenContext
import com.slopssaloon.omen.app.feature.shell.OmenScreenHeaderControls
import com.slopssaloon.omen.app.feature.shell.OmenScreenSwitcherBar
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

// -------------------------------------------------------------------------------------------
// T3, "reviewing what Omen found" -- the Compose half of `TradeFindReview`, from
// `Blueprints/specs/design/screen-contracts/TradeFindReview-v1.md`, compiled from
// `design/native-visual-lock-2026-09-13/TradeFindReview.dc.html`. iOS mirror:
// `App/CommandCenter/OmenTradeFindReviewScreen.swift`.
//
// Two decisions carried over from the design session, both non-negotiable per the contract's
// "Build acceptance" section:
//   1. Reasoning is never behind a second tap -- the candidate card renders `Your need` /
//      `Their need` / `Evidence` unconditionally.
//   2. Every gesture has an always-visible button doing the identical thing -- the drag on the
//      card is a shortcut; `Pass` and `Save for later` are the real interface.
//
// **Flagged contract drift** (see the Swift file's header note for the full reasoning): E034's
// binding table names `reasoning.opponent_receives`, but the contract's own literal fixture only
// reproduces "Needs RB" from `reasoning.user_receives`. This file binds to `user_receives`,
// matching the literal example and the header's evident intent.
// -------------------------------------------------------------------------------------------

@Composable
fun OmenTradeFindReviewScreen(
    viewModel: TradeFindReviewViewModel,
    platform: String,
    leagueId: String,
    teamId: String,
    week: Int? = null,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onExit: (() -> Unit)? = null,
) {
    LaunchedEffect(platform, leagueId, teamId, week) {
        viewModel.load(platform, leagueId, teamId, week)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .semantics { contentDescription = "trade-find-review-screen" },
    ) {
        OmenScreenSwitcherBar(context)
        Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
            TradeFindReviewHeader(onOpenAccount)
            when (val state = viewModel.viewState) {
                TradeFindReviewViewModel.ViewState.Loading -> TradeFindLoadingBlock()
                TradeFindReviewViewModel.ViewState.Reviewing -> ReviewingContent(viewModel)
                TradeFindReviewViewModel.ViewState.BatchExhausted -> {
                    OmenStateSurface(
                        kind = OmenStateSurfaceKind.Empty,
                        title = "That's everyone this week.",
                        message = "Omen scanned ${viewModel.response?.teamsConsidered ?: 0} teams and found " +
                            "${viewModel.response?.candidates?.size ?: 0} worth a look. Come back once your " +
                            "league's rosters move.",
                        modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step32),
                    )
                    OmenButton(
                        text = "Back to Trade",
                        onClick = { onExit?.invoke() },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.step16),
                        variant = OmenButtonVariant.Secondary,
                        size = OmenButtonSize.Lg,
                    )
                }
                TradeFindReviewViewModel.ViewState.ZeroCandidates -> {
                    OmenStateSurface(
                        kind = OmenStateSurfaceKind.Empty,
                        title = "No real gaps to fill.",
                        message = "Omen checked ${viewModel.response?.totalOtherTeams ?: 0} teams against your " +
                            "roster and found nothing that clearly helps you. That's not a miss — some weeks " +
                            "there's nothing there.",
                        modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step32),
                    )
                    OmenButton(
                        text = "Back to Trade",
                        onClick = { onExit?.invoke() },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.step16),
                        variant = OmenButtonVariant.Secondary,
                        size = OmenButtonSize.Lg,
                    )
                }
                is TradeFindReviewViewModel.ViewState.RouteElsewhere -> {
                    // Not this screen's job to render (own-roster-unreadable / league-not-active /
                    // team-not-found route to the existing ConnectFailed/LeagueDegraded family).
                    OmenStateSurface(
                        kind = OmenStateSurfaceKind.Disconnected,
                        title = "Omen can't check this league right now",
                        message = "This isn't a \"no candidates found\" answer — Omen couldn't read what it " +
                            "needed to check. Try again from League.",
                        modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step32),
                    )
                }
                is TradeFindReviewViewModel.ViewState.Failed -> {
                    OmenStateSurface(
                        kind = OmenStateSurfaceKind.Error,
                        title = "Omen couldn't load candidates",
                        message = messageFor(state.error),
                        modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step32),
                    )
                }
            }
            Spacer(modifier = Modifier.height(OmenTheme.spacing.step16))
        }
    }
}

private fun messageFor(error: com.slopssaloon.omen.app.feature.api.OmenApiError): String = when (error) {
    com.slopssaloon.omen.app.feature.api.OmenApiError.Network ->
        "Omen couldn't reach the server. Check your connection and try again."
    com.slopssaloon.omen.app.feature.api.OmenApiError.Unauthorized ->
        "Your session expired. Sign in again to see your league's candidates."
    is com.slopssaloon.omen.app.feature.api.OmenApiError.Server ->
        "Omen is having trouble on our side. Try again in a moment."
    com.slopssaloon.omen.app.feature.api.OmenApiError.Decode ->
        "Omen sent something this version of the app couldn't read."
}

@Composable
private fun TradeFindReviewHeader(onOpenAccount: (() -> Unit)?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
        ) {
            Text("Find a trade", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
            Text("Review picks", style = OmenTheme.typography.screenTitle.toTextStyle(), color = OmenTheme.color.textPrimary)
        }
        OmenScreenHeaderControls(OmenHelpDestination.Trade, onOpenAccount = onOpenAccount)
    }
}

/** Loading state: "Scanning your league…", skeleton lines sized to the card's own rhythm. */
@Composable
private fun TradeFindLoadingBlock() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step16)
            .semantics { contentDescription = "Scanning your league" },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
    ) {
        Text("Scanning your league…", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        SkeletonLine(height = 20.dp, widthFraction = 0.4f)
        SkeletonLine(height = 55.dp)
        SkeletonLine(height = 55.dp)
        SkeletonLine(height = 34.dp, widthFraction = 0.9f)
        SkeletonLine(height = 34.dp, widthFraction = 0.85f)
        SkeletonLine(height = 34.dp, widthFraction = 0.7f)
    }
}

@Composable
private fun SkeletonLine(height: androidx.compose.ui.unit.Dp, widthFraction: Float = 1f) {
    val brush = Brush.horizontalGradient(listOf(OmenTheme.color.surface1, OmenTheme.color.surface2, OmenTheme.color.surface1))
    Box(
        modifier = Modifier
            .fillMaxWidth(widthFraction)
            .height(height)
            .clip(RoundedCornerShape(6.dp))
            .background(brush)
            .semantics { invisibleToUser() },
    )
}

/** `BatchProgressBar` + degraded banner + the candidate card + the always-visible action row. */
@Composable
private fun ReviewingContent(viewModel: TradeFindReviewViewModel) {
    BatchProgressBar(
        positionLabel = viewModel.positionLabel,
        teamsScannedLabel = viewModel.teamsScannedLabel,
        currentIndex = viewModel.currentIndex,
        total = viewModel.candidates.size,
    )
    val showing = viewModel.degradedShowingLabel
    val sentence = viewModel.degradedSentence
    if (showing != null && sentence != null) {
        DegradedBanner(
            showingLabel = showing,
            sentence = sentence,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step10),
        )
    }
    val candidate = viewModel.currentCandidate
    if (candidate != null) {
        val scope = rememberCoroutineScope()
        CandidateSwipeCard(
            candidate = candidate,
            onPass = { viewModel.pass() },
            onSave = { scope.launch { viewModel.save() } },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step12),
        )
        Text(
            "Swipe right to save, left to pass — or use the buttons below.",
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step10),
        )
        val saveState = viewModel.saveState(candidate.id)
        SwipeActionRow(
            saveState = saveState,
            onPass = { viewModel.pass() },
            onSave = { scope.launch { viewModel.save() } },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step8),
        )
        Text(
            "Saved picks keep this reasoning.",
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step8),
        )
    }
}

/** "Candidate 3 of 6" and "5 of 6 teams scanned" side by side, plus a dot pager. */
@Composable
private fun BatchProgressBar(positionLabel: String?, teamsScannedLabel: String?, currentIndex: Int, total: Int) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            if (positionLabel != null) {
                Text(
                    "Candidate $positionLabel",
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            if (teamsScannedLabel != null) {
                Text(teamsScannedLabel, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
            }
        }
        if (total > 0) {
            Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
                repeat(total) { index ->
                    val on = index == currentIndex
                    androidx.compose.foundation.layout.Box(
                        modifier = Modifier
                            .width(if (on) 16.dp else 5.dp)
                            .height(5.dp)
                            .clip(RoundedCornerShape(50))
                            .background(if (on) OmenTheme.color.accent else OmenTheme.color.borderSubtle),
                    )
                }
            }
        }
    }
}

/** Reuses the dashed-hairline `.hatch` treatment for real data with a named gap. */
@Composable
private fun DegradedBanner(showingLabel: String, sentence: String, modifier: Modifier = Modifier) {
    val border = OmenTheme.color.border
    Column(
        modifier = modifier
            .drawBehind {
                drawRoundRect(
                    color = border,
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(13.dp.toPx()),
                    style = Stroke(width = 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx()), 0f)),
                )
            }
            .background(Brush.verticalGradient(listOf(OmenTheme.color.surface2, OmenTheme.color.surface1)), RoundedCornerShape(13.dp))
            .padding(OmenTheme.spacing.step12)
            .semantics { contentDescription = "$showingLabel $sentence" },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
    ) {
        Text(showingLabel, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        Text(sentence, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
    }
}

/**
 * `CandidateSwipeCard` -- the primary drawn state. Reasoning renders unconditionally; there is
 * no collapsed/expandable state for it. Carries the drag gesture (the hidden gesture stamps),
 * while [SwipeActionRow] below carries the same two actions as always-visible buttons.
 */
@Composable
private fun CandidateSwipeCard(
    candidate: TradeFindCandidate,
    onPass: () -> Unit,
    onSave: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val offsetX = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val commitThresholdPx = with(androidx.compose.ui.platform.LocalDensity.current) { 96.dp.toPx() }
    // Read outside `drawBehind` -- that lambda is a `DrawScope`, not `@Composable`, so it cannot
    // read `OmenTheme.color` itself (the same pattern `OmenTradeJourneyScreens.kt`'s
    // `TradeReadBlock`/`TradeShareCard` already use for their own hairlines).
    val cardAccentLine = OmenTheme.color.accent.copy(alpha = 0.34f)

    Column(
        modifier = modifier
            .offset { IntOffset(offsetX.value.roundToInt(), 0) }
            .pointerInput(candidate.id) {
                detectHorizontalDragGestures(
                    onDragEnd = {
                        val value = offsetX.value
                        scope.launch {
                            when {
                                value <= -commitThresholdPx -> {
                                    offsetX.animateTo(0f)
                                    onPass()
                                }
                                value >= commitThresholdPx -> {
                                    offsetX.animateTo(0f)
                                    onSave()
                                }
                                else -> offsetX.animateTo(0f)
                            }
                        }
                    },
                    onHorizontalDrag = { change, dragAmount ->
                        change.consume()
                        scope.launch { offsetX.snapTo(offsetX.value + dragAmount) }
                    },
                )
            }
            .clip(RoundedCornerShape(15.dp))
            .background(Brush.verticalGradient(listOf(OmenTheme.color.surface2, OmenTheme.color.surface1)))
            .drawBehind {
                drawRect(color = cardAccentLine, size = Size(size.width, 1f))
            }
            .padding(OmenTheme.spacing.step14),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        Header(candidate)
        Chips(candidate)
        Legs(candidate)
        ReasoningLine(candidate)
        Evidence(candidate)
    }

    // Gesture stamps: opacity tracks drag magnitude past the commit threshold, hidden at rest.
    val passOpacity = if (offsetX.value < 0f) (-offsetX.value / commitThresholdPx).coerceIn(0f, 1f) else 0f
    val saveOpacity = if (offsetX.value > 0f) (offsetX.value / commitThresholdPx).coerceIn(0f, 1f) else 0f
    Box(modifier = modifier.height(0.dp)) {
        GestureStamp("Pass", OmenTheme.color.textTertiary, passOpacity, Alignment.TopStart, -10f)
        GestureStamp("Save", OmenTheme.color.accent, saveOpacity, Alignment.TopEnd, 10f)
    }
}

@Composable
private fun androidx.compose.foundation.layout.BoxScope.GestureStamp(
    label: String,
    color: Color,
    opacity: Float,
    alignment: Alignment,
    rotationDegrees: Float,
) {
    Box(
        modifier = Modifier
            .align(alignment)
            .clip(RoundedCornerShape(6.dp))
            .drawBehind {
                drawRoundRect(
                    color = color,
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()),
                    style = Stroke(width = 2.dp.toPx()),
                )
            }
            .padding(horizontal = OmenTheme.spacing.step10, vertical = OmenTheme.spacing.step4)
            .semantics { invisibleToUser() },
    ) {
        Text(label, style = OmenTheme.typography.label.toTextStyle(), color = color.copy(alpha = opacity))
    }
}

@Composable
private fun Header(candidate: TradeFindCandidate) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            "vs ${candidate.opponentDisplayName}",
            style = OmenTheme.typography.h3.toTextStyle(),
            color = OmenTheme.color.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        // See this file's header note: bound to `user_receives`, not the binding table's named
        // `opponent_receives`, to match the contract's own literal example.
        val need = candidate.reasoning.userReceives
        Text(
            if (need.need.status == "hole") "Needs ${need.position}" else "No hole",
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.accent,
        )
    }
}

@Composable
private fun Chips(candidate: TradeFindCandidate) {
    val fillsFor = candidate.reasoning.fillsNeedFor
    if (fillsFor == listOf("no_named_hole_on_either_side")) {
        Text("No named hole on either side", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        return
    }
    Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
        if (fillsFor.contains("user")) {
            FillsChip("Fills your ${candidate.reasoning.userReceives.position} hole")
        }
        if (fillsFor.contains("opponent")) {
            FillsChip("Fills their ${candidate.reasoning.opponentReceives.position} hole")
        }
    }
}

@Composable
private fun FillsChip(text: String) {
    val accent = OmenTheme.color.accent
    Box(
        modifier = Modifier
            .sizeIn(minHeight = 44.dp)
            .drawBehind {
                drawRoundRect(
                    color = accent.copy(alpha = 0.38f),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(7.dp.toPx()),
                    style = Stroke(width = 1.dp.toPx()),
                )
            }
            .padding(horizontal = OmenTheme.spacing.step10),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(text, style = OmenTheme.typography.micro.toTextStyle(), color = accent)
    }
}

@Composable
private fun Legs(candidate: TradeFindCandidate) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6), modifier = Modifier.padding(top = OmenTheme.spacing.step2)) {
        LegHeading("You send")
        LegRow(label = "Out", labelColor = OmenTheme.color.textTertiary, player = candidate.give)
        LegHeading("You receive")
        LegRow(label = "In", labelColor = OmenTheme.color.accent, player = candidate.receive)
    }
}

@Composable
private fun LegHeading(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
        Text(text, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        Box(modifier = Modifier.weight(1f).height(1.dp).background(OmenTheme.color.borderSubtle))
    }
}

@Composable
private fun LegRow(label: String, labelColor: Color, player: TradeFindPlayer) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(OmenTheme.color.surface1)
            .padding(OmenTheme.spacing.step10)
            .clearAndSetSemantics { contentDescription = "$label, ${player.name}, ${player.meta}, ${player.pointsLabel}" },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = OmenTheme.typography.micro.toTextStyle(), color = labelColor, modifier = Modifier.width(22.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(player.name, style = OmenTheme.typography.name.toTextStyle(), color = OmenTheme.color.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(player.meta, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text(player.pointsLabel, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
    }
}

@Composable
private fun ReasoningLine(candidate: TradeFindCandidate) {
    val userSign = candidate.userLineupDelta?.let(::signedString) ?: "—"
    val oppSign = candidate.opponentLineupDelta?.let(::signedString) ?: "—"
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            buildString { append(userSign) },
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textPrimary,
        )
        Text(
            " to your starting lineup this week · $oppSign to theirs.",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )
    }
}

private fun signedString(value: Double): String = if (value >= 0) "+%.1f".format(value) else "%.1f".format(value)

@Composable
private fun Evidence(candidate: TradeFindCandidate) {
    val reasoning = candidate.reasoning
    val hairline = OmenTheme.color.textPrimary.copy(alpha = 0.08f)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind { drawRect(color = hairline, size = Size(size.width, 1f)) }
            .padding(top = OmenTheme.spacing.step10),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        EvidenceRow("Your need", needSentence(reasoning.userReceives, isSelf = true))
        EvidenceRow("Their need", needSentence(reasoning.opponentReceives, isSelf = false))
        EvidenceRow("Evidence", evidenceSentence(reasoning.evidence))
    }
}

@Composable
private fun EvidenceRow(key: String, statement: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "$key. $statement" },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        Text(
            key,
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            maxLines = 2,
            modifier = Modifier.width(84.dp),
        )
        Text(statement, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary, modifier = Modifier.weight(1f))
    }
}

private fun needSentence(positionNeed: TradeFindPositionNeed, isSelf: Boolean): String {
    val position = positionNeed.position
    val need = positionNeed.need
    val have = need.have?.toString() ?: "an unknown number of"
    val required = need.required?.toString() ?: "an unknown number of"
    return when (need.status) {
        "hole" -> if (isSelf) {
            "$position is a hole — you start $have, the league needs $required."
        } else {
            "$position is a hole for them — they start $have, the league needs $required."
        }
        "surplus" -> if (isSelf) {
            "$position is surplus for you — you start $required, roster $have."
        } else {
            "$position is surplus for them — they start $required, roster $have."
        }
        "balanced" -> if (isSelf) {
            "$position is even for you — you start $required, roster $have."
        } else {
            "$position is even for them — they start $required, roster $have."
        }
        else -> "$position isn't tracked for this league shape."
    }
}

private val evidenceLabels = mapOf(
    "live_roster_depth" to "Live roster depth",
    "live_lineup_projection_delta" to "Live lineup-projection delta",
    "missing_projection_for_some_players" to "Missing a projection for some players",
)

private fun evidenceSentence(slugs: List<String>): String {
    val ordered = slugs.sortedBy { if (it == "missing_projection_for_some_players") 1 else 0 }
    return ordered.joinToString(" · ") { evidenceLabels[it] ?: it.replace('_', ' ').replaceFirstChar(Char::uppercaseChar) }
}

/** `SwipeActionRow` -- `Pass` and `Save for later`, always visible, always tappable. */
@Composable
private fun SwipeActionRow(
    saveState: TradeFindReviewViewModel.SaveState,
    onPass: () -> Unit,
    onSave: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val saveTitle = when (saveState) {
        TradeFindReviewViewModel.SaveState.Idle -> "Save for later"
        TradeFindReviewViewModel.SaveState.Saving -> "Saving…"
        TradeFindReviewViewModel.SaveState.Saved -> "Saved ✓"
        TradeFindReviewViewModel.SaveState.Error -> "Couldn't save — try again"
    }
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
        OmenButton(
            text = "Pass",
            onClick = onPass,
            modifier = Modifier.weight(1f),
            variant = OmenButtonVariant.Secondary,
            size = OmenButtonSize.Lg,
        )
        OmenButton(
            text = saveTitle,
            onClick = onSave,
            modifier = Modifier.weight(1f),
            variant = if (saveState == TradeFindReviewViewModel.SaveState.Saved) OmenButtonVariant.Secondary else OmenButtonVariant.Primary,
            size = OmenButtonSize.Lg,
            enabled = saveState != TradeFindReviewViewModel.SaveState.Saving && saveState != TradeFindReviewViewModel.SaveState.Saved,
            loading = saveState == TradeFindReviewViewModel.SaveState.Saving,
        )
    }
}
