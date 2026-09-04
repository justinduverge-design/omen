import Foundation

/// M5-Native-API-Client slice B — `GET /api/dashboard/summary` → `dashboard-summary.v1`.
///
/// Decoding is intentionally lenient about *additive* fields (the contract has grown
/// `lastResult`, `favorite_team`, and others over time and will grow again) and strict
/// about the fields the shell actually gates on. Unknown tool status strings decode to
/// `.unknown` rather than failing the whole response — an unrecognized status must not
/// black out a user's Command Center.
struct DashboardSummary: Decodable, Equatable {
    let contractVersion: String
    let isMock: Bool
    let user: User
    let platforms: Platforms
    let tools: Tools
    /// Where we are in the NFL game week. Optional because it is additive and a server that
    /// predates it must not fail the decode — the headline falls back to a status-only line.
    let gameWeek: GameWeek?

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case isMock = "is_mock"
        case gameWeek = "game_week"
        case user, platforms, tools
    }

    /// `game_week` — the Command Center headline's clock.
    ///
    /// **Comes from the server, never from the device.** NFL week rollover is a league fact in
    /// the league's own timezone: a phone in Los Angeles at 9pm Monday is still on Monday in
    /// the league's week while UTC has already moved it to Tuesday. Computing this client-side
    /// would give two users the same week and different headlines.
    struct GameWeek: Decodable, Equatable {
        /// Where in the week we are. Unknown values degrade to `.live` rather than failing —
        /// the contract may grow a phase, and one new string must not blank a headline.
        enum Phase: String, Decodable {
            /// Tuesday. Waivers cleared, last week scored, this week's plan being built.
            case preparing
            /// Wednesday. The plan is done and waiting.
            case ready
            /// Thursday through Monday. Games are on.
            case live
            case offSeason = "off_season"

            init(from decoder: Decoder) throws {
                let raw = try decoder.singleValueContainer().decode(String.self)
                self = Phase(rawValue: raw) ?? .live
            }
        }

        /// The week the phase refers to — on Tuesday and Wednesday that is the week about to
        /// be played, the same number the user will see on Sunday. `nil` in the off-season,
        /// deliberately: a headline naming a week that has not arrived is a lie the user can
        /// see, so absence is modelled rather than clamped to 1.
        let week: Int?
        let phase: Phase
        /// Day in the league's timezone, so copy can vary across the live window.
        let day: String?
        let isOffSeason: Bool?

        enum CodingKeys: String, CodingKey {
            case week, phase, day
            case isOffSeason = "is_off_season"
        }
    }

    struct User: Decodable, Equatable {
        let favoriteTeam: String?

        enum CodingKeys: String, CodingKey { case favoriteTeam = "favorite_team" }
    }

    struct Platforms: Decodable, Equatable {
        let yahoo: Platform
        let sleeper: Platform
        let espn: Platform

        var anyConnected: Bool { yahoo.connected || sleeper.connected || espn.connected }
    }

    struct Platform: Decodable, Equatable {
        let connected: Bool
        /// Present on Yahoo as `"token_expired"`. Absent on a healthy connection.
        let status: String?
        let leagueId: String?
        let username: String?

        enum CodingKeys: String, CodingKey {
            case connected, status, username
            case leagueId = "league_id"
        }
    }

    struct Tools: Decodable, Equatable {
        let omenOfTheWeek: Tool
        let waiverWire: Tool

        enum CodingKeys: String, CodingKey {
            case omenOfTheWeek = "omen_of_the_week"
            case waiverWire = "waiver_wire"
        }
    }

    struct Tool: Decodable, Equatable {
        let available: Bool
        let status: ToolStatus
    }

    /// The four states defined by `omenReadiness.js` and pinned in
    /// `omen-native-backend-state-contract-v1.md` §F2. No native code may invent a fifth.
    enum ToolStatus: String, Decodable, Equatable {
        case ready
        case pendingLiveEngine = "pending_live_engine"
        case needsPlatform = "needs_platform"
        case offSeason = "off_season"
        case unknown

        init(from decoder: Decoder) throws {
            let raw = try decoder.singleValueContainer().decode(String.self)
            self = ToolStatus(rawValue: raw) ?? .unknown
        }
    }
}

// MARK: - Mapping to Command Center state

