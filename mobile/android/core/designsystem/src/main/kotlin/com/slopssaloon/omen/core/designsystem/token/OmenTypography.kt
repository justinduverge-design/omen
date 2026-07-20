package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Native font-family seam (registry §2.4; m1-native-typography-build-brief-v1.md §3).
 * Alegreya Sans / Alegreya / DM Mono are the locked families, but font-file acquisition is a
 * separately approved asset/license decision not yet made (brief §7). Until then this resolves
 * to platform fallbacks chosen to preserve the *shape* of the role split — sans for UI/headings,
 * serif for long-form reading, monospace for numeric/code-adjacent values — so the hierarchy
 * degrades gracefully rather than collapsing to one face. Swapping in the real font resources
 * is a one-line change here; no call site may reference a font family directly (registry §2.6).
 */
object OmenFontFamilies {
    val alegreyaSans: FontFamily = FontFamily.SansSerif
    val alegreya: FontFamily = FontFamily.Serif
    val dmMono: FontFamily = FontFamily.Monospace
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
        family = OmenFontFamilies.alegreya,
        size = 15.sp,
        lineHeight = 24.sp,
        weight = FontWeight.Normal,
    ),
    bodySmall = OmenTypeRole(
        family = OmenFontFamilies.alegreya,
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
        family = OmenFontFamilies.dmMono,
        size = 12.sp,
        lineHeight = 16.sp,
        weight = FontWeight.Medium,
        letterSpacing = 0.12.em,
        uppercase = true,
    ),
    chip = OmenTypeRole(
        family = OmenFontFamilies.dmMono,
        size = 11.sp,
        lineHeight = 14.sp,
        weight = FontWeight.Medium,
        letterSpacing = 0.10.em,
        uppercase = true,
    ),
    numeric = OmenTypeRole(
        family = OmenFontFamilies.dmMono,
        size = 15.sp,
        lineHeight = 20.sp,
        weight = FontWeight.Medium,
        tabularNumbers = true,
    ),
)
