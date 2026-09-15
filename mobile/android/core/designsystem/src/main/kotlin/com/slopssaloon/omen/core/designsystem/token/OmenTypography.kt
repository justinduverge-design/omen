package com.slopssaloon.omen.core.designsystem.token

import com.slopssaloon.omen.core.designsystem.R

import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * Registry §2.4: the two bundled Wix Madefor optical cuts. This object is the only seam; no
 * screen or component names a font directly (registry §2.6).
 *
 * **One file per cut, five weights each.** Both `.ttf`s are variable fonts carrying a single
 * `wght` axis, 400-800, with named instances at every hundred. Each `FontWeight` is registered
 * against the *same* resource with an explicit `variationSettings`, which is what pins the axis
 * — without it every weight would resolve to the file's default instance (400) and the whole
 * ramp would render flat.
 *
 * That is not hypothetical. The iOS half of this same swap shipped a resolver that set a weight
 * *trait* instead of the axis, and every role on that platform resolved to Regular while the
 * test suite stayed green. Android's mechanism here is the correct one; it is documented at
 * this length so nobody "simplifies" the `variationSettings` argument away.
 *
 * `variationSettings` needs API 26, which is this module's `minSdk`, so there is no silently
 * degraded path on a supported device.
 *
 * Wix Madefor has a real 600, so the SemiBold-declared-against-Bold workaround that Alegreya
 * Sans forced is deleted rather than ported (registry §2.4). No role uses 600 after C7 moved
 * `h3` to 700, but the cut carries it and this seam can reach it.
 */
@OptIn(ExperimentalTextApi::class)
object OmenFontFamilies {

    /** The five named instances both cuts ship. */
    val weights = listOf(400, 500, 600, 700, 800)

    private fun cut(resId: Int) = FontFamily(
        *weights.map { weight ->
            Font(
                resId,
                FontWeight(weight),
                variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
            )
        }.toTypedArray()
    )

    val display = cut(R.font.wix_madefor_display)
    val text = cut(R.font.wix_madefor_text)
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

/** Named roles from the merged visual-lock registry. */
data class OmenTypography(
    val display: OmenTypeRole,
    val h1: OmenTypeRole,
    val scoreLead: OmenTypeRole,
    val call: OmenTypeRole,
    val scoreTrail: OmenTypeRole,
    val screenTitle: OmenTypeRole,
    val h2: OmenTypeRole,
    val h3: OmenTypeRole,
    val body: OmenTypeRole,
    val cardLead: OmenTypeRole,
    val name: OmenTypeRole,
    val bodySmall: OmenTypeRole,
    val label: OmenTypeRole,
    val micro: OmenTypeRole,
    val numeric: OmenTypeRole,
)

val OmenTypographyRoles = OmenTypography(
    display = OmenTypeRole(OmenFontFamilies.display, 48.sp, 56.sp, FontWeight(800), 0.em, false, false),
    h1 = OmenTypeRole(OmenFontFamilies.display, 32.sp, 40.sp, FontWeight(800), 0.em, false, false),
    scoreLead = OmenTypeRole(OmenFontFamilies.display, 27.sp, 28.sp, FontWeight(800), 0.em, false, true),
    call = OmenTypeRole(OmenFontFamilies.display, 24.sp, 26.sp, FontWeight(800), 0.em, false, false),
    scoreTrail = OmenTypeRole(OmenFontFamilies.display, 22.sp, 24.sp, FontWeight(800), 0.em, false, true),
    screenTitle = OmenTypeRole(OmenFontFamilies.display, 22.sp, 26.sp, FontWeight(800), 0.em, false, false),
    h2 = OmenTypeRole(OmenFontFamilies.display, 20.sp, 26.sp, FontWeight(700), 0.em, false, false),
    h3 = OmenTypeRole(OmenFontFamilies.display, 18.sp, 24.sp, FontWeight(700), 0.em, false, false),
    body = OmenTypeRole(OmenFontFamilies.text, 15.sp, 22.sp, FontWeight(400), 0.em, false, false),
    cardLead = OmenTypeRole(OmenFontFamilies.display, 14.sp, 18.sp, FontWeight(700), 0.em, false, false),
    name = OmenTypeRole(OmenFontFamilies.text, 13.sp, 16.sp, FontWeight(700), 0.em, false, false),
    bodySmall = OmenTypeRole(OmenFontFamilies.text, 12.sp, 17.sp, FontWeight(400), 0.em, false, false),
    label = OmenTypeRole(OmenFontFamilies.text, 11.sp, 14.sp, FontWeight(700), 0.12.em, true, false),
    micro = OmenTypeRole(OmenFontFamilies.text, 10.sp, 13.sp, FontWeight(800), 0.16.em, true, false),
    numeric = OmenTypeRole(OmenFontFamilies.display, 15.sp, 22.sp, FontWeight(800), 0.em, false, true),
)