extension OmenCommandCenterState {
    /// Builds the Command Center from shell truth alone.
    ///
    /// **What this contract does and does not carry.** `dashboard-summary.v1` carries tool
    /// gates and provider connection booleans. It carries no league display name, no team
    /// name, no matchup, no waiver opportunities, no ledger rows, and no standings. Those
    /// arrive in slices C/D/E from their own routes.
    ///
    /// So this mapping deliberately renders *honest absence* rather than filling the gap:
    /// the context strip stays `.empty` because naming a league we were not given a name for
    /// would be invention, and the matchup carries a reason derived from the real status.
    /// The missing display-name fields are a backend ask, recorded in
    /// `Blueprints/handoffs/frontend-to-backend.md` — not something to paper over here.
    /// `context` is slice C's overlay. It is `nil` until (and unless) `league-standings.v1`
    /// yields a platform, a league name, and a team this user owns — so the default here
    /// stays `.empty` and the screen only ever gains detail, never loses it.
    /// `ledger` is slice E's overlay and follows the same never-regress rule as `context`:
    /// `nil` keeps the shell-derived default below, and a supplied value always wins because
    /// `moves-history.v1` is the only source that actually knows whether rows exist.
    static func from(
        summary: DashboardSummary,
        context: OmenContextStripState? = nil,
        ledger: OmenLedgerPreviewState? = nil,
        leaguePulse: OmenLeaguePulseState? = nil,
        matchup: OmenMatchupHeroState? = nil
    ) -> OmenCommandCenterState {
        let omenStatus = summary.tools.omenOfTheWeek.status
        let connected = summary.platforms.anyConnected

        return OmenCommandCenterState(
            greeting: greeting(for: omenStatus, gameWeek: summary.gameWeek),
            context: context ?? .empty,
            // A real matchup always wins. The shell can only ever say why there isn't one.
            matchup: matchup ?? .noMatchup(reason: matchupReason(for: omenStatus, connected: connected)),
            waiverWatch: waiverWatch(for: summary.tools.waiverWire.status, season: omenStatus),
            ledger: ledger ?? (omenStatus == .needsPlatform ? .notConnected : .empty),
            leaguePulse: leaguePulse ?? Self.leaguePulse(for: omenStatus)
        )
    }

    /// The Command Center headline.
    ///
    /// **The line moves with the NFL game week**, because the week itself has a rhythm and a
    /// headline that ignores it reads the same on the Tuesday after a loss as it does at
    /// kickoff. Founder direction, 2026-09-04: Tuesday prepares the plan, Wednesday has it
    /// ready, and Thursday through Monday is game mode.
    ///
    /// ## Precedence
    ///
    /// **Status wins over the calendar.** A disconnected user must not be told "Sunday, Week 3
    /// is in play" — that is a claim about a week Omen cannot see for them. The phase lines
    /// are reached only once the tools are actually usable.
    ///
    /// ## The lines
    ///
    /// | When | Line |
    /// | --- | --- |
    /// | Tue | Preparing your Week 3 game plan. |
    /// | Wed | Your Week 3 game plan is ready. |
    /// | Thu | Week 3 is live. Thursday night is on. |
    /// | Fri | Week 3 in progress. Lineups still open. |
    /// | Sat | Week 3 in progress. Lineups lock tomorrow. |
    /// | Sun | Sunday. Week 3 is in play. |
    /// | Mon | Monday night closes out Week 3. |
    ///
    /// This table and `gameWeekLine` are one thing; edit both together. **Still in workshop** —
    /// the founder asked to rotate copy through the game week and these are the first draft of
    /// the live-window lines, not a settled set.
    ///
    /// Superseded twice in two days, which is worth recording: `"This week's move is ready."`
    /// was a status announcement about Omen at the top of a page whose job is to be a Small
    /// Council of short reads (facts-of-record #16); `"Your week is scouted."` fixed the
    /// subject but was still one static line for a seven-day rhythm.
    static func greeting(
        for status: DashboardSummary.ToolStatus,
        gameWeek: DashboardSummary.GameWeek? = nil
    ) -> String {
        // Facts about the user's own setup outrank the calendar — they are why the rest of the
        // screen is empty, and the headline is where that gets said.
        switch status {
        case .needsPlatform:
            return "No game plan yet."
        case .offSeason:
            return "No game plan until kickoff."
        case .unknown:
            return "Omen is reading your leagues."
        case .pendingLiveEngine:
            return "Omen needs more on your league."
        case .ready:
            break
        }

        guard let gameWeek, let week = gameWeek.week, gameWeek.isOffSeason != true else {
            // Tools are ready but the server told us nothing about the week — an older build,
            // or the off-season. Neither can name a week, so neither does.
            return "Your game plan is ready."
        }
        return gameWeekLine(phase: gameWeek.phase, day: gameWeek.day, week: week)
    }

