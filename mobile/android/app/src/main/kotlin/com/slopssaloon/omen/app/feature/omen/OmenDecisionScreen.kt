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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.app.feature.help.OmenHelpButton
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBrief
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefAlternative
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefPayload
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.designsystem.component.OmenMetricDelta
import com.slopssaloon.omen.core.designsystem.component.OmenMetricItem
import com.slopssaloon.omen.core.designsystem.component.OmenPosition
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.component.OmenSignalItem
import com.slopssaloon.omen.core.designsystem.component.OmenSignalSource
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** M4 Omen destination assembly. It owns state selection; DecisionBrief owns rendering. */
@Composable
fun OmenDecisionScreen(state: OmenDecisionBriefState, modifier: Modifier = Modifier) {
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
        OmenDecisionBrief(state = state, modifier = Modifier.fillMaxWidth())
    }
}

/** Deterministic, explicitly mock fixture. It is never selected for a real account. */
object OmenDecisionFixtures {
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
