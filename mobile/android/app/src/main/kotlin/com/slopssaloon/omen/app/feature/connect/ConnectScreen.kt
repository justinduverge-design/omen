package com.slopssaloon.omen.app.feature.connect

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.material3.Text
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformBadge
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import kotlinx.coroutines.launch

/**
 * M5-NativeConnect — onboarding steps 4–6. iOS mirror: `App/Connect/ConnectView.swift`.
 *
 * Assembled from approved primitives only. Spec §6 governs the copy: no bare "Loading…", every
 * non-success state carries a safe next action, and cancelling is never framed as a failure.
 */
@Composable
fun ConnectScreen(
    viewModel: ConnectViewModel,
    onConnected: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(OmenTheme.spacing.cardInterior),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16),
    ) {
        when (val state = viewModel.state) {
            is ConnectState.NotStarted -> {
                Text("Connect a league", style = OmenTheme.typography.h1.toTextStyle(), color = OmenTheme.color.textPrimary)
                // Spec §4: explain the benefit in one sentence.
                Text(
                    "Connect a league so Omen can use your roster, scoring, and matchup.",
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                // No provider is selected by default (spec §4), and availability is stated up
                // front rather than discovered by tapping into a dead end.
                ConnectProvider.entries.forEach { provider ->
                    OmenListRow(
                        title = provider.displayName,
                        // States what tapping will do *before* it is tapped. Yahoo's row says
                        // "browser" plainly: the user is about to leave the app, and being
                        // told after the fact is how a connect flow reads as a hijack.
                        subtitle = when (provider.availability) {
                            is ConnectAvailability.Available ->
                                if (provider == ConnectProvider.Yahoo) {
                                    "Sign in with Yahoo in your browser"
                                } else {
                                    "Connect with your username"
                                }
                            is ConnectAvailability.OnHold -> "On hold"
                            is ConnectAvailability.UseWeb -> "Connect on the web"
                        },
                        onClick = { scope.launch { viewModel.selectProvider(provider) } },
                        leadingContent = { OmenPlatformBadge(platform = provider.platform) },
                    )
                }

                Text("Sleeper", style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                // The contract is explicit that Omen never collects a provider password.
                Text(
                    "Enter your Sleeper username. Omen never asks for your Sleeper password.",
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                com.slopssaloon.omen.core.designsystem.component.OmenTextField(
                    value = viewModel.username,
                    onValueChange = { viewModel.username = it },
                    label = "Sleeper username",
                    placeholder = "username",
                    enabled = !state.isBusy,
                )
                OmenButton(
                    text = "Find my leagues",
                    onClick = { scope.launch { viewModel.resolveUsername() } },
                    enabled = viewModel.canSubmitUsername,
                )
            }

            is ConnectState.ResolvingAccount, is ConnectState.ValidatingConnection,
            is ConnectState.StartingYahooAuthorization, is ConnectState.AwaitingYahooReturn,
            is ConnectState.ConfirmingYahooConnection, is ConnectState.BindingYahooLeague -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Loading,
                    title = "Just a moment",
                    // Spec §6: never a bare "Loading…" — say what is happening.
                    message = state.progressLabel ?: "Working…",
                )
                // Leaving mid-flight is safe: the Sleeper connect is idempotent by request id,
                // and the Yahoo one is a server-bound OAuth transaction that is consumed or
                // expires.
                OmenButton("Cancel", { viewModel.cancel() }, variant = OmenButtonVariant.Link)
            }

            is ConnectState.ChoosingYahooLeague -> {
                Text("Choose a league", style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                Text(
                    "Yahoo is connected. Pick the league Omen should read.",
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                state.leagues.forEach { league ->
                    OmenListRow(
                        title = league.name,
                        subtitle = league.subtitle,
                        onClick = { scope.launch { viewModel.bindYahooLeague(league) } },
                        leadingContent = {
                            OmenPlatformBadge(
                                platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Yahoo,
                            )
                        },
                    )
                }
                OmenButton("Choose another provider", { viewModel.startOver() }, variant = OmenButtonVariant.Link)
            }

            is ConnectState.YahooConnected -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Empty,
                    title = "${state.league.name} is connected",
                    message = "Omen can now read this league's roster, scoring, and matchup.",
                )
                OmenButton("Go to Command Center", onConnected)
            }

            is ConnectState.ChoosingLeague -> {
                Text("Choose a league", style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                Text(
                    "Signed in as ${state.account.username}.",
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                state.account.leagues.forEach { league ->
                    OmenListRow(
                        title = league.name,
                        subtitle = league.subtitle.ifEmpty { null },
                        onClick = { scope.launch { viewModel.selectLeague(league) } },
                        leadingContent = { OmenPlatformBadge(platform = com.slopssaloon.omen.core.designsystem.component.OmenPlatform.Sleeper) },
                    )
                }
                OmenButton("Use a different username", { viewModel.startOver() }, variant = OmenButtonVariant.Link)
            }

            is ConnectState.Connected -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Empty,
                    title = "${state.league.name} is connected",
                    message = "Omen can now read this league's roster, scoring, and matchup.",
                )
                OmenButton("Go to Command Center", onConnected)
            }

            // Cancelling is normal. No error styling, no apology.
            is ConnectState.Canceled -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Empty,
                    title = "No problem",
                    message = "Nothing was connected. You can pick a provider whenever you're ready.",
                )
                OmenButton("Choose a provider", { viewModel.startOver() }, variant = OmenButtonVariant.Secondary)
                OmenButton("Not now", onDismiss, variant = OmenButtonVariant.Link)
            }

            is ConnectState.RetryableError -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Error,
                    title = "That didn't work",
                    message = state.failure.message,
                )
                // Spec §6: every non-success state has a safe next action. A Yahoo round trip
                // that already happened is re-checked rather than restarted — sending a user
                // who is in fact connected back through the browser is the loop this flow
                // exists to avoid.
                if (state.failure == ConnectFailure.ProviderNotConnected ||
                    state.failure == ConnectFailure.NoLeaguesForSeason
                ) {
                    OmenButton("Check again", { scope.launch { viewModel.confirmYahooConnection() } })
                }
                OmenButton("Try again", { viewModel.startOver() }, variant = OmenButtonVariant.Secondary)
                OmenButton("Explore the demo instead", onDismiss, variant = OmenButtonVariant.Link)
            }

            is ConnectState.NeedsReauth -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Error,
                    title = "Sign in again",
                    message = "Your Omen session expired. Sign in again, then connect your league.",
                )
                OmenButton("Close", onDismiss, variant = OmenButtonVariant.Secondary)
            }

            // Never a dead end — name the path that works.
            is ConnectState.UnsupportedOnMobile -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Disconnected,
                    title = "${state.provider.displayName} can't be connected in the app yet",
                    message = when (val availability = state.provider.availability) {
                        is ConnectAvailability.OnHold -> availability.reason
                        is ConnectAvailability.UseWeb -> availability.reason
                        is ConnectAvailability.Available -> ""
                    },
                )
                OmenButton("Choose another provider", { viewModel.startOver() }, variant = OmenButtonVariant.Secondary)
            }
        }
    }
}
