package com.slopssaloon.omen.app.feature.connect

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.Text
import androidx.compose.material3.Surface
import androidx.compose.material3.TextButton
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.slopssaloon.omen.R
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenIconButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformBadge
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.component.OmenTextField
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

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0B)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(OmenTheme.spacing.cardInterior),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16),
        ) {
            when (val state = viewModel.state) {
                is ConnectState.NotStarted -> {
                    if (viewModel.selectedProvider == ConnectProvider.Sleeper) {
                        Text("Sleeper", style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                        // The contract is explicit that Omen never collects a provider password.
                        Text(
                            "Enter your Sleeper username. Omen never asks for your Sleeper password.",
                            style = OmenTheme.typography.bodySmall.toTextStyle(),
                            color = OmenTheme.color.textSecondary,
                        )
                        OmenTextField(
                            value = viewModel.username,
                            onValueChange = { viewModel.username = it },
                            label = "Sleeper username",
                            placeholder = "username",
                            enabled = !state.isBusy,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OmenButton(
                            text = "Find my leagues",
                            onClick = { scope.launch { viewModel.resolveUsername() } },
                            enabled = viewModel.canSubmitUsername,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OmenButton("Choose another provider", { viewModel.startOver() }, variant = OmenButtonVariant.Link)
                    } else {
                        Column(modifier = Modifier.fillMaxSize()) {
                            Spacer(Modifier.height(OmenTheme.spacing.step12))
                            OmenIconButton(
                                contentDescription = "Back",
                                onClick = onDismiss,
                                size = OmenIconButtonSize.Sm,
                            ) {
                                Icon(
                                    painter = painterResource(id = R.drawable.ic_canvas_chevron_left),
                                    contentDescription = null,
                                    tint = Color.Unspecified,
                                    modifier = Modifier.size(24.dp),
                                )
                            }
                            Spacer(Modifier.height(28.dp))
                            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
                                Text("Bring your league.", style = OmenTheme.typography.h1.toTextStyle(), color = OmenTheme.color.textPrimary)
                                // Spec §4: explain the benefit in one sentence.
                                Text(
                                    "Omen reads your roster, your scoring, and your matchup. That's all it asks for, and you can disconnect any time.",
                                    style = OmenTheme.typography.body.toTextStyle(),
                                    color = OmenTheme.color.textSecondary,
                                )
                            }
                            Spacer(Modifier.height(28.dp))
                            // No provider is selected by default (spec §4), and availability is stated up
                            // front rather than discovered by tapping into a dead end.
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                ConnectProvider.entries.forEach { provider ->
                                    ConnectProviderCard(
                                        provider = provider,
                                        onClick = { scope.launch { viewModel.selectProvider(provider) } },
                                    )
                                }
                            }
                            Spacer(Modifier.weight(1f))
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = OmenTheme.color.omen.copy(alpha = 0.10f),
                                border = BorderStroke(1.dp, OmenTheme.color.omen.copy(alpha = 0.35f)),
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(14.dp),
                                ) {
                                    Icon(
                                        painter = painterResource(id = R.drawable.ic_canvas_shield),
                                        contentDescription = null,
                                        tint = Color.Unspecified,
                                        modifier = Modifier.size(18.dp),
                                    )
                                    Text(
                                        "Omen never asks for your league password, and never posts or trades on your behalf.",
                                        style = OmenTheme.typography.bodySmall.toTextStyle(),
                                        color = OmenTheme.color.textSecondary,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                            Spacer(Modifier.height(14.dp))
                            CanvasTextAction("I'll do this later", onDismiss)
                            Spacer(Modifier.height(22.dp))
                        }
                    }
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
                ConnectedActions(onConnected = onConnected, onConnectAnother = { viewModel.startOver() })
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
                ConnectedActions(onConnected = onConnected, onConnectAnother = { viewModel.startOver() })
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

            // ---- ESPN (W1-A) ----

            // Consent, before anything opens. Its own step rather than a line under a button,
            // because that is what W1-A binds: the user is told what is about to happen while
            // they can still decline, and declining writes nothing. The affiliation disclaimer is
            // not decorative — Disney's Terms of Use §2.B.vii bars use suggesting association.
            is ConnectState.EspnConsent -> {
                Text(
                    EspnHandoffCopy.CONSENT_TITLE,
                    style = OmenTheme.typography.h2.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                )
                Text(
                    EspnHandoffCopy.CONSENT_BODY,
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                OmenButton(EspnHandoffCopy.CONSENT_CONTINUE, { viewModel.beginEspnSignIn() })
                OmenButton(
                    EspnHandoffCopy.CONSENT_DECLINE,
                    { viewModel.startOver() },
                    variant = OmenButtonVariant.Secondary,
                )
            }

            is ConnectState.EspnSigningIn -> {
                viewModel.espnCookieReader?.let { reader ->
                    EspnWebSignInView(
                        reader = reader,
                        onProgress = { progress -> scope.launch { viewModel.espnSignInProgressed(progress) } },
                        modifier = Modifier.fillMaxWidth().weight(1f),
                    )
                }
                Text(
                    if (viewModel.espnSignInProgress.isSignedIn) {
                        EspnHandoffCopy.SIGN_IN_READY
                    } else {
                        EspnHandoffCopy.SIGN_IN_WAITING
                    },
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                // Presence and host names only — the same thing `extension/popup.js` shows, for
                // the same reason. No cookie value ever reaches this string.
                viewModel.espnSignInProgress.diagnosticOrNull
                    ?.takeIf { it.isNotEmpty() }
                    ?.let { diagnostic ->
                        Text(
                            diagnostic,
                            style = OmenTheme.typography.bodySmall.toTextStyle(),
                            color = OmenTheme.color.textTertiary,
                        )
                    }
                if (viewModel.espnSignInProgress.isSignedIn) {
                    OmenTextField(
                        value = viewModel.espnLeagueId,
                        onValueChange = { viewModel.espnLeagueId = it },
                        label = "ESPN League ID",
                        placeholder = "e.g. 156664",
                        enabled = !state.isBusy,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        EspnHandoffCopy.LEAGUE_ID_HINT,
                        style = OmenTheme.typography.bodySmall.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
                viewModel.espnNotice?.let { notice ->
                    Text(
                        notice,
                        style = OmenTheme.typography.bodySmall.toTextStyle(),
                        color = OmenTheme.color.textSecondary,
                    )
                }
                // Omen never submits on the user's behalf — the rule the desktop helper follows.
                OmenButton(
                    EspnHandoffCopy.SIGN_IN_CONNECT,
                    { scope.launch { viewModel.confirmEspnConnection() } },
                    enabled = viewModel.canConnectEspn,
                )
                OmenButton(
                    EspnHandoffCopy.SIGN_IN_CANCEL,
                    { viewModel.cancelEspnSignIn() },
                    variant = OmenButtonVariant.Secondary,
                )
            }

            // The leagues ESPN reported, in Omen's own list — the user is out of ESPN's web view
            // by the time they see this.
            is ConnectState.ChoosingEspnLeague -> {
                Text(
                    EspnHandoffCopy.foundLeaguesTitle(state.options.size),
                    style = OmenTheme.typography.h2.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                )
                Text(
                    EspnHandoffCopy.FOUND_LEAGUES_SUBTITLE,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                state.options.forEach { option ->
                    OmenListRow(
                        title = option.displayName,
                        subtitle = option.subtitle,
                        onClick = { scope.launch { viewModel.connectEspnLeague(option) } },
                    )
                }
                OmenButton(
                    "Choose another provider",
                    { viewModel.startOver() },
                    variant = OmenButtonVariant.Secondary,
                )
            }

            is ConnectState.EspnConnected -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Empty,
                    title = "${state.connection.displayLeagueName} is connected",
                    message = EspnHandoffCopy.connectedMessage(state.connection),
                )
                OmenButton("Go to Command Center", onConnected)
                OmenButton(
                    "Connect another league",
                    { viewModel.startOver() },
                    variant = OmenButtonVariant.Secondary,
                )
            }

            is ConnectState.DiscoveringEspnLeagues,
            is ConnectState.ValidatingEspnConnection,
            -> {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Loading,
                    title = "Just a moment",
                    // Spec §6: never a bare "Loading…" — say what is happening.
                    message = state.progressLabel ?: "Working…",
                )
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
                if (state.provider == ConnectProvider.Espn) {
                    Text(
                        text = ESPN_CONSENT_TEXT,
                        style = OmenTheme.typography.bodySmall.toTextStyle(),
                        color = OmenTheme.color.textSecondary,
                    )
                }
                OmenButton("Choose another provider", { viewModel.startOver() }, variant = OmenButtonVariant.Secondary)
            }
        }
    }
}
}

@Composable
private fun ConnectProviderCard(provider: ConnectProvider, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF141416),
        contentColor = OmenTheme.color.textPrimary,
        border = BorderStroke(1.dp, OmenTheme.color.border),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
            modifier = Modifier.padding(OmenTheme.spacing.step16).heightIn(min = 44.dp),
        ) {
            ProviderMark(provider)
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
                Text(provider.displayName, style = OmenTheme.typography.h3.toTextStyle(), color = OmenTheme.color.textPrimary)
                Text(availabilityLabel(provider), style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
            }
            Icon(
                painter = painterResource(id = R.drawable.ic_canvas_chevron_right),
                contentDescription = null,
                tint = Color.Unspecified,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun CanvasTextAction(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    TextButton(
        onClick = onClick,
        enabled = enabled,
        colors = ButtonDefaults.textButtonColors(
            contentColor = OmenTheme.color.textTertiary,
            disabledContentColor = OmenTheme.color.textTertiary.copy(alpha = 0.45f),
        ),
        contentPadding = PaddingValues(0.dp),
        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
    ) {
        Text(
            text = text,
            style = OmenTheme.typography.label.toTextStyle(),
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ProviderMark(provider: ConnectProvider) {
    val (label, color, foreground) = when (provider) {
        ConnectProvider.Espn -> Triple("E", OmenTheme.color.data.platformEspnChip, OmenTheme.color.data.onPlatformEspn)
        ConnectProvider.Yahoo -> Triple("Y!", OmenTheme.color.data.platformYahooChip, OmenTheme.color.data.onPlatformYahoo)
        ConnectProvider.Sleeper -> Triple("S", OmenTheme.color.data.platformSleeperChip, OmenTheme.color.data.onPlatformSleeper)
    }
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(44.dp),
    ) {
        Surface(shape = RoundedCornerShape(10.dp), color = color, modifier = Modifier.fillMaxSize()) {
            Box(contentAlignment = Alignment.Center) {
                Text(label, style = OmenTheme.typography.h2.toTextStyle(), color = foreground)
            }
        }
    }
}

private fun availabilityLabel(provider: ConnectProvider): String = when (provider.availability) {
    is ConnectAvailability.Available -> if (provider == ConnectProvider.Yahoo) {
        "Sign in with Yahoo"
    } else {
        "Just your username — no password"
    }
    is ConnectAvailability.OnHold -> "On hold"
    is ConnectAvailability.UseWeb -> "Needs a computer for now · we'll show you"
}

@Composable
private fun ConnectedActions(onConnected: () -> Unit, onConnectAnother: () -> Unit) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
        modifier = Modifier.fillMaxWidth(),
    ) {
        OmenButton(
            text = "Go to Command Center",
            onClick = onConnected,
            modifier = Modifier.weight(1f),
        )
        OmenButton(
            text = "Connect another league",
            onClick = onConnectAnother,
            variant = OmenButtonVariant.Secondary,
            modifier = Modifier.weight(1f),
        )
    }
}

private const val ESPN_CONSENT_TEXT =
    "Connecting ESPN uses your own ESPN session so Omen can read your league — your roster, " +
        "scoring, and matchup. It is your account and your choice, and you can disconnect it " +
        "any time in Account. Omen is not affiliated with or endorsed by ESPN."
