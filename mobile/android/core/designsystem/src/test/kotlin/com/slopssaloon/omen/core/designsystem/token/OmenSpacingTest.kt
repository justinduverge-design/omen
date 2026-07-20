package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.unit.dp
import kotlin.test.Test
import kotlin.test.assertEquals

/** Locks the spacing scale and rhythm aliases against registry §2.5. */
class OmenSpacingTest {

    @Test
    fun `scale matches the registry sequence`() {
        assertEquals(4.dp, OmenSpacing.step4)
        assertEquals(8.dp, OmenSpacing.step8)
        assertEquals(12.dp, OmenSpacing.step12)
        assertEquals(16.dp, OmenSpacing.step16)
        assertEquals(24.dp, OmenSpacing.step24)
        assertEquals(32.dp, OmenSpacing.step32)
        assertEquals(48.dp, OmenSpacing.step48)
        assertEquals(64.dp, OmenSpacing.step64)
        assertEquals(96.dp, OmenSpacing.step96)
    }

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

    @Test
    fun `minimum touch target is 48dp on Android`() {
        assertEquals(48.dp, OmenMinTouchTarget)
    }
}
