package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.unit.dp
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Locks registry §2.5 as replaced by the founder on 2026-09-13.
 *
 * The amendment landed in the registry on 2026-09-13 and in the token files on **2026-09-15**. For
 * two days the scale and its own implementation disagreed, and the visual-lock screens could not
 * be built to contract because the steps they needed did not exist. The registry's reasoning is
 * the reason this is asserted rather than left to review: the density that buys D11's no-scroll
 * constraint lives in the **6–14 range**, so dropping 6, 10 or 14 does not cost tidiness — it
 * costs the fold.
 */
class OmenSpacingTest {

    @Test
    fun `the scale is the base-2 modular fifteen`() {
        assertEquals(
            listOf(2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64, 96).map { it.dp },
            listOf(
                OmenSpacing.step2, OmenSpacing.step4, OmenSpacing.step6, OmenSpacing.step8,
                OmenSpacing.step10, OmenSpacing.step12, OmenSpacing.step14, OmenSpacing.step16,
                OmenSpacing.step20, OmenSpacing.step24, OmenSpacing.step32, OmenSpacing.step40,
                OmenSpacing.step48, OmenSpacing.step64, OmenSpacing.step96,
            ),
        )
    }

    /** Every value at or above 16 is unchanged, so nothing built to the previous scale moves. */
    @Test
    fun `the rescale did not move anything at or above sixteen`() {
        assertEquals(16.dp, OmenSpacing.step16)
        assertEquals(24.dp, OmenSpacing.step24)
        assertEquals(32.dp, OmenSpacing.step32)
        assertEquals(48.dp, OmenSpacing.step48)
        assertEquals(64.dp, OmenSpacing.step64)
        assertEquals(96.dp, OmenSpacing.step96)
    }

    /**
     * Restored 2026-09-15 after being destroyed by a wholesale rewrite of this file. The rescale
     * changed which steps exist; it did not change the rhythm, and the registry re-states these
     * aliases unchanged in intent on the new steps.
     */
    @Test
    fun `rhythm aliases match registry §2·5 prose`() {
        assertEquals(24.dp, OmenSpacing.cardInterior)
        assertEquals(16.dp, OmenSpacing.headerToBody)
        assertEquals(24.dp, OmenSpacing.bodyToFooter)
        assertEquals(48.dp, OmenSpacing.sectionStack)
        assertEquals(32.dp, OmenSpacing.heroToFirstSection)
        assertEquals(16.dp, OmenSpacing.fieldToField)
        assertEquals(8.dp, OmenSpacing.labelToInput)
        assertEquals(4.dp, OmenSpacing.inputToHint)
    }

    /** Restored 2026-09-15 — see above. Registry §4: Android's minimum touch target is 48dp. */
    @Test
    fun `minimum touch target is 48dp on Android`() {
        assertEquals(48.dp, OmenMinTouchTarget)
    }

    /** Every step is `2 × n`. A step that is not even is not on this scale. */
    @Test
    fun `every step is a multiple of two`() {
        listOf(
            OmenSpacing.step2, OmenSpacing.step4, OmenSpacing.step6, OmenSpacing.step8,
            OmenSpacing.step10, OmenSpacing.step12, OmenSpacing.step14, OmenSpacing.step16,
            OmenSpacing.step20, OmenSpacing.step24, OmenSpacing.step32, OmenSpacing.step40,
            OmenSpacing.step48, OmenSpacing.step64, OmenSpacing.step96,
        ).forEach { step ->
            assertEquals(0f, step.value % 2f, "step $step is not 2 × n")
        }
    }
}
