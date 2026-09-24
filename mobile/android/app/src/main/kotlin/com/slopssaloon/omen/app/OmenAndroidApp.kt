package com.slopssaloon.omen.app

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import com.slopssaloon.omen.app.feature.commandcenter.OmenTeamPicker
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import com.slopssaloon.omen.BuildConfig
import com.slopssaloon.omen.R
import com.slopssaloon.omen.app.auth.OmenAuthFlow
import com.slopssaloon.omen.app.auth.OmenDeleteAccountScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterFixtures
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenLeagueScreen
import com.slopssaloon.omen.app.feature.commandcenter.omenScoutWireState
import com.slopssaloon.omen.app.feature.commandcenter.scoutSummary
import com.slopssaloon.omen.app.feature.commandcenter.waiverUnread
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeAnswer
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeNeedsContextScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeShareScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeVerdictScreen
import com.slopssaloon.omen.app.feature.commandcenter.TradeRosterFlow
import com.slopssaloon.omen.app.feature.commandcenter.omenTradeAnswer
import com.slopssaloon.omen.app.feature.help.OmenHelpSupportScreen
import com.slopssaloon.omen.app.feature.omen.OmenDecisionScreen
import com.slopssaloon.omen.app.auth.AndroidChromeTabsOAuthProvider
import com.slopssaloon.omen.app.auth.CredentialManagerGoogleIdTokenProvider
import com.slopssaloon.omen.app.auth.OAuthCallbackBus
import com.slopssaloon.omen.app.auth.OtpResendController
import com.slopssaloon.omen.app.auth.OkHttpAccountRepository
import com.slopssaloon.omen.app.auth.OkHttpGoTrueTransport
import com.slopssaloon.omen.core.auth.AccountDeletion
import com.slopssaloon.omen.core.auth.AccountDeletionOutcome
import com.slopssaloon.omen.core.auth.OtpCodeValidator
import com.slopssaloon.omen.core.auth.AccountRepository
import com.slopssaloon.omen.core.auth.AuthEvent
import com.slopssaloon.omen.core.auth.AuthFlowReducer
import com.slopssaloon.omen.core.auth.AuthFlowState
import com.slopssaloon.omen.core.auth.AuthOutcome
import com.slopssaloon.omen.core.auth.AuthRepository
import com.slopssaloon.omen.core.auth.AuthRepositorySessionRefresher
import com.slopssaloon.omen.core.auth.FakeAuthRepository
import com.slopssaloon.omen.core.auth.GoogleIdTokenProvider
import com.slopssaloon.omen.core.auth.GoogleIdTokenResult
import com.slopssaloon.omen.core.auth.OAuthCallback
import com.slopssaloon.omen.core.auth.SupabaseAuthRepository
import com.slopssaloon.omen.core.auth.SupabaseOAuthProvider
import com.slopssaloon.omen.core.auth.UnconfiguredGoogleIdTokenProvider
import com.slopssaloon.omen.core.auth.UnconfiguredSupabaseOAuthProvider
import com.slopssaloon.omen.app.feature.api.ApiLeagueDirectoryRepository
import com.slopssaloon.omen.app.feature.api.LeagueCarouselViewModel
import com.slopssaloon.omen.app.feature.api.LeagueSwitcherViewModel
import com.slopssaloon.omen.app.feature.commandcenter.OmenLeagueSwitcherSheet
import com.slopssaloon.omen.app.feature.omen.OmenNoLeagueScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskFootnote
import com.slopssaloon.omen.app.feature.commandcenter.OmenSwitchLoadingScreen
import com.slopssaloon.omen.app.feature.commandcenter.omenDeskCrest
import com.slopssaloon.omen.app.feature.shell.OmenScreenContext
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.app.feature.api.ApiDashboardRepository
import com.slopssaloon.omen.app.feature.api.ApiLeagueRepository
import com.slopssaloon.omen.app.feature.api.ApiPlayerSearchRepository
import com.slopssaloon.omen.app.feature.api.ApiTradeRepository
import com.slopssaloon.omen.app.feature.api.LeagueViewModel
import com.slopssaloon.omen.app.feature.api.TradeViewModel
import com.slopssaloon.omen.app.feature.api.ApiMovesRepository
import com.slopssaloon.omen.app.feature.api.ApiOmenDecisionRepository
import com.slopssaloon.omen.app.feature.api.ApiWaiverAnalysisRepository
import com.slopssaloon.omen.app.feature.api.CommandCenterViewModel
import com.slopssaloon.omen.app.feature.api.OmenApiClient
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.app.feature.api.OmenDecisionViewModel
import com.slopssaloon.omen.app.feature.chrome.OmenAccountConnection
import com.slopssaloon.omen.app.feature.chrome.OmenAccountConnections
import com.slopssaloon.omen.app.feature.chrome.OmenAccountScreen
import com.slopssaloon.omen.app.feature.chrome.OmenAccountState
import com.slopssaloon.omen.app.feature.chrome.OmenBetaReportRepository
import com.slopssaloon.omen.app.feature.chrome.OmenBetaReportScreen
import com.slopssaloon.omen.app.feature.chrome.OmenReportComposer
import com.slopssaloon.omen.app.feature.chrome.OmenReportPill
import com.slopssaloon.omen.app.feature.chrome.OmenPrivacyDataScreen
import com.slopssaloon.omen.app.feature.api.ForcedUpdateScreen
import com.slopssaloon.omen.app.feature.api.MinVersionGateClient
import com.slopssaloon.omen.app.feature.api.UpdateGateState
import com.slopssaloon.omen.app.feature.api.UpdateGateViewModel
import com.slopssaloon.omen.app.feature.connect.CustomTabsProviderAuthSession
import com.slopssaloon.omen.app.feature.connect.ApiConnectRepository
import com.slopssaloon.omen.app.feature.connect.ConnectScreen
import com.slopssaloon.omen.app.feature.help.OmenHelpButton
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.core.designsystem.component.OmenIconButtonSize
import com.slopssaloon.omen.app.feature.connect.ConnectViewModel
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenListRow
import com.slopssaloon.omen.core.designsystem.component.OmenModalSheet
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
 * signed-out users land on the real [AuthFlowReducer], and the signed-in destination hosts the
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
    // Discord OAuth ships in M4-Auth-Providers-v1 as the first user of the provider-agnostic
    // seam. `isConfigured("discord")` is optimistic (Supabase's anon key can't tell us whether
    // a provider is enabled server-side); the transport 404 mapping in SupabaseAuthRepository
    // catches an actually-disabled provider and surfaces OAUTH_PROVIDER_NOT_CONFIGURED.
    val oauthProvider: SupabaseOAuthProvider = remember {
        if (env.supabaseConfigured) AndroidChromeTabsOAuthProvider(context, env.supabaseUrl)
        else UnconfiguredSupabaseOAuthProvider()
    }
    val discordConfigured = remember(oauthProvider) { oauthProvider.isConfigured("discord") }
    val accountRepo: AccountRepository = remember { OkHttpAccountRepository(env.apiBaseUrl) }

    // Installs the token-renewal seam. Without this every authenticated request sends whatever
    // bearer is in secure storage, and a Supabase access token lives one hour — which is how
    // signed-in beta users kept landing back on the sign-in screen.
    remember(sessionManager, repo) { sessionManager.attach(AuthRepositorySessionRefresher(repo)) }

    // M5 slices B + C. Built from the same public `apiBaseUrl` the account repository uses —
    // `AppEnvironment` holds public config only, never a secret. Bearers come from
    // `SessionManager.authorized`, which renews an expiring token before the call.
    val commandCenterViewModel = remember {
        val client = OmenApiClient(env.apiBaseUrl)
        CommandCenterViewModel(
            repository = ApiDashboardRepository(client),
            leagueRepository = ApiLeagueRepository(client),
            movesRepository = ApiMovesRepository(client),
            waiverRepository = ApiWaiverAnalysisRepository(client),
            sessionManager = sessionManager,
        )
    }

    // Visual briefs §10.2. Its own view model for the same reason the decision one has its
    // own: enumerating leagues makes live provider calls and must not block the shell.
    val leagueSwitcherViewModel = remember {
        LeagueSwitcherViewModel(
            repository = ApiLeagueDirectoryRepository(OmenApiClient(env.apiBaseUrl)),
            sessionManager = sessionManager,
        )
    }

    // The Command Center carousel. Its own view model rather than the switcher's: the two read
    // the same route for different reasons, cache different things, and must fail
    // independently — the same reasoning already recorded for the switcher above.
    val leagueCarouselViewModel = remember {
        LeagueCarouselViewModel(
            directoryRepository = ApiLeagueDirectoryRepository(OmenApiClient(env.apiBaseUrl)),
            leagueRepository = ApiLeagueRepository(OmenApiClient(env.apiBaseUrl)),
            sessionManager = sessionManager,
        )
    }

    // M5 slice D. Its own view model rather than a field on the Command Center one: the live
    // engine call is slower and independently failable, so the Omen destination owns its own
    // loading state instead of blocking the shell.
    val omenDecisionViewModel = remember {
        OmenDecisionViewModel(
            repository = ApiOmenDecisionRepository(OmenApiClient(env.apiBaseUrl)),
            sessionManager = sessionManager,
        )
    }

    // M5 slice F. Own view model, matching the Omen destination: `league-overview.v1` makes a
    // live provider call and must not block the shell.
    val leagueViewModel = remember {
        LeagueViewModel(
            repository = ApiLeagueRepository(OmenApiClient(env.apiBaseUrl)),
            sessionManager = sessionManager,
        )
    }

    // M5 slice G. `/api/trade/compare` is free and public, so this one tolerates a null token
    // and still returns a real (neutral) answer.
    val tradeViewModel = remember {
        TradeViewModel(
            repository = ApiTradeRepository(OmenApiClient(env.apiBaseUrl)),
            // Autocomplete is public too — `/api/players/search` takes no bearer.
            playerSearch = ApiPlayerSearchRepository(OmenApiClient(env.apiBaseUrl)),
            sessionManager = sessionManager,
            scope = scope,
        )
    }

    // M5-NativeConnect. Same public base URL; the token is read lazily from secure storage.
    val connectViewModel = remember {
        ConnectViewModel(
            repository = ApiConnectRepository(OmenApiClient(env.apiBaseUrl)),
            sessionManager = sessionManager,
            // Yahoo signs in on Yahoo's own page in a Custom Tab, never in a WebView — the
            // onboarding contract §87 forbids the app hosting a provider login.
            authSession = CustomTabsProviderAuthSession(context),
        )
    }
    var showConnectSheet by remember { mutableStateOf(false) }
    val sessionState by sessionManager.state.collectAsState()

    // O7 forced-update gate. Unauthenticated and independent of session restore — it must be
    // able to block a bad build before the user ever signs in.
    val updateGateViewModel = remember {
        UpdateGateViewModel(
            client = MinVersionGateClient(env.apiBaseUrl),
            currentVersion = BuildConfig.VERSION_NAME,
        )
    }

    // `restoreRefreshing`, not `restore`: the plain restore marks any expired session
    // NeedsReauth immediately, and after the first hour every cold launch has an expired
    // access token. Renew before judging.
    LaunchedEffect(Unit) { sessionManager.restoreRefreshing() }
    LaunchedEffect(Unit) { updateGateViewModel.check() }

    var flow by remember { mutableStateOf<AuthFlowState>(AuthFlowState.Idle) }
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var selectedDestination by remember { mutableStateOf(NavDestination.Command) }
    var showDelete by remember { mutableStateOf(false) }
    var deletePhrase by remember { mutableStateOf("") }
    var deleteMessage by remember { mutableStateOf<String?>(null) }
    var deleting by remember { mutableStateOf(false) }
    var showAccountSheet by remember { mutableStateOf(false) }
    var showSwitcherSheet by remember { mutableStateOf(false) }
    var showHelpSupportSheet by remember { mutableStateOf(false) }
    var showReportComposer by remember { mutableStateOf(false) }
    var showPrivacyData by remember { mutableStateOf(false) }
    val betaReportRepository = remember { OmenBetaReportRepository(OmenApiClient(env.apiBaseUrl)) }

    // The "code didn't arrive" half of email sign-in. Held beside the reducer rather than
    // inside it: a failed resend must not knock the user out of AwaitingOtp and discard the
    // code they may be mid-way through typing.
    val otpResend = remember { OtpResendController() }

    fun dispatch(event: AuthEvent) {
        val next = AuthFlowReducer.reduce(flow, event)
        flow = next
        when (next) {
            is AuthFlowState.RequestingOtp -> scope.launch {
                otpResend.reset()
                val outcome = repo.requestEmailOtp(next.email)
                dispatch(AuthEvent.OtpRequestResult(outcome))
                if (outcome is AuthOutcome.OtpSent) otpResend.startCooldown()
            }
            is AuthFlowState.VerifyingOtp ->
                scope.launch {
                    dispatch(AuthEvent.OtpVerifyResult(repo.verifyEmailOtp(next.email, OtpCodeValidator.normalize(code))))
                }
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
            is AuthFlowState.LaunchingOAuth -> scope.launch {
                // Fire and forget — the callback deep link arrives via OAuthCallbackBus below.
                oauthProvider.launch(next.providerId)
            }
            is AuthFlowState.ExchangingOAuthCode -> Unit // driven by the callback collector
            is AuthFlowState.Authenticated -> {
                sessionManager.onAuthenticated(next.session)
                flow = AuthFlowState.Idle
            }
            else -> Unit
        }
    }

    // Collect OAuth deep-link callbacks fed by MainActivity.onNewIntent. When one arrives
    // while we are in LaunchingOAuth for providerId=X, validate `state`, dispatch
    // OAuthCallbackReceived (→ ExchangingOAuthCode), then run the code exchange and dispatch
    // the terminal OAuthExchangeResult. If we get a callback in any other state, we surface
    // OAUTH_CALLBACK_MISMATCH through the reducer.
    LaunchedEffect(oauthProvider) {
        OAuthCallbackBus.callbacks.collect { uri ->
            // The same deep link carries two different returns. A *provider connect* (Yahoo)
            // comes back with `status=connected|cancelled` and no PKCE code, because the server
            // minted, validated and consumed that OAuth state itself; `ConnectViewModel`'s
            // browser session collects it. Handing it to the sign-in reducer would dispatch a
            // callback with an empty code and push a signed-in user's auth flow into a failure
            // state over a connect that went fine. It is also deliberately NOT cleared here —
            // the connect session is the collector that owns it.
            if (uri.getQueryParameter("status") != null) return@collect
            // Consume the replay immediately. The current handling attempt is authoritative;
            // retaining a completed or rejected callback would make a later collector replay it.
            OAuthCallbackBus.clear()
            val providerId = (flow as? AuthFlowState.LaunchingOAuth)?.providerId ?: run {
                // Not launching anything — feed a mismatch so any stale callback fails safely.
                dispatch(
                    AuthEvent.OAuthCallbackReceived(
                        providerId = "unknown",
                        code = uri.getQueryParameter("code").orEmpty(),
                        state = uri.getQueryParameter("state").orEmpty(),
                    ),
                )
                return@collect
            }
            when (val parsed = oauthProvider.parseCallback(
                providerId = providerId,
                code = uri.getQueryParameter("code"),
                state = uri.getQueryParameter("state"),
            )) {
                is OAuthCallback.Valid -> {
                    dispatch(
                        AuthEvent.OAuthCallbackReceived(
                            providerId = providerId,
                            code = parsed.code,
                            state = uri.getQueryParameter("state").orEmpty(),
                        ),
                    )
                    dispatch(
                        AuthEvent.OAuthExchangeResult(
                            providerId = providerId,
                            outcome = repo.exchangeOAuthCode(
                                providerId = providerId,
                                code = parsed.code,
                                codeVerifier = parsed.codeVerifier,
                            ),
                        ),
                    )
                }
                OAuthCallback.Mismatch, OAuthCallback.Malformed -> {
                    dispatch(
                        AuthEvent.OAuthCallbackReceived(
                            providerId = "unknown", // triggers OAUTH_CALLBACK_MISMATCH branch
                            code = uri.getQueryParameter("code").orEmpty(),
                            state = uri.getQueryParameter("state").orEmpty(),
                        ),
                    )
                }
            }
        }
    }

    OmenTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = OmenTheme.color.bg) {
            val gateState = updateGateViewModel.state
            if (gateState is UpdateGateState.Blocked) {
                ForcedUpdateScreen(
                    minimumVersion = gateState.minimumVersion,
                    onUpdate = {
                        val storeUri = "https://play.google.com/store/apps/details?id=${context.packageName}"
                        runCatching {
                            context.startActivity(
                                Intent(Intent.ACTION_VIEW, Uri.parse(storeUri))
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                            )
                        }
                    },
                )
            } else when (val s = sessionState) {
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
                        onClick = { sessionManager.signOut() },
                    )
                }

                SessionState.SignedOut -> {
                    OmenAuthFlow(
                        state = flow,
                        email = email,
                        code = code,
                        live = env.supabaseConfigured,
                        googleConfigured = env.googleSignInConfigured,
                        discordConfigured = discordConfigured,
                        demoModeEnabled = env.demoModeEnabled,
                        onEmailChange = { email = it },
                        onCodeChange = { code = OtpCodeValidator.normalize(it).take(6) },
                        onSubmitEmail = { dispatch(AuthEvent.EmailSubmitted(email)) },
                        resend = otpResend,
                        onResendCode = {
                            scope.launch {
                                val current = flow
                                if (current is AuthFlowState.AwaitingOtp &&
                                    otpResend.resend(current.email, repo::requestEmailOtp)
                                ) {
                                    otpResend.startCooldown()
                                }
                            }
                        },
                        onSubmitCode = { dispatch(AuthEvent.OtpSubmitted(code)) },
                        onGoogle = { dispatch(AuthEvent.GoogleRequested) },
                        onDiscord = { dispatch(AuthEvent.OAuthRequested(providerId = "discord")) },
                        onReset = { code = ""; dispatch(AuthEvent.Reset) },
                        onTryDemo = { sessionManager.onDemo() },
                    )
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
                            commandCenterViewModel = commandCenterViewModel,
                            omenDecisionViewModel = omenDecisionViewModel,
                            leagueViewModel = leagueViewModel,
                            tradeViewModel = tradeViewModel,
                            leagueCarouselViewModel = leagueCarouselViewModel,
                            onConnect = { showConnectSheet = true },
                            onOpenAccount = { showAccountSheet = true },
                            onSwitchContext = { showSwitcherSheet = true },
                            onOpenOmen = { selectedDestination = NavDestination.Omen },
                            onOpenLeague = { selectedDestination = NavDestination.League },
                        )
                        if (selectedDestination == NavDestination.Command) {
                            OmenReportPill(
                                onClick = { showReportComposer = true },
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12),
                            )
                        }
                    }
                    OmenLeagueSwitcherSheet(
                        visible = showSwitcherSheet,
                        viewModel = leagueSwitcherViewModel,
                        onSelectLeague = { platform, leagueId, teamId ->
                            scope.launch {
                                // §10.3: apply the new context atomically across the
                                // personalized surfaces — but only when the switch actually
                                // took. A null return means it did not, and re-reading for
                                // the old context would present it as new.
                                val refresh = leagueSwitcherViewModel.select(platform, leagueId, teamId)
                                if (refresh != null) {
                                    showSwitcherSheet = false
                                    commandCenterViewModel.load(s.userId)
                                    omenDecisionViewModel.load(s.userId)
                                }
                            }
                        },
                        onConnectAnother = {
                            showSwitcherSheet = false
                            showConnectSheet = true
                        },
                        onManageConnections = {
                            showSwitcherSheet = false
                            showAccountSheet = true
                        },
                        onDismiss = { showSwitcherSheet = false },
                    )
                    LaunchedEffect(showSwitcherSheet) {
                        if (showSwitcherSheet) leagueSwitcherViewModel.load(s.userId)
                    }
                    OmenModalSheet(
                        visible = showConnectSheet,
                        onDismissRequest = { showConnectSheet = false },
                        title = "Connect",
                    ) {
                        // M6-ContextualHelp above the flow rather than inside a single step,
                        // so it is still reachable from the error, on-hold, and
                        // ESPN-unsupported states — where "why can't I connect this?" is asked.
                        ContextualHelpRow(OmenHelpDestination.Connect)
                        ConnectScreen(
                            viewModel = connectViewModel,
                            onConnected = {
                                showConnectSheet = false
                                // Re-read the shell so the new connection shows immediately
                                // rather than waiting for the next cold launch.
                                scope.launch { commandCenterViewModel.load(s.userId) }
                            },
                            onDismiss = { showConnectSheet = false },
                        )
                    }
                    OmenModalSheet(
                        visible = showAccountSheet,
                        onDismissRequest = { showAccountSheet = false },
                        title = "Account",
                    ) {
                        OmenAccountScreen(
                            state = OmenAccountState(
                                identity = s.userId,
                                connections = accountConnections(leagueSwitcherViewModel.viewState),
                            ),
                            onAddLeague = { showAccountSheet = false; showConnectSheet = true },
                            onReportProblem = { showReportComposer = true },
                            onHelp = { showHelpSupportSheet = true },
                            onPrivacy = { showPrivacyData = true },
                            onSignOut = {
                                showAccountSheet = false
                                sessionManager.signOut()
                            },
                        )
                    }
                    LaunchedEffect(showAccountSheet) {
                        if (showAccountSheet) leagueSwitcherViewModel.load(s.userId)
                    }
                    OmenModalSheet(
                        visible = showPrivacyData,
                        onDismissRequest = { showPrivacyData = false },
                        title = "Privacy & data",
                    ) {
                        OmenPrivacyDataScreen(
                            onDelete = if (s.userId != SessionManager.DEMO_USER_ID) {
                                { showPrivacyData = false; showAccountSheet = false; showDelete = true }
                            } else null,
                            onClose = { showPrivacyData = false },
                        )
                    }
                    OmenModalSheet(
                        visible = showReportComposer,
                        onDismissRequest = { showReportComposer = false },
                        title = "Report a problem",
                    ) {
                        OmenReportComposer(
                            screen = OmenBetaReportScreen.CommandCenter,
                            send = { report ->
                                val token = store.load()?.accessToken
                                if (token.isNullOrBlank()) {
                                    com.slopssaloon.omen.app.feature.chrome.OmenBetaReportOutcome.Failed(
                                        "Your session expired. Nothing was saved."
                                    )
                                } else betaReportRepository.send(report, token)
                            },
                            onDone = { showReportComposer = false },
                        )
                    }
                    OmenModalSheet(
                        visible = showHelpSupportSheet,
                        onDismissRequest = { showHelpSupportSheet = false },
                        title = "Help + Support",
                    ) {
                        OmenHelpSupportScreen(showTitle = false)
                    }
                }
            }
        }
    }
}