    /// The table above, in code. Separated so a copy change is one function.
    static func gameWeekLine(
        phase: DashboardSummary.GameWeek.Phase,
        day: String?,
        week: Int
    ) -> String {
        switch phase {
        case .preparing:
            return "Preparing your Week \(week) game plan."
        case .ready:
            return "Your Week \(week) game plan is ready."
        case .offSeason:
            return "No game plan until kickoff."
        case .live:
            // Rotates across the live window so the page reads differently on Thursday night
            // and Monday night. Keyed to the day rather than randomised: a headline that
            // changes on every pull-to-refresh reads as a bug, and cannot be tested.
            switch day {
            case "thursday": return "Week \(week) is live. Thursday night is on."
            case "friday":   return "Week \(week) in progress. Lineups still open."
            case "saturday": return "Week \(week) in progress. Lineups lock tomorrow."
            case "sunday":   return "Sunday. Week \(week) is in play."
            case "monday":   return "Monday night closes out Week \(week)."
            // An unrecognised day still gets a true sentence rather than no headline.
            default:         return "Week \(week) is live."
            }
        }
    }

    private static func matchupReason(for status: DashboardSummary.ToolStatus, connected: Bool) -> String {
        switch status {
        case .ready:
            return "Open Omen to see this week's move."
        case .pendingLiveEngine:
            // F2: this means "connected but missing the provider-specific context a safe
            // live attempt needs" — NOT "the engine isn't built." Say the former.
            return "Your league is connected, but Omen still needs league details before it can call this week."
        case .needsPlatform:
            return connected
                ? "Your connection isn't usable yet. Reconnect it in Account to see your week."
                : "No matchup yet — connect Sleeper or ESPN to see your team's week."
        case .offSeason:
            return "No matchup yet — the regular season hasn't started."
        case .unknown:
            return "Omen couldn't read your league status. Pull to refresh."
        }
    }

    /// `buildWaiverTool()` in `src/routes/dashboard.js` only ever returns `ready` or
    /// `needs_platform` — it has no off-season branch, because the season gate lives on
    /// `omen_of_the_week` via `isOffSeason()`. So the season must be taken from the Omen
    /// status, or a connected user would be told to watch waivers in August.
    private static func waiverWatch(
        for status: DashboardSummary.ToolStatus,
        season: DashboardSummary.ToolStatus
    ) -> OmenWaiverWatchState {
        if season == .offSeason { return .offSeason }

        switch status {
        case .ready, .pendingLiveEngine:
            // The waiver tool reports usable, but this contract carries no opportunities.
            // "Availability needs confirmation" is exactly true; an empty `.calm` list would
            // read as "Omen looked and found nothing," which it has not done.
            return .availabilityUnknown
        case .needsPlatform, .unknown:
            return .notConnected
        case .offSeason:
            return .offSeason
        }
    }

    /// Shell-derived fallback only. A supplied `leaguePulse` always wins, because
    /// `league-standings.v1` is the only source that actually knows the user's rank —
    /// this function can never do better than "a standings answer is expected".
    ///
    /// `.ready` / `.pendingLiveEngine` return `.loading`, NOT `.unavailable`: the shell says a
    /// usable league exists, so a standings request is genuinely in flight and the section is
    /// pending, not resting. Returning `.unavailable` here is what made a healthy league
    /// report "Standings temporarily unavailable" permanently.
    private static func leaguePulse(for status: DashboardSummary.ToolStatus) -> OmenLeaguePulseState {
        switch status {
        case .ready, .pendingLiveEngine:
            return .loading
        case .needsPlatform, .unknown:
            return .notConnected
        case .offSeason:
            return .offSeason(summary: "Standings return when the regular season starts.")
        }
    }
}
