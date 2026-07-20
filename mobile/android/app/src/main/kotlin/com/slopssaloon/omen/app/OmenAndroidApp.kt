package com.slopssaloon.omen.app

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.Button
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import com.slopssaloon.omen.core.session.SessionState

@Composable
fun OmenAndroidApp() {
    var sessionState by remember { mutableStateOf<SessionState>(SessionState.SignedOut) }
    var selectedDestination by remember { mutableStateOf("Command") }
    var showingAuthPlaceholder by remember { mutableStateOf(false) }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFFA67C2E),
            onPrimary = Color(0xFF0A0A0B),
            background = Color(0xFF0A0A0B),
            onBackground = Color(0xFFF5F0E8),
            surface = Color(0xFF1C1C1E),
            onSurface = Color(0xFFF5F0E8),
        ),
    ) {
        Surface(modifier = Modifier.fillMaxSize()) {
            when (sessionState) {
            SessionState.Loading -> Text("Loading Omen")
            SessionState.SignedOut -> if (showingAuthPlaceholder) Column(Modifier.padding(24.dp)) {
                Text("Sign in to Omen")
                Text("Sign-in wiring comes after this local vertical slice.")
                Button(onClick = { sessionState = SessionState.SignedIn("local-preview") }) {
                    Text("Continue with local preview")
                }
            } else Column(Modifier.padding(24.dp)) {
                Text("Welcome to Omen")
                Text("See the move before the league does.")
                Button(onClick = { sessionState = SessionState.SignedIn("demo-local") }) {
                    Text("Try Demo")
                }
                Button(onClick = { showingAuthPlaceholder = true }) {
                    Text("Get started")
                }
            }
            is SessionState.SignedIn -> Column(Modifier.padding(24.dp)) {
                Text(when (selectedDestination) {
                    "Command" -> "Omen Command Center\nDemo mode is active."
                    "Omen" -> "Mock recommendation\nStart Jordan Addison over the flex alternative.\nConnection needs attention: connect a league for live Omen."
                    else -> selectedDestination
                })
                NavigationBar {
                    listOf("Command", "Omen", "Trade", "Draft", "League").forEach { destination ->
                        NavigationBarItem(
                            selected = selectedDestination == destination,
                            onClick = { selectedDestination = destination },
                            icon = { Text(destination.take(1)) },
                            label = { Text(destination) },
                        )
                    }
                }
            }
            }
        }
    }
}
