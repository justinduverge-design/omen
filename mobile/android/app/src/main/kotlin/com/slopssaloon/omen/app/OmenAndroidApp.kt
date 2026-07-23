package com.slopssaloon.omen.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import com.slopssaloon.omen.R
import com.slopssaloon.omen.app.auth.OmenAuthFlow
import com.slopssaloon.omen.app.auth.OmenDeleteAccountScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterFixtures
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterScreen
import com.slopssaloon.omen.app.auth.CredentialManagerGoogleIdTokenProvider
import com.slopssaloon.omen.app.auth.OkHttpAccountRepository
import com.slopssaloon.omen.app.auth.OkHttpGoTrueTransport
import com.slopssaloon.omen.core.auth.AccountDeletion
import com.slopssaloon.omen.core.auth.AccountDeletionOutcome
import com.slopssaloon.omen.core.auth.AccountRepository
import com.slopssaloon.omen.core.auth.AuthEvent
import com.slopssaloon.omen.core.auth.AuthFlowReducer
import com.slopssaloon.omen.core.auth.AuthFlowState
import com.slopssaloon.omen.core.auth.AuthRepository
import com.slopssaloon.omen.core.auth.FakeAuthRepository
import com.slopssaloon.omen.core.auth.GoogleIdTokenProvider
import com.slopssaloon.omen.core.auth.GoogleIdTokenResult
import com.slopssaloon.omen.core.auth.SupabaseAuthRepository
import com.slopssaloon.omen.core.auth.UnconfiguredGoogleIdTokenProvider
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import com.slopssaloon.omen.core.network.AppEnvironment
import com.slopssaloon.omen.core.session.AndroidKeystoreSessionStore
import com.slopssaloon.omen.core.session.SecureSessionStore
import com.slopssaloon.omen.core.session.SessionManager
import com.slopssaloon.omen.core.session.SessionState
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * M3-A / M4 app shell. Session is restored from Keystore-backed secure storage on launch,
 * "Get started" drives the real [AuthFlowReducer], and the signed-in destination hosts the
 * approved [OmenCommandCenterScreen] (feature layer). Auth surfaces are delegated to
 * [OmenAuthFlow] and [OmenDeleteAccountScreen], which are individually allowlisted under
 * M4-Auth and retire together in a future Omen-primitive-native auth pass.
 *
 * As of M4 Command Center v1, this file uses no banned raw Material 3 primitives or raw
 * `Color(0xNN…)` literals — theming flows through [OmenTheme] which internally wraps
 * `MaterialTheme`. Enforcement scanner: unconditional.
 */
@Composable
fun OmenAndroidApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val env = remember { AppEnvironment.fromBuildConfig() }
    val clock = { System.currentTimeMillis() / 1000 }
    val store: SecureSessionStore = remember { AndroidKeystoreSessionStore(context) }
    val sessionManager = remember { SessionManager(store, clock) }
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
    val accountRepo: AccountRepository = remember { OkHttpAccountRepository(env.apiBaseUrl) }
    val sessionState by sessionManager.state.collectAsState()

    LaunchedEffect(Unit) { sessionManager.restore() }

    var flow by remember { mutableStateOf<AuthFlowState>(AuthFlowState.Idle) }
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var showAuth by remember { mutableStateOf(false) }
    var selectedDestination by remember { mutableStateOf(NavDestination.Command) }
    var showDelete by remember { mutableStateOf(false) }
    var deletePhrase by remember { mutableStateOf("") }
    var deleteMessage by remember { mutableStateOf<String?>(null) }
    var deleting by remember { mutableStateOf(false) }

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
                        dispatch(AuthEvent.GoogleTokenResult(tokenResult))
                        dispatch(
                            AuthEvent.GoogleExchangeResult(
                                repo.signInWithGoogleIdToken(tokenResult.idToken, tokenResult.rawNonce),
                            ),
                        )
                    }
                    else -> dispatch(AuthEvent.GoogleTokenResult(tokenResult))
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

    OmenTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = OmenTheme.color.bg) {
            when (val s = sessionState) {
                SessionState.Loading -> OmenStateSurface(
                    kind = OmenStateSurfaceKind.Loading,
                    title = "Loading Omen",
                    message = "Restoring your session.",
                    modifier = Modifier.padding(OmenTheme.spacing.cardInterior),
                )

                SessionState.NeedsReauth -> Column(
                    modifier = Modifier.padding(OmenTheme.spacing.cardInterior),
                    verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
                ) {
                    Text(
                        text = "Please sign in again",
                        style = OmenTheme.typography.h2.toTextStyle(),
                        color = OmenTheme.color.textPrimary,
                    )
                    Text(
                        text = "Your Omen session expired. Sign in to continue.",
                        style = OmenTheme.typography.body.toTextStyle(),
                        color = OmenTheme.color.textSecondary,
                    )
                    OmenButton(
                        text = "Sign in",
                        onClick = { showAuth = true; sessionManager.signOut() },
                    )
                }

                SessionState.SignedOut -> if (showAuth) {
                    OmenAuthFlow(
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
                } else Column(
                    modifier = Modifier.padding(OmenTheme.spacing.cardInterior),
                    verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
                ) {
                    Text(
                        text = "Welcome to Omen",
                        style = OmenTheme.typography.h1.toTextStyle(),
                        color = OmenTheme.color.textPrimary,
                    )
                    Text(
                        text = "See the move before the league does.",
                        style = OmenTheme.typography.body.toTextStyle(),
                        color = OmenTheme.color.textSecondary,
                    )
                    OmenButton(text = "Try Demo", onClick = { sessionManager.onDemo() }, variant = OmenButtonVariant.Secondary)
                    OmenButton(text = "Get started", onClick = { showAuth = true })
                }

                is SessionState.SignedIn -> if (showDelete) {
                    OmenDeleteAccountScreen(
                        phrase = deletePhrase,
                        message = deleteMessage,
                        deleting = deleting,
                        onPhraseChange = { deletePhrase = it },
                        onConfirm = {
                            deleteMessage = null
                            deleting = true
                            scope.launch {
                                val token = store.load()?.accessToken
                                val outcome = if (token.isNullOrBlank()) AccountDeletionOutcome.Unauthorized
                                else accountRepo.deleteAccount(token, deletePhrase)
                                deleting = false
                                when (outcome) {
                                    AccountDeletionOutcome.Deleted -> {
                                        showDelete = false; deletePhrase = ""; deleteMessage = null
                                        sessionManager.signOut()
                                    }
                                    AccountDeletionOutcome.InvalidConfirmation ->
                                        deleteMessage = "The phrase must exactly match. Nothing was deleted."
                                    AccountDeletionOutcome.Unauthorized ->
                                        deleteMessage = "Your session expired. Sign in again to delete your account."
                                    is AccountDeletionOutcome.RetryableError ->
                                        deleteMessage = "Couldn't reach the server. Nothing was deleted — try again."
                                }
                            }
                        },
                        onCancel = { showDelete = false; deletePhrase = ""; deleteMessage = null },
                    )
                } else Scaffold(
                    containerColor = OmenTheme.color.bg,
                    bottomBar = { OmenBottomNav(selectedDestination) { selectedDestination = it } },
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding),
                    ) {
                        SignedInDestination(
                            destination = selectedDestination,
                            userId = s.userId,
                            onSignOut = { sessionManager.signOut() },
                            onDelete = { showDelete = true }.takeIf { s.userId != SessionManager.DEMO_USER_ID },
                        )
                    }
                }
            }
        }
    }
}

