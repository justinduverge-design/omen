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

    /** A provider Omen cannot connect here. Never a dead end. */
    data class UnsupportedOnMobile(val provider: ConnectProvider) : ConnectState

    // ESPN — W1-A. Consent, then ESPN's own sign-in in an app-controlled WebView, then the
    // leagues ESPN reports for that account. iOS mirror: `App/Connect/ConnectFlow.swift`.

    /** Consent, shown before ESPN's sign-in opens. A required step, not a footnote. */
    data object EspnConsent : ConnectState

    /** ESPN's own sign-in is on screen in the in-app web view. */
    data object EspnSigningIn : ConnectState

    /** Signed in; asking ESPN which leagues this account plays in. */
    data object DiscoveringEspnLeagues : ConnectState

    /** ESPN answered with the user's leagues. They pick one. */
    data class ChoosingEspnLeague(val options: List<EspnLeagueOption>) : ConnectState

    /** The user pressed Connect. Sending the one request that carries the session. */
    data class ValidatingEspnConnection(val leagueId: String) : ConnectState

    /** The server reports a bound ESPN league. */
    data class EspnConnected(val connection: EspnConnection) : ConnectState

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
            is DiscoveringEspnLeagues -> "Signed in. Finding your leagues…"
            is ValidatingEspnConnection -> "Checking that Omen can read this league…"
            else -> null
        }

    /** True while a request is in flight; disables controls so a double-tap cannot re-submit. */
    val isBusy: Boolean
        get() = this is ResolvingAccount || this is ValidatingConnection ||
            this is StartingYahooAuthorization || this is AwaitingYahooReturn ||
            this is ConfirmingYahooConnection || this is BindingYahooLeague ||
            this is DiscoveringEspnLeagues || this is ValidatingEspnConnection
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

    /**
     * Signed in, but the session was not where Omen could read it. Named explicitly by the Wave 1
     * contract's failure table, which also forbids blaming the user for it.
     */
    EspnSessionUnreadable("Omen couldn't read your ESPN session. That's on us, not you — try once more, or finish on a computer."),

    /** The session read fine and ESPN refused the league — wrong league, or no access to it. */
    EspnLeagueUnreachable("Omen signed in but couldn't reach that league. Open the league you want in ESPN, then try again."),
}

/** Availability is a recorded product decision, not something probed at runtime. */
sealed interface ConnectAvailability {
    data object Available : ConnectAvailability
    data class OnHold(val reason: String) : ConnectAvailability
    data class UseWeb(val reason: String) : ConnectAvailability
}

enum class ConnectProvider(val displayName: String, val platform: OmenPlatform) {
    Espn("ESPN", OmenPlatform.Espn),
    Yahoo("Yahoo", OmenPlatform.Yahoo),
    Sleeper("Sleeper", OmenPlatform.Sleeper);

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
            // **Was `UseWeb` until 2026-09-03.** W1-A: ESPN now signs in inside the app, at
            // parity with iOS.
            //
            // Two things had to be true and both are, each measured rather than assumed. The
            // mechanism: `HttpOnlyCookieSpikeTest` (androidTest) proves Android's `CookieManager`
            // returns HttpOnly cookie values — run before any of this was written, because this
            // exact question has been answered wrongly twice in this repo by inference. The
            // permission: onboarding contract §87's WebView ban was lifted for ESPN by the
            // founder on 2026-09-02, with the guideline 5.2.2 exposure stated and accepted.
            //
            // The desktop helper and `/espn-connect` stay as the documented fallback.
            Espn -> ConnectAvailability.Available
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

/**
 * One league ESPN reports for the signed-in account.
 *
 * Labels and ids only — the shape `POST /api/platforms/espn/leagues` returns. No credential
 * passes through this type, which is why it is safe to hold in [ConnectState].
 */
data class EspnLeagueOption(
    val id: String,
    val name: String?,
    val season: Int?,
    val teamId: String?,
    val teamName: String?,
) {
    /** ESPN routinely omits a league name; a neutral label beats an unidentifiable row. */
    val displayName: String get() = name?.takeIf { it.isNotEmpty() } ?: "Untitled ESPN league"

    /** Omits what ESPN did not supply rather than printing a placeholder. */
    val subtitle: String?
        get() = listOfNotNull(teamName?.takeIf { it.isNotEmpty() }, season?.toString())
            .takeIf { it.isNotEmpty() }
            ?.joinToString(" · ")
}

/**
 * What the server reports about the user's ESPN connection, reduced to the two things the app is
 * allowed to show. Deliberately narrow: no secret ids, no credential fields, no raw payload.
 */
data class EspnConnection(
    val leagueName: String?,
    val teamName: String?,
) {
    /** ESPN exposes no league list to Omen, so a null name is a healthy connection, not a bug. */
    val displayLeagueName: String
        get() = leagueName?.takeIf { it.isNotEmpty() } ?: "Your ESPN league"
}

/**
 * The ESPN session, carried from the sign-in sheet to the one request that consumes it.
 *
 * [toString] is overridden, and that is not decoration: Kotlin data classes print every property,
 * so the generated one would put a live ESPN session into any log line, crash report, or test
 * failure message that interpolated it. iOS solves the same problem in `EspnCapture`.
 */
data class EspnCapture(
    val espnS2: String,
    val swid: String,
    val leagueId: String,
    val teamId: String?,
) {
    override fun toString(): String =
        "EspnCapture(league=$leagueId, team=${teamId ?: "-"}, session=<redacted>)"
}

/** What the sign-in sheet has observed so far. */
sealed interface EspnSignInProgress {
    /** No ESPN session in the jar yet. Carries a presence-only diagnostic, never a value. */
    data class SignedOut(val diagnostic: String = "") : EspnSignInProgress

