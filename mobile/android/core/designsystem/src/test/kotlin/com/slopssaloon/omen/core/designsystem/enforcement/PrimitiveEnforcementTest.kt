package com.slopssaloon.omen.core.designsystem.enforcement

import java.io.File
import kotlin.test.Test
import kotlin.test.fail

/**
 * M1-P P4 enforcement: feature and app-shell Kotlin sources must compose approved shared
 * `Omen*` primitives from `:core:designsystem`, not clone raw Material 3 primitives or raw
 * `Color(0xNNNNNNNN)` literals in-place.
 *
 * Scope. Walks `mobile/android/app/src/main/kotlin` and any future `mobile/android/feature`
 * subtree. The `:core:designsystem` module itself is out of scope because it is the
 * primitive layer.
 *
 * Banned. Any of the Material 3 primitives listed in [BANNED_M3_PRIMITIVES] used by
 * fully-qualified import or by call-site; and any raw eight-hex-digit `Color(0x...)` literal.
 *
 * Allowlist. [ALLOWLISTED_FILES] names files intentionally exempted (M2 scaffold shells). Each
 * entry MUST have a written reason and a retirement plan.
 *
 * Why this is a scanner and not `detekt` yet. This module has no detekt config; adding one is
 * a larger change. A source-scanning JUnit test proves the rule today and is deletable when
 * detekt rules land later.
 */
class PrimitiveEnforcementTest {

    @Test
    fun `app + feature Kotlin sources compose Omen primitives instead of raw Material 3 or hex colors`() {
        val roots = TARGET_ROOTS.filter { it.isDirectory }
        if (roots.isEmpty()) {
            fail("None of ${TARGET_ROOTS.map { it.path }} exist. Fix the relative path in PrimitiveEnforcementTest.")
        }
        val violations = mutableListOf<Violation>()
        for (root in roots) {
            root.walkTopDown()
                .filter { it.isFile && it.extension == "kt" }
                .filter { file -> ALLOWLISTED_FILES.none { file.invariantPath.endsWith(it) } }
                .forEach { file ->
                    val text = file.readText()
                    for (banned in BANNED_M3_PRIMITIVES) {
                        val importPattern = Regex("""import\s+androidx\.compose\.material3\.$banned\b""")
                        if (importPattern.containsMatchIn(text)) {
                            violations += Violation(file, "imports androidx.compose.material3.$banned — use Omen* primitive")
                        }
                    }
                    if (RAW_HEX_COLOR.containsMatchIn(text)) {
                        violations += Violation(file, "raw Color(0xNNNNNNNN) literal — use OmenColor / OmenTheme.color tokens")
                    }
                }
        }
        if (violations.isNotEmpty()) {
            fail(buildString {
                appendLine("M1-P P4 primitive enforcement failed. Compose from :core:designsystem's Omen* primitives.")
                appendLine("Allowlist a file only with a written reason + retirement plan in PrimitiveEnforcementTest.ALLOWLISTED_FILES.")
                appendLine()
                violations.forEach { appendLine("  - ${it.file.invariantPath}: ${it.reason}") }
            })
        }
    }

    private val File.invariantPath: String get() = path.replace('\\', '/')

    private data class Violation(val file: File, val reason: String)

    companion object {
        // `user.dir` when the unit test runs is `mobile/android/core/designsystem`.
        private val REPO_MOBILE_ANDROID: File = run {
            val here = File(System.getProperty("user.dir")!!) // mobile/android/core/designsystem
            here.parentFile!!.parentFile!! // -> mobile/android
        }

        private val TARGET_ROOTS = listOf(
            File(REPO_MOBILE_ANDROID, "app/src/main/kotlin"),
            // Future :feature: modules land here and will be picked up automatically.
            File(REPO_MOBILE_ANDROID, "feature"),
        )

        /**
         * Files exempted from this check. Each entry MUST document why and when it will be
         * retired. Adding to this list is a design-steward decision, not a build fix.
         *
         * Both entries below are tracked under sprint item **M4-Auth** in
         * `Direction/current_sprint.md`. Exit condition is a single event: BOTH files leave
         * this list together when the Omen-primitive-native auth surfaces land and the
         * scanner is still green. No third auth file may join this list without opening a
         * separately-tracked retirement item — the M4-Auth plan is the only exemption path
         * for these two files.
         *
         * - `app/auth/OmenAuthFlow.kt` — extracted 2026-07-22 from OmenAndroidApp.kt to
         *   isolate raw `Button`/`OutlinedButton`/`OutlinedTextField` usage. Retires with
         *   M4-Auth.
         * - `app/auth/OmenDeleteAccountScreen.kt` — extracted 2026-07-22 alongside
         *   OmenAuthFlow. Retires with M4-Auth.
         *
         * Retired 2026-07-22: `OmenAndroidApp.kt` (M4 Command Center v1 landed the primitive
         * rewrite and swapped its MaterialTheme wrapper for OmenTheme).
         */
        private val ALLOWLISTED_FILES = listOf(
            "app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenAuthFlow.kt",
            "app/src/main/kotlin/com/slopssaloon/omen/app/auth/OmenDeleteAccountScreen.kt",
        )

        private val BANNED_M3_PRIMITIVES = listOf(
            "Button",
            "OutlinedButton",
            "TextButton",
            "ElevatedButton",
            "FilledTonalButton",
            "IconButton",
            "Card",
            "OutlinedCard",
            "ElevatedCard",
            "TextField",
            "OutlinedTextField",
            "AlertDialog",
            "Chip",
            "AssistChip",
            "FilterChip",
            "SuggestionChip",
        )

        private val RAW_HEX_COLOR = Regex("""\bColor\(0x[0-9A-Fa-f]{8}\)""")
    }
}
