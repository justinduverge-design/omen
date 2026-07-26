package com.slopssaloon.omen.app.screenshot

import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import com.slopssaloon.omen.R
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterFixtures
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterScreen
import com.slopssaloon.omen.app.feature.omen.OmenDecisionFixtures
import com.slopssaloon.omen.app.feature.omen.OmenDecisionScreen
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Reusable screenshot-mode registry for the native-visual-evidence CI workflow. The
 * MainActivity reads the intent extra `OMEN_SCREENSHOT_SCENARIO` on launch — if the value
 * matches an entry here, the app mounts *only* that scenario against fully deterministic
 * in-app fixtures (no session/auth, no network, no fabricated provider state) and the
 * workflow captures a screenshot.
 *
 * Adding a scenario for a future M4 screen means adding one entry to [entries] and one
 * matrix row to `.github/workflows/native-visual-evidence.yml`. No workflow rewrite,
 * no shell change, no app-side plumbing beyond this file and its iOS twin.
 *
 * Naming rule: `<screen-slug>.<state-slug>` — kebab-case, dot-separated, lowercase. The
 * platform-agnostic scenario slug is the primary key across iOS and Android so artifact
 * pairs share the same suffix.
 */
object ScreenshotScenarios {

    const val INTENT_EXTRA: String = "OMEN_SCREENSHOT_SCENARIO"

    /** Every declared scenario. Add rows here to extend the workflow matrix. */
    val entries: Map<String, ScreenshotScenario> = linkedMapOf(
        "command-center.demo-connected" to ScreenshotScenario(
            label = "Command Center — demo/mock connected",
            render = { CommandCenterInShell(demo = true) },
        ),
        "command-center.disconnected" to ScreenshotScenario(
            label = "Command Center — real user, disconnected",
            render = { CommandCenterInShell(demo = false) },
        ),
        "omen.demo" to ScreenshotScenario(
            label = "Omen — demo/mock decision",
            render = { OmenInShell(demo = true) },
        ),
        "omen.disconnected" to ScreenshotScenario(
            label = "Omen — real user, disconnected",
            render = { OmenInShell(demo = false) },
        ),
    )

    fun isKnown(key: String?): Boolean = key != null && entries.containsKey(key)
    fun get(key: String): ScreenshotScenario = entries.getValue(key)
}

@Composable
private fun OmenInShell(demo: Boolean) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Omen) {} },
    ) { innerPadding ->
        OmenDecisionScreen(
            state = if (demo) OmenDecisionFixtures.demo else OmenDecisionFixtures.realDisconnected,
            modifier = Modifier.padding(innerPadding),
        )
    }
}

data class ScreenshotScenario(
    val label: String,
    val render: @Composable () -> Unit,
)

/**
 * Deterministic shell mirroring the signed-in Scaffold in [com.slopssaloon.omen.app.OmenAndroidApp]
 * so screenshots include the permanent 4-tab bottom navigation. No session or network
 * access. The nav labels/icons are read from the same drawable set as the production shell.
 */
@Composable
fun ScreenshotScenarioHost(scenarioKey: String) {
    OmenTheme {
        val scenario = ScreenshotScenarios.get(scenarioKey)
        scenario.render()
    }
}

@Composable
private fun CommandCenterInShell(demo: Boolean) {
    var selected by remember { mutableStateOf(FauxNavTab.Command) }
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(selected) { selected = it } },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            when (selected) {
                FauxNavTab.Command -> OmenCommandCenterScreen(
                    state = if (demo) OmenCommandCenterFixtures.demoConnected
                    else OmenCommandCenterFixtures.realDisconnected,
                )
                else -> Text(
                    text = "${selected.label} — screenshot fixture only",
                    modifier = Modifier.padding(OmenTheme.spacing.cardInterior),
                    color = OmenTheme.color.textSecondary,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                )
            }
        }
    }
}

/**
 * Screenshot-mode copy of the production nav. Kept private + separate so the production
 * `NavDestination` enum remains the single source of truth for the running app, and this
 * file only mirrors the shape needed to make the bottom bar visible in captures.
 */
private enum class FauxNavTab(val label: String, val iconRes: Int, val contentDescription: String) {
    Command("Command", R.drawable.ic_nav_command, "Command Center"),
    Omen("Omen", R.drawable.ic_nav_omen, "Omen of the Week"),
    Trade("Trade", R.drawable.ic_nav_trade, "Trade Analyzer"),
    League("League", R.drawable.ic_nav_account, "League"),
}

@Composable
private fun FauxBottomNav(selected: FauxNavTab, onSelect: (FauxNavTab) -> Unit) {
    NavigationBar(
        containerColor = OmenTheme.color.surface1,
        contentColor = OmenTheme.color.textPrimary,
    ) {
        for (tab in FauxNavTab.entries) {
            NavigationBarItem(
                selected = tab == selected,
                onClick = { onSelect(tab) },
                icon = { Icon(painter = painterResource(id = tab.iconRes), contentDescription = tab.contentDescription) },
                label = { Text(text = tab.label, style = OmenTheme.typography.label.toTextStyle()) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = OmenTheme.color.accent,
                    selectedTextColor = OmenTheme.color.accent,
                    indicatorColor = OmenTheme.color.accentMuted,
                    unselectedIconColor = OmenTheme.color.textSecondary,
                    unselectedTextColor = OmenTheme.color.textSecondary,
                ),
            )
        }
    }
}
