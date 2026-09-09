package com.slopssaloon.omen.core.designsystem.token

import com.slopssaloon.omen.core.designsystem.R

import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Native font-family seam (registry §2.4; m1-native-typography-build-brief-v1.md §3).
 *
 * **One typeface, founder decision 2026-09-07.** The app previously carried a three-family role
 * split — Alegreya Sans for UI, Alegreya for reading copy, DM Mono for eyebrow/chip/numeric. No
 * font files had ever been committed, so that split rendered as the platform SansSerif / Serif /
 * Monospace on device and was never seen in its intended faces. The founder judged the result and
 * chose to collapse to a single family rather than ship the three. Alegreya Sans is now the only
 * family in the app; hierarchy is carried by size, weight, letter spacing and case alone.
 *
 * This supersedes `W2-Typography`, which retired only DM Mono.
 *
 * The files are committed under `core/designsystem/src/main/res/font/` under the SIL Open Font
 * License 1.1 with `OFL.txt` intact.
 *
 * **Alegreya Sans has no 600 weight** (the family ships 100/300/400/500/700/800/900), so the two
 * SemiBold roles are declared against the Bold resource. That matches the design canvas, where CSS
 * font matching promotes 600 to 700 against this family — the shipped app resolves the same face
 * the approved artboards did, rather than letting the platform synthesise a weight.
 *
 * No call site may reference a font family directly (registry §2.6); this object stays the only
 * seam.
 */
object OmenFontFamilies {
    val alegreyaSans: FontFamily = FontFamily(
        Font(R.font.alegreya_sans_regular, FontWeight.Normal),
        Font(R.font.alegreya_sans_medium, FontWeight.Medium),
        // Alegreya Sans has no 600; SemiBold is declared against Bold so Compose resolves a real
        // face instead of synthesising one.
        Font(R.font.alegreya_sans_bold, FontWeight.SemiBold),
        Font(R.font.alegreya_sans_bold, FontWeight.Bold),
    )
}

/**
 * One shared type role. `sp` sizes participate in Android's system font-scale automatically
 * (Compose's `sp` unit is scale-aware by default) — satisfies the brief's "no fixed-size text
 * that disables accessibility scaling" rule without extra plumbing.
 */
data class OmenTypeRole(
    val family: FontFamily,
    val size: TextUnit,
    val lineHeight: TextUnit,
    val weight: FontWeight,
    val letterSpacing: TextUnit = 0.sp,
    val uppercase: Boolean = false,
    val tabularNumbers: Boolean = false,
) {
    fun toTextStyle(): TextStyle = TextStyle(
        fontFamily = family,
        fontSize = size,
        lineHeight = lineHeight,
        fontWeight = weight,
        letterSpacing = letterSpacing,
        fontFeatureSettings = if (tabularNumbers) "tnum" else null,
    )
}

/** The ten locked roles from the registry §2.4 / typography brief §2. */
data class OmenTypography(
    val display: OmenTypeRole,
    val h1: OmenTypeRole,
    val h2: OmenTypeRole,
    val h3: OmenTypeRole,
    val body: OmenTypeRole,
    val bodySmall: OmenTypeRole,
    val label: OmenTypeRole,
    val eyebrow: OmenTypeRole,
    val chip: OmenTypeRole,
    val numeric: OmenTypeRole,
)

val OmenTypographyRoles = OmenTypography(
    display = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 48.sp,
        lineHeight = 56.sp,
        weight = FontWeight.Bold,
    ),
    h1 = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 32.sp,
        lineHeight = 40.sp,
        weight = FontWeight.Bold,
    ),
    h2 = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 20.sp,
        lineHeight = 28.sp,
        weight = FontWeight.SemiBold,
    ),
    h3 = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 16.sp,
        lineHeight = 24.sp,
        weight = FontWeight.SemiBold,
    ),
    body = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 15.sp,
        lineHeight = 24.sp,
        weight = FontWeight.Normal,
    ),
    bodySmall = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 13.sp,
        lineHeight = 20.sp,
        weight = FontWeight.Normal,
    ),
    label = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 12.sp,
        lineHeight = 16.sp,
        weight = FontWeight.Medium,
        letterSpacing = 0.05.em,
    ),
    eyebrow = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 12.sp,
        lineHeight = 16.sp,
        weight = FontWeight.Medium,
        letterSpacing = 0.12.em,
        uppercase = true,
    ),
    chip = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 11.sp,
        lineHeight = 14.sp,
        weight = FontWeight.Medium,
        letterSpacing = 0.10.em,
        uppercase = true,
    ),
    numeric = OmenTypeRole(
        family = OmenFontFamilies.alegreyaSans,
        size = 15.sp,
        lineHeight = 20.sp,
        weight = FontWeight.Medium,
        tabularNumbers = true,
    ),
)
