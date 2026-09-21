package com.slopssaloon.omen.app.feature.chrome

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.BuildConfig
import com.slopssaloon.omen.app.feature.api.OmenApiClient
import com.slopssaloon.omen.app.feature.api.OmenApiResult
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenPlatformBadge
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class OmenAccountConnection(
    val id: String,
    val platform: OmenPlatform,
    val teamName: String,
    val leagueName: String,
)

sealed interface OmenAccountConnections {
    data class Loaded(val rows: List<OmenAccountConnection>) : OmenAccountConnections
    data object None : OmenAccountConnections
    data object Unavailable : OmenAccountConnections
}

data class OmenAccountState(
    val identity: String,
    val identityProvider: String = "Omen account",
    val avatarInitials: String = identity.take(2).uppercase(),
    val connections: OmenAccountConnections,
)

@Composable
fun OmenAccountScreen(
    state: OmenAccountState,
    onAddLeague: (() -> Unit)? = null,
    onDisconnect: ((OmenAccountConnection) -> Unit)? = null,
    onReportProblem: (() -> Unit)? = null,
    onHelp: (() -> Unit)? = null,
    onPrivacy: (() -> Unit)? = null,
    onSignOut: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12),
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(Modifier.weight(1f)) {
                Text("SIGNED IN", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
                Text("Account", style = OmenTheme.typography.h1.toTextStyle(), color = OmenTheme.color.textPrimary)
            }
            Box(
                Modifier.size(30.dp).background(OmenTheme.color.surface2, RoundedCornerShape(99.dp)),
                contentAlignment = Alignment.Center,
            ) { Text(state.avatarInitials, style = OmenTheme.typography.label.toTextStyle(), color = OmenTheme.color.accentHover) }
        }
        OmenListRow(state.identity, state.identityProvider, onClick = {})
        SectionLabel("Connected leagues", when (val c = state.connections) {
            is OmenAccountConnections.Loaded -> c.rows.size.toString()
            OmenAccountConnections.None -> "0"
            OmenAccountConnections.Unavailable -> null
        })
        when (val connections = state.connections) {
            is OmenAccountConnections.Loaded -> connections.rows.forEach { connection ->
                OmenListRow(
                    title = connection.teamName,
                    subtitle = connection.leagueName,
                    leadingContent = { OmenPlatformBadge(connection.platform) },
                    trailingContent = onDisconnect?.let { disconnect -> {
                        Box(
                            modifier = Modifier
                                .heightIn(min = 48.dp)
                                .clickable { disconnect(connection) }
                                .semantics { contentDescription = "Disconnect ${connection.teamName}, ${connection.leagueName}" },
                            contentAlignment = Alignment.Center,
                        ) { Text("Disconnect", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent) }
                    } },
                )
            }
            OmenAccountConnections.None -> HonestText("No leagues connected yet.")
            OmenAccountConnections.Unavailable -> HonestText(
                "Omen couldn’t read your connected leagues. This list is unread, not empty — nothing has been disconnected."
            )
        }
        if (onAddLeague != null) {
            OmenButton("+ Add a league", onAddLeague, Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.step16), OmenButtonVariant.Link)
        }
        SectionLabel("Support")
        OmenListRow("Report a problem", "Sends device and version. Never your league data.", onClick = onReportProblem)
        OmenListRow("Help centre", "Answers and connection recovery", onClick = onHelp)
        OmenListRow("Privacy & data", "Export or delete your account", onClick = onPrivacy)
        if (onSignOut != null) OmenButton(
            "Sign out", onSignOut,
            Modifier.fillMaxWidth().padding(OmenTheme.spacing.step16),
            OmenButtonVariant.Secondary,
        )
    }
}

@Composable
fun OmenPrivacyDataScreen(
    onExport: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Column(Modifier.padding(OmenTheme.spacing.step16)) {
            Text("PRIVACY", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
            Text("Privacy & data", style = OmenTheme.typography.h1.toTextStyle(), color = OmenTheme.color.textPrimary)
            Text(
                "Your account data stays separate from provider credentials. Omen never shows or exports credential values.",
                style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary,
            )
        }
        OmenListRow("Export my data", "Request a copy of your Omen account data", onClick = onExport)
        OmenListRow("Delete account", "Permanently removes your Omen account", onClick = onDelete)
    }
}

