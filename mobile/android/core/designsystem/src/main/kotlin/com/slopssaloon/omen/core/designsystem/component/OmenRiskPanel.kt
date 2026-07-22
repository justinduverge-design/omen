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

/** Registry §2.3 risk families — badge + text label together always (color is never alone). */
enum class OmenRiskLevel { Low, Medium, High }

/**
 * Registry §3.2 RiskPanel. A risk badge with its plain-English reasons underneath. The badge
 * label is the readable name of the level so screen readers and low-vision users get the
 * meaning even without color. Empty `reasons` renders the badge alone.
 */
@Composable
fun OmenRiskPanel(
    level: OmenRiskLevel,
    reasons: List<String>,
    modifier: Modifier = Modifier,
) {
    val (badgeTone, badgeLabel) = when (level) {
        OmenRiskLevel.Low -> OmenBadgeTone.Success to "Low risk"
        OmenRiskLevel.Medium -> OmenBadgeTone.Neutral to "Medium risk"
        OmenRiskLevel.High -> OmenBadgeTone.Risk to "High risk"
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        OmenBadge(label = badgeLabel, tone = badgeTone)
        for (reason in reasons) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    text = "•",
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                )
                Text(
                    text = reason,
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                )
            }
        }
    }
}