/**
 * Top-level destinations for the signed-in shell — Command · Omen · Trade · League, per
 * M0c §12.5 approved navigation contract. Draft is a *seasonal* destination reached
 * through League and promoted from Command Center during draft-relevant periods; it is
 * NOT a permanent tab. Account is contextual, reached via the Command Center header
 * profile control (see [OmenCommandCenterScreen]'s `onOpenAccount`), NOT a permanent tab.
 *
 * The `ic_nav_draft.xml` and `ic_nav_account.xml` drawables remain checked in for the
 * seasonal Draft reintroduction inside League and the Account header affordance
 * respectively — neither is orphaned. League uses its own group glyph so it cannot be
 * mistaken for the contextual Account action.
 */
/**
 * The permanent 4-tab navigation contract.
 *
 * **Internal, not private, since 2026-08-30.** The screenshot harness used to carry its own
 * `FauxNavTab` mirror of this list. A mirror is a duplicate, and duplicates drift — that is how
 * the harness came to render Trade and League as stubs for a day after the real screens shipped
 * (`F-VET-B01`). One definition cannot drift from itself.
 */
internal enum class NavDestination(
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
    League(
        label = "League",
        iconRes = R.drawable.ic_nav_league,
        contentDescription = "League",
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
                        // At font scale 2.0 (Android's accessibility maximum) an unconstrained
                        // label overflows its nav item: "Command" wrapped to "Comma / nd" and
                        // spilled below the row, and "League" was clipped at the screen edge.
                        // Four items cannot show full labels at 2x on a phone, so the choice is
                        // *how* it degrades — predictable ellipsis inside the item, or text
                        // drawn outside its bounds. Found 2026-08-22 by rendering, not by any
                        // test: nothing here is assertable without looking at the pixels.
                        //
                        // Meaning is preserved for screen readers regardless — Compose keeps the
                        // full string in the semantics tree even when it is visually ellipsized,
                        // and each item's icon carries its own contentDescription.
                        maxLines = 1,
                        softWrap = false,
                        overflow = TextOverflow.Ellipsis,
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
    commandCenterViewModel: CommandCenterViewModel,
    omenDecisionViewModel: OmenDecisionViewModel,
    leagueViewModel: LeagueViewModel,
    tradeViewModel: TradeViewModel,
    leagueCarouselViewModel: LeagueCarouselViewModel,
    onConnect: () -> Unit,
    onOpenAccount: () -> Unit,
    onOpenOmen: () -> Unit,
    onOpenLeague: () -> Unit,
    onSwitchContext: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    suspend fun loadLeagueForSelectedContext() {
        val page = leagueCarouselViewModel.currentPage ?: leagueCarouselViewModel.allPages.firstOrNull { it.isActive }
        leagueViewModel.load(userId, page?.platform, page?.leagueId)
    }

    // J4: `TradeBuild`/`TradeRoster` over `GET /api/trade/roster`, and `TradeShare` over
    // `POST /api/trade/share`. Local to this destination — nothing else needs them.
    var showTradeRosterSheet by remember { mutableStateOf(false) }
    var showTradeShareSheet by remember { mutableStateOf(false) }

    when (destination) {
        NavDestination.Command -> {
            LaunchedEffect(userId) { commandCenterViewModel.load(userId) }
            val failure = commandCenterViewModel.failure
            val committingPage = leagueCarouselViewModel.committingPageId?.let { committingId ->
                leagueCarouselViewModel.allPages.firstOrNull { it.id == committingId }
            }
            if (committingPage != null) {
                // §10.3, wired — the iOS twin is `CommandCenterView.switchingContext`.
                //
                // A league switch used to leave the outgoing team's scoreboard on screen until
                // the new read landed, and for that second the numbers belonged to one team and
                // the name above them to another. The contract is explicit that "the previous
                // team's numbers are discarded, never reused while loading", so the desk goes to
                // its mid-switch state and the switcher bar commits to the incoming team at
                // once — the one thing on the screen that is actually known.
                //
                // The state is read off `committingPageId`, which the carousel already maintains
                // and `OmenTeamPicker` and `OmenLeagueCarousel` already read. A second flag for
                // "is a switch happening" would be a second answer to one question.
                val platform = when (committingPage.platform.lowercase()) {
                    "yahoo" -> OmenPlatform.Yahoo
                    "sleeper" -> OmenPlatform.Sleeper
                    else -> OmenPlatform.Espn
                }
                val providerName = when (platform) {
                    OmenPlatform.Yahoo -> "Yahoo"
                    OmenPlatform.Sleeper -> "Sleeper"
                    else -> "ESPN"
                }
                OmenSwitchLoadingScreen(
                    context = OmenScreenContext(
                        crest = omenDeskCrest(committingPage.displayTeamName),
                        teamName = committingPage.displayTeamName,
                        platform = platform,
                        leagueName = committingPage.leagueName,
                    ),
                    // No week label mid-switch: the week belongs to the read that has not landed,
                    // and carrying the outgoing team's week over is the same reuse §10.3 forbids.
                    weekLabel = "",
                    footnote = OmenDeskFootnote(
                        text = "Reading ${committingPage.displayTeamName} from $providerName.",
                        emphasis = "The previous team's numbers are gone, not reused.",
                    ),
                    onOpenAccount = onOpenAccount,
                )
            } else if (failure != null) {
                // M5 slice B: an unreadable shell renders an explicit failure surface. It must
                // NOT silently fall through to the disconnected fixture, which would state as
                // fact that the user has no leagues.
                Column(
                    modifier = Modifier.padding(OmenTheme.spacing.cardInterior),
                    verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16),
                ) {
                    OmenStateSurface(
                        kind = OmenStateSurfaceKind.Error,
                        title = "Couldn't reach Omen",
                        message = commandCenterFailureMessage(failure),
                    )
                    OmenButton(
                        text = "Try again",
                        onClick = { scope.launch { commandCenterViewModel.load(userId) } },
                        variant = OmenButtonVariant.Secondary,
                    )
                }
            } else if (commandCenterViewModel.hasNoConnectedLeague) {
                // J1's terminus, wired — the iOS twin is `CommandCenterView`'s
                // `hasNoConnectedLeague` branch. Until now this screen existed only in a
                // screenshot scenario: captured, and unreachable by any real user, which is a
                // screenshot of nothing. The Command Center's own furniture renders as a broken
                // dashboard when there is no league; this says why it is empty instead.
                OmenNoLeagueScreen(
                    onConnect = onConnect,
                    onSeeHowOmenDecides = onOpenOmen,
                )
            } else {
                OmenCommandCenterScreen(
                    state = commandCenterViewModel.commandCenterState,
                    loadReceipt = { commandCenterViewModel.loadReceipt(it) },
                    // Passing this is what makes the strip's switch affordance render at
                    // all — OmenContextStrip hides it when onSwitch is null, which is why a
                    // user with a connected league previously had no way to choose it.
                    onSwitchContext = onSwitchContext,
                    onConnect = onConnect,
                    onOpenAccount = onOpenAccount,
                    onOpenOmen = onOpenOmen,
                    onOpenLeague = onOpenLeague,
                    carousel = leagueCarouselViewModel,
                    userId = userId,
                    // §10.3: the server names the surfaces a context change invalidates, and
                    // the client re-reads them rather than deciding for itself. The Omen and
                    // League destinations reload on their own LaunchedEffect, so the shell is
                    // the one that has to be told.
                    onContextChanged = {
                        scope.launch {
                            commandCenterViewModel.load(userId)
                            loadLeagueForSelectedContext()
                            omenDecisionViewModel.load(userId)
                        }
                    },
                )
            }
        }
        NavDestination.Omen -> {
            // M5 slice D: the Omen destination renders the live engine's answer. Previously
            // this picked a fixture — `realDisconnected` for every real signed-in user,
            // regardless of their actual leagues.
            LaunchedEffect(userId) {
                omenDecisionViewModel.onConnect = onConnect
                omenDecisionViewModel.load(userId)
            }
            WithTeamPicker(leagueCarouselViewModel, userId, onContextChanged = {
                    scope.launch {
                        // Every personalized surface, not just the visible one — a user who
                        // switches on Trade and then taps League must not find the old team
                        // there.
                        commandCenterViewModel.load(userId)
                        loadLeagueForSelectedContext()
                        omenDecisionViewModel.load(userId)
                    }
                }) {
                OmenDecisionScreen(
                    state = omenDecisionViewModel.briefState(
                        onReload = { scope.launch { omenDecisionViewModel.reload() } },
                    ),
                )
            }
        }
        // M5 slice G: the Trade destination now renders `trade-compare.v2`.
        NavDestination.Trade -> {
            // The league Trade personalizes against comes from the SAME `league-overview.v1`
            // read the League destination uses, so the two screens can never disagree about
            // which league the user is in.
            val leagueState = leagueViewModel.viewState
            LaunchedEffect(leagueState) {
                val loaded = leagueState as? LeagueViewModel.ViewState.Loaded
                tradeViewModel.useLeague(loaded?.overview?.platform, loaded?.overview?.leagueId)
            }
            WithTeamPicker(leagueCarouselViewModel, userId, onContextChanged = {
                    scope.launch {
                        // Every personalized surface, not just the visible one — a user who
                        // switches on Trade and then taps League must not find the old team
                        // there.
                        commandCenterViewModel.load(userId)
                        loadLeagueForSelectedContext()
                        omenDecisionViewModel.load(userId)
                    }
                }) {
                // J4: once the server has answered, the answer is J4's screen rather than the
                // builder's inline verdict. `omenTradeAnswer` picks `TradeVerdict` or
                // `TradeNeedsContext` off `verdict_state` — the same seat in the journey, in the
                // two states the contract returns it in. `TradeBuild`/`TradeRoster` (real
                // opponent rosters, `GET /api/trade/roster`, via `TradeRosterFlow`) and
                // `TradeShare` (`POST /api/trade/share`) route independently below, since neither
                // is "the answer" — see `omenTradeAnswer`'s doc comment.
                val loadedCompare = (tradeViewModel.viewState as? TradeViewModel.ViewState.Loaded)?.result
                val answer = loadedCompare?.let { omenTradeAnswer(it, tradeViewModel.offer) }
                when (answer) {
                    is OmenTradeAnswer.Verdict -> OmenTradeVerdictScreen(
                        state = answer.state,
                        onOpenAccount = onOpenAccount,
                        // Keeps the offer. A user who reads "you give up too much" wants to
                        // change one player, not retype the deal.
                        onPrimaryAction = { tradeViewModel.dismissVerdict() },
                        onShare = { showTradeShareSheet = true },
                    )
                    is OmenTradeAnswer.NeedsContext -> OmenTradeNeedsContextScreen(
                        state = answer.state,
                        onOpenAccount = onOpenAccount,
                        onConnect = onConnect,
                        onShowAnyway = { tradeViewModel.dismissVerdict() },
                    )
                    null -> OmenTradeScreen(
                        state = tradeViewModel.viewState,
                        offer = tradeViewModel.offer,
                        searchState = tradeViewModel.searchState,
                        searchingSide = tradeViewModel.searchingSide,
                        onQueryChanged = { text, side -> tradeViewModel.search(text, side) },
                        onAdd = { name, side -> tradeViewModel.add(name, side) },
                        onAddResult = { player, side -> tradeViewModel.add(player, side) },
                        onRemove = { index, side -> tradeViewModel.remove(index, side) },
                        onCompare = { scope.launch { tradeViewModel.compare(userId) } },
                        onBrowseRoster = { showTradeRosterSheet = true },
                        capabilities = tradeViewModel.capabilities,
                    )
                }
                LaunchedEffect(Unit) { tradeViewModel.loadCapabilities() }
            }
            OmenModalSheet(
                visible = showTradeRosterSheet,
                onDismissRequest = { showTradeRosterSheet = false },
                title = "Trade",
            ) {
                TradeRosterFlow(
                    tradeViewModel = tradeViewModel,
                    userId = userId,
                    onOpenAccount = onOpenAccount,
                    onDismiss = { showTradeRosterSheet = false },
                )
            }
            OmenModalSheet(
                visible = showTradeShareSheet,
                onDismissRequest = {
                    showTradeShareSheet = false
                    tradeViewModel.dismissShare()
                },
                title = "Share",
            ) {
                val shareState = tradeViewModel.shareScreenState
                if (shareState != null) {
                    val clipboard = LocalClipboardManager.current
                    OmenTradeShareScreen(
                        state = shareState,
                        onOpenAccount = onOpenAccount,
                        onToggleInclusion = { tradeViewModel.toggleShareInclusion(it) },
                        onShare = { scope.launch { tradeViewModel.share(userId) } },
                        onCopyAsText = {
                            tradeViewModel.copyShareText()?.let { clipboard.setText(AnnotatedString(it)) }
                        },
                    )
                }
            }
        }
        // M5 slice F: the League destination now renders `league-overview.v1`. It replaced an
        // honest "landing next" placeholder, which was correct while the screen contract was
        // unratified and is no longer.
        NavDestination.League -> {
            LaunchedEffect(userId) { loadLeagueForSelectedContext() }
            WithTeamPicker(leagueCarouselViewModel, userId, onContextChanged = {
                    scope.launch {
                        // Every personalized surface, not just the visible one — a user who
                        // switches on Trade and then taps League must not find the old team
                        // there.
                        commandCenterViewModel.load(userId)
                        loadLeagueForSelectedContext()
                        omenDecisionViewModel.load(userId)
                    }
                }) {
                OmenLeagueScreen(
                    state = leagueViewModel.viewState,
                    onRetry = { scope.launch { leagueViewModel.reload() } },
                    onConnect = onConnect,
                    // E017 carries both controls, and `OmenScreenHeaderControls` renders the
                    // account one only when this is non-null. Without it League — and the wire
                    // sheet it presents, which inherits this same lambda — would be the only
                    // signed-in surfaces with no route to the account.
                    onOpenAccount = onOpenAccount,
                    // The wire comes from the SAME `waiver-analysis.v1` read Command Center
                    // already makes, for the reason Trade takes its league from the League
                    // destination's read: two surfaces that fetch the wire separately can
                    // disagree about it on screen.
                    //
                    // Null until that read lands, which removes the section link rather than
                    // opening an empty sheet.
                    wire = commandCenterViewModel.waiverAnalysis?.let {
                        omenScoutWireState(it, leagueViewModel.wireWeekLabel)
                    },
                    waiverSummary = commandCenterViewModel.waiverAnalysis?.scoutSummary
                        ?: waiverUnread,
                )
            }
        }
    }
}


