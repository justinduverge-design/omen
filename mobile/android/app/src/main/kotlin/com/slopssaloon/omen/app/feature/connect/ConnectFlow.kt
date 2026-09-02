package com.slopssaloon.omen.app.feature.connect

import com.slopssaloon.omen.core.designsystem.component.OmenPlatform

/**
 * M5-NativeConnect — the user-facing connection state machine. iOS mirror:
 * `App/Connect/ConnectFlow.swift`.
 *
 * Authority: `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §6.
 * The spec lists the full machine including OAuth stages (`authorizing`, `awaiting_return`).
 * Sleeper does not use OAuth and reaches none of them; Yahoo does, and its stages are modeled
 * separately below rather than shared, because the two flows differ in every step that has
 * user-visible copy.
 *
 * Spec rules this type enforces: no generic endless "Loading…", every non-success state has a
 * safe next action, and **cancellation is normal, not an error**.
 */
sealed interface ConnectState {
    data object NotStarted : ConnectState
    data object ResolvingAccount : ConnectState
    data class ChoosingLeague(val account: ResolvedSleeperAccount) : ConnectState
    data class ValidatingConnection(val league: SleeperLeague) : ConnectState
    data class Connected(val league: SleeperLeague) : ConnectState

    // Yahoo — OAuth in the system browser (Custom Tabs), then a league bind.

    /** Asking the backend for the provider authorization URL. */
    data object StartingYahooAuthorization : ConnectState

    /** The browser is open on Yahoo's own sign-in. Cancelling here is normal. */
    data object AwaitingYahooReturn : ConnectState

    /** Back from the browser, confirming with the server what actually got connected. */
    data object ConfirmingYahooConnection : ConnectState
    data class ChoosingYahooLeague(val leagues: List<YahooLeague>) : ConnectState
    data class BindingYahooLeague(val league: YahooLeague) : ConnectState
    data class YahooConnected(val league: YahooLeague) : ConnectState

    /** The user backed out. Distinct from [RetryableError] so copy never scolds them. */
    data object Canceled : ConnectState
    data class RetryableError(val failure: ConnectFailure) : ConnectState

    /** The Omen session, not the provider, is the problem. */
    data object NeedsReauth : ConnectState

    /** A provider Omen cannot connect here — ESPN today. Never a dead end. */
    data class UnsupportedOnMobile(val provider: ConnectProvider) : ConnectState

    /** Spec §6: "Every waiting screen says what is happening and what the user can do." */
    val progressLabel: String?
        get() = when (this) {
            is ResolvingAccount -> "Looking up your Sleeper account…"
            is ValidatingConnection -> "Checking that Omen can read this league…"
            is StartingYahooAuthorization -> "Opening Yahoo's sign-in…"
            is AwaitingYahooReturn ->
                "Waiting for Yahoo. Finish signing in, and we'll pick up where you left off."
            is ConfirmingYahooConnection -> "Checking what Yahoo shared with Omen…"
            is BindingYahooLeague -> "Checking that Omen can read this league…"
            else -> null
        }

    /** True while a request is in flight; disables controls so a double-tap cannot re-submit. */
    val isBusy: Boolean
        get() = this is ResolvingAccount || this is ValidatingConnection ||
            this is StartingYahooAuthorization || this is AwaitingYahooReturn ||
            this is ConfirmingYahooConnection || this is BindingYahooLeague
}

/**
 * Why an attempt stopped, in terms the user can act on. Never carries a raw provider error,
 * identifier, or credential — spec §7: "raw provider/cookie details never enter client copy."
 */
enum class ConnectFailure(val message: String) {
    UsernameNotFound("We couldn't find that Sleeper username. Check the spelling and try again."),
    NoLeaguesForSeason("That account doesn't have any leagues this season. Try another username, or explore the demo."),
    Network("We couldn't reach Omen. Check your connection and try again."),
    Server("Omen had a problem on our side. Try again in a moment."),

    /** The backend's own idempotency guard said an identical request is already running. */
    AlreadyInProgress("That connection is already being set up. Give it a second, then check Account."),

    /**
     * Yahoo's Fantasy Sports API entitlement is off server-side (`503 yahoo_unavailable`). A
     * product state, not a user error, so it gets its own sentence rather than "our side".
     */
    ProviderUnavailable("Yahoo connections are paused right now. Sleeper still works, or try again later."),

    /**
     * The provider round trip finished but Omen still cannot read the account — usually the
     * user approving in the browser while the token exchange failed behind them.
     */
    ProviderNotConnected("Yahoo didn't finish connecting. Try again, and make sure you tap Agree in the Yahoo screen."),
}

/** Availability is a recorded product decision, not something probed at runtime. */
sealed interface ConnectAvailability {
    data object Available : ConnectAvailability
    data class OnHold(val reason: String) : ConnectAvailability
    data class UseWeb(val reason: String) : ConnectAvailability
}

enum class ConnectProvider(val displayName: String, val platform: OmenPlatform) {
    Sleeper("Sleeper", OmenPlatform.Sleeper),
    Yahoo("Yahoo", OmenPlatform.Yahoo),
    Espn("ESPN", OmenPlatform.Espn);

    val availability: ConnectAvailability
        get() = when (this) {
            Sleeper -> ConnectAvailability.Available
            // **Entitlement granted 2026-08-28**, and native OAuth is wired as of this change.
            //
            // This said "paused while we wait on Yahoo to restore our data access" for four
            // days after that stopped being true — Android was describing a state the system
            // had already left, while iOS had at least moved on to `UseWeb`. `POST
            // /api/yahoo/auth` has accepted `native_return: true` since PR #191 and its
            // callback returns to `com.slopssaloon.omen://auth/callback?status=…` after
            // validating and consuming the OAuth state server-side; the missing half was the
            // Custom Tabs round trip the onboarding-connection contract §87 specifies.
            Yahoo -> ConnectAvailability.Available
            // Onboarding contract §5: ESPN is research-gated on native and a store build must
            // not ask for a password or raw cookie entry. §10 blocks "ESPN connected" UI until
            // the ESPN mobile feasibility memo resolves.
            Espn -> ConnectAvailability.UseWeb(
                "ESPN needs your browser to connect securely. Connect it once on the Omen website and it'll show up here.",
            )
        }
}

/**
 * A Yahoo league as `GET /api/yahoo/leagues` returns it.
 *
 * [id] is Yahoo's `league_key` (`nfl.l.12345`), which is what `POST /api/yahoo/league` matches
 * against — not the bare numeric id a user sees in the Yahoo UI.
 */
data class YahooLeague(
    val id: String,
    val name: String,
    val season: Int?,
) {
    /** Yahoo returns name and season as nullable, so this omits what the payload lacked. */
    val subtitle: String? get() = season?.toString()
}

data class ResolvedSleeperAccount(
    val username: String,
    val leagues: List<SleeperLeague>,
)

data class SleeperLeague(
    val id: String,
    val name: String,
    val season: Int,
    val scoringFormat: String?,
    val teamName: String?,
) {
    /** Omits anything the payload did not supply rather than printing a placeholder. */
    val subtitle: String
        get() = listOfNotNull(teamName, scoringFormat, season.toString())
            .filter { it.isNotEmpty() }
            .joinToString(" · ")
}
