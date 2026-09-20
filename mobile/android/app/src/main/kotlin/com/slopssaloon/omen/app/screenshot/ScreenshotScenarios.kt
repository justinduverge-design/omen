package com.slopssaloon.omen.app.screenshot

import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import com.slopssaloon.omen.R
import com.slopssaloon.omen.app.auth.OmenAuthFlow
import com.slopssaloon.omen.app.auth.OtpResendController
import com.slopssaloon.omen.app.feature.api.ForcedUpdateScreen
import com.slopssaloon.omen.app.feature.api.StartSitDetail
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterFixtures
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandDeskScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandQuietScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskFootnote
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskLedgerLine
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskLedgerOutcome
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskMatchup
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskSection
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskState
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskTeam
import com.slopssaloon.omen.app.feature.commandcenter.OmenDeskWaiverMove
import com.slopssaloon.omen.app.feature.commandcenter.OmenQuietState
import com.slopssaloon.omen.app.feature.commandcenter.OmenQuietVariant
import com.slopssaloon.omen.app.feature.commandcenter.OmenSwitchFilter
import com.slopssaloon.omen.app.feature.commandcenter.OmenSwitchGroup
import com.slopssaloon.omen.app.feature.commandcenter.OmenSwitchLoadingScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeBuildScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeBuildState
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeCapability
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeFilter
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeInput
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeLeg
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeNeedsContextScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeNeedsContextState
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradePartner
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeRead
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeRosterScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeRosterState
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeShareScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeShareState
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeSide
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeSubmission
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeVerdictScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeVerdictState
import com.slopssaloon.omen.app.feature.commandcenter.OmenSwitchRow
import com.slopssaloon.omen.app.feature.commandcenter.OmenSwitchSheetOverlay
import com.slopssaloon.omen.app.feature.commandcenter.OmenSwitchSheetState
import com.slopssaloon.omen.app.feature.shell.OmenScreenContext
import com.slopssaloon.omen.core.designsystem.component.OmenConfidenceBand
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.app.feature.api.LeagueCarouselViewModel
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterState
import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverWatchState
import com.slopssaloon.omen.app.feature.help.ContextualHelpContent
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.app.feature.help.OmenHelpSupportScreen
import com.slopssaloon.omen.app.feature.help.OmenHelpSupportState
import com.slopssaloon.omen.core.designsystem.component.OmenContextualHelpSheet
import com.slopssaloon.omen.app.feature.api.LeagueOverview
import com.slopssaloon.omen.app.feature.api.LeagueViewModel
import com.slopssaloon.omen.app.feature.api.TradeCompare
import com.slopssaloon.omen.app.feature.api.TradeOffer
import com.slopssaloon.omen.app.feature.api.TradePlayer
import com.slopssaloon.omen.app.feature.api.TradeViewModel
import com.slopssaloon.omen.app.feature.commandcenter.OmenLeagueScreen
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeScreen
import com.slopssaloon.omen.app.feature.connect.ConnectException
import com.slopssaloon.omen.app.feature.connect.ConnectFailure
import com.slopssaloon.omen.app.feature.connect.ConnectProvider
import com.slopssaloon.omen.app.feature.connect.ConnectRepository
import com.slopssaloon.omen.app.feature.connect.FollowedLeague
import com.slopssaloon.omen.app.feature.connect.ConnectScreen
import com.slopssaloon.omen.app.feature.connect.ConnectViewModel
import com.slopssaloon.omen.app.feature.connect.EspnCapture
import com.slopssaloon.omen.app.feature.connect.EspnConnection
import com.slopssaloon.omen.app.feature.connect.EspnLeagueOption
import com.slopssaloon.omen.app.feature.connect.ProviderAuthOutcome
import com.slopssaloon.omen.app.feature.connect.ResolvedSleeperAccount
import com.slopssaloon.omen.app.feature.connect.SleeperLeague
import com.slopssaloon.omen.app.feature.connect.StubProviderAuthSession
import com.slopssaloon.omen.app.feature.connect.YahooLeague
import com.slopssaloon.omen.app.feature.omen.OmenDecisionFixtures
import com.slopssaloon.omen.app.feature.omen.OmenDecisionScreen
import com.slopssaloon.omen.app.feature.omen.OmenConnectFailedScreen
import com.slopssaloon.omen.app.feature.omen.OmenEvidenceScreen
import com.slopssaloon.omen.app.feature.omen.OmenNoLeagueScreen
import com.slopssaloon.omen.app.feature.omen.OmenStartSitScreen
import com.slopssaloon.omen.core.auth.AuthFlowState
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager

/**
 * Reusable screenshot-mode registry for the native-visual-evidence CI workflow. The
 * MainActivity reads the intent extra `OMEN_SCREENSHOT_SCENARIO` on launch — if the value
 * matches an entry here, the app mounts *only* that scenario against fully deterministic
 * in-app fixtures (no session/auth, no network, no fabricated provider state) and the
 * workflow captures a screenshot.
 *
 * Adding a scenario for a future M4 screen means adding one entry to [entries] and one
 * matrix row to `.github/workflows/native-visual-evidence.yml`. No workflow rewrite,
 * no shell change, no app-side plumbing beyond this file and its iOS twin.
 *
 * Naming rule: `<screen-slug>.<state-slug>` — kebab-case, dot-separated, lowercase. The
 * platform-agnostic scenario slug is the primary key across iOS and Android so artifact
 * pairs share the same suffix.
 */
object ScreenshotScenarios {

    const val INTENT_EXTRA: String = "OMEN_SCREENSHOT_SCENARIO"

