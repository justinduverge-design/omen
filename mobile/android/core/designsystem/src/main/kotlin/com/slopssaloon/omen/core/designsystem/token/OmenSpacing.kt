package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Spacing scale (registry §2.5): 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 ·
 * 64 · 96. No ad-hoc values —
 * feature code picks a named step or a documented rhythm alias, never a raw `dp` literal.
 */
object OmenSpacing {
    val step2: Dp = 2.dp
    val step4: Dp = 4.dp
    val step6: Dp = 6.dp
    val step8: Dp = 8.dp
    val step10: Dp = 10.dp
    val step12: Dp = 12.dp
    val step14: Dp = 14.dp
    val step16: Dp = 16.dp
    val step20: Dp = 20.dp
    val step24: Dp = 24.dp
    val step32: Dp = 32.dp
    val step40: Dp = 40.dp
    val step48: Dp = 48.dp
    val step64: Dp = 64.dp
    val step96: Dp = 96.dp

    /** card interior padding */
    val cardInterior: Dp = step24
    /** header → body gap */
    val headerToBody: Dp = step16
    /** body → footer gap */
    val bodyToFooter: Dp = step24
    /** section stack gap */
    val sectionStack: Dp = step48
    /** hero → first section gap */
    val heroToFirstSection: Dp = step32
    /** field → field gap */
    val fieldToField: Dp = step16
    /** label → input gap */
    val labelToInput: Dp = step8
    /** input → hint gap */
    val inputToHint: Dp = step4
    /** chip interior padding — vertical / horizontal */
    val chipInteriorVertical: Dp = step6
    val chipInteriorHorizontal: Dp = step10
    /** inline gap between sibling chips or facts */
    val inlineGap: Dp = step10
}

/** Registry §4: minimum Android touch target is 48dp. */
val OmenMinTouchTarget: Dp = 48.dp
