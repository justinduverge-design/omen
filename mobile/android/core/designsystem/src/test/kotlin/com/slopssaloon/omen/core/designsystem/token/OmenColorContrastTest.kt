package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.graphics.Color
import kotlin.math.pow
import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * The gate the hex-pinning tests next door cannot be.
 *
 * `OmenColorTest` asserts that a token equals a hex. That catches drift from the registry and
 * nothing else — it stayed green for the entire life of the shipped light palette, in which
 * `border` `#E5E5E3` sat on `surface1` `#FFFFFF` at **1.10:1** while being the only boundary
 * drawn around a text field, a picker, an OTP cell and a secondary button. A pinned hex is a
 * pinned hex whether or not anyone can see it.
 *
 * This computes WCAG 2.1 relative-luminance contrast from the token values themselves, so it
 * fails on the *consequence* of a value rather than on the value, and survives a future
 * repalette that keeps the ratios.
 *
 * Thresholds: 4.5:1 for anything that renders as text (1.4.3), 3:1 for a boundary that is the
 * sole visual delimiter of a control (1.4.11). `borderSubtle` is deliberately absent — it is the
 * decorative hairline inside an already-differentiated card, never a control's only edge.
 */
class OmenColorContrastTest {

    private fun channel(c: Float): Double {
        val v = c.toDouble()
        return if (v <= 0.03928) v / 12.92 else ((v + 0.055) / 1.055).pow(2.4)
    }

