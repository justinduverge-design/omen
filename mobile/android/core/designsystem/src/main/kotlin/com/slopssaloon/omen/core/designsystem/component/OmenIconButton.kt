package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import com.slopssaloon.omen.core.designsystem.token.OmenFocusRingFullyRounded
import com.slopssaloon.omen.core.designsystem.token.OmenMinTouchTarget
import com.slopssaloon.omen.core.designsystem.token.omenFocusRing

/** registry §3.1 IconButton row: accent/neutral/danger tones. */
enum class OmenIconButtonTone { Accent, Neutral, Danger }

enum class OmenIconButtonSize { Sm, Md, Lg }

/**
 * Foundation IconButton (registry §3.1). [contentDescription] is a **required, non-nullable**
 * parameter — the registry names "`Button` w/ `Label` icon-only + a11y label" as the contract,
 * so there is no way to construct an `OmenIconButton` without supplying the accessibility label
 * a screen reader will announce.
 *
 * Pass `icon`'s own `contentDescription = null` (e.g. `Icon(..., contentDescription = null)`) —
 * the label lives on this wrapper, not the inner glyph, to avoid TalkBack announcing it twice.
 *
 * States covered from the outset: default, focus (via [omenFocusRing]), disabled (`enabled =
 * false`), and loading (spinner replaces the icon; `stateDescription = "Loading"` merges into
 * the announced label, matching [OmenButton]'s treatment).
 */
@Composable
fun OmenIconButton(
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tone: OmenIconButtonTone = OmenIconButtonTone.Neutral,
    size: OmenIconButtonSize = OmenIconButtonSize.Md,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: @Composable () -> Unit,
) {
    val colors = OmenTheme.color
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    val isInteractable = enabled && !loading

    val tint = when (tone) {
        OmenIconButtonTone.Accent -> colors.accent
        OmenIconButtonTone.Neutral -> colors.textPrimary
        OmenIconButtonTone.Danger -> colors.data.riskHigh
    }
    val resolvedTint = if (isInteractable) tint else colors.textTertiary

    val visualSize: Dp = when (size) {
        OmenIconButtonSize.Sm -> 32.dp
        OmenIconButtonSize.Md -> 40.dp
        OmenIconButtonSize.Lg -> 44.dp
    }

    IconButton(
        onClick = onClick,
        enabled = isInteractable,
        interactionSource = interactionSource,
        modifier = modifier
            .size(maxOf(visualSize, OmenMinTouchTarget))
            .omenFocusRing(
                focused = focused,
                color = colors.focusRing,
                haloColor = colors.focusRingHalo,
                cornerRadius = OmenFocusRingFullyRounded,
            )
            .semantics {
                this.contentDescription = contentDescription
                if (loading) stateDescription = "Loading"
            },
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(visualSize / 2),
                strokeWidth = 2.dp,
                color = resolvedTint,
            )
        } else {
            CompositionLocalProvider(LocalContentColor provides resolvedTint) {
                icon()
            }
        }
    }
}
