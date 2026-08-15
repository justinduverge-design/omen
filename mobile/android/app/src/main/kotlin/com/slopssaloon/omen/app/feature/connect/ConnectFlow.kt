package com.slopssaloon.omen.app.feature.connect

import com.slopssaloon.omen.core.designsystem.component.OmenPlatform

/**
 * M5-NativeConnect — the user-facing connection state machine. iOS mirror:
 * `App/Connect/ConnectFlow.swift`.
 *
 * Authority: `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §6.
 * The spec lists the full machine including OAuth stages (`authorizing`, `awaiting_return`).
 * Sleeper is not an OAuth provider, so those stages are unreachable on the only path this item
 * ships — deliberately not modeled rather than added as dead cases.
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
            else -> null
        }

    /** True while a request is in flight; disables controls so a double-tap cannot re-submit. */
    val isBusy: Boolean
        get() = this is ResolvingAccount || this is ValidatingConnection
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
            // YAHOO_ENABLED is false pending a Fantasy API entitlement only Yahoo can grant
            // (P1-YahooReauth). The handshake succeeds while every Fantasy call 403s, so
            // offering the button would produce a connection that reads connected and serves
            // nothing.
            Yahoo -> ConnectAvailability.OnHold(
                "Yahoo connections are paused while we wait on Yahoo to restore our data access.",
            )
            // Onboarding contract §5: ESPN is research-gated on native and a store build must
            // not ask for a password or raw cookie entry. §10 blocks "ESPN connected" UI until
            // the ESPN mobile feasibility memo resolves.
            Espn -> ConnectAvailability.UseWeb(
                "ESPN needs your browser to connect securely. Connect it once on the Omen website and it'll show up here.",
            )
        }
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
