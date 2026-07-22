package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Sign of the delta drives which invariant token colors the delta text. */
enum class OmenMetricDelta { None, Positive, Negative }

/** One metric row inside a MetricStrip. `confidence` is optional 0..100 for a subline bar. */
data class OmenMetricItem(
    val label: String,
    val value: String,
    val delta: String? = null,
    val deltaDirection: OmenMetricDelta = OmenMetricDelta.None,
    val confidence: Int? = null,
)

/**
 * Registry §3.2 MetricStrip. Labeled metric row(s) with numeric value, optional signed delta,
 * optional confidence subline. Delta color is drawn from the risk invariant family so a
 * positive delta reads as success (risk-low green) and a negative delta as risk (risk-high).
 * Delta always includes a plus/minus glyph in the caller's string so meaning survives
 * grayscale.
 */
@Composable
fun OmenMetricStrip(
    items: List<OmenMetricItem>,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        for (item in items) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = item.label,
                        style = OmenTheme.typography.label.toTextStyle(),
                        color = OmenTheme.color.textSecondary,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = item.value,
                            style = OmenTheme.typography.numeric.toTextStyle(),
                            color = OmenTheme.color.textPrimary,
                        )
                        val deltaText = item.delta
                        if (deltaText != null) {
                            Text(
                                text = deltaText,
                                style = OmenTheme.typography.numeric.toTextStyle(),
                                color = deltaColor(item.deltaDirection),
                            )
                        }
                    }
                }
                val confidence = item.confidence
                if (confidence != null) {
                    OmenConfidenceBar(score = confidence)
                }
            }
        }
    }
}

@Composable
private fun deltaColor(direction: OmenMetricDelta): Color = when (direction) {
    OmenMetricDelta.None -> OmenTheme.color.textSecondary
    OmenMetricDelta.Positive -> OmenTheme.color.data.riskLow
    OmenMetricDelta.Negative -> OmenTheme.color.data.riskHigh
}
