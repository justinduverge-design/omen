package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.2 DecisionBrief shell state, per
 * `Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md`. One sealed hierarchy
 * for all 8 required state surfaces so callers cannot mix a Success render with a Mock
 * badge — the shell decides which surface renders.
 */
sealed interface OmenDecisionBriefState {
    data class Success(val payload: OmenDecisionBriefPayload) : OmenDecisionBriefState
    data class Empty(val message: String) : OmenDecisionBriefState
    data object Loading : OmenDecisionBriefState
    data class Error(val message: String, val onRetry: (() -> Unit)? = null) : OmenDecisionBriefState
    data class Disconnected(val onConnect: (() -> Unit)? = null) : OmenDecisionBriefState
    data class Stale(val payload: OmenDecisionBriefPayload, val lastSynced: String) : OmenDecisionBriefState
    data class Mock(val payload: OmenDecisionBriefPayload) : OmenDecisionBriefState
    data object OffSeason : OmenDecisionBriefState
}

/** DecisionBrief payload per shell brief §2 field set. Any field may be absent. */
data class OmenDecisionBriefPayload(
    val verdict: String,
    val move: String,
    val impact: String? = null,
    val confidence: Int,
    val risk: OmenRiskLevel,
    val riskReasons: List<String> = emptyList(),
    val explanation: List<String> = emptyList(),
    val metrics: List<OmenMetricItem> = emptyList(),
    val signals: List<OmenSignalItem> = emptyList(),
    val alternatives: List<OmenDecisionBriefAlternative> = emptyList(),
)

/** One "considered but not recommended" player row shown under the primary recommendation. */
data class OmenDecisionBriefAlternative(
    val name: String,
    val position: OmenPosition,
    val team: String? = null,
    val meta: String? = null,
)

/**
 * Registry §3.2 DecisionBrief shell. The single Omen recommendation surface that Command
 * Center, Omen, and Trade all render. `state` is the source of truth for what appears —
 * the outer Card remains the outer container in every state so scroll position and
 * outer chrome stay stable.
 *
 * `feedbackSlot` is a slot rather than structured props (see brief §10 open question) — the
 * consuming feature decides its own feedback UI (rating stars, thumbs, text field) and
 * hands it in composed. `null` means the feedback surface is not rendered.
 */
@Composable
fun OmenDecisionBrief(
    state: OmenDecisionBriefState,
    modifier: Modifier = Modifier,
    feedbackSlot: (@Composable () -> Unit)? = null,
) {
    // OmenStateSurface already renders its own Card. To avoid Card-in-Card double-nesting,
    // state variants that delegate to a state surface render at the top level; payload
    // variants (Success/Stale/Mock) wrap themselves in a Card so the outer chrome is
    // consistent across all "we have advice" renders. Callers see a single visually
    // wrapped block either way.
    when (state) {
        is OmenDecisionBriefState.Success -> OmenCard(modifier = modifier.fillMaxWidth()) {
            SuccessBody(state.payload, feedbackSlot)
        }
        is OmenDecisionBriefState.Stale -> OmenCard(modifier = modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
                StaleBanner(lastSynced = state.lastSynced)
                SuccessBody(state.payload, feedbackSlot)
            }
        }
        is OmenDecisionBriefState.Mock -> OmenCard(
            modifier = modifier.fillMaxWidth(),
            variant = OmenCardVariant.Preview,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
                MockBanner()
                SuccessBody(state.payload, feedbackSlot)
            }
        }
        is OmenDecisionBriefState.Empty -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "Nothing to recommend right now",
            message = state.message,
            modifier = modifier,
        )
        OmenDecisionBriefState.Loading -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Loading,
            title = "Analyzing your matchup…",
            message = "Checking the latest roster and schedule signals.",
            modifier = modifier,
        )
        is OmenDecisionBriefState.Error -> ErrorBody(state, modifier)
        is OmenDecisionBriefState.Disconnected -> DisconnectedBody(state, modifier)
        OmenDecisionBriefState.OffSeason -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "Omen is off this week",
            message = "The regular season isn't running. Omen will be back when Week 1 kicks off.",
            modifier = modifier,
        )
    }
}

@Composable
private fun ErrorBody(state: OmenDecisionBriefState.Error, modifier: Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Error,
            title = "Unable to build this recommendation",
            message = state.message,
        )
        val retry = state.onRetry
        if (retry != null) {
            OmenButton(text = "Try again", onClick = retry, size = OmenButtonSize.Md)
        }
    }
}

@Composable
private fun DisconnectedBody(state: OmenDecisionBriefState.Disconnected, modifier: Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Disconnected,
            title = "Connect a league",
            message = "Connect Sleeper, Yahoo, or ESPN so Omen can read your roster and matchup.",
        )
        val connect = state.onConnect
        if (connect != null) {
            OmenButton(text = "Connect a league", onClick = connect, size = OmenButtonSize.Md)
        }
    }
}

@Composable
private fun MockBanner() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        OmenBadge(label = "Demo", tone = OmenBadgeTone.Mock)
        Text(
            text = "Sample data — not live advice.",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )
    }
}

@Composable
private fun StaleBanner(lastSynced: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        OmenBadge(label = "Stale", tone = OmenBadgeTone.Stub)
        Text(
            text = "Showing your last sync · $lastSynced",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )
    }
}

@Composable
private fun SuccessBody(
    payload: OmenDecisionBriefPayload,
    feedbackSlot: (@Composable () -> Unit)?,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            Text(
                text = payload.verdict,
                style = OmenTheme.typography.h2.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                text = payload.move,
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            val impact = payload.impact
            if (impact != null) {
                Text(
                    text = impact,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }
        if (payload.metrics.isNotEmpty()) {
            OmenMetricStrip(items = payload.metrics)
        }
        OmenConfidenceBar(score = payload.confidence, label = "Confidence")
        OmenRiskPanel(level = payload.risk, reasons = payload.riskReasons)
        for (paragraph in payload.explanation) {
            Text(
                text = paragraph,
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }
        if (payload.signals.isNotEmpty()) {
            OmenSignalList(signals = payload.signals)
        }
        if (payload.alternatives.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                Text(
                    text = "Also considered",
                    style = OmenTheme.typography.label.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                for (alternative in payload.alternatives) {
                    OmenPlayerRow(
                        name = alternative.name,
                        position = alternative.position,
                        team = alternative.team,
                        meta = alternative.meta,
                    )
                }
            }
        }
        if (feedbackSlot != null) {
            feedbackSlot()
        }
    }
}