    private fun luminance(color: Color): Double =
        0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue)

    private fun contrast(a: Color, b: Color): Double {
        val la = luminance(a)
        val lb = luminance(b)
        return (maxOf(la, lb) + 0.05) / (minOf(la, lb) + 0.05)
    }

    private fun surfaces(scheme: OmenColorScheme) = listOf(
        "bg" to scheme.bg,
        "surface1" to scheme.surface1,
        "surface2" to scheme.surface2,
        "surface3" to scheme.surface3,
    )

    private fun assertAgainstEverySurface(
        themeName: String,
        scheme: OmenColorScheme,
        tokens: List<Pair<String, Color>>,
        minimum: Double,
    ) {
        val failures = buildList {
            for ((tokenName, token) in tokens) {
                for ((surfaceName, surface) in surfaces(scheme)) {
                    val ratio = contrast(token, surface)
                    if (ratio < minimum) {
                        add("$themeName $tokenName on $surfaceName = ${"%.2f".format(ratio)}:1")
                    }
                }
            }
        }
        assertTrue(
            failures.isEmpty(),
            "below the ${"%.1f".format(minimum)}:1 floor:\n" + failures.joinToString("\n"),
        )
    }

    /**
     * Each text token against the surfaces it can actually land on — not a blanket sweep.
     *
     * `surface3` is the deepest inset shade: a confidence-bar track, a progress track, a
     * disabled container (exempt from 1.4.3), and the neutral [OmenBadge] fill. The badge is
     * the only one of those that carries type, and it draws `textSecondary`, so secondary is
     * held against surface3 and tertiary is not. Asserting tertiary there would be an
     * arbitrary threshold dressed as a gate — it would force tertiary up to within a hair of
     * secondary and flatten a hierarchy no user ever sees under pressure.
     */
    private fun textTokens(scheme: OmenColorScheme): List<Triple<String, Color, Int>> = listOf(
        Triple("textPrimary", scheme.textPrimary, 4),
        Triple("textSecondary", scheme.textSecondary, 4),
        Triple("textTertiary", scheme.textTertiary, 3),
    )

    private fun assertTextRamp(themeName: String, scheme: OmenColorScheme) {
        val failures = buildList {
            for ((tokenName, token, surfaceCount) in textTokens(scheme)) {
                for ((surfaceName, surface) in surfaces(scheme).take(surfaceCount)) {
                    val ratio = contrast(token, surface)
                    if (ratio < 4.5) {
                        add("$themeName $tokenName on $surfaceName = ${"%.2f".format(ratio)}:1")
                    }
                }
            }
        }
        assertTrue(failures.isEmpty(), "below the 4.5:1 floor:\n" + failures.joinToString("\n"))
    }

    @Test
    fun `light text ramp clears AA on every surface it can land on`() {
        assertTextRamp("light", OmenLightColors)
    }

    @Test
    fun `dark text ramp clears AA on every surface it can land on`() {
        assertTextRamp("dark", OmenDarkColors)
    }

    /**
     * `border` is not decoration. It is the entire visible boundary of `OmenTextField`,
     * `OmenPicker`, `OmenOtpCodeField`, the secondary/destructive `OmenButton` outlines and
     * Material's `outline` role via the bridge. WCAG 1.4.11 wants 3:1 for exactly that.
     *
     * Held against `bg`, `surface1` and `surface2` — the three grounds those controls actually
     * sit on. `surface3` is the deepest inset shade and no control is drawn on it today; it
     * clears 3:1 in light and does not in dark, and that is a known residual rather than a
     * silent pass.
     */
    @Test
    fun `border meets the non-text UI floor on the surfaces controls sit on`() {
        for ((themeName, scheme) in listOf("light" to OmenLightColors, "dark" to OmenDarkColors)) {
            for ((surfaceName, surface) in surfaces(scheme).take(3)) {
                val ratio = contrast(scheme.border, surface)
                assertTrue(
                    ratio >= 3.0,
                    "$themeName border on $surfaceName = ${"%.2f".format(ratio)}:1, below 3.0:1",
                )
            }
        }
    }

    @Test
    fun `accent carries readable text on its own muted container`() {
        for ((themeName, scheme) in listOf("light" to OmenLightColors, "dark" to OmenDarkColors)) {
            val onAccent = contrast(scheme.textOnAccent, scheme.accent)
            assertTrue(
                onAccent >= 4.5,
                "$themeName textOnAccent on accent = ${"%.2f".format(onAccent)}:1",
            )
            val primaryOnMuted = contrast(scheme.textPrimary, scheme.accentMuted)
            assertTrue(
                primaryOnMuted >= 4.5,
                "$themeName textPrimary on accentMuted = ${"%.2f".format(primaryOnMuted)}:1",
            )
        }
    }

    /**
     * Risk tiers are read as text on chips. The dark values were already AA; the light ones
     * (`#16A34A` / `#D97706`) were 3.24:1 and 3.14:1 on the old white `surface1` and shipped
     * that way.
     */
    @Test
    fun `risk tiers clear AA as text in both themes`() {
        for ((themeName, scheme) in listOf("light" to OmenLightColors, "dark" to OmenDarkColors)) {
            assertAgainstEverySurface(
                themeName,
                scheme,
                listOf(
                    "riskLow" to scheme.data.riskLow,
                    "riskMedium" to scheme.data.riskMedium,
                ),
                4.5,
            )
        }
    }

    /**
     * The platform chips, after 2026-09-11.
     *
     * These render filled with the brand colour and a white label, rather than drawing the
     * brand colour as text. The old treatment put Yahoo `#410093` at **1.33:1** on `surface1`
     * — a filter control nobody could read — and no test noticed, because the token held
     * exactly the hex it was supposed to hold.
     *
     * The brand hexes are sourced values and must not drift for legibility reasons; this
     * asserts the *treatment* carries them instead.
     */
    @Test
    fun `platform chips carry their label on the brand fill`() {
        for ((themeName, scheme) in listOf("light" to OmenLightColors, "dark" to OmenDarkColors)) {
            val pairs = listOf(
                Triple("sleeper", scheme.data.platformSleeperChip, scheme.data.onPlatformSleeper),
                Triple("yahoo", scheme.data.platformYahooChip, scheme.data.onPlatformYahoo),
                Triple("espn", scheme.data.platformEspnChip, scheme.data.onPlatformEspn),
            )
            for ((name, fill, label) in pairs) {
                val ratio = contrast(label, fill)
                assertTrue(
                    ratio >= 4.5,
                    "$themeName $name label on its own fill = ${"%.2f".format(ratio)}:1",
                )
            }
        }
    }

    /**
     * Crimson is the founder's colour and it is dark and saturated, which makes it a fill
     * rather than ink. As text it converges with the ground — it measured 1.59:1 on the smoky
     * `bg` and 1.91:1 on the old near-black. Reversed out with Bone White on top it is 9.15:1
     * and among the strongest things on the screen.
     *
     * Asserted with Bone White specifically, not with `textPrimary` per theme: `riskHigh` is a
     * data-semantic invariant and is dark in BOTH themes, so a crimson fill always carries the
     * light ink. The first version of this test asked whether light-mode `textPrimary`
     * (`#1C1917`, near-black) sat on crimson and failed at 1.68:1 — a true number answering a
     * question the product never asks.
     */
    @Test
    fun `crimson carries bone white when used as a fill`() {
        val boneWhite = OmenDarkColors.textPrimary
        for ((themeName, scheme) in listOf("light" to OmenLightColors, "dark" to OmenDarkColors)) {
            val ratio = contrast(boneWhite, scheme.data.riskHigh)
            assertTrue(
                ratio >= 4.5,
                "$themeName Bone White on crimson fill = ${"%.2f".format(ratio)}:1",
            )
        }
    }
}
