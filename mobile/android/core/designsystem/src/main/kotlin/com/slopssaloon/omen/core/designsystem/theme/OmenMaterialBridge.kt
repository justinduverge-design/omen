package com.slopssaloon.omen.core.designsystem.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import com.slopssaloon.omen.core.designsystem.token.OmenColorScheme

/**
 * Omen's tokens expressed as a Material 3 [ColorScheme].
 *
 * Why this exists: `OmenTheme` already wrapped `MaterialTheme`, but called it with no
 * arguments, so every Material component fell back to Material's own default palette — which
 * is light. Omen components read `OmenTheme.color` directly and were fine; anything Material
 * drew was not. `ModalBottomSheet` defaults its container to `surfaceContainerLow`, so in dark
 * mode the Command Center detail sheets came up on a near-white slab with Omen's dark-theme
 * content painted on top, and the sheet title read pale gold on white (founder, 2026-09-10).
 *
 * This adds no new colors. Every value is an existing Omen token, re-labelled into the role
 * Material looks for, so the registry stays the single source of truth for hexes
 * (`omen-native-design-system-registry-v1.md` §2.2).
 *
 * Omen components should still prefer `OmenTheme.color` directly. This is the floor for the
 * Material widgets underneath them, not an invitation to theme through Material.
 */
internal fun omenMaterialColorScheme(colors: OmenColorScheme, darkTheme: Boolean): ColorScheme {
    val base = if (darkTheme) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = colors.accent,
        onPrimary = colors.textOnAccent,
        primaryContainer = colors.accentMuted,
        onPrimaryContainer = colors.textPrimary,

        secondary = colors.omen,
        onSecondary = colors.textOnAccent,
        secondaryContainer = colors.surface2,
        onSecondaryContainer = colors.textPrimary,

        tertiary = colors.umber,
        onTertiary = colors.textOnAccent,

        background = colors.bg,
        onBackground = colors.textPrimary,

        surface = colors.bg,
        onSurface = colors.textPrimary,
        surfaceVariant = colors.surface2,
        onSurfaceVariant = colors.textSecondary,

        // These five are what sheets, menus, dialogs and cards actually read. The bottom-sheet
        // bug lived in `surfaceContainerLow`.
        surfaceContainerLowest = colors.bg,
        surfaceContainerLow = colors.surface1,
        surfaceContainer = colors.surface1,
        surfaceContainerHigh = colors.surface2,
        surfaceContainerHighest = colors.surface3,

        outline = colors.border,
        outlineVariant = colors.borderSubtle,

        error = colors.data.riskHigh,
        onError = colors.textOnAccent,
        errorContainer = colors.surface2,
        onErrorContainer = colors.data.riskHigh,
    )
}
