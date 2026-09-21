package com.slopssaloon.omen.app.feature.omen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.app.feature.help.OmenHelpButton
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBrief
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefAlternative
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefPayload
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenConfidenceBand
import com.slopssaloon.omen.core.designsystem.component.OmenSignalList
import com.slopssaloon.omen.core.designsystem.component.OmenMetricDelta
import com.slopssaloon.omen.core.designsystem.component.OmenMetricItem
import com.slopssaloon.omen.core.designsystem.component.OmenPosition
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.component.OmenSignalItem
import com.slopssaloon.omen.core.designsystem.component.OmenSignalSource
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** M4 Omen destination assembly. It owns state selection; DecisionBrief owns rendering. */
@Composable
private fun LegacyOmenDecisionScreen(state: OmenDecisionBriefState, modifier: Modifier = Modifier) {
    var showingEvidence by remember { mutableStateOf(false) }
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(OmenTheme.spacing.cardInterior),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = OmenTheme.spacing.step16),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Omen",
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            // M6-ContextualHelp: confidence, risk, and "why is this empty?" are the three
            // things people ask here, so help sits with the title.
            OmenHelpButton(OmenHelpDestination.Omen)
        }
        Text(
            text = "One call for this week. Evidence stays separate from the call.",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
            modifier = Modifier.padding(bottom = OmenTheme.spacing.step12),
        )
        OmenDecisionBrief(state = state, modifier = Modifier.fillMaxWidth())
        val payload = (state as? OmenDecisionBriefState.Success)?.payload
        if (payload != null) {
            // Blocks 5-7 and 10 of `omencall-evidence-contract-v1`, ratified 2026-09-18.
            // Same strings and same order as iOS; acceptance line 16 requires it.
            //
            // Android's call card itself still trails the artboard — it renders
            // `OmenDecisionBrief` rather than the artboard's composition, and has no switcher
            // bar or account control. That is recorded drift, not closed here.
            CapabilityGroups(payload)
            WhyThisConfidence(payload)
            OmenButton(
                text = if (showingEvidence) "Hide the full argument" else "See the full argument",
                onClick = { showingEvidence = !showingEvidence },
                variant = OmenButtonVariant.Link,
                size = OmenButtonSize.Md,
                modifier = Modifier.padding(top = OmenTheme.spacing.step12),
            )
            if (showingEvidence) {
                OmenCard(modifier = Modifier.padding(top = OmenTheme.spacing.step8)) {
                    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
                        Text("The argument", style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                        if (payload.signals.isNotEmpty()) OmenSignalList(payload.signals)
                        payload.confidenceDrivers.forEach { driver ->
                            Text(driver, style = OmenTheme.typography.body.toTextStyle(), color = OmenTheme.color.textSecondary)
                        }
                    }
                }
            }
        }
    }
}


/**
 * Blocks 5-7. Three labelled groups rather than one flat list: the capability contract's classes
 * are the lesson, not compliance furniture. A group with no members is absent, not empty, and
 * `not_requested` is filtered before it reaches here so it renders nowhere.
 *
 * Row order inside a group is the server's. The screen must not re-rank — re-ranking is a claim
 * about relative importance that no contract supports.
 */
@Composable
private fun CapabilityGroups(payload: OmenDecisionBriefPayload) {
    val moved = payload.signals.filter { it.used == true && it.source == OmenSignalSource.Live }
    val readNotUsed = payload.signals.filter { it.used == false && it.source == OmenSignalSource.Live }
    val couldNotRead = payload.signals.filter { it.source == OmenSignalSource.Unavailable }

    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        if (moved.isNotEmpty()) CapabilityGroup("What moved this call", moved, emphasis = true)
        if (readNotUsed.isNotEmpty()) CapabilityGroup("Read, but it didn't decide this", readNotUsed, emphasis = false)
        if (couldNotRead.isNotEmpty()) CapabilityGroup("What Omen couldn't read", couldNotRead, emphasis = false)
    }
}

@Composable
private fun CapabilityGroup(title: String, items: List<OmenSignalItem>, emphasis: Boolean) {
    OmenCard(modifier = Modifier.padding(top = OmenTheme.spacing.step12)) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            Text(
                text = title,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
            items.forEach { item ->
                Text(
                    text = item.label,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                )
                // "Read, but it didn't decide this" carries no evidence styling: a source is not
                // evidence until an engine marks it used.
                Text(
                    text = item.detail.orEmpty(),
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = if (emphasis) OmenTheme.color.textSecondary else OmenTheme.color.textTertiary,
                )
            }
        }
    }
}

/**
 * Block 10. The transferable rule, not a restatement of the band. Server drivers are preferred;
 * the fallback states the rule rather than inventing a driver. Never a numeral and never a meter
 * (fact-of-record #16).
 */
