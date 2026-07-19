package com.slopssaloon.omen.app

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Button
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Column
import com.slopssaloon.omen.core.session.SessionState

@Composable
fun OmenAndroidApp() {
    var sessionState by remember { mutableStateOf<SessionState>(SessionState.SignedOut) }
    var selectedDestination by remember { mutableStateOf("Command") }

    MaterialTheme {
        when (sessionState) {
            SessionState.Loading -> Text("Loading Omen")
            SessionState.SignedOut -> Column {
                Text("Welcome to Omen")
                Button(onClick = { sessionState = SessionState.SignedIn("demo-local") }) {
                    Text("Enter demo")
                }
            }
            is SessionState.SignedIn -> Column {
                Text(if (selectedDestination == "Command") "Omen Command Center" else selectedDestination)
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
