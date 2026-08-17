package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterState
import com.slopssaloon.omen.app.feature.commandcenter.OmenLeaguePulseState
import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerPreviewState
import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverWatchState
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import org.json.JSONObject

/**
 * M5-Native-API-Client slice B — `GET /api/dashboard/summary` → `dashboard-summary.v1`.
 * iOS mirror: `App/Api/DashboardSummary.swift`.
 *
 * Lenient about *additive* fields (this contract has grown `lastResult`, `favorite_team`, and
 * others and will grow again) and strict about the fields the shell gates on. An unknown tool
 * status decodes to [ToolStatus.Unknown] rather than failing the response — an unrecognized
 * status must not black out a user's Command Center.
 */
data class DashboardSummary(
    val contractVersion: String,
    val isMock: Boolean,
    val favoriteTeam: String?,
    val platforms: Platforms,
    val omenStatus: ToolStatus,
    val waiverStatus: ToolStatus,
) {
    data class Platforms(
        val yahooConnected: Boolean,
        val sleeperConnected: Boolean,
        val espnConnected: Boolean,
    ) {
        val anyConnected: Boolean get() = yahooConnected || sleeperConnected || espnConnected
    }

    /**
     * The four states defined by `omenReadiness.js` and pinned in
     * `omen-native-backend-state-contract-v1.md` §F2. No native code may invent a fifth.
     */
    enum class ToolStatus(val wire: String) {
        Ready("ready"),
        PendingLiveEngine("pending_live_engine"),
        NeedsPlatform("needs_platform"),
        OffSeason("off_season"),
        Unknown("");

        companion object {
            fun from(raw: String?): ToolStatus =
                entries.firstOrNull { it.wire == raw && it != Unknown } ?: Unknown
        }
    }

    companion object {
        /** Returns null on any structurally unreadable payload, which the client maps to Decode. */
        fun parse(json: String): DashboardSummary? = runCatching {
            val root = JSONObject(json)
            val platforms = root.getJSONObject("platforms")
            val tools = root.getJSONObject("tools")

            fun connected(name: String): Boolean =
                platforms.optJSONObject(name)?.optBoolean("connected", false) ?: false

            fun status(tool: String): ToolStatus =
                ToolStatus.from(tools.optJSONObject(tool)?.optString("status"))

            DashboardSummary(
                contractVersion = root.optString("contract_version"),
                isMock = root.optBoolean("is_mock", false),
                favoriteTeam = root.optJSONObject("user")
                    ?.optString("favorite_team")
                    ?.takeIf { it.isNotEmpty() && it != "null" },
                platforms = Platforms(
                    yahooConnected = connected("yahoo"),
                    sleeperConnected = connected("sleeper"),
                    espnConnected = connected("espn"),
                ),
                omenStatus = status("omen_of_the_week"),
                waiverStatus = status("waiver_wire"),
            )
        }.getOrNull()
    }
}

/**
 * Builds the Command Center from shell truth alone.
 *
 * **What this contract does and does not carry.** `dashboard-summary.v1` carries tool gates and
 * provider connection booleans. It carries no league display name, no team name, no matchup, no
 * waiver opportunities, no ledger rows, and no standings. Those arrive in their own slices.
 *
 * So this mapping renders *honest absence* rather than filling the gap. [context] is slice C's
 * overlay from `league-standings.v1`; until it arrives the strip stays empty, because naming a
 * league we were not given a name for would be invention.
 */
