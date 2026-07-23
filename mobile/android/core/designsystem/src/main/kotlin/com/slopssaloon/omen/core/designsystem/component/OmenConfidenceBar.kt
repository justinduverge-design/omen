package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import kotlin.math.roundToInt

/**
 * Registry §3.2 ConfidenceBar. Renders a 0–100 confidence score as a gradient bar over
 * `confidence-floor → confidence-ceiling`, always paired with a redundant numeric label
 * (fan-experience data-legibility invariant: color is never the sole carrier).
 *
 * The bar is a display-only meter; interactive tuning belongs upstream. Accepts scores
 * outside 0..100 and clamps rather than throwing, so upstream data glitches degrade to a
 * visibly bounded bar instead of a crash.
 */
@Composable
fun OmenConfidenceBar(
    score: Int,
    modifier: Modifier = Modifier,
    label: String? = null,
) {
    val clamped = score.coerceIn(0, 100)
    val colors = OmenTheme.color
    val gradient = Brush.horizontalGradient(
        colors = listOf(colors.data.confidenceFloor, colors.data.confidenceCeiling),
    )
    val scoreText = "$clamped"
    val a11y = if (label != null) "$label $clamped out of 100" else "Confidence $clamped out of 100"

    Column(
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = a11y },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
    ) {
        if (label != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = label,
                    style = OmenTheme.typography.eyebrow.toTextStyle(),
                    color = colors.textSecondary,
                )
                Text(
                    text = scoreText,
                    style = OmenTheme.typography.numeric.toTextStyle(),
                    color = colors.textPrimary,
                )
            }
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(colors.surface3),
        ) {
            val fillFraction = clamped / 100f
            Box(
                modifier = Modifier
                    .fillMaxWidth(fillFraction)
                    .height(8.dp)
                    .background(gradient),
            )
        }
        if (label == null) {
            Text(
                text = scoreText,
                style = OmenTheme.typography.numeric.toTextStyle(),
                color = colors.textPrimary,
            )
        }
    }
}

/** Convenience overload for `Double` / `Float` scores that rounds to the nearest integer. */
@Composable
fun OmenConfidenceBar(
    score: Double,
    modifier: Modifier = Modifier,
    label: String? = null,
) {
    OmenConfidenceBar(score = score.roundToInt(), modifier = modifier, label = label)
}
