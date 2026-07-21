package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.graphics.Color
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

/**
 * Locks the color tokens against the hex values in `omen-native-design-system-registry-v1.md`
 * §2.2/§2.3 so a future hand-edit here can't silently drift from the registry without a failing
 * test flagging it.
 */
class OmenColorTest {

    @Test
    fun `dark core semantics match registry`() {
        assertEquals(Color(0xFF0A0A0B), OmenDarkColors.bg)
        assertEquals(Color(0xFF1C1C1E), OmenDarkColors.surface1)
        assertEquals(Color(0xFFF5F0E8), OmenDarkColors.textPrimary)
        assertEquals(Color(0xFFA67C2E), OmenDarkColors.accent)
        assertEquals(Color(0xFF2F7D5B), OmenDarkColors.omen)
    }

    @Test
    fun `light core semantics match registry`() {
        assertEquals(Color(0xFFFAFAF9), OmenLightColors.bg)
        assertEquals(Color(0xFFFFFFFF), OmenLightColors.surface1)
        assertEquals(Color(0xFF1C1C1E), OmenLightColors.textPrimary)
        assertEquals(Color(0xFF7A5C1E), OmenLightColors.accent)
        assertEquals(Color(0xFF1A5C3E), OmenLightColors.omen)
    }

    @Test
    fun `focus ring is derived from accent per theme`() {
        assertEquals(OmenDarkColors.accent, OmenDarkColors.focusRing)
        assertEquals(OmenLightColors.accent, OmenLightColors.focusRing)
        assertEquals(0.4f, OmenDarkColors.focusRingHalo.alpha)
        assertEquals(0.4f, OmenLightColors.focusRingHalo.alpha)
    }

    @Test
    fun `risk-high is a data-semantic invariant unchanged across themes`() {
        assertEquals(Color(0xFF7E1717), OmenDarkColors.data.riskHigh)
        assertEquals(OmenDarkColors.data.riskHigh, OmenLightColors.data.riskHigh)
    }

    @Test
    fun `risk-low and risk-medium document a light-mode override`() {
        assertEquals(Color(0xFF34C759), OmenDarkColors.data.riskLow)
        assertEquals(Color(0xFF16A34A), OmenLightColors.data.riskLow)
        assertNotEquals(OmenDarkColors.data.riskLow, OmenLightColors.data.riskLow)

        assertEquals(Color(0xFFFF9F0A), OmenDarkColors.data.riskMedium)
        assertEquals(Color(0xFFD97706), OmenLightColors.data.riskMedium)
    }

    @Test
    fun `platform brand and demo tokens are invariant across themes`() {
        assertEquals(OmenDarkColors.data.platformSleeper, OmenLightColors.data.platformSleeper)
        assertEquals(OmenDarkColors.data.platformYahoo, OmenLightColors.data.platformYahoo)
        assertEquals(OmenDarkColors.data.platformEspn, OmenLightColors.data.platformEspn)
        assertEquals(OmenDarkColors.data.demoText, OmenLightColors.data.demoText)
    }

    @Test
    fun `platform chip legibility overrides match registry`() {
        assertEquals(Color(0xFF0F70B0), OmenDarkColors.data.platformSleeperChip)
        assertEquals(Color(0xFF410093), OmenDarkColors.data.platformYahooChip)
        assertEquals(Color(0xFFB21826), OmenDarkColors.data.platformEspnChip)
    }

    @Test
    fun `platform chip and on-platform tokens are invariant across themes`() {
        assertEquals(OmenDarkColors.data.platformSleeperChip, OmenLightColors.data.platformSleeperChip)
        assertEquals(OmenDarkColors.data.platformYahooChip, OmenLightColors.data.platformYahooChip)
        assertEquals(OmenDarkColors.data.platformEspnChip, OmenLightColors.data.platformEspnChip)
        assertEquals(OmenDarkColors.data.onPlatformSleeper, OmenLightColors.data.onPlatformSleeper)
        assertEquals(OmenDarkColors.data.onPlatformYahoo, OmenLightColors.data.onPlatformYahoo)
        assertEquals(OmenDarkColors.data.onPlatformEspn, OmenLightColors.data.onPlatformEspn)
    }

    @Test
    fun `on-platform foregrounds are pure white`() {
        assertEquals(Color(0xFFFFFFFF), OmenDarkColors.data.onPlatformSleeper)
        assertEquals(Color(0xFFFFFFFF), OmenDarkColors.data.onPlatformYahoo)
        assertEquals(Color(0xFFFFFFFF), OmenDarkColors.data.onPlatformEspn)
    }
}