    /** Every declared scenario. Add rows here to extend the workflow matrix. */
    val entries: Map<String, ScreenshotScenario> = linkedMapOf(
        "onboarding.sign-in" to ScreenshotScenario(
            label = "Onboarding — sign in first",
            render = { OnboardingAuthBody(AuthFlowState.Idle) },
        ),
        "onboarding.email-code" to ScreenshotScenario(
            label = "Onboarding — email code",
            render = { OnboardingAuthBody(AuthFlowState.AwaitingOtp("justin@slopssaloon.com")) },
        ),
        "onboarding.connect-league" to ScreenshotScenario(
            label = "Onboarding — connect your league",
            render = { OnboardingConnectBody() },
        ),
        "command-center.demo-connected" to ScreenshotScenario(
            label = "Command Center — demo/mock connected",
            render = { CommandCenterInShell(demo = true) },
        ),
        "command-center.long-matchup" to ScreenshotScenario(
            label = "Command Center — long fantasy team names in matchup",
            render = { CommandCenterInShell(state = OmenCommandCenterFixtures.longNameMatchup) },
        ),
        // The `carousel != null` branch — a real multi-league account. Every other Command
        // Center scenario runs the stacked `carousel == null` layout, which is why three
        // clipping bugs reached the founder's phone before anything here could catch them.
        "command-center.carousel" to ScreenshotScenario(
            label = "Command Center — six leagues, live carousel",
            render = {
                val vm = remember { CarouselFixtures.viewModel() }
                LaunchedEffect(Unit) { vm.load(userId = "fixture") }
                CommandCenterInShell(demo = false, carousel = vm)
            },
        ),
        "command-center.carousel-provider-down" to ScreenshotScenario(
            label = "Command Center — carousel with one provider failing",
            render = {
                val vm = remember { CarouselFixtures.viewModel(failingPlatform = "espn") }
                LaunchedEffect(Unit) { vm.load(userId = "fixture") }
                CommandCenterInShell(demo = false, carousel = vm)
            },
        ),
        "command-center.disconnected" to ScreenshotScenario(
            label = "Command Center — real user, disconnected",
            render = { CommandCenterInShell(demo = false) },
        ),
        "omen.demo" to ScreenshotScenario(
            label = "Omen — demo/mock decision",
            render = { OmenInShell(demo = true) },
        ),
        "omen.disconnected" to ScreenshotScenario(
            label = "Omen — real user, disconnected",
            render = { OmenInShell(demo = false) },
        ),
        // J3 — The first call. The numbered suffix is the contact-sheet order. Both passes
        // traverse the same three compositions so degraded evidence cannot be mistaken for an
        // optional edge case covered by a nominal-only screenshot.
        // J1 "Getting in". The journey has no capability profile, so per screen-journeys-v1 the
        // provider failure path is its degraded pass — and it is the only confirmed beta failure.
        "journey-j1.nominal.04-espn-consent" to ScreenshotScenario(
            label = "J1 4/6 — ESPN consent, before the sheet opens",
            render = { OnboardingConnectBody(autoSelectProvider = ConnectProvider.Espn) },
        ),
        "journey-j1.degraded.05-connect-failed" to ScreenshotScenario(
            label = "J1 degraded 5/6 — ESPN refused a stale session",
            render = {
                // Scaffold, not bare: without it the eyebrow renders under the status bar. The
                // J3 scenarios got their insets from J3InShell's Scaffold and these did not.
                // No bottom bar — this screen is inside the connect flow, not a tab.
                J1InShell(tab = null) { modifier ->
                    OmenConnectFailedScreen(
                        modifier = modifier,
                        provider = "ESPN",
                        statusCode = 401,
                        statusText = "Unauthorized",
                        // A fixture league id. No cookie value appears here, and none may.
                        leagueId = "884411",
                        observedAt = "3:48 PM",
                        unaffected = listOf("Sleeper", "Yahoo"),
                        onReconnect = {},
                        onSendToSupport = {},
                    )
                }
            },
        ),
        "journey-j1.nominal.06-command-no-league" to ScreenshotScenario(
            label = "J1 6/6 — signed in, no league connected",
            render = {
                J1InShell(tab = FauxNavTab.Command) { modifier ->
                    OmenNoLeagueScreen(
                        modifier = modifier,
                        onConnect = {},
                        onSeeHowOmenDecides = {},
                    )
                }
            },
        ),
        // J2 — "the desk". The numbering is the storyboard order: arrive at Command, open the
        // switcher, watch the new team resolve, and see what the desk says on a quiet week.
        //
        // The degraded pass is not a fifth screen. `CONTRACTS.md` gives Command Center its own
        // rule — "Every section fails independently; a dead matchup read sits beside live
        // standings" — so the same four frames run with `league_matchup` unavailable and
        // `league_standings` read-but-unused, which is exactly the pair
        // `capability-expression-v1.md` requires of a degraded pass for a `consumes` profile.
        //
        // `CommandQuiet` appears only in the nominal pass and `CommandQuietStraight` only in the
        // degraded one, and that is the contract rather than a convenience: the neutral variant
        // requires *all* positive quiet evidence, so it cannot occur in a pass where a provider
        // failed. Straight fires on exactly that.
        "journey-j2.nominal.01-command-center" to ScreenshotScenario(
            label = "J2 nominal 1/4 — the desk, everything read",
            render = {
                J2InShell { modifier ->
                    OmenCommandDeskScreen(
                        state = J2ScreenshotFixtures.nominalDesk,
                        modifier = modifier,
                        context = J2ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onOpenLeague = {},
                        onOpenLedger = {},
                    )
                }
            },
        ),
        "journey-j2.nominal.02-switch-sheet" to ScreenshotScenario(
            label = "J2 nominal 2/4 — the switcher sheet over the desk",
            render = {
                J2InShell { modifier ->
                    OmenSwitchSheetOverlay(
                        state = J2ScreenshotFixtures.nominalSwitchSheet,
                        modifier = modifier,
                        onSelectFilter = {},
                        onSelectRow = {},
                        onToggleFavorite = {},
                        onDismiss = {},
                    ) {
                        OmenCommandDeskScreen(
                            state = J2ScreenshotFixtures.nominalDesk,
                            context = J2ScreenshotFixtures.titansContext,
                            onOpenAccount = {},
                        )
                    }
                }
            },
        ),
        "journey-j2.nominal.03-switch-loading" to ScreenshotScenario(
            label = "J2 nominal 3/4 — mid-switch, nothing reused",
            render = {
                J2InShell { modifier ->
                    OmenSwitchLoadingScreen(
                        context = J2ScreenshotFixtures.davantesContext,
                        weekLabel = "Week 7 · Sunday",
                        footnote = J2ScreenshotFixtures.switchingFootnote,
                        modifier = modifier,
                        onOpenAccount = {},
                    )
                }
            },
        ),
        "journey-j2.nominal.04-command-quiet" to ScreenshotScenario(
            label = "J2 nominal 4/4 — a quiet week, neutral variant",
            render = {
                J2InShell { modifier ->
                    OmenCommandQuietScreen(
                        state = J2ScreenshotFixtures.quietNeutral,
                        modifier = modifier,
                        context = J2ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                    )
                }
            },
        ),
        "journey-j2.degraded.01-command-center" to ScreenshotScenario(
            label = "J2 degraded 1/4 — dead matchup read beside a live wire",
            render = {
                J2InShell { modifier ->
                    OmenCommandDeskScreen(
                        state = J2ScreenshotFixtures.degradedDesk,
                        modifier = modifier,
                        context = J2ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onOpenLeague = {},
                        onOpenLedger = {},
                    )
                }
            },
        ),
        "journey-j2.degraded.02-switch-sheet" to ScreenshotScenario(
            label = "J2 degraded 2/4 — switcher naming the provider it could not list",
            render = {
                J2InShell { modifier ->
                    OmenSwitchSheetOverlay(
                        state = J2ScreenshotFixtures.degradedSwitchSheet,
                        modifier = modifier,
                        onSelectFilter = {},
                        onSelectRow = {},
                        onToggleFavorite = {},
                        onDismiss = {},
                    ) {
                        OmenCommandDeskScreen(
                            state = J2ScreenshotFixtures.degradedDesk,
                            context = J2ScreenshotFixtures.titansContext,
                            onOpenAccount = {},
                        )
                    }
                }
            },
        ),
        "journey-j2.degraded.03-switch-loading" to ScreenshotScenario(
            label = "J2 degraded 3/4 — mid-switch after a partial read",
            render = {
                J2InShell { modifier ->
                    OmenSwitchLoadingScreen(
                        context = J2ScreenshotFixtures.davantesContext,
                        weekLabel = "Week 7 · Sunday",
                        footnote = J2ScreenshotFixtures.switchingFootnote,
                        modifier = modifier,
                        onOpenAccount = {},
                    )
                }
            },
        ),
        "journey-j2.degraded.04-command-quiet-straight" to ScreenshotScenario(
            label = "J2 degraded 4/4 — a quiet week after a loss, straight variant",
            render = {
                J2InShell { modifier ->
                    OmenCommandQuietScreen(
                        state = J2ScreenshotFixtures.quietStraight,
                        modifier = modifier,
                        context = J2ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                    )
                }
            },
        ),
        // J4, "settling an argument". Trade is the front door, so these open on the Trade tab.
        //
        // Numbered in the order a user meets them: build a deal, look at the other roster, get
        // the read, send it. `TradeVerdict` holds the third seat in the nominal pass and
        // `TradeNeedsContext` holds it in the degraded one — the same seat in the journey, in
        // the two states `trade-compare.v2` can return the answer in. See `J4ScreenshotFixtures`
        // for why that is a contract and not a convenience.
        "journey-j4.nominal.01-trade-build" to ScreenshotScenario(
            label = "J4 nominal 1/4 — build a deal, third team unavailable",
            render = {
                J4InShell { modifier ->
                    OmenTradeBuildScreen(
                        state = J4ScreenshotFixtures.nominalBuild,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onSelectTab = {},
                        onSelectPartner = {},
                        onSelectFilter = {},
                        onPrimaryAction = {},
                    )
                }
            },
        ),
        "journey-j4.nominal.02-trade-roster" to ScreenshotScenario(
            label = "J4 nominal 2/4 — picking from a roster Omen could read",
            render = {
                J4InShell { modifier ->
                    OmenTradeRosterScreen(
                        state = J4ScreenshotFixtures.nominalRoster,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onSelectTab = {},
                        onSelectPartner = {},
                        onSelectFilter = {},
                        onAddPlayer = {},
                    )
                }
            },
        ),
        "journey-j4.nominal.03-trade-verdict" to ScreenshotScenario(
            label = "J4 nominal 3/4 — the read, both sides and the caveat",
            render = {
                J4InShell { modifier ->
                    OmenTradeVerdictScreen(
                        state = J4ScreenshotFixtures.verdict,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onPrimaryAction = {},
                        onCounter = {},
                        onShare = {},
                    )
                }
            },
        ),
        "journey-j4.nominal.04-trade-share" to ScreenshotScenario(
            label = "J4 nominal 4/4 — share the read, names off by default",
            render = {
                J4InShell { modifier ->
                    OmenTradeShareScreen(
                        state = J4ScreenshotFixtures.nominalShare,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onToggleInclusion = {},
                        onShare = {},
                        onCopyAsText = {},
                    )
                }
            },
        ),
        "journey-j4.degraded.01-trade-build" to ScreenshotScenario(
            label = "J4 degraded 1/4 — a read built on inputs that did not all arrive",
            render = {
                J4InShell { modifier ->
                    OmenTradeBuildScreen(
                        state = J4ScreenshotFixtures.degradedBuild,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onSelectTab = {},
                        onSelectPartner = {},
                        onSelectFilter = {},
                        onPrimaryAction = {},
                    )
                }
            },
        ),
        "journey-j4.degraded.02-trade-roster" to ScreenshotScenario(
            label = "J4 degraded 2/4 — no opponent rosters, permanently",
            render = {
                J4InShell { modifier ->
                    OmenTradeRosterScreen(
                        state = J4ScreenshotFixtures.degradedRoster,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onSelectTab = {},
                        onSelectPartner = {},
                        onSelectFilter = {},
                        onAddPlayer = {},
                    )
                }
            },
        ),
        "journey-j4.degraded.03-trade-needs-context" to ScreenshotScenario(
            label = "J4 degraded 3/4 — too close to call blind, and it says which input is missing",
            render = {
                J4InShell { modifier ->
                    OmenTradeNeedsContextScreen(
                        state = J4ScreenshotFixtures.needsContext,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onConnect = {},
                        onShowAnyway = {},
                    )
                }
            },
        ),
        "journey-j4.degraded.04-trade-share" to ScreenshotScenario(
            label = "J4 degraded 4/4 — the share service failed, and the read did not",
            render = {
                J4InShell { modifier ->
                    OmenTradeShareScreen(
                        state = J4ScreenshotFixtures.degradedShare,
                        modifier = modifier,
                        context = J4ScreenshotFixtures.titansContext,
                        onOpenAccount = {},
                        onToggleInclusion = {},
                        onShare = {},
                        onCopyAsText = {},
                    )
                }
            },
        ),
        "journey-j3.nominal.01-omen-call" to ScreenshotScenario(
            label = "J3 nominal 1/3 — Omen call",
            render = {
                J3InShell { modifier ->
                    OmenDecisionScreen(
                        state = OmenDecisionFixtures.journeyNominal,
                        modifier = modifier,
                        weekLabel = "Week 7",
                        providerName = "ESPN",
                        onMakeMove = {},
                        onDecline = {},
                    )
                }
            },
        ),
        "journey-j3.nominal.02-omen-evidence" to ScreenshotScenario(
            label = "J3 nominal 2/3 — full argument",
            render = {
                J3InShell { modifier ->
                    OmenEvidenceScreen(
                        payload = OmenDecisionFixtures.journeyNominalPayload,
                        weekLabel = "Week 7",
                        modifier = modifier,
                    )
                }
            },
        ),
        "journey-j3.nominal.03-start-sit" to ScreenshotScenario(
            label = "J3 nominal 3/3 — clear Start/Sit call",
            render = {
                J3InShell { modifier ->
                    OmenStartSitScreen(detail = J3ScreenshotFixtures.nominalStartSit, modifier = modifier)
                }
            },
        ),
        "journey-j3.degraded.01-omen-call" to ScreenshotScenario(
            label = "J3 degraded 1/3 — Omen call",
            render = {
                J3InShell { modifier ->
                    OmenDecisionScreen(
                        state = OmenDecisionFixtures.journeyDegraded,
                        modifier = modifier,
                        weekLabel = "Week 7",
                        providerName = "ESPN",
                        onMakeMove = {},
                        onDecline = {},
                    )
                }
            },
        ),
        "journey-j3.degraded.02-omen-evidence" to ScreenshotScenario(
            label = "J3 degraded 2/3 — unavailable and unused inputs",
            render = {
                J3InShell { modifier ->
                    OmenEvidenceScreen(
                        payload = OmenDecisionFixtures.journeyDegradedPayload,
                        weekLabel = "Week 7",
                        modifier = modifier,
                    )
                }
            },
        ),
        "journey-j3.degraded.03-start-sit" to ScreenshotScenario(
            label = "J3 degraded 3/3 — incomplete Start/Sit read",
            render = {
                J3InShell { modifier ->
                    OmenStartSitScreen(
                        detail = J3ScreenshotFixtures.degradedStartSit,
                        onRetry = {},
                        modifier = modifier,
                    )
                }
            },
        ),
        "help-support.available" to ScreenshotScenario(
            label = "Help + Support — available",
            render = { HelpSupportInShell(OmenHelpSupportState.Available) },
        ),
        "help-support.no-account" to ScreenshotScenario(
            label = "Help + Support — no account",
            render = { HelpSupportInShell(OmenHelpSupportState.NoAccount) },
        ),
        "help-support.offline" to ScreenshotScenario(
            label = "Help + Support — offline",
            render = { HelpSupportInShell(OmenHelpSupportState.Offline) },
        ),
        "help-support.submission-unavailable" to ScreenshotScenario(
            label = "Help + Support — feedback unavailable",
            render = { HelpSupportInShell(OmenHelpSupportState.SubmissionUnavailable) },
        ),
        "help-support.provider-recovery" to ScreenshotScenario(
            label = "Help + Support — provider recovery",
            render = { HelpSupportInShell(OmenHelpSupportState.ProviderRecovery) },
        ),
        // M4-CC-WaiverWatch. One scenario per registered honest state, mirroring the iOS twin
        // key-for-key. The composition is NOT re-implemented here — every entry mounts the
        // real OmenCommandCenterScreen and varies only `waiverWatch`, matching what
        // `OmenCommandCenterScreenTest.everyRequiredHonestWaiverWatchStateRendersItsApprovedMessage`
        // asserts.
        //
        // Base fixture is chosen for coherence: `not-connected` uses the disconnected fixture,
        // because "your waiver moves need a league" beside a selected demo league is a state
        // the product never produces. The other five imply a usable league.
        "waiver-watch.pending" to ScreenshotScenario(
            label = "Waiver Watch — claim pending",
            render = { WaiverWatchInShell(OmenWaiverWatchState.Pending) },
        ),
        "waiver-watch.processed" to ScreenshotScenario(
            label = "Waiver Watch — waivers processed",
            render = { WaiverWatchInShell(OmenWaiverWatchState.Processed) },
        ),
        "waiver-watch.availability-unknown" to ScreenshotScenario(
            label = "Waiver Watch — availability needs confirmation",
            render = { WaiverWatchInShell(OmenWaiverWatchState.AvailabilityUnknown) },
        ),
        "waiver-watch.no-credible-move" to ScreenshotScenario(
            label = "Waiver Watch — no credible move",
            render = { WaiverWatchInShell(OmenWaiverWatchState.NoCredibleMove) },
        ),
        "waiver-watch.not-connected" to ScreenshotScenario(
            label = "Waiver Watch — no connected league",
            render = {
                WaiverWatchInShell(
                    OmenWaiverWatchState.NotConnected,
                    base = OmenCommandCenterFixtures.realDisconnected,
                )
            },
        ),
        "waiver-watch.off-season" to ScreenshotScenario(
            label = "Waiver Watch — off-season",
            render = { WaiverWatchInShell(OmenWaiverWatchState.OffSeason) },
        ),
        // M6-ContextualHelp. The sheet body is rendered directly rather than through a tap:
        // screenshot mode has no interaction, and the content is what needs proving.
        "contextual-help.command-center" to ScreenshotScenario(
            label = "Contextual help — Command Center",
            render = { ContextualHelpBody(OmenHelpDestination.CommandCenter) },
        ),
        "contextual-help.omen" to ScreenshotScenario(
            label = "Contextual help — Omen of the Week",
            render = { ContextualHelpBody(OmenHelpDestination.Omen) },
        ),
        "contextual-help.connect" to ScreenshotScenario(
            label = "Contextual help — Connect a league (native provider truth)",
            render = { ContextualHelpBody(OmenHelpDestination.Connect) },
        ),
        "contextual-help.account" to ScreenshotScenario(
            label = "Contextual help — Account",
            render = { ContextualHelpBody(OmenHelpDestination.Account) },
        ),
        // O7 forced-update gate. Rendered directly rather than through the real gate:
        // screenshot mode has no network, and the blocking composition is what needs
        // proving. The version is a fixture, not a real minimum.
        "forced-update.blocked" to ScreenshotScenario(
            label = "Forced update — build below minimum",
            render = { ForcedUpdateBody() },
        ),
    )