/** Top-level destinations for the signed-in shell. Mirrors iOS `CommandCenterView` tabs. */
private enum class NavDestination(
    val label: String,
    val iconRes: Int,
    val contentDescription: String,
) {
    Command(
        label = "Command",
        iconRes = R.drawable.ic_nav_command,
        contentDescription = "Command Center",
    ),
    Omen(
        label = "Omen",
        iconRes = R.drawable.ic_nav_omen,
        contentDescription = "Omen of the Week",
    ),
    Trade(
        label = "Trade",
        iconRes = R.drawable.ic_nav_trade,
        contentDescription = "Trade Analyzer",
    ),
    Draft(
        label = "Draft",
        iconRes = R.drawable.ic_nav_draft,
        contentDescription = "Draft Assistant",
    ),
    Account(
        label = "Account",
        iconRes = R.drawable.ic_nav_account,
        contentDescription = "Account settings",
    ),
}

@Composable
private fun OmenBottomNav(selected: NavDestination, onSelect: (NavDestination) -> Unit) {
    NavigationBar(
        containerColor = OmenTheme.color.surface1,
        contentColor = OmenTheme.color.textPrimary,
    ) {
        for (destination in NavDestination.entries) {
            NavigationBarItem(
                selected = destination == selected,
                onClick = { onSelect(destination) },
                icon = {
                    Icon(
                        painter = painterResource(id = destination.iconRes),
                        contentDescription = destination.contentDescription,
                    )
                },
                label = {
                    Text(
                        text = destination.label,
                        style = OmenTheme.typography.label.toTextStyle(),
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = OmenTheme.color.accent,
                    selectedTextColor = OmenTheme.color.accent,
                    indicatorColor = OmenTheme.color.accentMuted,
                    unselectedIconColor = OmenTheme.color.textSecondary,
                    unselectedTextColor = OmenTheme.color.textSecondary,
                ),
            )
        }
    }
}

@Composable
private fun SignedInDestination(
    destination: NavDestination,
    userId: String,
    onSignOut: () -> Unit,
    onDelete: (() -> Unit)?,
) {
    when (destination) {
        NavDestination.Command -> OmenCommandCenterScreen(
            state = OmenCommandCenterFixtures.demoConnected,
        )
        NavDestination.Omen, NavDestination.Trade, NavDestination.Draft -> OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "${destination.label} coming next",
            message = "This tab lands in a follow-up M4 slice.",
            modifier = Modifier.padding(OmenTheme.spacing.cardInterior),
        )
        NavDestination.Account -> Column(
            modifier = Modifier.padding(OmenTheme.spacing.cardInterior),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
        ) {
            Text(
                text = "Signed in as $userId",
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            OmenButton(text = "Sign out", onClick = onSignOut, variant = OmenButtonVariant.Secondary)
            if (onDelete != null) {
                OmenButton(text = "Delete account", onClick = onDelete, variant = OmenButtonVariant.Danger)
            }
        }
    }
}
