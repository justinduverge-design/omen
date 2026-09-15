package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Locks registry §2.4 as resolved by C7 on 2026-09-13 — the fourteen-step ramp, the fifteen
 * named roles, the two optical cuts, and the figure rule.
 *
 * **What this file cannot prove, stated so nobody reads it as more than it is.** These are JVM
 * unit tests. They assert the role *specification* — the family object a role points at, its
 * size, weight, tracking and case. They cannot assert the face Android actually resolves on a
 * device, because font resolution needs a real `Context`.
 *
 * That distinction is not academic. On 2026-09-15 the iOS half of this same swap shipped a
 * resolver that never applied a weight: every role rendered at 400, and the iOS suite stayed
 * green because its assertions read the spec rather than the resolved face. The equivalent
 * guard here has to be an instrumented test, and `W1-ANDROID-CI` — nothing in CI runs Android
 * tests at all today — means even these do not run automatically yet. Both are open gaps.
 */
class OmenTypographyTest {

    private val displayRoles = mapOf(
        "display" to OmenTypographyRoles.display,
        "h1" to OmenTypographyRoles.h1,
        "scoreLead" to OmenTypographyRoles.scoreLead,
        "call" to OmenTypographyRoles.call,
        "scoreTrail" to OmenTypographyRoles.scoreTrail,
        "screenTitle" to OmenTypographyRoles.screenTitle,
        "h2" to OmenTypographyRoles.h2,
        "h3" to OmenTypographyRoles.h3,
        "cardLead" to OmenTypographyRoles.cardLead,
        "numeric" to OmenTypographyRoles.numeric,
    )

    private val textRoles = mapOf(
        "body" to OmenTypographyRoles.body,
        "name" to OmenTypographyRoles.name,
        "bodySmall" to OmenTypographyRoles.bodySmall,
        "label" to OmenTypographyRoles.label,
        "micro" to OmenTypographyRoles.micro,
    )

    private val allRoles get() = displayRoles + textRoles

    @Test
    fun `every registry role is covered by this test`() {
        // Fifteen roles in §2.4. If a role is added and not mapped above, the maps stop
        // describing the registry and every assertion below silently narrows.
        assertEquals(15, allRoles.size)
    }

    @Test
    fun `headings scores and columnar values use the display optical cut`() {
        displayRoles.forEach { (name, role) ->
            assertEquals(OmenFontFamilies.display, role.family, "role $name is not on the display cut")
        }
    }

    @Test
    fun `reasoning labels and metadata use the text optical cut`() {
        textRoles.forEach { (name, role) ->
            assertEquals(OmenFontFamilies.text, role.family, "role $name is not on the text cut")
        }
    }

    @Test
    fun `both cuts register all five named instances so no weight falls back to 400`() {
        assertEquals(listOf(400, 500, 600, 700, 800), OmenFontFamilies.weights)
    }

    @Test
    fun `every role sits on the C7 ramp`() {
        val ramp = setOf(10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 27, 32, 48).map { it.sp }
        allRoles.forEach { (name, role) ->
            assertTrue(role.size in ramp, "role $name is ${role.size}, off the C7 ramp (floor 10)")
        }
    }

    @Test
    fun `sizes and weights match the locked role map`() {
        assertEquals(48.sp, OmenTypographyRoles.display.size)
        assertEquals(56.sp, OmenTypographyRoles.display.lineHeight)
        assertEquals(FontWeight.ExtraBold, OmenTypographyRoles.display.weight)

        assertEquals(32.sp, OmenTypographyRoles.h1.size)
        assertEquals(FontWeight.ExtraBold, OmenTypographyRoles.h1.weight)

        assertEquals(24.sp, OmenTypographyRoles.call.size)
        assertEquals(22.sp, OmenTypographyRoles.screenTitle.size)

        assertEquals(15.sp, OmenTypographyRoles.body.size)
        assertEquals(FontWeight.Normal, OmenTypographyRoles.body.weight)

        assertEquals(10.sp, OmenTypographyRoles.micro.size)
        assertEquals(FontWeight.ExtraBold, OmenTypographyRoles.micro.weight)
    }

    /**
     * `micro` carries eyebrows, dividers and section rules; `label` carries labels, chips and
     * badges. The compatibility aliases that briefly mapped the old `eyebrow`/`chip` names onto
     * these were removed 2026-09-15 — an alias made a 12pt/Medium eyebrow render as 10pt/
     * ExtraBold at every call site without any of those call sites being looked at.
     */
    @Test
    fun `the tracked uppercase roles carry the registry tracking`() {
        assertTrue(OmenTypographyRoles.micro.uppercase)
        assertEquals(0.16.em, OmenTypographyRoles.micro.letterSpacing)

        assertTrue(OmenTypographyRoles.label.uppercase)
        assertEquals(0.12.em, OmenTypographyRoles.label.letterSpacing)
    }

    /**
     * Column alignment must survive having no mono family. It comes from the tabular-figure
     * feature applied in `toTextStyle()`, not from the typeface. Reintroducing a mono family to
     * hold a column straight is prohibited (facts-of-record #21).
     */
    @Test
    fun `columnar roles request tabular figures`() {
        listOf(
            "numeric" to OmenTypographyRoles.numeric,
            "scoreLead" to OmenTypographyRoles.scoreLead,
            "scoreTrail" to OmenTypographyRoles.scoreTrail,
        ).forEach { (name, role) ->
            assertTrue(role.tabularNumbers, "role $name lost its tabular figures")
            assertEquals("tnum", role.toTextStyle().fontFeatureSettings, "role $name")
        }
    }

    @Test
    fun `non-numeric roles do not set font feature settings`() {
        assertEquals(null, OmenTypographyRoles.body.toTextStyle().fontFeatureSettings)
        assertEquals(null, OmenTypographyRoles.micro.toTextStyle().fontFeatureSettings)
    }
}