    fun isKnown(key: String?): Boolean = key != null && entries.containsKey(key)
    fun get(key: String): ScreenshotScenario = entries.getValue(key)
}

/**
 * The real [OmenContextualHelpSheet] held open, so the captured evidence is the shipped
 * component rather than a screenshot-only restatement of its layout.
 */
/**
 * O7 gate screen on the brand background, matching how `OmenAndroidApp` hosts it inside a
 * `Surface(color = OmenTheme.color.bg)`.
 */
@Composable
private fun ForcedUpdateBody() {
    Surface(modifier = Modifier.fillMaxSize(), color = OmenTheme.color.bg) {
        ForcedUpdateScreen(minimumVersion = "1.2.0", onUpdate = {})
    }
}

@Composable
private fun ContextualHelpBody(destination: OmenHelpDestination) {
    Box(Modifier.fillMaxSize()) {
        OmenContextualHelpSheet(
            topic = ContextualHelpContent.topic(destination),
            visible = true,
            onDismissRequest = {},
        )
    }
}

@Composable
private fun WaiverWatchInShell(
    state: OmenWaiverWatchState,
    base: OmenCommandCenterState = OmenCommandCenterFixtures.demoConnected,
) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Command) {} },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            OmenCommandCenterScreen(state = base.copy(waiverWatch = state))
        }
    }
}

