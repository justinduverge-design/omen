package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Semantic focus/selection outline (registry §4; m1-focus-ring-build-brief-v1.md).
 *
 * Draws a two-layer outline — a soft halo plus a crisp stroke — derived from
 * [OmenColorScheme.focusRing] / [OmenColorScheme.focusRingHalo]. `Modifier.border` draws inside
 * the existing layout bounds, so this never changes a component's measured size.
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
 * @param shape corner shape to match the target component; defaults to a 8dp rounded rect.
 */
fun Modifier.omenFocusRing(
    focused: Boolean,
    color: Color,
    haloColor: Color,
    shape: RoundedCornerShape = RoundedCornerShape(8.dp),
    strokeWidth: Dp = 2.dp,
    haloWidth: Dp = 4.dp,
): Modifier = if (!focused) {
    this
} else {
    this
        .border(width = haloWidth, color = haloColor, shape = shape)
        .border(width = strokeWidth, color = color, shape = shape)
}
