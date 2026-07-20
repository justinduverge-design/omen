package com.slopssaloon.omen.core.designsystem.token

import androidx.compose.ui.graphics.Color

/**
 * Core semantic color roles. Values are the live `index.css` hexes transcribed in
 * `omen-native-design-system-registry-v1.md` §2.2 — do not hand-edit a hex here without
 * updating the registry row first (registry markdown is the source of truth).
 *
 * Feature code must read [com.slopssaloon.omen.core.designsystem.theme.OmenTheme.color],
 * never construct [OmenColorScheme] or a raw [Color] directly (registry §2.6).
 */
data class OmenColorScheme(
    val bg: Color,
    val surface1: Color,
    val surface2: Color,
    val surface3: Color,
    val border: Color,
    val borderSubtle: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textTertiary: Color,
    val accent: Color,
    val accentHover: Color,
    val accentMuted: Color,
    val textOnAccent: Color,
    val omen: Color,
    val umber: Color,
    /** Derived from [accent]; solid stroke color for the focus-ring outline (registry §2.2, §4). */
    val focusRing: Color,
    /** Soft halo layered behind [focusRing] — the "accent @ 40%" reading of the registry row. */
    val focusRingHalo: Color,
    val data: OmenDataSemanticColors,
)

/**
 * Data-semantic invariant tokens (registry §2.3). These never change with a theme pack —
 * risk/data-source/confidence/position/platform meaning must stay fixed across the whole app.
 * Identical values in light and dark by contract, except where the registry documents a
 * light-mode override (risk-low/medium below).
 */
data class OmenDataSemanticColors(
    val riskLow: Color,
    val riskMedium: Color,
    val riskHigh: Color,
    val dataLive: Color,
    val dataStub: Color,
    val dataMock: Color,
    val dataUnavailable: Color,
    val confidenceFloor: Color,
    val confidenceCeiling: Color,
    val posRb: Color,
    val posWr: Color,
    val posQb: Color,
    val posTe: Color,
    val posDef: Color,
    val posK: Color,
    val platformSleeper: Color,
    val platformYahoo: Color,
    val platformEspn: Color,
    val demoText: Color,
    val demoTextSecondary: Color,
)

private val darkDataSemantics = OmenDataSemanticColors(
    riskLow = Color(0xFF34C759),
    riskMedium = Color(0xFFFF9F0A),
    riskHigh = Color(0xFF7E1717),
    dataLive = Color(0xFF34C759),
    dataStub = Color(0xFFFF9F0A),
    dataMock = Color(0xFF636366),
    dataUnavailable = Color(0xFF3A3A3C),
    confidenceFloor = Color(0xFF701020),
    confidenceCeiling = Color(0xFF206F3A),
    posRb = Color(0xFF34D399),
    posWr = Color(0xFF60A5FA),
    posQb = Color(0xFFFB923C),
    posTe = Color(0xFFC084FC),
    posDef = Color(0xFFF472B6),
    posK = Color(0xFFA3A3A3),
    platformSleeper = Color(0xFF1FA3E8),
    platformYahoo = Color(0xFF410093),
    platformEspn = Color(0xFFC81E2C),
    demoText = Color(0xFF7DD3FC),
    demoTextSecondary = Color(0xCCBAE6FD),
)

// Registry §2.3: risk-high and the data-source/confidence/position/platform/demo families are
// identical dark/light by contract; only risk-low/risk-medium document a light override.
private val lightDataSemantics = darkDataSemantics.copy(
    riskLow = Color(0xFF16A34A),
    riskMedium = Color(0xFFD97706),
)

val OmenDarkColors = OmenColorScheme(
    bg = Color(0xFF0A0A0B),
    surface1 = Color(0xFF1C1C1E),
    surface2 = Color(0xFF2C2C2E),
    surface3 = Color(0xFF3A3A3C),
    border = Color(0xFF3A3A3C),
    borderSubtle = Color(0xFF2C2C2E),
    textPrimary = Color(0xFFF5F0E8),
    textSecondary = Color(0xFFAEAEB2),
    textTertiary = Color(0xFF6D6D72),
    accent = Color(0xFFA67C2E),
    accentHover = Color(0xFFC49035),
    accentMuted = Color(0xFF3A2A0A),
    textOnAccent = Color(0xFF0A0A0B),
    omen = Color(0xFF2F7D5B),
    umber = Color(0xFF5A3A25),
    focusRing = Color(0xFFA67C2E),
    focusRingHalo = Color(0xFFA67C2E).copy(alpha = 0.4f),
    data = darkDataSemantics,
)

val OmenLightColors = OmenColorScheme(
    bg = Color(0xFFFAFAF9),
    surface1 = Color(0xFFFFFFFF),
    surface2 = Color(0xFFF5F5F4),
    surface3 = Color(0xFFEBEBEA),
    border = Color(0xFFE5E5E3),
    borderSubtle = Color(0xFFF0F0EE),
    textPrimary = Color(0xFF1C1C1E),
    textSecondary = Color(0xFF6B7280),
    textTertiary = Color(0xFF9CA3AF),
    accent = Color(0xFF7A5C1E),
    accentHover = Color(0xFFA67C2E),
    accentMuted = Color(0xFFFEF3C7),
    textOnAccent = Color(0xFFFAFAF9),
    omen = Color(0xFF1A5C3E),
    umber = Color(0xFF5A3A25),
    focusRing = Color(0xFF7A5C1E),
    focusRingHalo = Color(0xFF7A5C1E).copy(alpha = 0.4f),
    data = lightDataSemantics,
)
