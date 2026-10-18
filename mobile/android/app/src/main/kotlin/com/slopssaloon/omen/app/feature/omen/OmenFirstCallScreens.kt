package com.slopssaloon.omen.app.feature.omen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.api.StartSitDetail
import com.slopssaloon.omen.app.feature.help.OmenHelpButton
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.core.designsystem.component.OmenBadge
import com.slopssaloon.omen.core.designsystem.component.OmenBadgeTone
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBrief
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefPayload
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionCapability
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.component.OmenSignalItem
import com.slopssaloon.omen.core.designsystem.component.OmenSignalSource
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import java.util.Locale

/**
 * U1 Omen destination, mirrored from iOS so a J3 contact sheet does not compare the canvas with
 * two different products. The unresolved help/avatar slot is intentionally unchanged.
 */
@Composable
fun OmenDecisionScreen(
    state: OmenDecisionBriefState,
    modifier: Modifier = Modifier,
    weekLabel: String? = null,
    providerName: String? = null,
    onMakeMove: (() -> Unit)? = null,
    onDecline: (() -> Unit)? = null,
) {
    val showingEvidence = androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }
    val payload = (state as? OmenDecisionBriefState.Success)?.payload
    if (showingEvidence.value && payload != null) {
        OmenEvidenceScreen(payload = payload, weekLabel = weekLabel, modifier = modifier)
        return
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
                if (weekLabel != null) {
                    Text(weekLabel, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
                }
                Text("Omen", style = OmenTheme.typography.screenTitle.toTextStyle(), color = OmenTheme.color.textPrimary)
            }
            OmenHelpButton(OmenHelpDestination.Omen)
        }
        Text("Call · one per team", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)

        if (payload == null) {
            OmenDecisionBrief(state = state, modifier = Modifier.fillMaxWidth())
            return@Column
        }

        OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step14)) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
                payload.callType?.let {
                    Text(
                        it.split('_', '-').joinToString(" / ") { word -> word.replaceFirstChar(Char::uppercase) },
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
                Text(payload.verdict, style = OmenTheme.typography.call.toTextStyle(), color = OmenTheme.color.textPrimary)
                Text(
                    payload.explanation.firstOrNull() ?: payload.move,
                    style = OmenTheme.typography.name.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step14)) {
                    payload.confidenceBand?.let {
                        Text(it.label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accentHover)
                    }
                    Text(
                        when (payload.risk) {
                            OmenRiskLevel.Low -> "Low risk"
                            OmenRiskLevel.Medium -> "Medium risk"
                            OmenRiskLevel.High -> payload.riskReasons.firstOrNull() ?: "High risk"
                        },
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
                val facts = payload.signals.filter { it.source == OmenSignalSource.Unavailable || it.used == true }
                if (facts.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                    ) {
                        facts.forEach { signal ->
                            Text(
                                if (signal.source == OmenSignalSource.Unavailable) "${signal.label} — unread" else signal.label,
                                style = OmenTheme.typography.micro.toTextStyle(),
                                color = if (signal.source == OmenSignalSource.Unavailable) OmenTheme.color.textTertiary else OmenTheme.color.textSecondary,
                            )
                        }
                    }
                }
                payload.signals.take(3).forEach { CapabilityEvidenceRow(it) }
            }
        }
        OmenButton(
            text = "See the full argument",
            onClick = { showingEvidence.value = true },
            variant = OmenButtonVariant.Link,
            size = OmenButtonSize.Md,
        )
        if (providerName != null && onMakeMove != null) {
            OmenButton(
                text = "Make this move in $providerName",
                onClick = onMakeMove,
                size = OmenButtonSize.Lg,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (onDecline != null) {
            OmenButton(
                text = "Not this week",
                onClick = onDecline,
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Lg,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Text(
            "Every call lands in the Ledger whether you take it or not.",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
            modifier = Modifier.padding(top = OmenTheme.spacing.step10),
        )
    }
}

/** J3 expanded argument. Capability rows are words: key, sentence, and status. No glyphs. */
@Composable
fun OmenEvidenceScreen(
    payload: OmenDecisionBriefPayload,
    weekLabel: String? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            if (weekLabel != null) {
                Text(weekLabel, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
            }
            Text("The argument", style = OmenTheme.typography.screenTitle.toTextStyle(), color = OmenTheme.color.textPrimary)
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            Text(
                payload.verdict,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
                modifier = Modifier.weight(1f),
            )
            payload.impact?.let {
                Text(
                    it,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                    textAlign = TextAlign.End,
                )
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
            payload.signals.forEach { CapabilityEvidenceRow(it) }
        }

        if (payload.alternatives.isNotEmpty()) {
            SectionHeader("What else was considered")
            OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
                Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
                    payload.alternatives.forEach { alternative ->
                        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step2)) {
                            Text(alternative.name, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textPrimary)
                            listOfNotNull(alternative.team, alternative.meta).takeIf { it.isNotEmpty() }?.let { detail ->
                                Text(detail.joinToString(" · "), style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
                            }
                        }
                    }
                }
            }
        }

        SectionHeader("Confidence", payload.confidenceBand?.label)
        OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step14), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        payload.confidenceBand?.label ?: "No confidence read",
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = if (payload.confidenceBand == null) OmenTheme.color.textTertiary else OmenTheme.color.accentHover,
                    )
                    Text(
                        when (payload.risk) {
                            com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel.Low -> "Low risk"
                            com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel.Medium -> "Medium risk"
                            com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel.High -> payload.riskReasons.firstOrNull() ?: "High risk"
                        },
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
                (payload.confidenceDrivers + payload.confidenceUnavailableReason).forEach { reason ->
                    Text(reason, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
                }
            }
        }
        Spacer(Modifier.height(OmenTheme.spacing.step16))
    }
}

