package com.slopssaloon.omen.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import com.slopssaloon.omen.core.designsystem.token.OmenColorScheme
import com.slopssaloon.omen.core.designsystem.token.OmenDarkColors
import com.slopssaloon.omen.core.designsystem.token.OmenLightColors
import com.slopssaloon.omen.core.designsystem.token.OmenSpacing
import com.slopssaloon.omen.core.designsystem.token.OmenTypography
import com.slopssaloon.omen.core.designsystem.token.OmenTypographyRoles

private val LocalOmenColorScheme = staticCompositionLocalOf { OmenDarkColors }
private val LocalOmenTypography = staticCompositionLocalOf { OmenTypographyRoles }

/**
 * Root of the Android design-system module, mirroring the `MaterialTheme` object shape so
 * usage reads `OmenTheme.color.xxx` / `OmenTheme.typography.xxx` / `OmenTheme.spacing.xxx`
 * (registry §2.6): feature code reads a token, never a raw hex, sp size, or dp literal.
 *
 * Wrap the app (or a preview) once: `OmenTheme { AppContent() }`.
 */
object OmenTheme {
    val color: OmenColorScheme
        @Composable
        @ReadOnlyComposable
        get() = LocalOmenColorScheme.current

    val typography: OmenTypography
        @Composable
        @ReadOnlyComposable
        get() = LocalOmenTypography.current

    val spacing = OmenSpacing

    /**
     * Defaults to the system dark/light setting via [isSystemInDarkTheme]; pass [darkTheme]
     * explicitly to override (e.g. an in-app appearance toggle, once one exists).
     */
    @Composable
    operator fun invoke(
        darkTheme: Boolean = isSystemInDarkTheme(),
        content: @Composable () -> Unit,
    ) {
        val colors = if (darkTheme) OmenDarkColors else OmenLightColors
        CompositionLocalProvider(
            LocalOmenColorScheme provides colors,
            LocalOmenTypography provides OmenTypographyRoles,
        ) {
            // Compose foundation components (OutlinedTextField, ModalBottomSheet, etc.) still
            // read MaterialTheme — bridge the minimum surface so Material defaults don't fight
            // Omen tokens. Omen components should still prefer OmenTheme.color directly.
            MaterialTheme {
                content()
            }
        }
    }
}
