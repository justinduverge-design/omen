package com.slopssaloon.omen.app.screenshot

import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import androidx.compose.ui.text.style.TextOverflow
import com.slopssaloon.omen.R
import com.slopssaloon.omen.app.feature.api.ForcedUpdateScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterFixtures
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterState
import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverWatchState
import com.slopssaloon.omen.app.feature.help.ContextualHelpContent
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.app.feature.help.OmenHelpSupportScreen
import com.slopssaloon.omen.app.feature.help.OmenHelpSupportState
import com.slopssaloon.omen.core.designsystem.component.OmenContextualHelpSheet
import com.slopssaloon.omen.app.feature.api.LeagueOverview
import com.slopssaloon.omen.app.feature.api.LeagueViewModel
import com.slopssaloon.omen.app.feature.api.TradeCompare
import com.slopssaloon.omen.app.feature.api.TradeOffer
import com.slopssaloon.omen.app.feature.api.TradeViewModel
import com.slopssaloon.omen.app.feature.commandcenter.OmenLeagueScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeScreen
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
        "help-support.available" to ScreenshotScenario(
            label = "Help + Support — available",
            render = { HelpSupportInShell(OmenHelpSupportState.Available) },
        ),
        "help-support.no-account" to ScreenshotScenario(
            label = "Help + Support — no account",
            render = { HelpSupportInShell(OmenHelpSupportState.NoAccount) },
        ),
        "help-support.offline" to ScreenshotScenario(
            label = "Help + Support — offline",
            render = { HelpSupportInShell(OmenHelpSupportState.Offline) },
        ),
        "help-support.submission-unavailable" to ScreenshotScenario(
            label = "Help + Support — feedback unavailable",
            render = { HelpSupportInShell(OmenHelpSupportState.SubmissionUnavailable) },
        ),
        "help-support.provider-recovery" to ScreenshotScenario(
            label = "Help + Support — provider recovery",
            render = { HelpSupportInShell(OmenHelpSupportState.ProviderRecovery) },
        ),
        // M4-CC-WaiverWatch. One scenario per registered honest state, mirroring the iOS twin
        // key-for-key. The composition is NOT re-implemented here — every entry mounts the
        // real OmenCommandCenterScreen and varies only `waiverWatch`, matching what
        // `OmenCommandCenterScreenTest.everyRequiredHonestWaiverWatchStateRendersItsApprovedMessage`
        // asserts.
        //
        // Base fixture is chosen for coherence: `not-connected` uses the disconnected fixture,
        // because "your waiver moves need a league" beside a selected demo league is a state
        // the product never produces. The other five imply a usable league.
        "waiver-watch.pending" to ScreenshotScenario(
            label = "Waiver Watch — claim pending",
            render = { WaiverWatchInShell(OmenWaiverWatchState.Pending) },
        ),
        "waiver-watch.processed" to ScreenshotScenario(
            label = "Waiver Watch — waivers processed",
            render = { WaiverWatchInShell(OmenWaiverWatchState.Processed) },
        ),
        "waiver-watch.availability-unknown" to ScreenshotScenario(
            label = "Waiver Watch — availability needs confirmation",
            render = { WaiverWatchInShell(OmenWaiverWatchState.AvailabilityUnknown) },
        ),
        "waiver-watch.no-credible-move" to ScreenshotScenario(
            label = "Waiver Watch — no credible move",
            render = { WaiverWatchInShell(OmenWaiverWatchState.NoCredibleMove) },
        ),
        "waiver-watch.not-connected" to ScreenshotScenario(
            label = "Waiver Watch — no connected league",
            render = {
                WaiverWatchInShell(
                    OmenWaiverWatchState.NotConnected,
                    base = OmenCommandCenterFixtures.realDisconnected,
                )
            },
        ),
        "waiver-watch.off-season" to ScreenshotScenario(
            label = "Waiver Watch — off-season",
            render = { WaiverWatchInShell(OmenWaiverWatchState.OffSeason) },
        ),
        // M6-ContextualHelp. The sheet body is rendered directly rather than through a tap:
        // screenshot mode has no interaction, and the content is what needs proving.
        "contextual-help.command-center" to ScreenshotScenario(
            label = "Contextual help — Command Center",
            render = { ContextualHelpBody(OmenHelpDestination.CommandCenter) },
        ),
        "contextual-help.omen" to ScreenshotScenario(
            label = "Contextual help — Omen of the Week",
            render = { ContextualHelpBody(OmenHelpDestination.Omen) },
        ),
        "contextual-help.connect" to ScreenshotScenario(
            label = "Contextual help — Connect a league (native provider truth)",
            render = { ContextualHelpBody(OmenHelpDestination.Connect) },
        ),
        "contextual-help.account" to ScreenshotScenario(
            label = "Contextual help — Account",
            render = { ContextualHelpBody(OmenHelpDestination.Account) },
        ),
        // O7 forced-update gate. Rendered directly rather than through the real gate:
        // screenshot mode has no network, and the blocking composition is what needs
        // proving. The version is a fixture, not a real minimum.
        "forced-update.blocked" to ScreenshotScenario(
            label = "Forced update — build below minimum",
            render = { ForcedUpdateBody() },
        ),
    )

    fun isKnown(key: String?): Boolean = key != null && entries.containsKey(key)
    fun get(key: String): ScreenshotScenario = entries.getValue(key)
}

