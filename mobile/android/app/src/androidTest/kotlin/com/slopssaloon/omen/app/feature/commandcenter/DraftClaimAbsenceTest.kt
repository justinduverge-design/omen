package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.printToString
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.assertFalse
import org.junit.runner.RunWith

/**
 * R7 — no shipped native copy may promise a draft feature.
 *
 * Draft is cut from 1.0 and the entire draft path is dark (facts-of-record #9;
 * founder decision 2026-08-16). `M6-ContextualHelp` already banned the exact
 * string "Draft Assistant" from *help* copy, and that ban held — which is why
 * the claim this test exists for survived it: the off-season Waiver Watch state
 * said Omen "will surface relevant draft and roster opportunities". With the
 * draft path dark, 1.0 surfaces no draft opportunities at all, so that was a
 * capability claim Omen could not meet. It never said "Draft Assistant", so a
 * product-name ban could not have found it.
 *
 * **Why this is behavioral where the iOS twin is a source scanner.** iOS scans
 * `OmenIOS/App/` from disk, which works because XCTest runs on the host. An
 * Android instrumentation test runs on the device, where the repo source does
 * not exist, and `:app` still has **no JVM unit-test source set** — adding one
 * is a build-configuration change outside this item's boundary, the same
 * pre-existing limitation recorded for the M5 slice A–C tests. So Android
 * asserts the *rendered* copy instead. That is a narrower net than the iOS
 * scanner: it proves the states it renders, not every literal in the module.
 * If a `:app` JVM source set ever lands, port the iOS scanner here and delete
 * this note.
 */
@RunWith(AndroidJUnit4::class)
class DraftClaimAbsenceTest {
    @get:Rule val composeRule = createComposeRule()

    @Test
    fun noWaiverWatchStateRendersCopyThatPromisesADraftFeature() {
        val states = listOf(
            OmenWaiverWatchState.Pending,
            OmenWaiverWatchState.Processed,
            OmenWaiverWatchState.AvailabilityUnknown,
            OmenWaiverWatchState.NoCredibleMove,
            OmenWaiverWatchState.NotConnected,
            OmenWaiverWatchState.OffSeason,
        )

        // `setContent` may be called only once per test, so the state is driven
        // through a mutable holder — the same pattern the neighbouring
        // `OmenCommandCenterScreenTest` uses to walk every waiver state.
        var waiverWatch by mutableStateOf<OmenWaiverWatchState>(states.first())
        composeRule.setContent {
            OmenCommandCenterScreen(
                state = OmenCommandCenterFixtures.demoConnected.copy(waiverWatch = waiverWatch),
            )
        }

        for (state in states) {
            composeRule.runOnIdle { waiverWatch = state }
            // Read the whole rendered semantics tree rather than probing for a
            // known sentence: the point is that NO copy in this state names a
            // draft, including copy this test does not know about.
            val rendered = composeRule.onRoot().printToString(maxDepth = Int.MAX_VALUE)
            assertFalse(
                "1.0 ships no draft surface, so no rendered copy may name one. State=$state",
                rendered.lowercase().contains("draft"),
            )
        }
    }
}