fun DashboardSummary.toCommandCenterState(
    context: OmenContextStripState? = null,
    ledger: OmenLedgerPreviewState? = null,
): OmenCommandCenterState = OmenCommandCenterState(
    greeting = greetingFor(omenStatus),
    context = context ?: OmenContextStripState.Empty,
    matchup = OmenMatchupHeroState.NoMatchup(
        reason = matchupReasonFor(omenStatus, platforms.anyConnected),
    ),
    waiverWatch = waiverWatchFor(waiverStatus, omenStatus),
    // [ledger] is slice E's overlay and follows the same never-regress rule as [context]: null
    // keeps the shell-derived default, and a supplied value always wins because
    // `moves-history.v1` is the only source that actually knows whether rows exist.
    ledger = ledger ?: if (omenStatus == DashboardSummary.ToolStatus.NeedsPlatform) {
        OmenLedgerPreviewState.NotConnected
    } else {
        OmenLedgerPreviewState.Empty
    },
    leaguePulse = leaguePulseFor(omenStatus),
)

private fun greetingFor(status: DashboardSummary.ToolStatus): String = when (status) {
    DashboardSummary.ToolStatus.Ready -> "This week's move is ready."
    DashboardSummary.ToolStatus.PendingLiveEngine -> "Your league needs a little more setup."
    DashboardSummary.ToolStatus.NeedsPlatform -> "Connect a league to see your matchup."
    DashboardSummary.ToolStatus.OffSeason -> "The season hasn't started yet."
    DashboardSummary.ToolStatus.Unknown -> "Omen is checking your leagues."
}

private fun matchupReasonFor(status: DashboardSummary.ToolStatus, connected: Boolean): String =
    when (status) {
        DashboardSummary.ToolStatus.Ready ->
            "Open Omen to see this week's move."
        // F2: this means "connected but missing the provider-specific context a safe live
        // attempt needs" — NOT "the engine isn't built." Say the former.
        DashboardSummary.ToolStatus.PendingLiveEngine ->
            "Your league is connected, but Omen still needs league details before it can call this week."
        DashboardSummary.ToolStatus.NeedsPlatform ->
            if (connected) {
                "Your connection isn't usable yet. Reconnect it in Account to see your week."
            } else {
                "No matchup yet — connect Sleeper or ESPN to see your team's week."
            }
        DashboardSummary.ToolStatus.OffSeason ->
            "No matchup yet — the regular season hasn't started."
        DashboardSummary.ToolStatus.Unknown ->
            "Omen couldn't read your league status. Pull to refresh."
    }

/**
 * `buildWaiverTool()` in `src/routes/dashboard.js` only ever returns `ready` or `needs_platform`
 * — it has no off-season branch, because the season gate lives on `omen_of_the_week` via
 * `isOffSeason()`. So the season must be taken from the Omen status, or a connected user would
 * be told to watch waivers in August.
 */
private fun waiverWatchFor(
    status: DashboardSummary.ToolStatus,
    season: DashboardSummary.ToolStatus,
): OmenWaiverWatchState {
    if (season == DashboardSummary.ToolStatus.OffSeason) return OmenWaiverWatchState.OffSeason

    return when (status) {
        // The waiver tool reports usable, but this contract carries no opportunities.
        // "Availability needs confirmation" is exactly true; an empty Calm list would read as
        // "Omen looked and found nothing," which it has not done.
        DashboardSummary.ToolStatus.Ready,
        DashboardSummary.ToolStatus.PendingLiveEngine -> OmenWaiverWatchState.AvailabilityUnknown
        DashboardSummary.ToolStatus.NeedsPlatform,
        DashboardSummary.ToolStatus.Unknown -> OmenWaiverWatchState.NotConnected
        DashboardSummary.ToolStatus.OffSeason -> OmenWaiverWatchState.OffSeason
    }
}

private fun leaguePulseFor(status: DashboardSummary.ToolStatus): OmenLeaguePulseState =
    when (status) {
        DashboardSummary.ToolStatus.Ready,
        DashboardSummary.ToolStatus.PendingLiveEngine -> OmenLeaguePulseState.Unavailable
        DashboardSummary.ToolStatus.NeedsPlatform,
        DashboardSummary.ToolStatus.Unknown -> OmenLeaguePulseState.NotConnected
        DashboardSummary.ToolStatus.OffSeason ->
            OmenLeaguePulseState.OffSeason("Standings return when the regular season starts.")
    }
