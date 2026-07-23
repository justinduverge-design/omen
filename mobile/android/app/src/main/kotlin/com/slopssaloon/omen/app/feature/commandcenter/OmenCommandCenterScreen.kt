package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import com.slopssaloon.omen.R
import com.slopssaloon.omen.core.designsystem.component.OmenContextStrip
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.2 approved **screen assembly** (feature layer). Rebuilt for v1.1 per
 * mobile-visual-briefs §1.1 to orient and prioritize the selected roster's week — it does
 * NOT duplicate Omen's full decision workspace. The full DecisionBrief lives on the Omen
 * destination, not here.
 *
 * v1.1 hierarchy:
 *   1. Header (page title + profile control)
 *   2. Persistent OmenContextStrip (approved node 25:2)
 *   3. OmenMatchupHero / Matchup Spine (approved node 25:26)
 *   4. Waiver Watch placeholder — blocked follow-up M4-CC-WaiverWatch
 *   5. Ledger preview placeholder — blocked follow-up M4-CC-LedgerPreview
 *   6. League Pulse placeholder — blocked follow-up M4-CC-LeaguePulse
 *
 * Callers own the [OmenCommandCenterState] and choose an honest fixture (demo mode vs
 * real signed-in user). This composition never selects a "connected" fixture on its own —
 * exposing a demo-connected provider claim to a real user would violate facts-of-record
 * #7 (mock/demo data must be visibly labeled, never presented as live).
 */
@Composable
fun OmenCommandCenterScreen(
    state: OmenCommandCenterState,
    modifier: Modifier = Modifier,
    onSwitchContext: (() -> Unit)? = null,
    onOpenMatchup: (() -> Unit)? = null,
    onOpenAccount: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(
                PaddingValues(
                    horizontal = OmenTheme.spacing.step16,
                    vertical = OmenTheme.spacing.step24,
                )
            ),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.sectionStack),
    ) {
        HeaderBlock(state.greeting, onOpenAccount)
        OmenContextStrip(state = state.context, onSwitch = onSwitchContext)
        OmenMatchupHero(state = state.matchup, onOpen = onOpenMatchup)
        WaiverWatchPlaceholder()
        LedgerPlaceholder()
        LeaguePulsePlaceholder()
    }
}

@Composable
private fun HeaderBlock(greeting: String, onOpenAccount: (() -> Unit)?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            Text(
                text = "Command Center",
                style = OmenTheme.typography.eyebrow.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
            Text(
                text = greeting,
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }
        if (onOpenAccount != null) {
            OmenIconButton(
                contentDescription = "Account and profile",
                onClick = onOpenAccount,
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_nav_account),
                    contentDescription = null,
                )
            }
        }
    }
}

@Composable
private fun WaiverWatchPlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("Waiver Watch")
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "Waiver Watch is landing next",
            message = "Blocked on the Figma-approved Waiver Watch proposal (sprint item M4-CC-WaiverWatch).",
        )
    }
}

@Composable
private fun LedgerPlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("The Ledger")
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "The Ledger is landing next",
            message = "Blocked on the Figma-approved Ledger preview proposal (sprint item M4-CC-LedgerPreview).",
        )
    }
}

@Composable
private fun LeaguePulsePlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("League Pulse")
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "League Pulse is landing next",
            message = "Blocked on the Figma-approved League Pulse proposal (sprint item M4-CC-LeaguePulse).",
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = OmenTheme.typography.label.toTextStyle(),
        color = OmenTheme.color.textSecondary,
    )
}

/**
 * Immutable view state for [OmenCommandCenterScreen]. Feature callers build one of these
 * from whatever data source is authoritative for the session (demo fixtures for
 * Try-Demo users; honest disconnected/loading state for real users until live wiring
 * lands). The screen renders honestly for every combination without inspecting the
 * source.
 */
data class OmenCommandCenterState(
    val greeting: String,
    val context: OmenContextStripState,
    val matchup: OmenMatchupHeroState,
)

/**
 * Fixture registry. Every fixture is explicitly labelled by its variable name; none of
 * these mints a "connected provider" claim for a real user. The screenshot workflow and
 * the `Try Demo` session both consume these; a real signed-in user without connected
 * context sees [realDisconnected] until live wiring exists.
 */
object OmenCommandCenterFixtures {
    val demoConnected: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Demo · this week's move is ready.",
        context = OmenContextStripState.Selected(
            platform = OmenPlatform.Sleeper,
            leagueName = "Demo Slate (mock league)",
            teamName = "Demo Titans",
        ),
        matchup = OmenMatchupHeroState.Live(
            selectedTeam = OmenMatchupTeam(name = "Demo Titans", record = "6–1", scoreText = "64.8"),
            opponent = OmenMatchupTeam(name = "Demo Rivals", record = "5–2", scoreText = "58.1"),
            projectedFinish = "119.6–114.2",
            whatToWatch = "Opponent has two demo players remaining Monday night.",
        ),
    )

    /**
     * Honest disconnected state — what a real signed-in user without a connected league
     * sees. No fabricated provider status, no fake matchup, no "manage league" no-op CTA.
     */
    val realDisconnected: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Connect a league to see your matchup.",
        context = OmenContextStripState.Empty,
        matchup = OmenMatchupHeroState.NoMatchup(
            reason = "No matchup yet — connect Sleeper, Yahoo, or ESPN to see your team's week.",
        ),
    )

    /**
     * Honest loading state — while the app is restoring session or the dashboard-summary
     * call is in flight.
     */
    val realLoading: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Restoring your session…",
        context = OmenContextStripState.Empty,
        matchup = OmenMatchupHeroState.NoMatchup(reason = "Loading…"),
    )
}
