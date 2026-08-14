package com.slopssaloon.omen.core.designsystem.component

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Platforms compact strip — visual brief §1.1 position 3 (amended 2026-08-14), Figma `73:2`,
 * state contract in `omen-native-backend-state-contract-v1.md`.
 * Mirrors iOS `OmenPlatformCompactStripTests`.
 */
class OmenPlatformCompactRowTest {

    @Test
    fun lastSyncRendersOnlyWhenConnected() {
        val connected = OmenPlatformRowState(
            OmenPlatform.Sleeper, OmenConnectionStatus.Connected, "4m ago",
        )
        assertEquals("4m ago", connected.resolvedLastSyncText)

        // A last-sync time beside a non-connected status reads as "working, recently".
        listOf(
            OmenConnectionStatus.Disconnected,
            OmenConnectionStatus.NeedsReauth,
            OmenConnectionStatus.Error,
            OmenConnectionStatus.Pending,
            OmenConnectionStatus.Recovering,
        ).forEach { status ->
            val row = OmenPlatformRowState(OmenPlatform.Yahoo, status, "4m ago")
            assertNull("$status must suppress last sync", row.resolvedLastSyncText)
        }
    }

    @Test
    fun accessibilityLabelCombinesPlatformStatusAndSyncIntoOneElement() {
        val row = OmenPlatformRowState(
            OmenPlatform.Sleeper, OmenConnectionStatus.Connected, "4m ago",
        )
        assertEquals("Sleeper, Connected, last sync 4m ago", row.accessibilityLabel)

        val reauth = OmenPlatformRowState(
            OmenPlatform.Yahoo, OmenConnectionStatus.NeedsReauth, "2h ago",
        )
        assertEquals("Yahoo, Reauth needed", reauth.accessibilityLabel)
    }

    @Test
    fun statusTextComesFromTheSharedEnumNotASecondVocabulary() {
        assertEquals("Reauth needed", connectionStatusLabel(OmenConnectionStatus.NeedsReauth))
        assertEquals("Connected", connectionStatusLabel(OmenConnectionStatus.Connected))
    }
}
