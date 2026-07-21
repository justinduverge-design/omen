package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Registry §3.1 Card / Surface variants. Cards are display containers; interactive rows use their own contract. */
enum class OmenCardVariant { Solid, Outlined, Empty, Error, Preview }

/** Semantic card emphasis — neutral foundation, Omen signal, or risk. */
enum class OmenCardTone { Neutral, Omen, Risk }

/**
 * Token-backed Material3 surface for Omen compositions. This intentionally has no click handler:
 * selection/focus behavior belongs to the approved interactive component that composes it, rather
 * than turning every display card into a misleading button.
 */
@Composable
fun OmenCard(
    modifier: Modifier = Modifier,
    variant: OmenCardVariant = OmenCardVariant.Solid,
    tone: OmenCardTone = OmenCardTone.Neutral,
    contentPadding: PaddingValues = PaddingValues(OmenTheme.spacing.cardInterior),
    content: @Composable () -> Unit,
) {
    val colors = OmenTheme.color
    val background = when (variant) {
        OmenCardVariant.Preview -> colors.surface2
        else -> colors.surface1
    }
    val toneBorder = when (tone) {
        OmenCardTone.Neutral -> if (variant == OmenCardVariant.Outlined) colors.border else colors.borderSubtle
        OmenCardTone.Omen -> colors.omen
        OmenCardTone.Risk -> colors.data.riskHigh
    }
    val borderColor = if (variant == OmenCardVariant.Error) colors.data.riskHigh else toneBorder

    Surface(
        modifier = modifier.then(
            if (variant == OmenCardVariant.Error) Modifier.semantics { stateDescription = "Error" } else Modifier,
        ),
        shape = RoundedCornerShape(12.dp),
        color = background,
        contentColor = colors.textPrimary,
        border = BorderStroke(1.dp, borderColor),
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
    ) { Box(Modifier.padding(contentPadding)) { content() } }
}