    /** Signed in. The ids are whatever the current page revealed — often nothing. */
    data class SignedIn(
        val detectedLeagueId: String? = null,
        val detectedTeamId: String? = null,
    ) : EspnSignInProgress

    val isSignedIn: Boolean get() = this is SignedIn
    val detectedLeagueIdOrNull: String? get() = (this as? SignedIn)?.detectedLeagueId
    val detectedTeamIdOrNull: String? get() = (this as? SignedIn)?.detectedTeamId
    val diagnosticOrNull: String? get() = (this as? SignedOut)?.diagnostic
}

/**
 * The ESPN handoff copy, written once so the app and its tests agree on what the user is told.
 *
 * Every line survives App Store and Play review reading it as store-facing copy: no password, no
 * cookie, no token, no `espn_s2`, no `SWID`. Kept byte-identical to iOS `EspnHandoffCopy` so the
 * two platforms cannot drift into telling users different things.
 */
object EspnHandoffCopy {
    const val CONSENT_TITLE = "Connect ESPN"
    const val CONSENT_BODY =
        "Next, ESPN's own sign-in page opens. You sign in to ESPN directly — Omen never sees " +
            "your ESPN password and never asks you to type it here. Afterwards Omen reads only " +
            "what it needs to follow your league: your roster, your scoring settings, and your " +
            "matchup. It is your account and your choice, and you can disconnect it any time in " +
            "Account. Omen is not affiliated with or endorsed by ESPN."
    const val CONSENT_CONTINUE = "Continue to ESPN"
    const val CONSENT_DECLINE = "Not now"

    const val SIGN_IN_WAITING = "Sign in to ESPN above. Omen picks up from there."
    const val SIGN_IN_READY =
        "Signed in. Open your league so Omen can fill this in — or type the ID yourself."
    const val LEAGUE_ID_HINT =
        "It's the number in your league's web address, after leagueId=. Pasting the whole address works too."
    const val SIGN_IN_CONNECT = "Connect this league"
    const val SIGN_IN_CANCEL = "Cancel"

    const val FOUND_LEAGUES_SUBTITLE =
        "Pick the one Omen should follow. You can connect another later."
    const val NO_LEAGUES_FOUND =
        "ESPN didn't report any football leagues on this account. If you know the league ID, you can enter it."
    const val DISCOVERY_UNAVAILABLE =
        "Omen couldn't ask ESPN for your leagues. Enter the league ID and we'll connect it directly."
    const val SIGN_IN_FELL_BACK =
        "We couldn't read your ESPN session on this phone. The desktop helper still works — here's how."

    fun foundLeaguesTitle(count: Int): String =
        if (count == 1) "Found your league" else "Found $count leagues"

    fun connectedMessage(connection: EspnConnection): String {
        val team = connection.teamName?.takeIf { it.isNotEmpty() }
            ?: return "Omen can now read this league's roster, scoring, and matchup."
        return "Omen is reading $team — roster, scoring, and matchup."
    }
}