/**
 * The real [OmenContextualHelpSheet] held open, so the captured evidence is the shipped
 * component rather than a screenshot-only restatement of its layout.
 */
/**
 * O7 gate screen on the brand background, matching how `OmenAndroidApp` hosts it inside a
 * `Surface(color = OmenTheme.color.bg)`.
 */
@Composable
private fun ForcedUpdateBody() {
    Surface(modifier = Modifier.fillMaxSize(), color = OmenTheme.color.bg) {
        ForcedUpdateScreen(minimumVersion = "1.2.0", onUpdate = {})
    }
}

@Composable
private fun ContextualHelpBody(destination: OmenHelpDestination) {
    Box(Modifier.fillMaxSize()) {
        OmenContextualHelpSheet(
            topic = ContextualHelpContent.topic(destination),
            visible = true,
            onDismissRequest = {},
        )
    }
}

@Composable
private fun WaiverWatchInShell(
    state: OmenWaiverWatchState,
    base: OmenCommandCenterState = OmenCommandCenterFixtures.demoConnected,
) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Command) {} },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            OmenCommandCenterScreen(state = base.copy(waiverWatch = state))
        }
    }
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

@Composable
private fun HelpSupportInShell(state: OmenHelpSupportState) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Command) {} },
    ) { innerPadding ->
        OmenHelpSupportScreen(
            state = state,
            contextDescription = if (state == OmenHelpSupportState.Available) {
                "Need help with your current Omen flow? Start with a topic below."
            } else null,
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
                    onOpenAccount = {},
                    onOpenOmen = { selected = FauxNavTab.Omen },
                    onOpenLedger = { selected = FauxNavTab.Omen },
                    onOpenLeague = { selected = FauxNavTab.League },
                )
                // The REAL screens, driven by explicit state — the same rule the Command tab
                // above already followed. These two rendered a bare "screenshot fixture only"
                // stub for a day after `M5` slices F and G shipped (`F-VET-B01`), so every
                // capture and every UI test reaching them assessed a screen that never ships.
                FauxNavTab.Trade -> OmenTradeScreen(
                    state = TradeViewModel.ViewState.Loaded(screenshotTradeVerdict()),
                    offer = TradeOffer(send = listOf("A.J. Brown"), receive = listOf("Garrett Wilson")),
                )
                FauxNavTab.League -> OmenLeagueScreen(
                    state = LeagueViewModel.ViewState.Loaded(screenshotLeagueOverview()),
                )
                FauxNavTab.Omen -> OmenDecisionScreen(state = OmenDecisionFixtures.demo)
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
    League("League", R.drawable.ic_nav_league, "League"),
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
                // Mirrors the production nav's font-scale constraint exactly. If this drifts,
                // screenshot evidence stops representing what ships — which is the whole point
                // of this file.
                label = {
                    Text(
                        text = tab.label,
                        style = OmenTheme.typography.label.toTextStyle(),
                        maxLines = 1,
                        softWrap = false,
                        overflow = TextOverflow.Ellipsis,
                    )
                },
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

/**
 * Decoded from contract JSON rather than built by constructor, so a scenario also proves the
 * screen renders from a payload the server could actually send. Swift twin:
 * `ScreenshotScenarios.leagueOverviewJSON`.
 */
private fun screenshotLeagueOverview(): LeagueOverview = requireNotNull(
    LeagueOverview.parse(
        """
        {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
         "league_name":"Demo Slate (mock league)","season":2026,"week":8,
         "matchup":{"status":"live",
           "you":{"team_id":"7","team_name":"Demo Titans","record":"6-1","points":64.8,"projected":null},
           "opponent":{"team_id":"3","team_name":"Demo Rivals","record":"5-2","points":58.1,"projected":null},
           "unavailable_reason":null},
         "standings":{"status":"available",
           "playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},
           "teams":[
             {"team_name":"Demo Rivals","is_current_user":false,"rank":1,"wins":7,"losses":1},
             {"team_name":"Demo Hawks","is_current_user":false,"rank":2,"wins":6,"losses":2},
             {"team_name":"Demo Titans","is_current_user":true,"rank":3,"wins":6,"losses":1},
             {"team_name":"Demo Bandits","is_current_user":false,"rank":4,"wins":4,"losses":4}]},
         "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
        """.trimIndent(),
    ),
) { "screenshot league fixture failed to parse" }

private fun screenshotTradeVerdict(): TradeCompare = requireNotNull(
    TradeCompare.parse(
        """
        {"contract_version":"trade-compare.v2","verdict_state":"favors_you",
         "evaluability":{"status":"evaluable","reason":null,"missing_projection_count":0,"total_player_count":2},
         "analysis_context":{"mode":"personalized","platform":"sleeper","league_id":"1",
           "league_name":"Demo Slate (mock league)","applied":["scoring_format","roster_construction"],
           "unavailable_reason":null},
         "net_value":4.2,"explanation":null}
        """.trimIndent(),
    ),
) { "screenshot trade fixture failed to parse" }
