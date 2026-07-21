package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Sentinel large enough that [drawOutsetRing]'s corner radius always clamps to a full circle. */
private val FullyRoundedCorner = 4096.dp

/** Use for [omenFocusRing]'s `cornerRadius` on a circular target (e.g. an icon button). */
val OmenFocusRingFullyRounded: Dp = FullyRoundedCorner

/**
 * Semantic focus/selection outline (registry §4; m1-focus-ring-build-brief-v1.md).
 *
 * Draws a two-layer **inset overlay** — a soft halo plus a crisp stroke — derived from
 * [OmenColorScheme.focusRing] / [OmenColorScheme.focusRingHalo]. It is deliberately drawn in
 * [drawWithContent] *after* the component content, rather than as an outward ring: Material
 * controls clip outward drawing at their bounds. The inset overlay remains visibly above every
 * filled variant and never changes measured layout size.
 *
 * `cornerRadius` describes the target's own corner treatment — pass [OmenFocusRingFullyRounded]
 * for a circular control (e.g. an icon button): `drawRoundRect`'s corner radius clamps to half
 * the shorter side, so an oversized value always renders as a full circle/pill regardless of
 * exact size.
 *
 * This modifier supplies the *visible outline* half of the non-color focus contract only.
 * Callers remain responsible for the other half: real Compose focus/interaction state
 * ([androidx.compose.foundation.interaction.InteractionSource] / native `focusable()`) and, for
 * selected controls, an additional shape/weight/checkmark cue — color and outline alone are
 * never sufficient (registry §4, brief §2/§5).
 *
 * @param focused whether the owning component currently holds focus or accessibility focus.
 * @param color the ring stroke color, normally [OmenColorScheme.focusRing].
 * @param haloColor the soft underlay color, normally [OmenColorScheme.focusRingHalo].
 * @param cornerRadius corner radius to match the target component; defaults to 8dp.
 */
fun Modifier.omenFocusRing(
    focused: Boolean,
    color: Color,
    haloColor: Color,
    cornerRadius: Dp = 8.dp,
    strokeWidth: Dp = 2.dp,
    haloWidth: Dp = 4.dp,
): Modifier = if (!focused) {
    this
} else {
    this.drawWithContent {
        drawContent()

        val strokePx = strokeWidth.toPx()
        val haloPx = haloWidth.toPx()
        val cornerPx = cornerRadius.toPx()

        val haloInset = haloPx / 2f
        drawRoundRect(
            color = haloColor,
            topLeft = Offset(haloInset, haloInset),
            size = Size(size.width - haloInset * 2f, size.height - haloInset * 2f),
            cornerRadius = CornerRadius(
                (cornerPx - haloInset).coerceAtLeast(0f),
                (cornerPx - haloInset).coerceAtLeast(0f),
            ),
            style = Stroke(width = haloPx),
        )

        val strokeInset = strokePx / 2f
        drawRoundRect(
            color = color,
            topLeft = Offset(strokeInset, strokeInset),
            size = Size(size.width - strokeInset * 2f, size.height - strokeInset * 2f),
            cornerRadius = CornerRadius(
                (cornerPx - strokeInset).coerceAtLeast(0f),
                (cornerPx - strokeInset).coerceAtLeast(0f),
            ),
            style = Stroke(width = strokePx),
        )
    }
}
