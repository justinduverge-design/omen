package com.slopssaloon.omen.core.designsystem.gallery

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonTone
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenBadge
import com.slopssaloon.omen.core.designsystem.component.OmenBadgeTone
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardTone
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenChip
import com.slopssaloon.omen.core.designsystem.component.OmenChipTone
import com.slopssaloon.omen.core.designsystem.component.OmenConfidenceBar
import com.slopssaloon.omen.core.designsystem.component.OmenConnectionStatus
import com.slopssaloon.omen.core.designsystem.component.OmenConnectionStatusBadge
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBrief
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefAlternative
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefPayload
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformConnectionCard
import com.slopssaloon.omen.core.designsystem.component.OmenPlayerChip
import com.slopssaloon.omen.core.designsystem.component.OmenPlayerRow
import com.slopssaloon.omen.core.designsystem.component.OmenPosition
import com.slopssaloon.omen.core.designsystem.component.OmenConfirmationDialog
import com.slopssaloon.omen.core.designsystem.component.OmenConfirmationVariant
import com.slopssaloon.omen.core.designsystem.component.OmenMetricDelta
import com.slopssaloon.omen.core.designsystem.component.OmenMetricItem
import com.slopssaloon.omen.core.designsystem.component.OmenMetricStrip
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.component.OmenRiskPanel
import com.slopssaloon.omen.core.designsystem.component.OmenSignalItem
import com.slopssaloon.omen.core.designsystem.component.OmenSignalList
import com.slopssaloon.omen.core.designsystem.component.OmenSignalSource
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenIconButtonTone
import com.slopssaloon.omen.core.designsystem.component.OmenFormField
import com.slopssaloon.omen.core.designsystem.component.OmenPicker
import com.slopssaloon.omen.core.designsystem.component.OmenTextField
import com.slopssaloon.omen.core.designsystem.component.OmenTextFieldVariant
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformBadge
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Debug-only (see `src/debug/AndroidManifest.xml`) evidence surface for M1-P P2 Button/
 * IconButton. Not a product screen — exists solely so this session can screenshot every
 * required state (default, disabled, loading; variant × tone matrix) on a real device, per
 * registry §3.1's required-states list. Never compiled into a release build.
 */
class DesignSystemGalleryActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            OmenTheme {
                GalleryScreen()
            }
        }
    }
}

private data class Section(val title: String, val content: @Composable () -> Unit)

