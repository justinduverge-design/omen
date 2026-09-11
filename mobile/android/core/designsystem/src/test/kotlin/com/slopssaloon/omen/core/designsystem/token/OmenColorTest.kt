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
        assertEquals(Color(0xFF1F1F1D), OmenDarkColors.bg)
        assertEquals(Color(0xFF2A2A27), OmenDarkColors.surface1)
        assertEquals(Color(0xFFF5F0E8), OmenDarkColors.textPrimary)
        assertEquals(Color(0xFFC4933B), OmenDarkColors.accent)
        assertEquals(Color(0xFF2F7D5B), OmenDarkColors.omen)
    }

    @Test
    fun `light core semantics match registry`() {
        assertEquals(Color(0xFFF1EDE4), OmenLightColors.bg)
        assertEquals(Color(0xFFFFFDF9), OmenLightColors.surface1)
        assertEquals(Color(0xFF1C1917), OmenLightColors.textPrimary)
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
        assertEquals(Color(0xFF13702F), OmenLightColors.data.riskLow)
        assertNotEquals(OmenDarkColors.data.riskLow, OmenLightColors.data.riskLow)

        assertEquals(Color(0xFFFF9F0A), OmenDarkColors.data.riskMedium)
        assertEquals(Color(0xFF8F4A09), OmenLightColors.data.riskMedium)
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

    /**
     * The Add League chip, 2026-09-06. `omenChip` is a legibility override on `omen` and belongs
     * to the same family as the `platform*Chip` rows above.
     *
     * The values are load-bearing, not decorative: `omen`'s dark `#2F7D5B` is **3.96:1** on `bg`
     * and chip type is 11sp, so the base verdigris fails AA at chip size. `#3A9A70` is the same
     * hue at **5.69:1**. Light mode needs no lift — `#1A5C3E` is already 7.94:1 on `surface1` —
     * so the two are equal there, and this test pins that asymmetry so a future "make them
     * consistent" tidy-up has to argue with the contrast numbers first.
     */
    @Test
    fun `the verdigris chip override lifts dark mode only`() {
        assertEquals(Color(0xFF4FAE81), OmenDarkColors.omenChip)
        assertEquals(Color(0xFF1A5C3E), OmenLightColors.omenChip)

        // Dark is a real lift off the base; light is deliberately identical to it.
        assertNotEquals(OmenDarkColors.omen, OmenDarkColors.omenChip)
        assertEquals(OmenLightColors.omen, OmenLightColors.omenChip)
    }

    @Test
    fun `on-platform foregrounds are pure white`() {
        assertEquals(Color(0xFFFFFFFF), OmenDarkColors.data.onPlatformSleeper)
        assertEquals(Color(0xFFFFFFFF), OmenDarkColors.data.onPlatformYahoo)
        assertEquals(Color(0xFFFFFFFF), OmenDarkColors.data.onPlatformEspn)
    }
}
