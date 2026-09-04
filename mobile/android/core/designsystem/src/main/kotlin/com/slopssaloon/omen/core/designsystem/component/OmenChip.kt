package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Registry §3.1 Chip tones: position, platform brand, and explicitly labeled demo mode. */
/**
 * [Neutral] was added 2026-09-03 for the Command Center league carousel's "All" chip, which
 * sits beside the three platform chips and must not borrow any one platform's colour — an All
 * chip tinted Sleeper-green reads as a fourth Sleeper filter. Additive: no existing tone or
 * call site changes. **Flagged for design sign-off** in the session handoff rather than
 * treated as settled. iOS mirror: `OmenChipTone.neutral`.
 */
enum class OmenChipTone { Rb, Wr, Qb, Te, Def, K, Sleeper, Yahoo, Espn, Demo, Neutral }

@Composable
fun OmenChip(
    label: String,
    tone: OmenChipTone,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
) {
    val colors = OmenTheme.color
    val foreground = when (tone) {
        OmenChipTone.Rb -> colors.data.posRb
        OmenChipTone.Wr -> colors.data.posWr
        OmenChipTone.Qb -> colors.data.posQb
        OmenChipTone.Te -> colors.data.posTe
        OmenChipTone.Def -> colors.data.posDef
        OmenChipTone.K -> colors.data.posK
        OmenChipTone.Sleeper -> colors.data.platformSleeper
        OmenChipTone.Yahoo -> colors.data.platformYahoo
        OmenChipTone.Espn -> colors.data.platformEspn
        OmenChipTone.Demo -> colors.data.demoText
        OmenChipTone.Neutral -> colors.textSecondary
    }
    val shape = RoundedCornerShape(999.dp)
    val chipLabel: @Composable () -> Unit = { Text(label, style = OmenTheme.typography.chip.toTextStyle()) }

    if (onClick == null) {
        Surface(
            modifier = modifier,
            shape = shape,
            color = foreground.copy(alpha = 0.15f),
            contentColor = foreground,
        ) { androidx.compose.foundation.layout.Box(Modifier.padding(horizontal = OmenTheme.spacing.step8, vertical = OmenTheme.spacing.step4)) { chipLabel() } }
    } else {
        FilterChip(
            selected = selected,
            onClick = onClick,
            modifier = modifier.semantics { contentDescription = label },
            enabled = enabled,
            label = chipLabel,
            leadingIcon = if (selected) { { Text("✓", style = OmenTheme.typography.chip.toTextStyle()) } } else null,
            shape = shape,
            border = FilterChipDefaults.filterChipBorder(
                enabled = enabled,
                selected = selected,
                borderColor = foreground.copy(alpha = 0.5f),
                selectedBorderColor = foreground,
            ),
            colors = FilterChipDefaults.filterChipColors(
                containerColor = foreground.copy(alpha = 0.15f),
                labelColor = foreground,
                selectedContainerColor = foreground.copy(alpha = 0.28f),
                selectedLabelColor = foreground,
                disabledContainerColor = colors.surface3,
                disabledLabelColor = colors.textTertiary,
            ),
        )
    }
}
