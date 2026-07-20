package com.slopssaloon.omen.app

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.auth.CredentialManagerGoogleIdTokenProvider
import com.slopssaloon.omen.app.auth.OkHttpGoTrueTransport
import com.slopssaloon.omen.core.auth.AuthEvent
import com.slopssaloon.omen.core.auth.AuthFailure
import com.slopssaloon.omen.core.auth.AuthFlowReducer
import com.slopssaloon.omen.core.auth.AuthFlowState
import com.slopssaloon.omen.core.auth.AuthRepository
import com.slopssaloon.omen.core.auth.FakeAuthRepository
import com.slopssaloon.omen.core.auth.GoogleIdTokenProvider
import com.slopssaloon.omen.core.auth.GoogleIdTokenResult
import com.slopssaloon.omen.core.auth.SupabaseAuthRepository
import com.slopssaloon.omen.core.auth.UnconfiguredGoogleIdTokenProvider
import com.slopssaloon.omen.core.network.AppEnvironment
import com.slopssaloon.omen.core.session.AndroidKeystoreSessionStore
import com.slopssaloon.omen.core.session.SecureSessionStore
import com.slopssaloon.omen.core.session.SessionManager
import com.slopssaloon.omen.core.session.SessionState
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * M3-A scaffolding surface. The session is restored from Keystore-backed secure storage on
 * launch, and "Get started" drives the real [AuthFlowReducer] state machine. Until the live
 * Supabase + Credential Manager wiring lands (pending the Google Web client ID), the sign-in
 * calls run against [FakeAuthRepository] and Google reports "not configured" — this is a
 * labeled local flow, never a claim of live authentication.
 */