@Composable
private fun OmenInShell(demo: Boolean) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Omen) {} },
    ) { innerPadding ->
        OmenDecisionScreen(
            state = if (demo) OmenDecisionFixtures.demo else OmenDecisionFixtures.realDisconnected,
            modifier = Modifier.padding(innerPadding),
        )
    }
}

/**
 * J1's shell. Mirrors `J3InShell`, with an optional tab bar: the connect-flow screens are not
 * inside a tab, and the Command terminus is.
 */
@Composable
private fun J1InShell(tab: FauxNavTab?, content: @Composable (Modifier) -> Unit) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { if (tab != null) FauxBottomNav(tab) {} },
    ) { innerPadding ->
        content(Modifier.padding(innerPadding))
    }
}

/**
 * J2 opens on the Command tab, which is the destination all five of its screens live in —
 * including the switcher sheet, which the artboard happens to draw over Trade only because the
 * switcher bar is on 25 of the 30 screens and can be opened from any of them.
 */
@Composable
private fun J2InShell(content: @Composable (Modifier) -> Unit) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Command) {} },
    ) { innerPadding ->
        content(Modifier.padding(innerPadding))
    }
}

@Composable
private fun J3InShell(content: @Composable (Modifier) -> Unit) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Omen) {} },
    ) { innerPadding ->
        content(Modifier.padding(innerPadding))
    }
}

/**
 * J4 opens on the Trade tab. Trade is the front door, and all five of its artboards are that
 * destination — a capture that opened anywhere else would be a picture of the wrong screen.
 */
@Composable
private fun J4InShell(content: @Composable (Modifier) -> Unit) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Trade) {} },
    ) { innerPadding ->
        content(Modifier.padding(innerPadding))
    }
}

/** Server-shaped fixtures decoded by the production parser so contract drift fails loudly. */
private object J3ScreenshotFixtures {
    val nominalStartSit: StartSitDetail = decode(
        """
        {"contract_version":"start-sit-detail.v2","state":"clear_decision","message":null,
         "platform":"espn","league_id":"fixture-league","league_name":"Sample League",
         "team_name":"Sample Team","season":2026,"week":7,"scoring_format":"half_ppr",
         "recommendation":{"slot":"FLEX",
           "start":{"player_key":"sample-wr1","name":"Sample WR1","position":"WR","team":"Sample Team","projected_points":16.8,"status":"Active","kickoff":"Sun 1:00 PM"},
           "over":{"player_key":"sample-wr2","name":"Sample WR2","position":"WR","team":"Sample Team","projected_points":13.0,"status":"Active","kickoff":"Sun 4:25 PM"},
           "points_delta":3.8,"confidence":"confident"},
         "why":["The available projection and usage reads favor Sample WR1."],
         "what_could_change_this":["A late inactive designation would invalidate the recommendation."],
         "evidence":[
           {"category":"projection","kind":"projection","statement":"Sample WR1 projects 3.8 points higher."},
           {"category":"roster","kind":"verified","statement":"Both players are eligible for the flex slot."}],
         "alternatives":[],
         "capabilities":[
           {"name":"league_scoring","state":"live","used":true,"kind":"verified","source":"provider","statement":"Half-PPR scoring was read for the selected league."},
           {"name":"roster","state":"live","used":true,"kind":"verified","source":"provider","statement":"The selected roster was read successfully."},
           {"name":"player_projections","state":"live","used":true,"kind":"projection","source":"provider","statement":"Current-week projections were available."},
           {"name":"start_sit_inference","state":"live","used":true,"kind":"inference","source":"omen","statement":"The model compared the two eligible players."}]}
        """.trimIndent(),
    )

