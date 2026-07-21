package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.Modifier
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

/**
 * The ring is drawn as an inset overlay after content via `drawWithContent` (a single draw
 * element, not `Modifier.border`). Material controls clip an outward ring, while this overlay
 * remains visible on filled variants without changing measured layout size. These tests lock the
 * identity/element-count contract only; the visual treatment is proven by gallery screenshots.
 */
class OmenFocusRingTest {

    private fun Modifier.elementCount(): Int = foldIn(0) { acc, _ -> acc + 1 }

    @Test
    fun `unfocused returns the modifier unchanged`() {
        val base = Modifier
        val result = base.omenFocusRing(
            focused = false,
            color = OmenDarkColors.focusRing,
            haloColor = OmenDarkColors.focusRingHalo,
        )
        assertEquals(base, result)
        assertEquals(0, result.elementCount())
    }

    @Test
    fun `focused adds a draw element without replacing the base modifier`() {
        val result = Modifier.omenFocusRing(
            focused = true,
            color = OmenDarkColors.focusRing,
            haloColor = OmenDarkColors.focusRingHalo,
        )
        assertNotEquals(Modifier, result)
        assertEquals(1, result.elementCount())
    }
}