@Composable
private fun SectionLabel(title: String, trailing: String? = null) {
    Row(Modifier.fillMaxWidth().padding(start = OmenTheme.spacing.step16, end = OmenTheme.spacing.step16, top = OmenTheme.spacing.step20, bottom = OmenTheme.spacing.step8)) {
        Text(title.uppercase(), Modifier.weight(1f), style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        if (trailing != null) Text(trailing, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
    }
}

@Composable private fun HonestText(text: String) = Text(
    text, Modifier.padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12),
    style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary,
)

enum class OmenBetaReportScreen(val wire: String, val display: String) {
    CommandCenter("command_center", "Command"), Account("account", "Account")
}

data class OmenBetaReport(
    val screen: OmenBetaReportScreen,
    val appVersion: String,
    val build: String,
    val osVersion: String,
    val deviceModel: String,
    val connectionState: String,
    val recentErrorCodes: List<String>,
    val message: String,
    val disclosureAccepted: Boolean,
) {
    fun jsonBody(): JSONObject = JSONObject()
        .put("screen", screen.wire)
        .put("app_version", appVersion)
        .put("build", build)
        .put("os_version", osVersion)
        .put("device_model", deviceModel)
        .put("connection_state", connectionState)
        .put("recent_error_codes", JSONArray(recentErrorCodes.take(5)))
        .put("message", message)
        .put("disclosure_accepted", disclosureAccepted)

    val isSendable: Boolean get() = disclosureAccepted && message.isNotBlank() && message.length <= 4000 &&
        recentErrorCodes.size <= 5 && recentErrorCodes.all { it.matches(Regex("^[a-z][a-z0-9_]{0,63}$")) }

    companion object {
        fun device(screen: OmenBetaReportScreen, message: String) = OmenBetaReport(
            screen, BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE.toString(),
            "Android ${Build.VERSION.RELEASE ?: "unknown"}", Build.MODEL ?: "Android device",
            "none", emptyList(), message, false,
        )
    }
}

sealed interface OmenBetaReportOutcome {
    data class Received(val id: String) : OmenBetaReportOutcome
    data object NotSaved : OmenBetaReportOutcome
    data class Failed(val message: String) : OmenBetaReportOutcome
}

class OmenBetaReportRepository(private val client: OmenApiClient) {
    suspend fun send(report: OmenBetaReport, accessToken: String): OmenBetaReportOutcome {
        if (!report.isSendable) return OmenBetaReportOutcome.Failed("Add a note before sending.")
        return when (val result = client.post("api/beta/reports", accessToken, report.jsonBody().toString()) { body ->
            JSONObject(body).optString("id").takeIf(String::isNotBlank)
        }) {
            is OmenApiResult.Success -> OmenBetaReportOutcome.Received(result.value)
            is OmenApiResult.Failure -> if ((result.error as? com.slopssaloon.omen.app.feature.api.OmenApiError.Server)?.status == 503)
                OmenBetaReportOutcome.NotSaved else OmenBetaReportOutcome.Failed("Omen couldn’t send this report. Nothing was saved.")
        }
    }
}

@Composable
fun OmenReportPill(onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().background(OmenTheme.color.surface2, RoundedCornerShape(12.dp)).clickable(onClick = onClick)
            .semantics { contentDescription = "Something look wrong? Sends this screen, your app version and the provider — never your league data. Report" }
            .padding(OmenTheme.spacing.step12),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
    ) {
        Box(Modifier.size(30.dp).background(OmenTheme.color.accentMuted, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
            Text("!", style = OmenTheme.typography.h3.toTextStyle(), color = OmenTheme.color.accent)
        }
        Column(Modifier.weight(1f)) {
            Text("Something look wrong?", style = OmenTheme.typography.label.toTextStyle(), color = OmenTheme.color.textPrimary)
            Text("Sends this screen, your app version and the provider — never your league data.", style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
        Text("Report", style = OmenTheme.typography.label.toTextStyle(), color = OmenTheme.color.accent)
    }
}

@Composable
fun OmenReportComposer(
    screen: OmenBetaReportScreen,
    send: suspend (OmenBetaReport) -> OmenBetaReportOutcome,
    initialOutcome: OmenBetaReportOutcome? = null,
    onDone: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var note by remember { mutableStateOf("") }
    var outcome by remember { mutableStateOf(initialOutcome) }
    var sending by remember { mutableStateOf(false) }
    var disclosureAccepted by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    if (outcome != null) {
        Column(modifier.fillMaxSize().padding(OmenTheme.spacing.step16), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
            Text("Report a problem", style = OmenTheme.typography.h1.toTextStyle(), color = OmenTheme.color.textPrimary)
            when (val value = outcome) {
                is OmenBetaReportOutcome.Received -> HonestText("Report received. Reference ${value.id}.")
                OmenBetaReportOutcome.NotSaved -> HonestText("Your report was not saved. Nothing was kept.")
                is OmenBetaReportOutcome.Failed -> HonestText(value.message)
                null -> Unit
            }
            OmenButton("Done", onDone, variant = OmenButtonVariant.Secondary)
        }
        return
    }
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(OmenTheme.spacing.step16), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        Text("Report a problem", style = OmenTheme.typography.h1.toTextStyle(), color = OmenTheme.color.textPrimary)
        Text("WHAT THIS SENDS", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        HonestText("Screen: ${screen.display}\nApp and build\nAndroid version and device\nProvider connection state\nRecent scrubbed error codes\nYour note")
        Text("Never league data, rosters, screenshots or credentials.", style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        OutlinedTextField(value = note, onValueChange = { note = it.take(4000) }, label = { Text("What went wrong?") }, modifier = Modifier.fillMaxWidth())
        OmenButton(
            if (disclosureAccepted) "Disclosure accepted" else "I understand what this sends",
            onClick = { disclosureAccepted = !disclosureAccepted },
            modifier = Modifier.fillMaxWidth(),
            variant = OmenButtonVariant.Secondary,
        )
        OmenButton("Send report", onClick = {
            val report = OmenBetaReport.device(screen, note).copy(disclosureAccepted = disclosureAccepted)
            if (report.isSendable) scope.launch { sending = true; outcome = send(report); sending = false }
        }, modifier = Modifier.fillMaxWidth(), enabled = note.isNotBlank() && disclosureAccepted, loading = sending)
    }
}
