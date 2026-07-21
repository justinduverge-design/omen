package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Registry §3.1 Badge: semantic status/data-source labels, never a standalone color signal. */
enum class OmenBadgeTone { Success, Neutral, Risk, Live, Stub, Mock, Unavailable }

@Composable
fun OmenBadge(
    label: String,
    tone: OmenBadgeTone,
    modifier: Modifier = Modifier,
) {
    val colors = OmenTheme.color
    val foreground = when (tone) {
        OmenBadgeTone.Success -> colors.data.riskLow
        OmenBadgeTone.Neutral -> colors.textSecondary
        OmenBadgeTone.Risk -> colors.data.riskHigh
        OmenBadgeTone.Live -> colors.data.dataLive
        OmenBadgeTone.Stub -> colors.data.dataStub
        OmenBadgeTone.Mock -> colors.data.dataMock
        OmenBadgeTone.Unavailable -> colors.data.dataUnavailable
    }
    val background = if (tone == OmenBadgeTone.Neutral) colors.surface3 else foreground.copy(alpha = 0.15f)

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = background,
        contentColor = foreground,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step8, vertical = OmenTheme.spacing.step4),
            style = OmenTheme.typography.chip.toTextStyle(),
        )
    }
}