@Composable
private fun CapabilityEvidenceRow(signal: OmenSignalItem) {
    val readButUnused = signal.source == OmenSignalSource.Live && signal.used == false
    val status = when {
        readButUnused -> "Read, not used"
        signal.source == OmenSignalSource.Live -> "Live"
        signal.source == OmenSignalSource.Stub -> "Provisional"
        signal.source == OmenSignalSource.Mock -> "Sample"
        else -> "Unavailable"
    }
    Row(
        modifier = Modifier.fillMaxWidth().semantics {
            contentDescription = listOfNotNull(signal.label, signal.detail, status).joinToString(". ")
        },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            signal.label,
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            modifier = Modifier.width(84.dp).padding(top = OmenTheme.spacing.step4),
        )
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            signal.detail?.let {
                Text(
                    it,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = if (readButUnused) OmenTheme.color.textTertiary else OmenTheme.color.textSecondary,
                )
            }
            if (readButUnused) {
                Text(
                    "Not used",
                    style = OmenTheme.typography.micro.toTextStyle(),
                    fontStyle = FontStyle.Italic,
                    color = OmenTheme.color.textTertiary,
                )
            } else {
                val tone = when (signal.source) {
                    OmenSignalSource.Live -> OmenBadgeTone.Live
                    OmenSignalSource.Stub -> OmenBadgeTone.Stub
                    OmenSignalSource.Mock -> OmenBadgeTone.Mock
                    OmenSignalSource.Unavailable -> OmenBadgeTone.Unavailable
                }
                OmenBadge(status, tone)
            }
        }
    }
}

/** J3 Start/Sit state. The response decides whether the clear or partial-read composition renders. */
@Composable
fun OmenStartSitScreen(
    detail: StartSitDetail,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            Text(
                detail.week?.let { "Week $it · Start / sit" } ?: "Start / sit",
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.accent,
            )
            Text(
                // The route returns one recommendation pair, not a complete roster.
                if (detail.state == "incomplete_data") "Partial read" else "The call",
                style = OmenTheme.typography.screenTitle.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }

        when (detail.state) {
            "clear_decision", "close_decision", "player_unavailable" -> ClearStartSit(detail)
            "incomplete_data" -> IncompleteStartSit(detail, onRetry)
            "off_season" -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Lineup decisions return in season",
                message = detail.message ?: "Omen will read your lineup again when the regular season begins.",
            )
            else -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "No lineup change",
                message = detail.message ?: "Omen did not find a defensible lineup change for this slot.",
            )
        }
        Spacer(Modifier.height(OmenTheme.spacing.step16))
    }
}

@Composable
private fun ClearStartSit(detail: StartSitDetail) {
    val recommendation = detail.recommendation
    val start = recommendation?.start
    val over = recommendation?.over
    if (recommendation == null || start == null || over == null) {
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Error,
            title = "The lineup call was incomplete",
            message = "Omen received a decision state without both players. Refresh before acting.",
        )
        return
    }

    val verb = if (detail.state == "close_decision") "leans toward" else "favors"
    val summary = buildString {
        append("Omen $verb ${start.name ?: "the available option"} over ${over.name ?: "the current starter"}")
        recommendation.pointsDelta?.let { append(String.format(Locale.US, " by %.1f projected points", it)) }
        append(".")
    }
    OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
        Text(summary, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
    }

    SectionHeader("The clear call", recommendation.slot)
    OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
        Column {
            StartSitPlayerRow(start, "Start")
            HorizontalDivider(color = OmenTheme.color.borderSubtle)
            StartSitPlayerRow(over, "Sit")
        }
    }

    SectionHeader(
        if (detail.state == "close_decision") "Why it stays close" else "Why it is clear",
        recommendation.pointsDelta?.let { String.format(Locale.US, "+%.1f points", it) },
    )
    OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
        Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10), verticalAlignment = Alignment.Top) {
            StartSitSwapMark()
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                val evidenceLines = detail.evidence.mapNotNull { item ->
                    item.statement?.let { statement ->
                        item.kind
                            ?.takeIf(String::isNotBlank)
                            ?.replace('_', ' ')
                            ?.replaceFirstChar(Char::uppercase)
                            ?.let { "$it · $statement" }
                            ?: statement
                    }
                }
                (detail.why + evidenceLines).forEach { reason ->
                    Text(reason, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step14)) {
                    recommendation.confidence?.let {
                        Text(it.replace('_', ' '), style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accentHover)
                    }
                    Text(
                        if (detail.state == "player_unavailable") over.status?.let { "$it — unavailable" } ?: "Player unavailable"
                        else if (detail.state == "close_decision") "Medium risk" else "Low risk",
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
            }
        }
    }

    if (detail.whatCouldChangeThis.isNotEmpty()) {
        SectionHeader("What could change this")
        OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                detail.whatCouldChangeThis.forEach {
                    Text(it, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
                }
            }
        }
    }
}