@Composable
fun OmenAndroidApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val env = remember { AppEnvironment.fromBuildConfig() }
    val clock = { System.currentTimeMillis() / 1000 }
    val store: SecureSessionStore = remember { AndroidKeystoreSessionStore(context) }
    val sessionManager = remember { SessionManager(store, clock) }
    // Live Supabase/Credential-Manager when public config is present; safe local fake otherwise.
    val repo: AuthRepository = remember {
        if (env.supabaseConfigured) {
            SupabaseAuthRepository(OkHttpGoTrueTransport(env.supabaseUrl, env.supabaseAnonKey), store, clock)
        } else {
            FakeAuthRepository(googleConfigured = env.googleSignInConfigured)
        }
    }
    val googleProvider: GoogleIdTokenProvider = remember {
        if (env.googleSignInConfigured) CredentialManagerGoogleIdTokenProvider(context, env.googleWebClientId)
        else UnconfiguredGoogleIdTokenProvider()
    }
    val sessionState by sessionManager.state.collectAsState()

    LaunchedEffect(Unit) { sessionManager.restore() }

    var flow by remember { mutableStateOf<AuthFlowState>(AuthFlowState.Idle) }
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var showAuth by remember { mutableStateOf(false) }
    var selectedDestination by remember { mutableStateOf("Command") }

    fun dispatch(event: AuthEvent) {
        val next = AuthFlowReducer.reduce(flow, event)
        flow = next
        when (next) {
            is AuthFlowState.RequestingOtp ->
                scope.launch { dispatch(AuthEvent.OtpRequestResult(repo.requestEmailOtp(next.email))) }
            is AuthFlowState.VerifyingOtp ->
                scope.launch { dispatch(AuthEvent.OtpVerifyResult(repo.verifyEmailOtp(next.email, code))) }
            is AuthFlowState.LaunchingGoogle -> scope.launch {
                when (val tokenResult = googleProvider.getIdToken(rawNonce = UUID.randomUUID().toString())) {
                    is GoogleIdTokenResult.Token -> {
                        dispatch(AuthEvent.GoogleTokenResult(tokenResult)) // → ExchangingGoogleToken (UI)
                        dispatch(
                            AuthEvent.GoogleExchangeResult(
                                repo.signInWithGoogleIdToken(tokenResult.idToken, tokenResult.rawNonce),
                            ),
                        )
                    }
                    else -> dispatch(AuthEvent.GoogleTokenResult(tokenResult)) // → Failed
                }
            }
            is AuthFlowState.Authenticated -> {
                sessionManager.onAuthenticated(next.session)
                showAuth = false
                flow = AuthFlowState.Idle
            }
            else -> Unit
        }
    }

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
            when (val s = sessionState) {
                SessionState.Loading -> Text("Loading Omen", Modifier.padding(24.dp))

                SessionState.NeedsReauth -> Column(Modifier.padding(24.dp)) {
                    Text("Please sign in again")
                    Text("Your Omen session expired. Sign in to continue.")
                    Button(onClick = { showAuth = true; sessionManager.signOut() }) { Text("Sign in") }
                }

                SessionState.SignedOut -> if (showAuth) {
                    AuthFlow(
                        state = flow,
                        email = email,
                        code = code,
                        live = env.supabaseConfigured,
                        googleConfigured = env.googleSignInConfigured,
                        onEmailChange = { email = it },
                        onCodeChange = { code = it },
                        onSubmitEmail = { dispatch(AuthEvent.EmailSubmitted(email)) },
                        onSubmitCode = { dispatch(AuthEvent.OtpSubmitted(code)) },
                        onGoogle = { dispatch(AuthEvent.GoogleRequested) },
                        onReset = { dispatch(AuthEvent.Reset) },
                        onBack = { showAuth = false; dispatch(AuthEvent.Reset) },
                    )
                } else Column(Modifier.padding(24.dp)) {
                    Text("Welcome to Omen")
                    Text("See the move before the league does.")
                    Button(onClick = { sessionManager.onDemo() }) { Text("Try Demo") }
                    Button(onClick = { showAuth = true }) { Text("Get started") }
                }

                is SessionState.SignedIn -> Column(Modifier.padding(24.dp)) {
                    Text(
                        when (selectedDestination) {
                            "Command" -> "Omen Command Center\nSigned in as ${s.userId}."
                            "Omen" -> "Mock recommendation\nStart Jordan Addison over the flex alternative.\nConnection needs attention: connect a league for live Omen."
                            else -> selectedDestination
                        },
                    )
                    OutlinedButton(onClick = { sessionManager.signOut() }) { Text("Sign out") }
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

@Composable
private fun AuthFlow(
    state: AuthFlowState,
    email: String,
    code: String,
    live: Boolean,
    googleConfigured: Boolean,
    onEmailChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSubmitEmail: () -> Unit,
    onSubmitCode: () -> Unit,
    onGoogle: () -> Unit,
    onReset: () -> Unit,
    onBack: () -> Unit,
) {
    Column(Modifier.padding(24.dp)) {
        Text("Sign in to Omen")
        Text(
            if (live) "Sign in with your email code or Google."
            else "Local auth flow (fake backend) — live Supabase wiring pending config.",
        )

        when (state) {
            is AuthFlowState.AwaitingOtp, is AuthFlowState.VerifyingOtp -> {
                Text("Enter the 6-digit code sent to $email")
                OutlinedTextField(
                    value = code,
                    onValueChange = onCodeChange,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    label = { Text("6-digit code") },
                )
                Button(
                    onClick = onSubmitCode,
                    enabled = state is AuthFlowState.AwaitingOtp,
                ) { Text(if (state is AuthFlowState.VerifyingOtp) "Verifying…" else "Verify code") }
            }
            else -> {
                OutlinedTextField(
                    value = email,
                    onValueChange = onEmailChange,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    label = { Text("Email") },
                )
                Button(
                    onClick = onSubmitEmail,
                    enabled = state !is AuthFlowState.RequestingOtp,
                ) { Text(if (state is AuthFlowState.RequestingOtp) "Sending code…" else "Email me a code") }
                OutlinedButton(onClick = onGoogle) {
                    Text(if (googleConfigured) "Continue with Google" else "Google (not configured)")
                }
            }
        }

        if (state is AuthFlowState.Failed) {
            Text(failureMessage(state.reason))
            Button(onClick = onReset) { Text("Try again") }
        }

        OutlinedButton(onClick = onBack) { Text("Back") }
    }
}

private fun failureMessage(reason: AuthFailure): String = when (reason) {
    AuthFailure.INVALID_EMAIL -> "That email doesn't look right. Check it and try again."
    AuthFailure.INVALID_CODE -> "That code didn't match. Re-enter it or request a new one."
    AuthFailure.CANCELED -> "Sign-in canceled. You can try again anytime."
    AuthFailure.NETWORK -> "Network problem. Check your connection and retry."
    AuthFailure.TIMEOUT -> "That took too long. Retry when you're ready."
    AuthFailure.SERVER -> "Something went wrong on our side. Try again, or use another sign-in method."
    AuthFailure.GOOGLE_UNAVAILABLE -> "Google sign-in isn't available on this build. Use email instead."
    AuthFailure.NEEDS_REAUTH -> "Your session expired. Please sign in again."
    AuthFailure.UNKNOWN -> "Couldn't complete sign-in. Try again, or contact support."
}
