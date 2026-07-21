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
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardTone
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenIconButtonTone
import com.slopssaloon.omen.core.designsystem.component.OmenFormField
import com.slopssaloon.omen.core.designsystem.component.OmenPicker
import com.slopssaloon.omen.core.designsystem.component.OmenTextField
import com.slopssaloon.omen.core.designsystem.component.OmenTextFieldVariant
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