@Composable
private fun IncompleteStartSit(detail: StartSitDetail, onRetry: (() -> Unit)?) {
    OmenCard(
        variant = OmenCardVariant.Empty,
        contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step10),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            Text(
                "Omen is working from part of the decision context.",
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
            Text(
                detail.message ?: "A required lineup input was unavailable, so Omen did not make a call.",
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
        }
    }

    val visible = detail.capabilities.filter { it.state != "not_requested" }
    val readable = visible.filter { it.state == "live" }
    val unavailable = visible.filter { it.state != "live" }
    if (readable.isNotEmpty()) {
        SectionHeader("What Omen could read", "${readable.size} input${if (readable.size == 1) "" else "s"}")
        CapabilityCard(readable)
    }
    if (unavailable.isNotEmpty()) {
        SectionHeader("What it could not", "${unavailable.size} input${if (unavailable.size == 1) "" else "s"}")
        CapabilityCard(unavailable)
    }

    SectionHeader("So Omen is not making a call")
    OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
        Text(
            "A recommendation without the required lineup inputs would look like advice and be a guess. Restore the missing read, or make this week’s call yourself.",
            style = OmenTheme.typography.name.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )
    }
    if (onRetry != null) {
        OmenButton(
            text = detail.platform?.let { "Retry ${it.replaceFirstChar(Char::uppercase)}" } ?: "Retry the connection",
            onClick = onRetry,
            size = OmenButtonSize.Lg,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun CapabilityCard(capabilities: List<OmenDecisionCapability>) {
    OmenCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(OmenTheme.spacing.step12)) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
            capabilities.forEach { CapabilityEvidenceRow(it.toSignalItem()) }
        }
    }
}

@Composable
private fun StartSitPlayerRow(player: StartSitDetail.Player, role: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = OmenTheme.spacing.step8),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step2)) {
            Text(player.name ?: "Unnamed player", style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textPrimary)
            Text(
                listOfNotNull(role, player.position, player.team, player.status).joinToString(" · "),
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
        }
        player.projectedPoints?.let {
            Text(
                String.format(Locale.US, "%.1f", it),
                style = OmenTheme.typography.numeric.toTextStyle(),
                color = if (role == "Start") OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
            )
        }
    }
}

@Composable
private fun StartSitSwapMark() {
    Column(
        modifier = Modifier.width(OmenTheme.spacing.step20).height(OmenTheme.spacing.step64),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.width(OmenTheme.spacing.step8).height(OmenTheme.spacing.step8).clip(CircleShape).background(OmenTheme.color.accent))
        Box(Modifier.width(OmenTheme.spacing.step2).weight(1f).background(OmenTheme.color.borderSubtle))
        Box(Modifier.width(OmenTheme.spacing.step6).height(OmenTheme.spacing.step6).clip(CircleShape).background(OmenTheme.color.surface3))
    }
}

@Composable
private fun SectionHeader(title: String, trailing: String? = null) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
        Text(title, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary, modifier = Modifier.weight(1f))
        if (trailing != null) {
            Text(trailing, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary, textAlign = TextAlign.End)
        }
    }
}

private fun OmenDecisionCapability.toSignalItem(): OmenSignalItem = OmenSignalItem(
    label = name?.split('_')?.joinToString(" ") { word -> word.replaceFirstChar(Char::uppercase) } ?: "Unknown input",
    source = when (state) {
        "live" -> OmenSignalSource.Live
        "stub" -> OmenSignalSource.Stub
        "mock", "demo" -> OmenSignalSource.Mock
        else -> OmenSignalSource.Unavailable
    },
    detail = statement ?: source,
    kind = when (kind) {
        "verified" -> com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Verified
        "projection" -> com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Projection
        "model" -> com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Model
        "inference" -> com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Inference
        "limitation" -> com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Limitation
        else -> null
    },
    used = used,
)
