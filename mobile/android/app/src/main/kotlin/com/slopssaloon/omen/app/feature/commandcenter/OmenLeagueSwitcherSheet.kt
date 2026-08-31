package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.slopssaloon.omen.app.feature.api.LeagueDirectory
import com.slopssaloon.omen.app.feature.api.LeagueSwitcherViewModel
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenModalSheet
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Visual briefs §10.2 — the native selection sheet the context strip opens.
 * iOS mirror: `App/CommandCenter/OmenLeagueSwitcherSheet.swift`.
 *
 * `OmenContextStrip` renders its switch affordance only when `onSwitch` is non-null, and
 * the real app never passed one — so the control did not render and a user with a
 * connected league had no way to choose it. The strip was always correct; the wiring and
 * this sheet were both missing.
 *
 * Contract points this composition honours, each load-bearing:
 *   - group by platform, platform order stable across visits (the server already sorts);
 *   - team and league both shown on every row;
 *   - the selected row carries a visible glyph, never colour alone;
 *   - long names truncate but stay complete for accessibility;
 *   - Connect another league / Manage connected leagues stay secondary, at the bottom.
 */
@Composable
fun OmenLeagueSwitcherSheet(
    visible: Boolean,
    viewModel: LeagueSwitcherViewModel,
    onSelectLeague: (platform: String, leagueId: String, teamId: String?) -> Unit,
    onConnectAnother: () -> Unit,
    onManageConnections: () -> Unit,
    onDismiss: () -> Unit,
) {
    OmenModalSheet(visible = visible, onDismissRequest = onDismiss, title = "Switch Team & League") {
        Column(
            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.headerToBody),
        ) {
            when (val state = viewModel.viewState) {
                is LeagueSwitcherViewModel.ViewState.Loading -> OmenStateSurface(
                    kind = OmenStateSurfaceKind.Loading,
                    title = "Reading your leagues",
                    message = "Omen is asking each connected platform which leagues you are in.",
                )

                LeagueSwitcherViewModel.ViewState.Demo -> OmenStateSurface(
                    kind = OmenStateSurfaceKind.Mock,
                    title = "Demo league",
                    message = "Demo mode runs one mock league, so there is nothing to switch " +
                        "to. Sign in and connect a platform to pick your own team.",
                )

                is LeagueSwitcherViewModel.ViewState.Failed -> {
                    // §10.3: never a dead selector, and never a fixture standing in for real
                    // data — showing demo leagues to a real user is the mock/live mixing
                    // facts-of-record #7 rules out.
                    OmenStateSurface(
                        kind = OmenStateSurfaceKind.Error,
                        title = "Omen could not read your leagues",
                        message = switcherErrorMessage(state.error),
                    )
                }

                is LeagueSwitcherViewModel.ViewState.Loaded -> {
                    viewModel.selectionError?.let { error ->
                        // The selected row does not move on a failed switch — §10.3 forbids
                        // a stale context looking current.
                        OmenStateSurface(
                            kind = OmenStateSurfaceKind.Error,
                            title = "That switch did not take",
                            message = switcherErrorMessage(error),
                        )
                    }

                    // F-DEV-02. The founder, on a real device: "I hit switch... and then I
                    // hit ESPN, and it still stays on my sleeper." The switch was not
                    // ignored — the server bound the league inside ESPN exactly as asked.
                    // What it cannot yet do is record WHICH PROVIDER he chose:
                    // `platform_connections` has no such column until
                    // `sql/2026-08-26_league_selection_review.sql` is applied, so every
                    // surface falls back to its tie-break, which puts Sleeper first.
                    //
                    // The server says so in `selection_persistence`, and both sheets decoded
                    // that field and then ignored it. Saying nothing was the defect; the
                    // switch itself works.
                    if (state.directory.crossProviderChoiceCannotPersist) {
                        OmenStateSurface(
                            kind = OmenStateSurfaceKind.Stale,
                            title = "Omen will keep using ${activeProviderName(state.directory)}",
                            message = "You can pick any league here and Omen will use it " +
                                "within that platform. Choosing a league on a different " +
                                "platform won't stick yet — Omen can't remember which " +
                                "platform you picked.",
                        )
                    }

                    if (state.directory.platforms.all { it.leagues.isEmpty() }) {
                        // §10.3: the empty state explains the value of connecting and offers
                        // a route. It never becomes a dead dashboard.
                        OmenStateSurface(
                            kind = OmenStateSurfaceKind.Empty,
                            title = "No leagues connected yet",
                            message = "Connect a league and Omen can read your real roster, then tell you the one move that matters this week.",
                        )
                    } else {
                        state.directory.platforms.forEach { group ->
                            PlatformSection(group, viewModel.selectingLeagueId, onSelectLeague)
                        }
                    }
                }
            }

            OmenButton(
                text = "Connect another league",
                onClick = onConnectAnother,
                variant = OmenButtonVariant.Link,
                size = OmenButtonSize.Sm,
            )
            OmenButton(
                text = "Manage connected leagues",
                onClick = onManageConnections,
                variant = OmenButtonVariant.Link,
                size = OmenButtonSize.Sm,
            )
        }
    }
}

