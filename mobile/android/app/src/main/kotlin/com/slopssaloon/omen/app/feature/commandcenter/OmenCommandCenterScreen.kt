package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.core.designsystem.component.OmenConnectionStatus
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBrief
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefAlternative
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefPayload
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.designsystem.component.OmenMetricDelta
import com.slopssaloon.omen.core.designsystem.component.OmenMetricItem
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformConnectionCard
import com.slopssaloon.omen.core.designsystem.component.OmenPosition
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.component.OmenSignalItem
import com.slopssaloon.omen.core.designsystem.component.OmenSignalSource
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.2 approved **screen assembly** (feature layer) — not a design-system
 * component. Composes approved primitives (Card/Badge/Button/StateSurface/typography +
 * spacing tokens) and P3 compositions (PlatformConnectionCard, ConnectionStatusBadge,
 * PlatformBadge, DecisionBrief) into the signed-in Command Center landing surface. Lives
 * in `app/feature/commandcenter/` so the DS module stays product-agnostic.
 *
 * V1 renders fixture data with visible mock labels; live wiring (dashboard-summary polling
 * + POST /api/omen/mvp-move) is a separate task. Every state path (all six
 * OmenConnectionStatus values × all eight OmenDecisionBriefState surfaces) can be
 * exercised by swapping the fixture payload — the screen has no data-fetching branches of
 * its own.
 */
@Composable
fun OmenCommandCenterScreen(
    state: OmenCommandCenterState,
    modifier: Modifier = Modifier,
) {
    val colors = OmenTheme.color
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.bg)
            .verticalScroll(rememberScrollState())
            .padding(
                PaddingValues(
                    horizontal = OmenTheme.spacing.step16,
                    vertical = OmenTheme.spacing.step24,
                )
            ),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.sectionStack),
    ) {
        HeaderBlock(state.greeting, state.leagueScope)
        PlatformsSection(state.platforms)
        OmenSection(state.decision)
    }
}

@Composable
private fun HeaderBlock(greeting: String, leagueScope: String?) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
        Text(
            text = "Command Center",
            style = OmenTheme.typography.eyebrow.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )
        Text(
            text = greeting,
            style = OmenTheme.typography.h1.toTextStyle(),
            color = OmenTheme.color.textPrimary,
        )
        if (leagueScope != null) {
            Text(
                text = leagueScope,
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }
    }
}

@Composable
private fun PlatformsSection(platforms: List<OmenCommandCenterPlatform>) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel(text = "Your platforms")
        for (platform in platforms) {
            OmenPlatformConnectionCard(
                platform = platform.platform,
                status = platform.status,
                description = platform.description,
                actionLabel = platform.actionLabel,
                onAction = platform.onAction,
            )
        }
    }
}

@Composable
private fun OmenSection(decision: OmenDecisionBriefState) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel(text = "This week's Omen")
        OmenDecisionBrief(state = decision)
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
 * from whatever data source is authoritative (fixture, dashboard-summary response, demo
 * mode). The screen renders honestly for every combination without inspecting the source.
 */
data class OmenCommandCenterState(
    val greeting: String,
    val leagueScope: String?,
    val platforms: List<OmenCommandCenterPlatform>,
    val decision: OmenDecisionBriefState,
)

data class OmenCommandCenterPlatform(
    val platform: OmenPlatform,
    val status: OmenConnectionStatus,
    val description: String? = null,
    val actionLabel: String? = null,
    val onAction: (() -> Unit)? = null,
)

/**
 * Static demo fixtures for gallery, previews, and until the live wiring lands. Every
 * `demoState*` here is visibly labeled (Mock DecisionBrief variant, mock connection
 * copy) so nothing here can be mistaken for a live recommendation. Fixture strings are
 * scaffold copy — real product copy lands in the live-wiring pass with a proper
 * `slops-ux-copy` review.
 */