@Composable
private fun WhyThisConfidence(payload: OmenDecisionBriefPayload) {
    val band = payload.confidenceBand ?: return
    OmenCard(modifier = Modifier.padding(top = OmenTheme.spacing.step12)) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            Text(
                text = "Why this confidence",
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
            val lines = payload.confidenceDrivers.ifEmpty { listOf(confidenceRule(band.label)) }
            lines.forEach { line ->
                Text(
                    text = line,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }
    }
}

/** Written per band rather than interpolated. Agreement, not margin, is the reusable part. */
private fun confidenceRule(band: String): String = when (band.lowercase()) {
    "confident" ->
        "Confident means the reads agree. Several independent inputs point the same way and none contradicts — that is what separates Confident from Leaning, not the size of the gap."
    "leaning" ->
        "Leaning means the reads mostly agree, but at least one pulls the other way or is missing. The move is still the better side of a close call."
    else ->
        "This band reflects how far the available reads agree with each other, not how large the projected gap is."
}

/** Deterministic, explicitly mock fixture. It is never selected for a real account. */
object OmenDecisionFixtures {
    val journeyNominalPayload = OmenDecisionBriefPayload(
        verdict = "Start Sample WR1 over Sample WR2",
        callType = "start_sit",
        move = "Move Sample WR1 into the flex slot before kickoff.",
        impact = "+3.8 projected",
        confidenceBand = OmenConfidenceBand.Confident,
        confidenceDrivers = listOf(
            "The roster and projection reads agree on the stronger option.",
            "The usage gap stayed stable across the latest provider update.",
        ),
        risk = OmenRiskLevel.Low,
        riskReasons = listOf("Both players remain active in the latest read."),
        explanation = listOf("Sample WR1 has the stronger projection and the steadier route share."),
        signals = listOf(
            OmenSignalItem(
                label = "Roster",
                source = OmenSignalSource.Live,
                detail = "The selected league roster was read successfully.",
                kind = com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Verified,
                used = true,
            ),
            OmenSignalItem(
                label = "Projections",
                source = OmenSignalSource.Live,
                detail = "Current-week projections favor Sample WR1.",
                kind = com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Projection,
                used = true,
            ),
            OmenSignalItem(
                label = "Start sit inference",
                source = OmenSignalSource.Live,
                detail = "The lineup model used both available players.",
                kind = com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Inference,
                used = true,
            ),
        ),
        alternatives = listOf(
            OmenDecisionBriefAlternative(
                name = "Sample WR3",
                position = OmenPosition.WR,
                team = "Sample Team",
                meta = "Lower projected floor",
            ),
        ),
    )

    val journeyNominal = OmenDecisionBriefState.Success(journeyNominalPayload)

    val journeyDegradedPayload = OmenDecisionBriefPayload(
        verdict = "Start Sample WR1 over Sample WR2",
        callType = "start_sit",
        move = "Sample WR2 draws the tougher coverage this week.",
        confidenceBand = OmenConfidenceBand.Leaning,
        confidenceDrivers = listOf("Target share held above 25% in three of the last four."),
        risk = OmenRiskLevel.Low,
        explanation = listOf("Sample WR1's routes-run share is the stable half of this call."),
        signals = listOf(
            OmenSignalItem(
                label = "Roster",
                source = OmenSignalSource.Live,
                detail = "Live roster read for the selected league.",
                kind = com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Verified,
                used = true,
            ),
            OmenSignalItem(
                label = "Matchup Dvp",
                source = OmenSignalSource.Live,
                detail = "Read, but it did not move this call.",
                kind = com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Projection,
                used = false,
            ),
            OmenSignalItem(
                label = "Weather",
                source = OmenSignalSource.Unavailable,
                detail = "Omen could not read kickoff weather for this game.",
                kind = com.slopssaloon.omen.core.designsystem.component.OmenEvidenceKind.Limitation,
                used = false,
            ),
        ),
    )

    val journeyDegraded = OmenDecisionBriefState.Success(journeyDegradedPayload)

    val demo = OmenDecisionBriefState.Demo(
        OmenDecisionBriefPayload(
            verdict = "Start Sample RB1",
            move = "Bench Sample RB2 for the RB1 slot.",
            impact = "+4.1 projected over your bench.",
            confidence = 72,
            risk = OmenRiskLevel.Low,
            riskReasons = listOf("Full practice Friday."),
            explanation = listOf("The matchup and usage signals favor Sample RB1 this week."),
            metrics = listOf(OmenMetricItem("Projected", "22.4", "+4.1", OmenMetricDelta.Positive)),
            signals = listOf(OmenSignalItem("Demo roster snapshot", OmenSignalSource.Mock)),
            alternatives = listOf(OmenDecisionBriefAlternative("Sample RB2", OmenPosition.RB, "Demo", "Limited practice")),
        ),
    )

    val realDisconnected = OmenDecisionBriefState.Disconnected()
}
