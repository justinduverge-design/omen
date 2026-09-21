package com.slopssaloon.omen.app.feature.chrome

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OmenBetaReportTest {
    private fun report(message: String = "The matchup card is stale") = OmenBetaReport(
        screen = OmenBetaReportScreen.CommandCenter,
        appVersion = "1.2.0",
        build = "42",
        osVersion = "Android 16",
        deviceModel = "Pixel",
        connectionState = "espn:connected",
        recentErrorCodes = listOf("league_read_failed"),
        message = message,
        disclosureAccepted = true,
    )

    @Test fun `payload has exactly the nine disclosed keys`() {
        assertEquals(
            setOf("screen", "app_version", "build", "os_version", "device_model", "connection_state", "recent_error_codes", "message", "disclosure_accepted"),
            report().jsonBody().keys().asSequence().toSet(),
        )
    }

    @Test fun `payload cannot carry forbidden league data`() {
        val text = report().jsonBody().toString()
        listOf("league_id", "league_name", "roster", "screenshot", "credential", "cookie", "token")
            .forEach { forbidden -> assertFalse(forbidden, text.contains("\"$forbidden\"")) }
    }

    @Test fun `sendability requires a note and scrubbed codes`() {
        assertTrue(report().isSendable)
        assertFalse(report("").isSendable)
        assertFalse(report().copy(recentErrorCodes = listOf("raw provider message!" )).isSendable)
    }

    @Test fun `device report starts without disclosure acceptance`() {
        assertFalse(OmenBetaReport.device(OmenBetaReportScreen.CommandCenter, "A note").disclosureAccepted)
    }
}