    val degradedStartSit: StartSitDetail = decode(
        """
        {"contract_version":"start-sit-detail.v2","state":"incomplete_data",
         "message":"The provider returned league settings, but the current roster and projections were unavailable.",
         "platform":"espn","league_id":"fixture-league","league_name":"Sample League",
         "team_name":"Sample Team","season":2026,"week":7,"scoring_format":"half_ppr",
         "recommendation":null,"why":[],"what_could_change_this":[],"evidence":[],"alternatives":[],
         "capabilities":[
           {"name":"league_scoring","state":"live","used":false,"kind":"verified","source":"provider","statement":"Half-PPR scoring was read, but could not decide the call alone."},
           {"name":"roster","state":"unavailable","used":false,"kind":"limitation","source":"provider","statement":"The provider did not return the current roster.","reason_code":"provider_unavailable"},
           {"name":"player_projections","state":"unavailable","used":false,"kind":"limitation","source":"provider","statement":"Player projections could not be resolved.","reason_code":"provider_unavailable"},
           {"name":"start_sit_inference","state":"unavailable","used":false,"kind":"limitation","source":"omen","statement":"Omen did not run inference without the required inputs.","reason_code":"missing_inputs"},
           {"name":"weather","state":"not_requested","used":false,"kind":"limitation","source":null,"statement":null}]}
        """.trimIndent(),
    )

    private fun decode(json: String): StartSitDetail = checkNotNull(StartSitDetail.parse(json)) {
        "Malformed J3 screenshot fixture"
    }
}

@Composable
private fun HelpSupportInShell(state: OmenHelpSupportState) {
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(FauxNavTab.Command) {} },
    ) { innerPadding ->
        OmenHelpSupportScreen(
            state = state,
            contextDescription = if (state == OmenHelpSupportState.Available) {
                "Need help with your current Omen flow? Start with a topic below."
            } else null,
            modifier = Modifier.padding(innerPadding),
        )
    }
}

data class ScreenshotScenario(
    val label: String,
    val render: @Composable () -> Unit,
)

@Composable
private fun OnboardingAuthBody(state: AuthFlowState) {
    OmenTheme {
        val resend = remember { OtpResendController() }
        OmenAuthFlow(
            state = state,
            email = "justin@slopssaloon.com",
            code = if (state is AuthFlowState.AwaitingOtp) "417" else "",
            live = true,
            googleConfigured = true,
            discordConfigured = true,
            demoModeEnabled = true,
            onEmailChange = {},
            onCodeChange = {},
            onSubmitEmail = {},
            onSubmitCode = {},
            resend = if (state is AuthFlowState.AwaitingOtp) resend else null,
            onGoogle = {},
            onDiscord = {},
            onReset = {},
            onTryDemo = {},
        )
    }
}

@Composable
private fun OnboardingConnectBody(autoSelectProvider: ConnectProvider? = null) {
    OmenTheme {
        val vm = remember {
                ConnectViewModel(
                    repository = ScreenshotConnectRepository(),
                    sessionManager = SessionManager(
                        InMemorySecureSessionStore(
                            Session(
                                userId = "screenshot",
                                accessToken = "t",
                                refreshToken = "r",
                                expiresAtEpochSeconds = 9_999_999_999,
                            ),
                        ),
                        nowEpochSeconds = { 1_000 },
                    ),
                    authSession = StubProviderAuthSession(ProviderAuthOutcome.Canceled),
                )
        }
        // Drives the flow to a provider's first step so a journey capture can reach a state
        // that otherwise needs a tap. Null in every other scenario — this never auto-selects for
        // a real user, because choosing a provider is their decision. iOS mirror:
        // `ConnectView(autoSelectProvider:)`.
        LaunchedEffect(autoSelectProvider) {
            if (autoSelectProvider != null) vm.selectProvider(autoSelectProvider)
        }
        ConnectScreen(
            viewModel = vm,
            onConnected = {},
            onDismiss = {},
        )
    }
}

private class ScreenshotConnectRepository : ConnectRepository {
    override suspend fun resolveSleeper(username: String, accessToken: String): Result<ResolvedSleeperAccount> =
        Result.success(
            ResolvedSleeperAccount(
                username = username,
                leagues = listOf(
                    SleeperLeague(
                        id = "1",
                        name = "Demo League",
                        season = 2026,
                        scoringFormat = "PPR",
                        teamName = "Demo Team",
                    ),
                ),
            ),
        )

    override suspend fun connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String,
    ): Result<Unit> = Result.success(Unit)

    override suspend fun startYahooAuthorization(accessToken: String): Result<String> =
        Result.success("https://example.invalid/yahoo")

    override suspend fun yahooLeagues(accessToken: String): Result<List<YahooLeague>> =
        Result.success(listOf(YahooLeague(id = "yahoo.l.1", name = "Demo Yahoo", season = 2026)))

    override suspend fun bindYahooLeague(id: String, accessToken: String): Result<Unit> =
        Result.success(Unit)

    // ---- ESPN ----
    //
    // All three deliberately refuse or return nothing. Screenshot mode signs in to nothing, and a
    // fixture that invented ESPN leagues or reported a successful connect would put fake league
    // names and a fake connected state into store screenshots.

    override suspend fun discoverEspnLeagues(
        espnS2: String,
        swid: String,
        accessToken: String,
    ): Result<List<EspnLeagueOption>> = Result.success(emptyList())

    override suspend fun connectEspn(capture: EspnCapture, accessToken: String): Result<Unit> =
        Result.failure(ConnectException(ConnectFailure.EspnSessionUnreadable))

    // Screenshot mode never writes, so the follow set is reported as accepted and stored — the
    // "did not persist" disclosure is a real-server state and must not appear in a marketing
    // capture describing something that did not happen.
    override suspend fun followLeagues(
        platform: String,
        leagues: List<FollowedLeague>,
        accessToken: String,
    ): Result<Boolean> = Result.success(true)

    override suspend fun espnConnection(accessToken: String): Result<EspnConnection?> =
        Result.success(null)

}

/**
 * Deterministic shell mirroring the signed-in Scaffold in [com.slopssaloon.omen.app.OmenAndroidApp]
 * so screenshots include the permanent 4-tab bottom navigation. No session or network
 * access. The nav labels/icons are read from the same drawable set as the production shell.
 */
@Composable
fun ScreenshotScenarioHost(scenarioKey: String) {
    OmenTheme {
        val scenario = ScreenshotScenarios.get(scenarioKey)
        scenario.render()
    }
}

@Composable
private fun CommandCenterInShell(
    demo: Boolean = true,
    state: OmenCommandCenterState? = null,
    carousel: LeagueCarouselViewModel? = null,
) {
    var selected by remember { mutableStateOf(FauxNavTab.Command) }
    Scaffold(
        containerColor = OmenTheme.color.bg,
        bottomBar = { FauxBottomNav(selected) { selected = it } },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            when (selected) {
                FauxNavTab.Command -> OmenCommandCenterScreen(
                    state = state ?: if (demo) OmenCommandCenterFixtures.demoConnected
                    else OmenCommandCenterFixtures.realDisconnected,
                    carousel = carousel,
                    onOpenAccount = {},
                    onOpenOmen = { selected = FauxNavTab.Omen },
                    onOpenLedger = { selected = FauxNavTab.Omen },
                    onOpenLeague = { selected = FauxNavTab.League },
                )
                // The REAL screens, driven by explicit state — the same rule the Command tab
                // above already followed. These two rendered a bare "screenshot fixture only"
                // stub for a day after `M5` slices F and G shipped (`F-VET-B01`), so every
                // capture and every UI test reaching them assessed a screen that never ships.
                FauxNavTab.Trade -> OmenTradeScreen(
                    state = TradeViewModel.ViewState.Loaded(screenshotTradeVerdict()),
                    offer = TradeOffer(
                        send = listOf(TradePlayer("A.J. Brown", position = "WR", team = "PHI")),
                        receive = listOf(TradePlayer("Garrett Wilson", position = "WR", team = "NYJ")),
                    ),
                )
                FauxNavTab.League -> OmenLeagueScreen(
                    state = LeagueViewModel.ViewState.Loaded(screenshotLeagueOverview()),
                )
                FauxNavTab.Omen -> OmenDecisionScreen(state = OmenDecisionFixtures.demo)
            }
        }
    }
}

