package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.Modifier
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

/**
 * `Modifier.border` draws inside existing layout bounds, so chaining it never changes a
 * component's measured size — these tests only lock the identity/element-count contract from
 * m1-focus-ring-build-brief-v1.md §3 ("Adds a visible outline without changing layout size").
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
    fun `focused adds a two-layer outline without replacing the base modifier`() {
        val result = Modifier.omenFocusRing(
            focused = true,
            color = OmenDarkColors.focusRing,
            haloColor = OmenDarkColors.focusRingHalo,
        )
        assertNotEquals(Modifier, result)
        assertEquals(2, result.elementCount())
    }
}
