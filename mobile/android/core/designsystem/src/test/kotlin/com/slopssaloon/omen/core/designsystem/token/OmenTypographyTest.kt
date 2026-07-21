package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Locks the ten roles against `m1-native-typography-build-brief-v1.md` §2 and confirms the
 * font-family fallback preserves the sans/serif/mono role split even before real Alegreya
 * Sans/Alegreya/DM Mono font files are acquired (brief §7 — that acquisition is a separate,
 * not-yet-made decision).
 */
class OmenTypographyTest {

    @Test
    fun `heading and label roles use the UI sans fallback`() {
        val uiRoles = listOf(
            OmenTypographyRoles.display,
            OmenTypographyRoles.h1,
            OmenTypographyRoles.h2,
            OmenTypographyRoles.h3,
            OmenTypographyRoles.label,
        )
        uiRoles.forEach { assertEquals(OmenFontFamilies.alegreyaSans, it.family) }
    }

    @Test
    fun `reading roles use the serif fallback`() {
        assertEquals(OmenFontFamilies.alegreya, OmenTypographyRoles.body.family)
        assertEquals(OmenFontFamilies.alegreya, OmenTypographyRoles.bodySmall.family)
    }

    @Test
    fun `numeric and compact-label roles use the mono fallback`() {
        val monoRoles = listOf(
            OmenTypographyRoles.eyebrow,
            OmenTypographyRoles.chip,
            OmenTypographyRoles.numeric,
        )
        monoRoles.forEach { assertEquals(OmenFontFamilies.dmMono, it.family) }
    }

    @Test
    fun `sizes and weights match the locked role map`() {
        assertEquals(48.sp, OmenTypographyRoles.display.size)
        assertEquals(56.sp, OmenTypographyRoles.display.lineHeight)
        assertEquals(FontWeight.Bold, OmenTypographyRoles.display.weight)

        assertEquals(32.sp, OmenTypographyRoles.h1.size)
        assertEquals(FontWeight.Bold, OmenTypographyRoles.h1.weight)

        assertEquals(15.sp, OmenTypographyRoles.body.size)
        assertEquals(FontWeight.Normal, OmenTypographyRoles.body.weight)

        assertEquals(11.sp, OmenTypographyRoles.chip.size)
        assertEquals(14.sp, OmenTypographyRoles.chip.lineHeight)
    }

    @Test
    fun `eyebrow and chip are uppercase with the documented tracking`() {
        assertTrue(OmenTypographyRoles.eyebrow.uppercase)
        assertEquals(0.12.em, OmenTypographyRoles.eyebrow.letterSpacing)

        assertTrue(OmenTypographyRoles.chip.uppercase)
        assertEquals(0.10.em, OmenTypographyRoles.chip.letterSpacing)

        assertEquals(0.05.em, OmenTypographyRoles.label.letterSpacing)
    }

    @Test
    fun `numeric role requests tabular figures`() {
        assertTrue(OmenTypographyRoles.numeric.tabularNumbers)
        assertEquals("tnum", OmenTypographyRoles.numeric.toTextStyle().fontFeatureSettings)
    }

    @Test
    fun `non-numeric roles do not set font feature settings`() {
        assertEquals(null, OmenTypographyRoles.body.toTextStyle().fontFeatureSettings)
    }
}