/**
 * Wraps a destination in the team picker.
 *
 * Omen, Trade and League each answer a question about one league, so each gets the row that
 * changes which one. Command Center does not — its carousel already IS the picker, and two of
 * them on one screen would be a control competing with itself.
 * iOS mirror: `CommandCenterView.withTeamPicker`.
 */
@Composable
private fun WithTeamPicker(
    viewModel: LeagueCarouselViewModel,
    userId: String,
    onContextChanged: () -> Unit,
    content: @Composable () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().background(OmenTheme.color.bg)) {
        OmenTeamPicker(
            viewModel = viewModel,
            userId = userId,
            onContextChanged = { onContextChanged() },
            modifier = Modifier.padding(
                horizontal = OmenTheme.spacing.step16,
                vertical = OmenTheme.spacing.step12,
            ),
        )
        content()
    }
}

/**
 * M6-ContextualHelp affordance for a sheet whose title is owned by [OmenModalSheet].
 * Right-aligned on its own row so it never displaces the sheet's own content or actions.
 */
@Composable
private fun ContextualHelpRow(destination: OmenHelpDestination) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.End,
    ) {
        OmenHelpButton(destination, size = OmenIconButtonSize.Sm)
    }
}

private fun accountConnections(state: LeagueSwitcherViewModel.ViewState): OmenAccountConnections = when (state) {
    is LeagueSwitcherViewModel.ViewState.Loaded -> {
        val rows = state.directory.platforms.flatMap { group ->
            group.leagues.map { league ->
                OmenAccountConnection(
                    id = "${group.platform}:${league.leagueId}",
                    platform = when (group.platform.lowercase()) {
                        "espn" -> OmenPlatform.Espn
                        "yahoo" -> OmenPlatform.Yahoo
                        else -> OmenPlatform.Sleeper
                    },
                    teamName = league.teamName ?: "Team unavailable",
                    leagueName = league.leagueName ?: "League name unavailable",
                )
            }
        }
        if (rows.isEmpty()) OmenAccountConnections.None else OmenAccountConnections.Loaded(rows)
    }
    LeagueSwitcherViewModel.ViewState.Demo -> OmenAccountConnections.None
    LeagueSwitcherViewModel.ViewState.Loading,
    is LeagueSwitcherViewModel.ViewState.Failed -> OmenAccountConnections.Unavailable
}

/**
 * User-facing copy for a shell read failure. Deliberately says what the user can do and never
 * surfaces a token, URL, or provider identifier — [OmenApiError] carries only a status code, so
 * there is nothing sensitive to leak here by construction.
 */
private fun commandCenterFailureMessage(error: OmenApiError): String = when (error) {
    is OmenApiError.Network ->
        "We couldn't reach Omen. Check your connection and try again."
    is OmenApiError.Unauthorized ->
        "Your session expired. Sign in again to see your leagues."
    is OmenApiError.Server ->
        "Omen had a problem on our side (error ${error.status}). Try again in a moment."
    is OmenApiError.Decode ->
        "Omen sent something this version of the app couldn't read. Updating the app may fix it."
}