/**
 * Screenshot-mode copy of the production nav. Kept private + separate so the production
 * `NavDestination` enum remains the single source of truth for the running app, and this
 * file only mirrors the shape needed to make the bottom bar visible in captures.
 */
private enum class FauxNavTab(val label: String, val iconRes: Int, val contentDescription: String) {
    Command("Command", R.drawable.ic_nav_command, "Command Center"),
    Omen("Omen", R.drawable.ic_nav_omen, "Omen of the Week"),
    Trade("Trade", R.drawable.ic_nav_trade, "Trade Analyzer"),
    League("League", R.drawable.ic_nav_league, "League"),
}

@Composable
private fun FauxBottomNav(selected: FauxNavTab, onSelect: (FauxNavTab) -> Unit) {
    NavigationBar(
        containerColor = OmenTheme.color.surface1,
        contentColor = OmenTheme.color.textPrimary,
    ) {
        for (tab in FauxNavTab.entries) {
            NavigationBarItem(
                selected = tab == selected,
                onClick = { onSelect(tab) },
                icon = { Icon(painter = painterResource(id = tab.iconRes), contentDescription = tab.contentDescription) },
                // Mirrors the production nav's font-scale constraint exactly. If this drifts,
                // screenshot evidence stops representing what ships — which is the whole point
                // of this file.
                label = {
                    Text(
                        text = tab.label,
                        style = OmenTheme.typography.label.toTextStyle(),
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

/**
 * Decoded from contract JSON rather than built by constructor, so a scenario also proves the
 * screen renders from a payload the server could actually send. Swift twin:
 * `ScreenshotScenarios.leagueOverviewJSON`.
 */
private fun screenshotLeagueOverview(): LeagueOverview = requireNotNull(
    LeagueOverview.parse(
        """
        {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
         "league_name":"Demo Slate (mock league)","season":2026,"week":8,
         "matchup":{"status":"live",
           "you":{"team_id":"7","team_name":"Demo Titans","record":"6-1","points":64.8,"projected":null},
           "opponent":{"team_id":"3","team_name":"Demo Rivals","record":"5-2","points":58.1,"projected":null},
           "unavailable_reason":null},
         "standings":{"status":"available",
           "playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},
           "teams":[
             {"team_name":"Demo Rivals","is_current_user":false,"rank":1,"wins":7,"losses":1},
             {"team_name":"Demo Hawks","is_current_user":false,"rank":2,"wins":6,"losses":2},
             {"team_name":"Demo Titans","is_current_user":true,"rank":3,"wins":6,"losses":1},
             {"team_name":"Demo Bandits","is_current_user":false,"rank":4,"wins":4,"losses":4}]},
         "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
        """.trimIndent(),
    ),
) { "screenshot league fixture failed to parse" }

private fun screenshotTradeVerdict(): TradeCompare = requireNotNull(
    TradeCompare.parse(
        """
        {"contract_version":"trade-compare.v2","verdict_state":"favors_you",
         "evaluability":{"status":"evaluable","reason":null,"missing_projection_count":0,"total_player_count":2},
         "analysis_context":{"mode":"personalized","platform":"sleeper","league_id":"1",
           "league_name":"Demo Slate (mock league)","applied":["scoring_format","roster_construction"],
           "unavailable_reason":null},
         "net_value":4.2,"explanation":null}
        """.trimIndent(),
    ),
) { "screenshot trade fixture failed to parse" }

/**
 * J2's fixtures. The Compose half of `J2ScreenshotFixtures` in `ScreenshotScenarios.swift`, and
 * deliberately identical string for string — a contact sheet that compares the two platforms
 * must be comparing the same words.
 *
 * Copy is taken **verbatim from the artboards** wherever the artboard has any, because on these
 * five screens the words are the design: `CommandQuiet` and `CommandQuietStraight` differ by two
 * sentences and nothing else, and paraphrasing either would erase the voice fence the pair
 * exists to draw.
 *
 * Team and player names are the canvas's own invented ones. A capture that escapes into a deck
 * must not read as a real person's league.
 */
private object J2ScreenshotFixtures {

    val titansContext = OmenScreenContext(
        crest = "TTO",
        teamName = "Titans of Slopsilonia",
        platform = OmenPlatform.Espn,
        leagueName = "Slops Saloon",
        onSwitch = {},
        onAddLeague = {},
    )

    /** The team being switched **to** on `SwitchLoading`. */
    val davantesContext = OmenScreenContext(
        crest = "DSI",
        teamName = "Davante’s Inferno",
        platform = OmenPlatform.Espn,
        leagueName = "EB Football",
        onSwitch = {},
        onAddLeague = {},
    )

    private val waiverMove = OmenDeskWaiverMove(
        addName = "Jaylen Wright",
        addMeta = "RB · TEN",
        addPoints = "11.4",
        dropName = "Roschon Johnson",
        dropMeta = "RB · CHI",
        dropPoints = "4.1",
        reasoning = "Pollard’s out three weeks and Wright took almost every backup snap. " +
            "Roschon is behind two healthy backs — you won’t miss him.",
        band = OmenConfidenceBand.Confident,
    )

    private val ledgerLine = OmenDeskLedgerLine(
        summary = "Start Stafford over Daniels",
        meta = "This week · start / sit · you followed it",
        outcome = OmenDeskLedgerOutcome.Pending,
    )

    val nominalDesk = OmenDeskState(
        weekLabel = "Week 7 · Sunday",
        deadlineLabel = "Lineups lock",
        deadlineTime = "1:00 PM",
        matchup = OmenDeskSection.Read(
            OmenDeskMatchup(
                platform = OmenPlatform.Espn,
                status = "Live · Q2",
                leader = OmenDeskTeam("TTO", "Titans of Slopsilonia", "5–2 · you", "64.8", isMine = true),
                trailer = OmenDeskTeam("GMR", "Gibbs me some Rice", "6–1", "51.2", isMine = false),
                projection = "119.6 – 114.2",
                projectionNote = "Projected · 5.4 ahead",
                leadFraction = 0.66f,
                watch = "Four of your starters left; two of theirs.",
            ),
        ),
        railCount = 4,
        railIndex = 0,
        waiver = OmenDeskSection.Read(waiverMove),
        ledger = OmenDeskSection.Read(ledgerLine),
        // The nominal artboard has no foot line and neither does this. Nothing was unread and
        // nothing was read-and-ignored, so there is nothing honest to put there.
        footnote = null,
    )

    /**
     * The degraded desk. Two classes are visible at once, which is the whole requirement:
     *
     *  - `league_matchup` is **unavailable** — named, with a sentence, in the board's own place.
     *    It is not dropped to make room, because that is the one class the spec says must
     *    survive truncation.
     *  - `league_standings` is **live, used: false** — named in the foot line, `text-tertiary`,
     *    with no evidence styling and no implication that it decided anything.
     *
     * The waiver card and the ledger line are untouched, and that is the point of the frame:
     * a dead matchup read sits beside a live wire, and the screen says which is which.
     */
    val degradedDesk = OmenDeskState(
        weekLabel = "Week 7 · Sunday",
        deadlineLabel = "Lineups lock",
        deadlineTime = "1:00 PM",
        matchup = OmenDeskSection.Unread(
            capability = "League matchup",
            sentence = "ESPN did not return this week’s scoreboard, so Omen has no live score " +
                "for you. The wire and the ledger below read normally.",
        ),
        railCount = 4,
        railIndex = 0,
        waiver = OmenDeskSection.Read(waiverMove),
        ledger = OmenDeskSection.Read(ledgerLine),
        footnote = OmenDeskFootnote("League standings were read and did not change this week’s call."),
    )

    private val switchFilters = listOf(
        OmenSwitchFilter("all", "All"),
        OmenSwitchFilter("espn", "ESPN"),
        OmenSwitchFilter("yahoo", "Yahoo"),
        OmenSwitchFilter("sleeper", "Sleeper"),
    )

    /**
     * Favourites first, then everything else — in the order the directory returned them.
     * `orderPlatformsByFollowCount` is the single authority and clients must not re-sort, so
     * these lists are written in final order and the screen never touches them.
     */
    private val switchGroups = listOf(
        OmenSwitchGroup(
            "Favourites",
            listOf(
                OmenSwitchRow("tto", "TTO", "Titans of Slopsilonia", "ESPN", isFavorite = true, isActive = true),
                OmenSwitchRow("dsi", "DSI", "Davante’s Inferno", "ESPN · EB Football", isFavorite = true, isActive = false),
            ),
        ),
        OmenSwitchGroup(
            "All teams",
            listOf(
                OmenSwitchRow("pak", "PAK", "Puk Around & Find Out", "ESPN · Fantasy Madness", isFavorite = false, isActive = false),
                // The artboard's own honest row: a league the provider named and a team it did
                // not. "unnamed team" is the caller's fallback, never the row's.
                OmenSwitchRow("dar", "DAR", "League 884411", "unnamed team", isFavorite = false, isActive = false),
            ),
        ),
    )

    val nominalSwitchSheet = OmenSwitchSheetState(
        filters = switchFilters,
        selectedFilterId = "espn",
        groups = switchGroups,
    )

    val degradedSwitchSheet = OmenSwitchSheetState(
        filters = switchFilters,
        selectedFilterId = "espn",
        groups = switchGroups,
        // Named rather than silently absent. A user whose Yahoo teams vanished from this list
        // would conclude they had lost them.
        notice = "Yahoo did not answer, so any Yahoo teams are missing from this list. " +
            "Your ESPN teams are all here.",
    )

    val switchingFootnote = OmenDeskFootnote(
        text = "Reading Davante’s Inferno from ESPN.",
        emphasis = "The previous team’s numbers are gone, not reused.",
    )

    val quietNeutral = OmenQuietState(
        variant = OmenQuietVariant.Neutral,
        weekLabel = "Week 8 · Bye",
        headline = "Nothing worth waking you for.",
        body = "You’re on bye, your roster is healthy, and nobody on your waiver wire is " +
            "worth a claim. Genuinely — go outside.",
        band = OmenConfidenceBand.Confident,
        nextRead = "Next read · Tuesday 3:00 AM waivers",
        footnote = OmenDeskFootnote("3rd of 12, two games clear of the cut. Trade deadline in three weeks."),
    )

    val quietStraight = OmenQuietState(
        variant = OmenQuietVariant.Straight,
        weekLabel = "Week 9 · After a loss",
        headline = "Rough week. Nothing worth moving for.",
        body = "You lost by four, Achane is out, and there is nobody on the wire who fixes that. " +
            "Holding is the call.",
        band = OmenConfidenceBand.Confident,
        nextRead = "Next read · Tuesday 3:00 AM waivers",
        footnote = OmenDeskFootnote("5th of 12. One game off the cut with six to play."),
    )
}

/**
 * J4's fixtures. The Compose half of `J4ScreenshotFixtures` in `ScreenshotScenarios.swift`.
 *
 * The reasoning for the four-frames-per-pass split, the two capability classes the degraded pass
 * must carry, and the facts of record these pin rather than decorate is written out once, in the
 * Swift file. A copied rule is a second source of truth and the copy is the one that goes stale.
 *
 * The copy strings are deliberately identical across the two platforms, because a contact sheet
 * that compares iOS against Android is worthless if the two are reading different sentences.
 */
private object J4ScreenshotFixtures {

    val titansContext = OmenScreenContext(
        crest = "TTO",
        teamName = "Titans of Slopsilonia",
        platform = OmenPlatform.Espn,
        leagueName = "Slops Saloon",
        onSwitch = {},
        onAddLeague = {},
    )

    val twoTeamsOnly = OmenTradeCapability(
        maxTeams = 2,
        threeTeamSupported = false,
        threeTeamReason = "multi_team_comparison_not_implemented",
    )

    private val partners = listOf(
        OmenTradePartner(id = "dsi", crest = "DSI", name = "Davante’s Inferno", need = "Needs RB"),
        OmenTradePartner(id = "gmr", crest = "GMR", name = "Gibbs me some Rice", need = "No hole"),
        // `need` is null, not "No hole". Nobody read this roster, and "No hole" for a roster
        // nobody read is a claim about a roster nobody read.
        OmenTradePartner(id = "puk", crest = "PUK", name = "Puk Around & Find Out", need = null),
    )

    private val filters = listOf(
        OmenTradeFilter(id = "all", title = "All"),
        OmenTradeFilter(id = "rb", title = "RB"),
        OmenTradeFilter(id = "wr", title = "WR"),
        OmenTradeFilter(id = "buy-low", title = "Buy low", isSmart = true),
    )

    private val usedRosterNeed = OmenTradeInput(
        capability = "Roster need",
        statement = "Your RB2 slot has averaged 6.1 since Pollard went out.",
        presentation = OmenTradeInput.Presentation.Used,
    )

    private val usedLeagueScoring = OmenTradeInput(
        capability = "League scoring",
        statement = "Half PPR, and it read your league’s own settings.",
        presentation = OmenTradeInput.Presentation.Used,
    )

    /** Class 2 — read, and explicitly **not** claimed as evidence. */
    private val scheduleReadNotUsed = OmenTradeInput(
        capability = "Schedule strength",
        statement = "Omen has it. The two schedules are close enough that it did not move this call.",
        presentation = OmenTradeInput.Presentation.ReadNotUsed,
    )

    /** Class 3 — could not read, **named**. Never dropped to make room. */
    private val rosterUnavailable = OmenTradeInput(
        capability = "Roster availability",
        statement = "ESPN did not return the other team’s roster for this league.",
        presentation = OmenTradeInput.Presentation.CouldNotRead,
    )

    private val sides = listOf(
        OmenTradeSide(
            heading = "You send",
            legs = listOf(
                OmenTradeLeg(
                    direction = OmenTradeLeg.Direction.Sending,
                    name = "Jaylen Waddle",
                    meta = "WR · MIA",
                    rank = "WR 21",
                ),
            ),
        ),
        OmenTradeSide(
            heading = "Davante’s Inferno sends",
            legs = listOf(
                OmenTradeLeg(
                    direction = OmenTradeLeg.Direction.Receiving,
                    name = "Tony Pollard",
                    meta = "RB · TEN",
                    rank = "RB 18",
                ),
                // Deliberately unranked. Null renders nothing; an em dash would read as a rank
                // of zero rather than as an absence.
                OmenTradeLeg(
                    direction = OmenTradeLeg.Direction.Receiving,
                    name = "Jaylen Wright",
                    meta = "RB · TEN",
                    rank = null,
                ),
            ),
        ),
    )

    private val nominalRead = OmenTradeRead(
        headline = "Take it.",
        reasoning = "You are deep at receiver and thin at back, and this trade fixes the side " +
            "that is costing you points. Pollard is the starter again and Wright is the " +
            "handcuff, so you get the backfield either way it breaks.",
        caveat = "Scored against Slops Saloon’s settings and your roster.",
        isPersonalized = true,
        inputs = listOf(usedRosterNeed, usedLeagueScoring, scheduleReadNotUsed),
    )

    private val degradedRead = OmenTradeRead(
        headline = "Too close to call blind.",
        reasoning = "On value this is a coin flip, and the thing that would break the tie — " +
            "what the other team is actually short of — is the thing Omen could not read " +
            "here. Forcing a verdict on half the inputs would be a guess wearing a verdict’s " +
            "clothes.",
        caveat = "Standard scoring — not your league’s settings. Need usually decides a trade, " +
            "and need is what standard scoring cannot see.",
        isPersonalized = false,
        inputs = listOf(usedLeagueScoring, scheduleReadNotUsed, rosterUnavailable),
    )

    private val submission = OmenTradeSubmission(
        title = "How to send this",
        caption = "ESPN · handoff only",
        steps = listOf(
            "Open ESPN, then League › Players › Davante’s Inferno.",
            "Propose Waddle for Pollard and Wright.",
            "Come back here once they answer and Omen will read the counter.",
        ),
    )

    val nominalBuild = OmenTradeBuildState(
        kicker = "Two teams",
        title = "Build a deal",
        tabTitles = listOf("Build", "Rosters"),
        selectedTabIndex = 0,
        partners = partners,
        selectedPartnerId = "dsi",
        filters = filters,
        selectedFilterId = "all",
        capability = twoTeamsOnly,
        sides = sides,
        read = nominalRead,
        submission = submission,
        primaryActionTitle = "Get Omen’s read",
    )

    val degradedBuild = OmenTradeBuildState(
        kicker = "Two teams",
        title = "Build a deal",
        tabTitles = listOf("Build", "Rosters"),
        selectedTabIndex = 0,
        partners = partners,
        selectedPartnerId = "dsi",
        filters = filters,
        selectedFilterId = "all",
        capability = twoTeamsOnly,
        sides = sides,
        read = degradedRead,
        // No submission block. The handoff steps come from `trade-capabilities.v1`'s
        // `submission` field, and this is the pass where that read did not land.
        submission = null,
        primaryActionTitle = "Get Omen’s read",
    )

    val nominalRoster = OmenTradeRosterState(
        kicker = "Davante’s Inferno",
        title = "Pick from their roster",
        tabTitles = listOf("Build", "Rosters"),
        selectedTabIndex = 1,
        partners = partners,
        selectedPartnerId = "dsi",
        filters = filters,
        selectedFilterId = "rb",
        capability = twoTeamsOnly,
        rosters = OmenTradeRosterState.Rosters.Read(
            teamName = "Davante’s Inferno",
            playerCount = 16,
            rows = listOf(
                OmenTradeRosterState.Row(
                    id = "pollard",
                    name = "Tony Pollard",
                    meta = "RB · TEN · RB 18",
                    availability = OmenTradeRosterState.Availability.Added,
                ),
                OmenTradeRosterState.Row(
                    id = "wright",
                    name = "Jaylen Wright",
                    meta = "RB · TEN · unranked",
                    availability = OmenTradeRosterState.Availability.Available,
                ),
                OmenTradeRosterState.Row(
                    id = "gibbs",
                    name = "Jahmyr Gibbs",
                    meta = "RB · DET · RB 3",
                    availability = OmenTradeRosterState.Availability.TheyNeedThis,
                ),
            ),
            freshness = "Rosters read 6 minutes ago",
        ),
        note = "Gibbs is greyed because they are as thin at back as you are. Omen will still " +
            "score it if you ask, but they will not take it.",
    )

    /**
     * Fact of record #16, rendered. The provider will not hand over the other teams' rosters for
     * this league, so Omen issues no trade call at all — a **permanent provider limit, not an
     * outage**. There is no retry control on this frame and there must never be one.
     */
    val degradedRoster = OmenTradeRosterState(
        kicker = "Davante’s Inferno",
        title = "Pick from their roster",
        tabTitles = listOf("Build", "Rosters"),
        selectedTabIndex = 1,
        partners = partners,
        selectedPartnerId = "dsi",
        filters = filters,
        selectedFilterId = "rb",
        capability = twoTeamsOnly,
        rosters = OmenTradeRosterState.Rosters.PermanentlyUnavailable(
            capability = "Opponent rosters",
            sentence = "ESPN does not give Omen the other teams’ rosters in this league, so " +
                "there is no trade call to make here. This will not change by trying again.",
        ),
        note = null,
    )

    val verdict = OmenTradeVerdictState(
        kicker = "The read",
        title = "Take it.",
        sides = sides,
        read = nominalRead,
        submission = submission,
        primaryActionTitle = "How to send this",
        counterActionTitle = "Build a counter",
        shareActionTitle = "Share this read",
    )

    val needsContext = OmenTradeNeedsContextState(
        kicker = "The read",
        title = "Too close to call blind.",
        sides = sides,
        read = degradedRead,
        remedy = "Connect the league Omen already has for you and it can score this against " +
            "your own settings instead of standard scoring.",
        connectActionTitle = "Use my league’s settings",
        showAnywayActionTitle = "Show the standard-scoring read anyway",
    )

    /**
     * **Names off by default.** `trade-share.v1` — a 30-day hash, no auth, no provider data. The
     * default lives here because the composable does not set it: whoever builds the state owns
     * it, and a default that lives in a view is a default nobody can test.
     */
    private val inclusions = listOf(
        OmenTradeShareState.Inclusion(
            id = "verdict",
            title = "The call and the reasoning",
            detail = "What Omen said and why.",
            isOn = true,
        ),
        OmenTradeShareState.Inclusion(
            id = "names",
            title = "Team names",
            detail = "Off by default. Your league-mates’ names do not leave Omen unless you " +
                "turn this on.",
            isOn = false,
        ),
        OmenTradeShareState.Inclusion(
            id = "caveat",
            title = "The caveat",
            detail = "Travels on the card itself, so a screenshot cannot lose it.",
            isOn = true,
        ),
    )

    private val card = OmenTradeShareState.Card(
        eyebrow = "Omen’s read",
        headline = "Take it.",
        reasoning = "Deep at receiver, thin at back. This trade fixes the side that is costing points.",
        caveat = "Scored against one league’s settings. Your league may score it differently.",
        footer = "omen · link expires in 30 days",
    )

    private const val SHARE_NOTE =
        "The link carries the read and nothing else — no login, no league, no provider data. " +
            "It expires after 30 days and cannot be renewed."

    val nominalShare = OmenTradeShareState(
        kicker = "Send the read",
        title = "Share this call",
        card = card,
        inclusions = inclusions,
        note = SHARE_NOTE,
        primaryActionTitle = "Create the link",
        secondaryActionTitle = "Copy as text",
        failure = null,
    )

    /**
     * `POST /api/trade/share` answered 503. That is the **share storage** failing, which is a
     * different thing from a trade Omen could not read, and the copy says which one it is.
     */
    val degradedShare = OmenTradeShareState(
        kicker = "Send the read",
        title = "Share this call",
        card = card,
        inclusions = inclusions,
        note = SHARE_NOTE,
        primaryActionTitle = "Create the link",
        secondaryActionTitle = "Copy as text",
        failure = "Omen could not create a link just now. The read above is unaffected — this " +
            "is the sharing service, not the call.",
    )
}
