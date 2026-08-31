package com.slopssaloon.omen.app.feature.help

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import com.slopssaloon.omen.BuildConfig
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.material3.Text
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.app.feature.connect.ConnectAvailability
import com.slopssaloon.omen.app.feature.connect.ConnectProvider
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Honest support states. These are supplied by the host; this screen never infers provider data. */
enum class OmenHelpSupportState {
    Available,
    NoAccount,
    Offline,
    SubmissionUnavailable,
    ProviderRecovery,
}

/**
 * Required Yahoo attribution sentence. Fixed wording - it is contractual, not editorial copy.
 *
 * The Yahoo API Access and Use Agreement (executed 2026-08-20, Docusign envelope
 * A1D54813-9307-84ED-83EA-FC24FBE40785) requires clear attribution wherever Yahoo Fantasy
 * Information is displayed, and for mobile applications specifically that it appear inside the
 * app in an "About", "Legal", or similar informational section. Help + Support is that section
 * on native; no separate Legal screen exists, and inventing one would need its own screen
 * contract and Figma approval under the native delivery governance.
 */
const val OMEN_YAHOO_ATTRIBUTION_TEXT = "Fantasy data provided by Yahoo Fantasy."

/**
 * Whether the Yahoo attribution should render.
 *
 * The test is **"can Yahoo Fantasy Information reach this app at all"**, not "can you connect
 * from inside it". Those came apart on 2026-08-28 when Yahoo restored the entitlement: a user can
 * now connect Yahoo on the web and that connection is read by every native surface, so the app
 * displays Yahoo data while offering no in-app Yahoo button.
 *
 * Gating on Available would therefore have shipped Yahoo data **with no attribution**, which the
 * Yahoo API Access and Use Agreement requires wherever that data is displayed. Only OnHold means
 * genuinely no Yahoo data, so only OnHold hides the line. iOS mirror: `omenShowsYahooAttribution`.
 */
fun omenShowsYahooAttribution(): Boolean =
    ConnectProvider.Yahoo.availability !is ConnectAvailability.OnHold

/**
 * Approved M4 Help + Support surface. Feedback is intentionally not sent or queued until an
 * approved support contract exists; no league, roster, credential, token, or raw provider error
 * is ever attached here.
 */
@Composable
fun OmenHelpSupportScreen(
    state: OmenHelpSupportState = OmenHelpSupportState.Available,
    contextDescription: String? = null,
    showTitle: Boolean = true,
    modifier: Modifier = Modifier,
) {
    var feedbackUnavailable by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Opens the user's mail app. SubmissionUnavailable is now reached only when there is
    // genuinely no way to send — a device with no mail client — which is what that state was
    // always meant to mean. See the iOS twin for why this is not `POST /api/omen/feedback`.
    fun compose(subject: String) {
        val body = "\n\n—\nOmen ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("mailto:$SUPPORT_ADDRESS")
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_TEXT, body)
        }
        try {
            context.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            feedbackUnavailable = true
        }
    }
    val effectiveState = if (feedbackUnavailable) OmenHelpSupportState.SubmissionUnavailable else state

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(OmenTheme.spacing.step16)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16),
    ) {
        if (showTitle) {
            Text(
                text = "Help + Support",
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }

        HelpSupportStateMessage(effectiveState)

        contextDescription?.let { description ->
            OmenCard(modifier = Modifier.fillMaxWidth(), variant = OmenCardVariant.Outlined) {
                Text(
                    text = description,
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }

        OmenCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text("Help Center", style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                Spacer(Modifier.padding(top = OmenTheme.spacing.step8))
                OmenListRow("Getting started", "Learn the Omen basics")
                OmenListRow("League connections", "Understand available connection paths")
                OmenListRow("Account and privacy", "Review what support never collects")
            }
        }

        OmenCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text("Help Improve Omen", style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
                Spacer(Modifier.padding(top = OmenTheme.spacing.step8))
                OmenListRow(
                    title = "Share feedback",
                    subtitle = "Opens your mail app — nothing is attached automatically",
                    onClick = { compose("Omen feedback") },
                )
                OmenListRow(
                    title = "Report a problem",
                    subtitle = "Tell us what happened without private league data",
                    onClick = { compose("Omen problem report") },
                )
            }
        }

        OmenCard(modifier = Modifier.fillMaxWidth(), variant = OmenCardVariant.Outlined) {
            Text(
                text = "Privacy: Omen never automatically attaches your selected league, roster, credentials, tokens, cookies, or raw provider errors to support.",
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }

        if (omenShowsYahooAttribution()) {
            OmenCard(modifier = Modifier.fillMaxWidth(), variant = OmenCardVariant.Outlined) {
                Text(
                    text = OMEN_YAHOO_ATTRIBUTION_TEXT,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }
    }
}

@Composable
private fun HelpSupportStateMessage(state: OmenHelpSupportState) {
    when (state) {
        OmenHelpSupportState.Available -> Unit
        OmenHelpSupportState.NoAccount -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "Sign in for account support",
            message = "You can still read Help Center topics without an account.",
        )
        OmenHelpSupportState.Offline -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Disconnected,
            title = "You are offline",
            message = "Help remains available. Try again when your connection returns.",
        )
        OmenHelpSupportState.SubmissionUnavailable -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Stale,
            title = "Feedback sending is not available yet",
            message = "Nothing was sent or saved. You can return to Help Center safely.",
        )
        OmenHelpSupportState.ProviderRecovery -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Error,
            title = "A league connection needs attention",
            message = "Reconnect from Account. Support does not show raw provider errors or credentials.",
        )
    }
}

/**
 * The same address the web app already publishes (`frontend/src/pages/Support.jsx`), so wiring
 * this invents no contract and adds no backend surface.
 *
 * Deliberately NOT `POST /api/omen/feedback`: that route is *move* feedback — it requires
 * `week`, `season` and a boolean `followed`, and upserts into `moves`. A bug report written
 * there would fabricate scoring data and still not reach a person.
 */
private const val SUPPORT_ADDRESS = "support@slopssaloon.com"