@Composable
private fun PlatformSection(
    group: LeagueDirectory.PlatformGroup,
    selectingLeagueId: String?,
    onSelectLeague: (platform: String, leagueId: String, teamId: String?) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        Text(
            text = platformDisplayName(group.platform).uppercase(),
            style = OmenTheme.typography.label.toTextStyle(),
            color = OmenTheme.color.textSecondary,
            modifier = Modifier.semantics { heading() },
        )

        if (group.leagues.isEmpty()) {
            // A provider with nothing to show says why, in the server's own words where it
            // supplied them.
            Text(
                text = group.notice ?: emptyGroupMessage(group),
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        } else {
            group.leagues.forEach { league ->
                OmenListRow(
                    title = league.teamName ?: "Your team",
                    subtitle = leagueSubtitle(group, league),
                    enabled = selectingLeagueId == null,
                    onClick = { onSelectLeague(group.platform, league.leagueId, league.teamId) },
                    trailingContent = if (league.isActive) {
                        {
                            // A glyph, not a colour. §10.2 forbids a colour-only cue.
                            Text(
                                text = "✓",
                                style = OmenTheme.typography.body.toTextStyle(),
                                color = OmenTheme.color.accent,
                            )
                        }
                    } else {
                        null
                    },
                    // The full names live here even when the visible labels truncate.
                    modifier = Modifier.semantics {
                        contentDescription = switcherRowAccessibilityLabel(group, league)
                    },
                )
            }
            group.notice?.let { notice ->
                Text(
                    text = notice,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }
    }
}

/** The provider Omen actually resolves to, in the user's words rather than a key. */
private fun activeProviderName(directory: LeagueDirectory): String {
    val platform = directory.active?.platform ?: return "your current platform"
    return platformDisplayName(platform)
}

fun platformDisplayName(platform: String): String = when (platform) {
    "sleeper" -> "Sleeper"
    "espn" -> "ESPN"
    "yahoo" -> "Yahoo"
    else -> platform.replaceFirstChar { it.uppercase() }
}

/** ESPN returns no league name because it exposes no league list to Omen. */
fun leagueSubtitle(group: LeagueDirectory.PlatformGroup, league: LeagueDirectory.League): String {
    val name = league.leagueName ?: "League ${league.leagueId}"
    return "$name · ${platformDisplayName(group.platform)}"
}

fun emptyGroupMessage(group: LeagueDirectory.PlatformGroup): String = when (group.connectionState) {
    "reconnect_required" ->
        "${platformDisplayName(group.platform)} needs to be reconnected before Omen can list its leagues."
    "not_connected" -> "${platformDisplayName(group.platform)} is not connected."
    else -> "No ${platformDisplayName(group.platform)} leagues are available right now."
}

/**
 * Full team, league and platform in one label, per §10.2's accessibility requirement,
 * regardless of what the visible rows truncated.
 */
fun switcherRowAccessibilityLabel(
    group: LeagueDirectory.PlatformGroup,
    league: LeagueDirectory.League,
): String {
    val team = league.teamName ?: "Your team"
    val name = league.leagueName ?: "league ${league.leagueId}"
    val selected = if (league.isActive) ", selected" else ""
    return "$team, $name, ${platformDisplayName(group.platform)}$selected"
}

/**
 * Never surfaces a provider message or a bare status code — the user gets an action, and no
 * credential or raw provider error can ride along (§10.3).
 */
fun switcherErrorMessage(error: OmenApiError): String = when (error) {
    is OmenApiError.Unauthorized -> "Your session expired. Sign in again to see your leagues."
    else -> "Omen could not reach your leagues just now. Try again in a moment."
}
