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
    /**
     * Where we are in the NFL game week. Null because it is additive and a server that
     * predates it must not fail the parse — the headline falls back to a status-only line.
     */
    val gameWeek: GameWeek? = null,
) {
    /**
     * `game_week` — the Command Center headline's clock.
     *
     * **Comes from the server, never from the device.** NFL week rollover is a league fact in
     * the league's own timezone: a phone in Los Angeles at 9pm Monday is still on Monday in
     * the league's week while UTC has already moved it to Tuesday. Computing this client-side
     * would give two users the same week and different headlines.
     * iOS mirror: `DashboardSummary.GameWeek`.
     */
    data class GameWeek(
        /**
         * The week the phase refers to — on Tuesday and Wednesday that is the week about to be
         * played, the same number the user will see on Sunday. Null in the off-season,
         * deliberately: a headline naming a week that has not arrived is a lie the user can
         * see, so absence is modelled rather than clamped to 1.
         */
        val week: Int?,
        val phase: Phase,
        /** Day in the league's timezone, so copy can vary across the live window. */
        val day: String?,
        val isOffSeason: Boolean,
    ) {
        enum class Phase(val wire: String) {
            /** Tuesday. Waivers cleared, last week scored, this week's plan being built. */
            Preparing("preparing"),

            /** Wednesday. The plan is done and waiting. */
            Ready("ready"),

            /** Thursday through Monday. Games are on. */
            Live("live"),
            OffSeason("off_season"),
            ;

            companion object {
                /**
                 * An unknown phase degrades to [Live] rather than failing — the contract may
                 * grow one, and a new string must not blank a headline.
                 */
                fun from(wire: String): Phase =
                    entries.firstOrNull { it.wire == wire } ?: Live
            }
        }
    }
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
                ToolStatus.from(tools.optJSONObject(tool)?.optStringOrNull("status").orEmpty())

            DashboardSummary(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                isMock = root.optBoolean("is_mock", false),
                favoriteTeam = root.optJSONObject("user")
                    ?.optStringOrNull("favorite_team").orEmpty()
                    ?.takeIf { it.isNotEmpty() && it != "null" },
                platforms = Platforms(
                    yahooConnected = connected("yahoo"),
                    sleeperConnected = connected("sleeper"),
                    espnConnected = connected("espn"),
                ),
                omenStatus = status("omen_of_the_week"),
                waiverStatus = status("waiver_wire"),
                gameWeek = root.optJSONObject("game_week")?.let { gw ->
                    GameWeek(
                        week = gw.optIntOrNull("week"),
                        phase = GameWeek.Phase.from(gw.optStringOrNull("phase").orEmpty()),
                        day = gw.optStringOrNull("day"),
                        isOffSeason = gw.optBoolean("is_off_season", false),
                    )
                },
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
    leaguePulse: OmenLeaguePulseState? = null,
    matchup: OmenMatchupHeroState? = null,
): OmenCommandCenterState = OmenCommandCenterState(
    greeting = greetingFor(omenStatus, gameWeek),
    context = context ?: OmenContextStripState.Empty,
    // A real matchup always wins. The shell can only ever say why there isn't one.
    matchup = matchup ?: OmenMatchupHeroState.NoMatchup(
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
    // Same never-regress rule as [context] and [ledger]: a supplied value always wins,
    // because `league-standings.v1` is the only source that knows the user's actual rank.
    leaguePulse = leaguePulse ?: leaguePulseFor(omenStatus),
)

/**
 * The Command Center headline.
 *
 * **The line moves with the NFL game week**, because the week itself has a rhythm and a
 * headline that ignores it reads the same on the Tuesday after a loss as it does at kickoff.
 * Founder direction, 2026-09-04: Tuesday prepares the plan, Wednesday has it ready, Thursday
 * through Monday is game mode. Swift twin: `OmenCommandCenterState.greeting(for:gameWeek:)`.
 *
 * ## Precedence
 *
 * **Status wins over the calendar.** A disconnected user must not be told "Sunday, Week 3 is
 * in play" — that is a claim about a week Omen cannot see for them. The phase lines are
 * reached only once the tools are actually usable.
 *
 * ## The lines
 *
 * | When | Line |
 * | --- | --- |
 * | Tue | Preparing your Week 3 game plan. |
 * | Wed | Your Week 3 game plan is ready. |
 * | Thu | Week 3 is live. Thursday night is on. |
 * | Fri | Week 3 in progress. Lineups still open. |
 * | Sat | Week 3 in progress. Lineups lock tomorrow. |
 * | Sun | Sunday. Week 3 is in play. |
 * | Mon | Monday night closes out Week 3. |
 *
 * This table and [gameWeekLine] are one thing; edit both together. **Still in workshop** — the
 * founder asked to rotate copy through the game week and these are the first draft of the
 * live-window lines, not a settled set.
 *
 * Superseded twice in two days, which is worth recording: `"This week's move is ready."` was a
 * status announcement about Omen at the top of a page whose job is to be a Small Council of
 * short reads (facts-of-record #16); `"Your week is scouted."` fixed the subject but was still
 * one static line for a seven-day rhythm.
 */
internal fun greetingFor(
    status: DashboardSummary.ToolStatus,
    gameWeek: DashboardSummary.GameWeek? = null,
): String {
    // Facts about the user's own setup outrank the calendar — they are why the rest of the
    // screen is empty, and the headline is where that gets said.
    when (status) {
        DashboardSummary.ToolStatus.NeedsPlatform -> return "No game plan yet."
        DashboardSummary.ToolStatus.OffSeason -> return "No game plan until kickoff."
        DashboardSummary.ToolStatus.Unknown -> return "Omen is reading your leagues."
        DashboardSummary.ToolStatus.PendingLiveEngine -> return "Omen needs more on your league."
        DashboardSummary.ToolStatus.Ready -> Unit
    }

    val week = gameWeek?.week
    // Tools are ready but the server told us nothing about the week — an older build, or the
    // off-season. Neither can name a week, so neither does.
    if (gameWeek == null || week == null || gameWeek.isOffSeason) return "Your game plan is ready."

    return gameWeekLine(gameWeek.phase, gameWeek.day, week)
}

/** The table above, in code. Separated so a copy change is one function. */
internal fun gameWeekLine(
    phase: DashboardSummary.GameWeek.Phase,
    day: String?,
    week: Int,
): String = when (phase) {
    DashboardSummary.GameWeek.Phase.Preparing -> "Preparing your Week $week game plan."
    DashboardSummary.GameWeek.Phase.Ready -> "Your Week $week game plan is ready."
    DashboardSummary.GameWeek.Phase.OffSeason -> "No game plan until kickoff."
    // Rotates across the live window so the page reads differently on Thursday night and
    // Monday night. Keyed to the day rather than randomised: a headline that changes on every
    // pull-to-refresh reads as a bug, and cannot be tested.
    DashboardSummary.GameWeek.Phase.Live -> when (day) {
        "thursday" -> "Week $week is live. Thursday night is on."
        "friday" -> "Week $week in progress. Lineups still open."
        "saturday" -> "Week $week in progress. Lineups lock tomorrow."
        "sunday" -> "Sunday. Week $week is in play."
        "monday" -> "Monday night closes out Week $week."
        // An unrecognised day still gets a true sentence rather than no headline.
        else -> "Week $week is live."
    }
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

/**
 * Shell-derived fallback only. Ready/PendingLiveEngine return [OmenLeaguePulseState.Loading], NOT
 * Unavailable: the shell says a usable league exists, so a standings request is genuinely in
 * flight. Returning Unavailable here is what made every healthy league report "Standings
 * temporarily unavailable" permanently.
 */
private fun leaguePulseFor(status: DashboardSummary.ToolStatus): OmenLeaguePulseState =
    when (status) {
        DashboardSummary.ToolStatus.Ready,
        DashboardSummary.ToolStatus.PendingLiveEngine -> OmenLeaguePulseState.Loading
        DashboardSummary.ToolStatus.NeedsPlatform,
        DashboardSummary.ToolStatus.Unknown -> OmenLeaguePulseState.NotConnected
        DashboardSummary.ToolStatus.OffSeason ->
            OmenLeaguePulseState.OffSeason("Standings return when the regular season starts.")
    }