object OmenCommandCenterFixtures {
    private val samplePayload = OmenDecisionBriefPayload(
        verdict = "Start Christian McCaffrey",
        move = "Bench Ken Walker for the RB1 slot.",
        impact = "+4.1 projected over your bench.",
        confidence = 72,
        risk = OmenRiskLevel.Low,
        riskReasons = listOf("McCaffrey full-practice Fri.", "Weather stable in SF."),
        explanation = listOf(
            "49ers implied 27 against a bottom-5 rush defense.",
            "Ken Walker limited practice with an ankle.",
        ),
        metrics = listOf(
            OmenMetricItem(label = "Projected", value = "22.4", delta = "+4.1", deltaDirection = OmenMetricDelta.Positive),
            OmenMetricItem(label = "Ceiling", value = "31.8"),
        ),
        signals = listOf(
            OmenSignalItem(label = "Yahoo roster snapshot", source = OmenSignalSource.Live, detail = "Refreshed 4 minutes ago."),
            OmenSignalItem(label = "Opponent defense grade", source = OmenSignalSource.Stub),
        ),
        alternatives = listOf(
            OmenDecisionBriefAlternative(name = "Ken Walker III", position = OmenPosition.RB, team = "SEA", meta = "Limited practice"),
        ),
    )

    val demoConnected = OmenCommandCenterState(
        greeting = "This week's move is ready.",
        leagueScope = "Sunday Slate · Sleeper · 12 teams",
        platforms = listOf(
            OmenCommandCenterPlatform(
                platform = OmenPlatform.Sleeper,
                status = OmenConnectionStatus.Connected,
                description = "Last synced 4 minutes ago.",
                actionLabel = "Manage league",
                onAction = {},
            ),
            OmenCommandCenterPlatform(
                platform = OmenPlatform.Yahoo,
                status = OmenConnectionStatus.Disconnected,
                description = "Connect Yahoo to blend the two rosters.",
                actionLabel = "Connect Yahoo",
                onAction = {},
            ),
        ),
        decision = OmenDecisionBriefState.Mock(samplePayload),
    )

    val demoDisconnected = OmenCommandCenterState(
        greeting = "Connect a league to see your Omen.",
        leagueScope = null,
        platforms = listOf(
            OmenCommandCenterPlatform(
                platform = OmenPlatform.Sleeper,
                status = OmenConnectionStatus.Disconnected,
                description = "Fastest way in — Sleeper username only.",
                actionLabel = "Connect Sleeper",
                onAction = {},
            ),
            OmenCommandCenterPlatform(
                platform = OmenPlatform.Yahoo,
                status = OmenConnectionStatus.Disconnected,
                description = "Official OAuth in your system browser.",
                actionLabel = "Connect Yahoo",
                onAction = {},
            ),
        ),
        decision = OmenDecisionBriefState.Disconnected(onConnect = {}),
    )

    val demoReauth = OmenCommandCenterState(
        greeting = "Sunday Slate needs a reconnect.",
        leagueScope = "Sunday Slate · Yahoo · 12 teams",
        platforms = listOf(
            OmenCommandCenterPlatform(
                platform = OmenPlatform.Yahoo,
                status = OmenConnectionStatus.NeedsReauth,
                description = "Reconnect to restore this week's roster.",
                actionLabel = "Reconnect Yahoo",
                onAction = {},
            ),
        ),
        decision = OmenDecisionBriefState.Error(
            message = "Yahoo session expired before we could read your roster.",
            onRetry = {},
        ),
    )

    val demoLoading = OmenCommandCenterState(
        greeting = "Working on this week's move…",
        leagueScope = "Sunday Slate · Sleeper · 12 teams",
        platforms = listOf(
            OmenCommandCenterPlatform(
                platform = OmenPlatform.Sleeper,
                status = OmenConnectionStatus.Connected,
                description = "Last synced 4 minutes ago.",
            ),
        ),
        decision = OmenDecisionBriefState.Loading,
    )

    val demoOffSeason = OmenCommandCenterState(
        greeting = "Season's between reps.",
        leagueScope = "Sunday Slate · Sleeper · 12 teams",
        platforms = listOf(
            OmenCommandCenterPlatform(
                platform = OmenPlatform.Sleeper,
                status = OmenConnectionStatus.Connected,
                description = "Ready for Week 1.",
            ),
        ),
        decision = OmenDecisionBriefState.OffSeason,
    )
}