@Composable
private fun GalleryScreen() {
    val sections = listOf(
        Section("Focus ring (auto-focused on launch — no touch involved)") {
            val focusRequester = remember { FocusRequester() }
            LaunchedEffect(Unit) { focusRequester.requestFocus() }
            OmenButton("Focused", {}, modifier = Modifier.focusRequester(focusRequester))
        },
        Section("IconButton — tone × state") {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OmenIconButton("Close", {}, tone = OmenIconButtonTone.Neutral) { PlaceholderGlyph() }
                OmenIconButton("Favorite", {}, tone = OmenIconButtonTone.Accent) { PlaceholderGlyph() }
                OmenIconButton("Delete", {}, tone = OmenIconButtonTone.Danger) { PlaceholderGlyph() }
                OmenIconButton("Disabled", {}, enabled = false) { PlaceholderGlyph() }
                OmenIconButton("Loading", {}, loading = true) { PlaceholderGlyph() }
            }
        },
        Section("Button — disabled") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenButton("Primary disabled", {}, enabled = false)
                OmenButton("Secondary disabled", {}, variant = OmenButtonVariant.Secondary, enabled = false)
                OmenButton("Danger disabled", {}, variant = OmenButtonVariant.Danger, enabled = false)
            }
        },
        Section("Button — loading") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenButton("Save", {}, loading = true)
                OmenButton("Delete", {}, variant = OmenButtonVariant.Danger, loading = true)
            }
        },
        Section("Button — variant × tone (default)") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenButton("Primary / Accent", {}, variant = OmenButtonVariant.Primary, tone = OmenButtonTone.Accent)
                OmenButton("Primary / Omen", {}, variant = OmenButtonVariant.Primary, tone = OmenButtonTone.Omen)
                OmenButton("Secondary / Accent", {}, variant = OmenButtonVariant.Secondary, tone = OmenButtonTone.Accent)
                OmenButton("Secondary / Omen", {}, variant = OmenButtonVariant.Secondary, tone = OmenButtonTone.Omen)
                OmenButton("Tertiary / Accent", {}, variant = OmenButtonVariant.Tertiary, tone = OmenButtonTone.Accent)
                OmenButton("Danger", {}, variant = OmenButtonVariant.Danger)
                OmenButton("Link", {}, variant = OmenButtonVariant.Link)
            }
        },
        Section("Button — sizes") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenButton("Sm", {}, size = OmenButtonSize.Sm)
                OmenButton("Md", {}, size = OmenButtonSize.Md)
                OmenButton("Lg", {}, size = OmenButtonSize.Lg)
            }
        },
        Section("Card / Surface — solid, outlined, empty, error, preview") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenCard { Text("Solid / neutral", style = OmenTheme.typography.h2.toTextStyle()) }
                OmenCard(variant = OmenCardVariant.Outlined, tone = OmenCardTone.Omen) {
                    Text("Outlined / Omen", style = OmenTheme.typography.h2.toTextStyle())
                }
                OmenCard(variant = OmenCardVariant.Empty) {
                    Text("Empty surface", style = OmenTheme.typography.body.toTextStyle())
                }
                OmenCard(variant = OmenCardVariant.Error) {
                    Text("Unable to refresh this matchup", style = OmenTheme.typography.body.toTextStyle())
                }
                OmenCard(variant = OmenCardVariant.Preview, tone = OmenCardTone.Risk) {
                    Text("Preview / risk", style = OmenTheme.typography.body.toTextStyle())
                }
            }
        },
        Section("Badge + Chip — semantic labels and selected state") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OmenBadge("Live", OmenBadgeTone.Live)
                    OmenBadge("Mock", OmenBadgeTone.Mock)
                    OmenBadge("Risk", OmenBadgeTone.Risk)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OmenChip("RB", OmenChipTone.Rb)
                    OmenChip("Sleeper", OmenChipTone.Sleeper, selected = true, onClick = {})
                    OmenChip("Demo", OmenChipTone.Demo, enabled = false, onClick = {})
                }
            }
        },
        Section("Form controls — default, error, success, disabled") {
            var email by remember { mutableStateOf("") }
            var format by remember { mutableStateOf("Standard") }
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OmenFormField(label = "Email", hint = "We use this only to send your sign-in code.") {
                    OmenTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = "Email",
                        placeholder = "you@example.com",
                        variant = OmenTextFieldVariant.Email,
                    )
                }
                OmenFormField(label = "Invite code", errorMessage = "That code is not valid yet.") {
                    OmenTextField(
                        value = "OMEN-2026",
                        onValueChange = {},
                        label = "Invite code",
                        isError = true,
                    )
                }
                OmenFormField(label = "League name", successMessage = "League name is available.") {
                    OmenTextField(
                        value = "Sunday Slate",
                        onValueChange = {},
                        label = "League name",
                    )
                }
                OmenFormField(label = "Scoring format", hint = "You can change this later.") {
                    OmenPicker(
                        label = "Scoring format",
                        selectedOption = format,
                        options = listOf("Standard", "Half PPR", "PPR"),
                        onOptionSelected = { format = it },
                    )
                }
                OmenFormField(label = "Locked field") {
                    OmenTextField(
                        value = "Already connected",
                        onValueChange = {},
                        label = "Connection status",
                        enabled = false,
                    )
                }
            }
        },
        Section("State surfaces — honest empty/loading/error/connection/data states") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenStateSurface(OmenStateSurfaceKind.Empty, "No lineup selected", "Choose a league to see your matchup.")
                OmenStateSurface(OmenStateSurfaceKind.Loading, "Analyzing your matchup…", "Checking the latest roster and schedule signals.")
                OmenStateSurface(OmenStateSurfaceKind.Error, "Unable to refresh this matchup", "Try again when your connection is available.")
                OmenStateSurface(OmenStateSurfaceKind.Disconnected, "League disconnected", "Reconnect Sleeper to restore live context.")
                OmenStateSurface(OmenStateSurfaceKind.Stale, "Showing your last sync", "This league data may be out of date.")
                OmenStateSurface(OmenStateSurfaceKind.Mock, "Demo analysis", "These values are sample data, not live advice.")
            }
        },
        Section("ListRow — display and interactive") {
            Column {
                OmenListRow(title = "Weekly Omen", subtitle = "Your matchup recommendation")
                OmenListRow(title = "Sunday Slate", subtitle = "Sleeper · 12 teams", onClick = {})
            }
        },
        Section("PlatformBadge — Sleeper / Yahoo / ESPN") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenPlatformBadge(OmenPlatform.Sleeper)
                OmenPlatformBadge(OmenPlatform.Yahoo)
                OmenPlatformBadge(OmenPlatform.Espn)
            }
        },
        Section("ConfidenceBar — labeled and unlabeled") {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OmenConfidenceBar(score = 72, label = "Confidence")
                OmenConfidenceBar(score = 15, label = "Confidence")
                OmenConfidenceBar(score = 100)
            }
        },
        Section("RiskPanel — low / medium / high") {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OmenRiskPanel(level = OmenRiskLevel.Low, reasons = listOf("Bench depth is strong.", "Weather stable."))
                OmenRiskPanel(level = OmenRiskLevel.Medium, reasons = listOf("Backup RB questionable.", "Weather uncertain."))
                OmenRiskPanel(level = OmenRiskLevel.High, reasons = listOf("Starter ruled out.", "Kicker on the road in wind."))
            }
        },
        Section("MetricStrip — value + delta + optional confidence") {
            OmenMetricStrip(
                items = listOf(
                    OmenMetricItem(label = "Projected", value = "142.6", delta = "+4.1", deltaDirection = OmenMetricDelta.Positive, confidence = 72),
                    OmenMetricItem(label = "Opponent", value = "128.4", delta = "−2.3", deltaDirection = OmenMetricDelta.Negative),
                    OmenMetricItem(label = "Ceiling", value = "168.2"),
                ),
            )
        },
        Section("SignalList — live / stub / mock / unavailable") {
            OmenSignalList(
                signals = listOf(
                    OmenSignalItem(label = "Yahoo roster snapshot", source = OmenSignalSource.Live, detail = "Refreshed 4 minutes ago."),
                    OmenSignalItem(label = "Opponent projections", source = OmenSignalSource.Stub, detail = "Backfilled from last week."),
                    OmenSignalItem(label = "Weather forecast", source = OmenSignalSource.Mock, detail = "Demo fixture."),
                    OmenSignalItem(label = "Vegas totals", source = OmenSignalSource.Unavailable, detail = "Provider silent this window."),
                ),
            )
        },
        Section("PlayerRow + PlayerChip") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenPlayerRow(name = "Christian McCaffrey", position = OmenPosition.RB, team = "SF", meta = "Q vs Dal, 4:25p ET")
                OmenPlayerRow(name = "Justin Jefferson", position = OmenPosition.WR, team = "MIN", meta = "vs GB, 1:00p ET", onClick = {})
                OmenPlayerRow(name = "Patrick Mahomes", position = OmenPosition.QB, team = "KC")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OmenPlayerChip(name = "Kelce", position = OmenPosition.TE)
                    OmenPlayerChip(name = "49ers D/ST", position = OmenPosition.DEF)
                }
            }
        },
        Section("ConnectionStatusBadge — all six states") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenConnectionStatusBadge(status = OmenConnectionStatus.Connected)
                OmenConnectionStatusBadge(status = OmenConnectionStatus.Disconnected)
                OmenConnectionStatusBadge(status = OmenConnectionStatus.NeedsReauth)
                OmenConnectionStatusBadge(status = OmenConnectionStatus.Error)
                OmenConnectionStatusBadge(status = OmenConnectionStatus.Pending)
                OmenConnectionStatusBadge(status = OmenConnectionStatus.Recovering)
            }
        },
        Section("PlatformConnectionCard — connected / reauth / disconnected") {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OmenPlatformConnectionCard(
                    platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Sleeper,
                    status = OmenConnectionStatus.Connected,
                    description = "Last synced 4 minutes ago.",
                    actionLabel = "Manage league",
                    onAction = {},
                )
                OmenPlatformConnectionCard(
                    platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Yahoo,
                    status = OmenConnectionStatus.NeedsReauth,
                    description = "Reconnect to restore this week's roster.",
                    actionLabel = "Reconnect Yahoo",
                    onAction = {},
                )
                OmenPlatformConnectionCard(
                    platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Espn,
                    status = OmenConnectionStatus.Disconnected,
                    description = "Connect ESPN to see your live matchup.",
                    actionLabel = "Connect ESPN",
                    onAction = {},
                )
            }
        },
        Section("Context Strip — selected / reauth / multi-team / empty") {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                com.slopssaloon.omen.core.designsystem.component.OmenContextStrip(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenContextStripState.Selected(
                        platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Sleeper,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                    ),
                    onSwitch = {},
                )
                com.slopssaloon.omen.core.designsystem.component.OmenContextStrip(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenContextStripState.NeedsRecovery(
                        platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Yahoo,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                        reason = "Session expired",
                    ),
                    onSwitch = {},
                )
                com.slopssaloon.omen.core.designsystem.component.OmenContextStrip(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenContextStripState.MultiTeamHint(
                        platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Sleeper,
                        leagueName = "Sunday Slate",
                        teamName = "Justin Titans",
                        otherTeamCount = 2,
                    ),
                    onSwitch = {},
                )
                com.slopssaloon.omen.core.designsystem.component.OmenContextStrip(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenContextStripState.Empty,
                    onSwitch = {},
                )
            }
        },
        Section("Matchup Hero — live / before / final / no matchup") {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState.Live(
                        selectedTeam = com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam("Justin Titans", "6–1", "64.8"),
                        opponent = com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam("Marcus Team", "5–2", "58.1"),
                        projectedFinish = "119.6–114.2",
                        whatToWatch = "Opponent has two players remaining Monday night.",
                    ),
                    onOpen = {},
                )
                com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState.BeforeGames(
                        selectedTeam = com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam("Justin Titans", "6–1", "119.6"),
                        opponent = com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam("Marcus Team", "5–2", "114.2"),
                        startTime = "Sun 1:00p ET",
                        whatToWatch = null,
                    ),
                )
                com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState.Final(
                        selectedTeam = com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam("Justin Titans", "6–1", "128.4"),
                        opponent = com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam("Marcus Team", "5–2", "121.7"),
                        resultSummary = "You won 128.4 to 121.7.",
                        whatToWatch = null,
                    ),
                )
                com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero(
                    state = com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState.NoMatchup(
                        reason = "No matchup this week — bye.",
                    ),
                )
            }
        },
        Section("Command Center — screen assembly (feature layer) · fixture note only") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "OmenCommandCenterScreen lives at " +
                        "mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/" +
                        "feature/commandcenter/OmenCommandCenterScreen.kt and is exercised " +
                        "in the running app (SignedIn → Command tab). It's a feature-layer " +
                        "screen assembly, not a DS component, so it is intentionally not " +
                        "rendered inside the DS gallery — showing the running app is the " +
                        "correct evidence surface for this screen.",
                    color = OmenTheme.color.textSecondary,
                )
            }
        },
        Section("DecisionBrief — success / stale / mock / empty / loading / error / disconnected / off-season") {
            val payload = OmenDecisionBriefPayload(
                verdict = "Start Christian McCaffrey",
                move = "Bench Ken Walker for the RB1 slot.",
                impact = "+4.1 projected over your bench.",
                confidence = 72,
                risk = OmenRiskLevel.Low,
                riskReasons = listOf("McCaffrey full-practice Fri.", "Weather stable in SF."),
                explanation = listOf("49ers implied 27 against a bottom-5 rush defense."),
                metrics = listOf(
                    OmenMetricItem(label = "Projected", value = "22.4", delta = "+4.1", deltaDirection = OmenMetricDelta.Positive),
                    OmenMetricItem(label = "Ceiling", value = "31.8"),
                ),
                signals = listOf(
                    OmenSignalItem(label = "Yahoo roster snapshot", source = OmenSignalSource.Live, detail = "Refreshed 4 minutes ago."),
                ),
                alternatives = listOf(
                    OmenDecisionBriefAlternative(name = "Ken Walker III", position = OmenPosition.RB, team = "SEA", meta = "Limited practice"),
                ),
            )
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OmenDecisionBrief(state = OmenDecisionBriefState.Success(payload))
                OmenDecisionBrief(state = OmenDecisionBriefState.Stale(payload, lastSynced = "12 minutes ago"))
                OmenDecisionBrief(state = OmenDecisionBriefState.Mock(payload))
                OmenDecisionBrief(state = OmenDecisionBriefState.Demo(payload))
                OmenDecisionBrief(state = OmenDecisionBriefState.Empty("Your lineup is already optimal."))
                OmenDecisionBrief(state = OmenDecisionBriefState.Loading)
                OmenDecisionBrief(state = OmenDecisionBriefState.Error("The recommendation engine timed out.", onRetry = {}))
                OmenDecisionBrief(state = OmenDecisionBriefState.Disconnected(onConnect = {}))
                OmenDecisionBrief(state = OmenDecisionBriefState.OffSeason)
            }
        },
        Section("ConfirmationDialog — default and destructive (tap to preview)") {
            var showDefault by remember { mutableStateOf(false) }
            var showDestructive by remember { mutableStateOf(false) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OmenButton("Show default", { showDefault = true })
                OmenButton("Show destructive", { showDestructive = true }, variant = OmenButtonVariant.Danger)
            }
            OmenConfirmationDialog(
                visible = showDefault,
                title = "Leave draft?",
                message = "Your picks will be lost.",
                confirmLabel = "Leave",
                cancelLabel = "Stay",
                onConfirm = { showDefault = false },
                onDismiss = { showDefault = false },
            )
            OmenConfirmationDialog(
                visible = showDestructive,
                title = "Delete lineup?",
                message = "This cannot be undone.",
                confirmLabel = "Delete",
                cancelLabel = "Cancel",
                onConfirm = { showDestructive = false },
                onDismiss = { showDestructive = false },
                variant = OmenConfirmationVariant.Destructive,
            )
        },
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        items(sections) { section ->
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(section.title, color = OmenTheme.color.textSecondary)
                section.content()
            }
        }
    }
}

@Composable
private fun PlaceholderGlyph() {
    Box(
        modifier = Modifier
            .size(16.dp)
            .background(LocalContentColor.current),
    )
}
