import SwiftUI

/// Fixtures and galleries for the foundation v1 patterns, so each piece can be captured and reviewed before
/// any screen uses it (progress file: Foundation). Sample data only; never reachable outside screenshot mode.
enum FoundationFixtures {
    static let puka = OmenPlayerSummary(id: "p1", name: "Puka Nacua", position: "WR", team: "LAR", number: 12, omenPoints: 18.6, providerPoints: 15.9, providerName: "ESPN", grade: 88, lead: .omen, detail: "LAR \u{00B7} Sun 4:25")
    static let bijan = OmenPlayerSummary(id: "p2", name: "Bijan Robinson", position: "RB", team: "ATL", number: 7, omenPoints: 19.8, providerPoints: 18.7, providerName: "ESPN", grade: 91, lead: .omen)
    static let meyers = OmenPlayerSummary(id: "p3", name: "Jakobi Meyers", position: "WR", team: "LV", number: 16, omenPoints: 13.4, providerPoints: 10.6, providerName: "ESPN", grade: 61, lead: .omen, injury: "Questionable")
    static let smith = OmenPlayerSummary(id: "p4", name: "DeVonta Smith", position: "WR", team: "PHI", number: 6, omenPoints: 10.3, providerPoints: 13.4, providerName: "ESPN", grade: 72, lead: .omen)
    static let pollard = OmenPlayerSummary(id: "p5", name: "Tony Pollard", position: "RB", team: "TEN", number: 20, grade: nil, detail: "can\u{2019}t be traded", locked: true, injury: "Out")
    static let mcbride = OmenPlayerSummary(id: "p6", name: "Trey McBride", position: "TE", team: "ARI", number: 85, omenPoints: 13.7, providerPoints: 12.2, providerName: "ESPN", grade: 82, lead: .unresolved)

    static let pukaPage = OmenPlayerPage(
        player: puka,
        ownerLabel: "Your team",
        gameLine: "Sun 4:25 vs SEA",
        reasons: [.init(text: "Target share up since Week 4", points: 1.6), .init(text: "Faces the 28th pass defence", points: 0.8), .init(text: "49.5-point game total", points: 0.3)],
        lastGames: [.init(label: "DAL", points: 21.4), .init(label: "SF", points: 12.8), .init(label: "NYG", points: 24.1), .init(label: "ARI", points: 9.6), .init(label: "SEA", points: 19.3)],
        role: [.init(label: "Snap share", value: "94%"), .init(label: "Targets a game", value: "11.0"), .init(label: "Catches a game", value: "7.5")],
        season: [.init(label: "Points a game", value: "17.9"), .init(label: "Season points", value: "107.4"), .init(label: "Games", value: "6"), .init(label: "Yards a catch, recent", value: "13.3")]
    )

    static let builder = OmenTradeBuilderState(
        mine: [puka, bijan, smith, mcbride, meyers],
        theirs: [
            OmenPlayerSummary(id: "t1", name: "Jahmyr Gibbs", position: "RB", team: "DET", number: 26, omenPoints: 20.4, providerPoints: 19.1, providerName: "ESPN", grade: 93, lead: .omen),
            OmenPlayerSummary(id: "t2", name: "Zay Flowers", position: "WR", team: "BAL", number: 4, omenPoints: 13.9, providerPoints: 13.1, providerName: "ESPN", grade: 77, lead: .omen),
            OmenPlayerSummary(id: "t3", name: "Garrett Wilson", position: "WR", team: "NYJ", number: 5, omenPoints: 15.2, providerPoints: 15.6, providerName: "ESPN", grade: 81, lead: .provider),
            pollard,
        ],
        partners: [OmenTradePartner(id: "gr", crest: "GR", name: "Gibbs me some Rice", need: "Needs WR")],
        partnerID: "gr",
        send: [TradePlayer(name: "DeVonta Smith", position: "WR", team: "PHI", playerKey: "p4")],
        receive: [TradePlayer(name: "Zay Flowers", position: "WR", team: "BAL", playerKey: "t2")]
    )

    /// Frame Main, League: ten teams, two trade targets, the wire, the week.
    static func league(degraded: Bool = false) -> OmenLeagueState {
        let names = ["Gibbs me some Rice", "Drake Maye Day", "Titans of Slopsilonia", "Taxi Squad Kings", "Puk Around & Find Out", "Chubb Rock"]
        let flowers = OmenPlayerSummary(id: "zf", name: "Zay Flowers", position: "WR", team: "BAL", omenPoints: 13.9, providerPoints: 13.1, providerName: "ESPN", grade: 77, lead: .omen)
        let miller = OmenPlayerSummary(id: "km", name: "Kendre Miller", position: "RB", team: "NO", omenPoints: 9.1, providerPoints: 8.4, providerName: "ESPN", grade: 58, lead: .omen)
        return OmenLeagueState(
            phase: .ready,
            eyebrow: "Slops Saloon \u{00B7} ESPN \u{00B7} 10 teams",
            headline: "3rd, one game back of first",
            subline: "Top 4 make the playoffs. You\u{2019}re 1 game clear of 5th.",
            standings: degraded ? [] : names.enumerated().map { i, n in
                .init(id: "\(i)", rank: i + 1, name: n, record: ["6\u{2013}1", "5\u{2013}2", "5\u{2013}2", "4\u{2013}3", "4\u{2013}3", "3\u{2013}4"][i], pointsFor: [812, 790, 777, 741, 730, 702][i], isYou: i == 2)
            },
            standingsNote: degraded ? "ESPN didn\u{2019}t send the standings this time." : nil,
            targets: degraded ? [] : [
                .init(id: "c1", partnerName: "Gibbs me some Rice", partnerNeed: "Needs WR", send: smith, receive: flowers, yourGain: 1.9, theirGain: 2.4, theCatch: nil),
                .init(id: "c2", partnerName: "Drake Maye Day", partnerNeed: "Needs RB", send: meyers, receive: miller, yourGain: 0.8, theirGain: 1.6, theCatch: nil),
            ],
            targetsNote: degraded ? "Omen could not read the other managers\u{2019} rosters for this league, so it names no trade targets." : nil,
            waiver: .init(line: "Add Tyjae Spears. Drop Roschon Johnson.", gain: 6.7),
            activity: [
                .init(id: "a1", text: "Taxi Squad Kings traded Breece Hall for Puka Nacua", category: "trade"),
                .init(id: "a2", text: "Chubb Rock added Tyjae Spears", category: "add"),
                .init(id: "a3", text: "Drake Maye Day dropped Rashid Shaheed", category: "drop"),
            ]
        )
    }

    /// Frame Sheets, "Your teams": three teams, the first checked, one signed out of Yahoo.
    static func switcher() -> some View {
        let teams = [
            OmenTeamCardModel(id: "e", platform: "espn", leagueName: "Slops Saloon", teamName: "Titans of Slopsilonia", record: "5\u{2013}2", score: 64.8, opponentScore: 51.2, status: .live(nil)),
            OmenTeamCardModel(id: "s", platform: "sleeper", leagueName: "Dynasty Degens", teamName: "Slopsilonia Dynasty", record: "4\u{2013}3", score: 88.1, opponentScore: 92.4, status: .final),
            OmenTeamCardModel(id: "y", platform: "yahoo", leagueName: "Work League", teamName: "Gridiron Gumbo", record: "3\u{2013}4", status: .reconnect),
        ]
        return OmenTeamSwitcherSheet(teams: teams, selectedID: "e", onSelect: { _ in }, onReconnect: { _ in }, onConnect: {}, onAccount: {}, onDone: {})
    }

    /// Frame Ledger: the contested record, the weeks as bars, every call. `graded: false` is before any result.
    static func ledger(graded: Bool) -> OmenLedgerState {
        let entries: [OmenLedgerEntry] = [
            .init(id: "c7", period: "WEEK 7", callType: "START/SIT", summary: "Start Meyers over D. Smith", outcome: "", action: .followed(.verified), ledgerOutcome: .pending, week: 7),
            .init(id: "c6", period: "WEEK 6", callType: "START/SIT", summary: "Start Wright over R. Johnson", outcome: "", action: .followed(.verified), ledgerOutcome: graded ? .worked : .pending, week: 6),
            .init(id: "c5", period: "WEEK 5", callType: "WAIVER", summary: "Add Spears, drop Tracy", outcome: "", action: .passed(.selfReported), ledgerOutcome: graded ? .didNotWork : .pending, week: 5),
            .init(id: "c4", period: "WEEK 4", callType: "START/SIT", summary: "Start Pierce over Shakir", outcome: "", action: .unknown, ledgerOutcome: graded ? .notVerified : .pending, week: 4),
            .init(id: "c3", period: "WEEK 3", callType: "TRADE", summary: "Trade: Etienne for McBride", outcome: "", action: .followed(.verified), ledgerOutcome: graded ? .worked : .pending, week: 3),
        ]
        let record = MovesHistory.Record(worked: nil, didNotWork: nil, contestedWorked: graded ? 41 : 0, contestedDidNotWork: graded ? 19 : 0, contestUnknown: nil, uncontested: nil)
        return OmenLedgerState(entries: graded ? entries : [entries[0]], record: record, providerName: "ESPN", season: 2026)
    }

    /// Frame LedgerReceipt: one call, frozen as issued. `closed: false` is a week not yet played.
    static func receipt(closed: Bool) -> OmenLedgerReceiptState {
        OmenLedgerReceiptState(
            eyebrow: closed ? "Right \u{00B7} Week 6" : "Pending \u{00B7} Week 7",
            outcome: closed ? .worked : .pending,
            headline: closed ? "Start Wright over R. Johnson" : "Start Meyers over D. Smith",
            detail: "Start/Sit \u{00B7} you made the move",
            result: closed ? "Wright scored 16.2, Johnson 2.4: +13.8 points" : nil,
            fairnessNote: "Graded on your league\u{2019}s half-PPR scoring. It counts toward the record because the other player was a real option: active and healthy.",
            said: [
                .init(id: 0, text: "Pollard is out three weeks and Wright took 71% of the backfield snaps last Sunday.", unread: false),
                .init(id: 1, text: "the weather forecast for the game", unread: true),
            ],
            issued: "Issued Tue 3:00 AM",
            choice: "Made the move (your word)"
        )
    }

    /// Frame Waivers: one add and drop with a bid, or nothing worth doing.
    static func waivers(move: Bool) -> OmenWaiversState {
        let spears = OmenPlayerSummary(id: "add", name: "Tyjae Spears", position: "RB", team: "TEN", omenPoints: 10.8, providerPoints: 8.9, providerName: "ESPN", grade: 66, lead: .omen, detail: "RB \u{00B7} TEN \u{00B7} 12% rostered")
        let roschon = OmenPlayerSummary(id: "drop", name: "Roschon Johnson", position: "RB", team: "CHI", omenPoints: 4.1, providerPoints: 4.1, providerName: "ESPN", grade: 31, lead: .unresolved)
        let others = [
            OmenWaiversState.Other(id: "o1", player: OmenPlayerSummary(id: "o1", name: "Jalen McMillan", position: "WR", team: "TB", omenPoints: 9.4, providerName: "ESPN", lead: .omen), note: "TB \u{00B7} 6 targets in each of the last 2"),
            OmenWaiversState.Other(id: "o2", player: OmenPlayerSummary(id: "o2", name: "Theo Johnson", position: "TE", team: "NYG", omenPoints: 7.2, providerName: "ESPN", lead: .omen), note: "NYG \u{00B7} route rate up to 78%"),
        ]
        return move
            ? OmenWaiversState(eyebrow: "Waivers \u{00B7} claims run Wed 3:00 AM", headline: "Add Tyjae Spears. Drop Roschon Johnson.",
                               reason: "Bijan is on bye in Week 9 and Spears is the only back on the wire with a real role.",
                               add: spears, drop: roschon, bid: "Bid $6", bidNote: "of your $82 left", others: others, empty: nil, providerName: "ESPN")
            : OmenWaiversState(eyebrow: "Waivers", headline: nil, reason: nil, add: nil, drop: nil, bid: nil, bidNote: nil, others: others,
                               empty: (title: "Nothing on the wire beats your bench", message: "Omen checked the free agents against your roster this week."), providerName: "ESPN")
    }

    /// Frame ThreeTeam: you, Gibbs me some Rice, Drake Maye Day; building, or judged with the provider steps.
    static func threeTeam(judged: Bool) -> OmenThreeTeamState {
        let teams = [
            OmenTradePartner(id: "you", crest: "You", name: "You"),
            OmenTradePartner(id: "gr", crest: "GR", name: "Gibbs me some Rice", need: "Needs WR"),
            OmenTradePartner(id: "dm", crest: "DM", name: "Drake Maye Day"),
        ]
        let miller = OmenPlayerSummary(id: "km", name: "Kendre Miller", position: "RB", team: "NO", number: 25, omenPoints: 9.1, providerPoints: 8.4, providerName: "Sleeper", grade: 58, lead: .omen)
        let moves = [
            OmenThreeTeamState.Move(id: "1", players: ["DeVonta Smith"], fromID: "you", toID: "gr"),
            OmenThreeTeamState.Move(id: "2", players: ["Zay Flowers"], fromID: "gr", toID: "dm"),
            OmenThreeTeamState.Move(id: "3", players: ["Kendre Miller"], fromID: "dm", toID: "you"),
        ]
        return OmenThreeTeamState(
            providerName: "Sleeper", teams: teams, candidates: [],
            rosters: ["you": builder.mine, "gr": builder.theirs, "dm": [miller]],
            destinations: ["you|p4": "gr"], moves: moves,
            phase: judged ? .judged(
                lines: [
                    .init(id: "you", name: "You", sends: "send D. Smith to Gibbs me some Rice", gets: "get K. Miller from Drake Maye Day", net: 1.4),
                    .init(id: "gr", name: "Gibbs me some Rice", sends: "send Z. Flowers to Drake Maye Day", gets: "get D. Smith from you", net: 2.1),
                    .init(id: "dm", name: "Drake Maye Day", sends: "send K. Miller to you", gets: "get Z. Flowers from Gibbs me some Rice", net: 0.8),
                ],
                caption: "",
                steps: [
                    .init(id: 0, text: "You \u{2192} Gibbs me some Rice", done: true),
                    .init(id: 1, text: "Gibbs me some Rice \u{2192} Drake Maye Day", done: false),
                ]
            ) : .building
        )
    }

    static let teams: [OmenTeamCardModel] = [
        OmenTeamCardModel(id: "t1", platform: "espn", leagueName: "Slops Saloon", teamName: "Titans of Slopsilonia", record: "5\u{2013}2", score: 64.8, opponentName: "Gibbs me some Rice", opponentRecord: "6\u{2013}1", opponentScore: 51.2, playersLeft: 4, opponentPlayersLeft: 2, projected: 119.6, opponentProjected: 114.2, line: "Projected to win by 5.4. Bijan and McBride still to play.", status: .live("Q2")),
        OmenTeamCardModel(id: "t2", platform: "sleeper", leagueName: "Dynasty Degens", teamName: "Slopsilonia Dynasty", record: "4\u{2013}3", score: 88.1, opponentName: "Taxi Squad Kings", opponentRecord: "5\u{2013}2", opponentScore: 92.4, playersLeft: 3, opponentPlayersLeft: 1, projected: 121.0, opponentProjected: 112.5, status: .live("Q3")),
        OmenTeamCardModel(id: "t3", platform: "yahoo", leagueName: "Work League", teamName: "Gridiron Gumbo", record: "3\u{2013}4", status: .reconnect),
    ]
}

struct FoundationPlayersGallery: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                OmenSectionHeader(title: "Your team", trailing: "Omen \u{00B7} ESPN")
                VStack(spacing: 0) {
                    OmenPlayerRow(player: FoundationFixtures.puka, variant: .browse(onOpen: {}))
                    OmenHairline()
                    OmenPlayerRow(player: FoundationFixtures.bijan, variant: .compare(onOpen: {}))
                    OmenHairline()
                    OmenPlayerRow(player: FoundationFixtures.smith, variant: .pick(selected: true, onToggle: {}, onInfo: {}), showsGrade: true)
                    OmenHairline()
                    OmenPlayerRow(player: FoundationFixtures.pollard, variant: .pick(selected: false, onToggle: {}, onInfo: {}), showsGrade: true)
                }
                OmenReadBlock(player: FoundationFixtures.puka, reasons: [
                    .init(text: "Target share up since Week 4", points: 1.6),
                    .init(text: "Faces the 28th pass defence", points: 0.8),
                ])
                OmenSidePair(
                    primary: .init(label: "Start", player: FoundationFixtures.meyers, value: "13.4", valueCaption: "Omen \u{00B7} ESPN 10.6"),
                    secondary: .init(label: "Sit", player: FoundationFixtures.smith, value: "10.3", valueCaption: "Omen \u{00B7} ESPN 13.4")
                )
                HStack(spacing: OmenSpacing.step24) {
                    OmenFigure(value: "+3.1", label: "points better", emphasized: true)
                    OmenFigure(value: "Medium", label: "risk")
                    OmenFigure(value: "Lean", label: "confidence")
                }
                OmenStatGrid(stats: [.init(label: "Snap share", value: "94%"), .init(label: "Targets / game", value: "11.0"), .init(label: "Catches / game", value: "7.5"), .init(label: "Yards per catch", value: "13.3")])
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step16)
        }
        .background(OmenColor.bg)
    }
}

struct FoundationTeamsGallery: View {
    @State private var selected: String? = "t1"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                HStack {
                    VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                        Text("WEEK 7 \u{00B7} SUNDAY").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                        Text("Up in 1 of 2").omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                    }
                    Spacer()
                    OmenAvatar(initials: "JD", action: {})
                }
                .padding(.horizontal, OmenSpacing.step20)
                OmenTeamRolodex(teams: FoundationFixtures.teams, selectedID: $selected, onReconnect: { _ in })
                VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                    OmenPinnedScore(team: FoundationFixtures.teams[0], onTap: {})
                    OmenTeamControl(platform: "espn", teamName: "Titans", action: {})
                    HStack { OmenProviderMark(platform: "sleeper", style: .tag); OmenProviderMark(platform: "yahoo", style: .tag); OmenProviderMark(platform: "espn") }
                    OmenStateBlock(kind: .hold, title: "Hold. Your lineup is already right.", message: "Omen checked every bench swap and the wire.")
                    OmenStateBlock(kind: .failed, title: "Omen couldn\u{2019}t reach your league", message: "Check your connection and try again.", actionTitle: "Try again", action: {})
                }
                .padding(.horizontal, OmenSpacing.step20)
            }
            .padding(.top, OmenSpacing.step16)
        }
        .background(OmenColor.bg)
    }
}

/// The Desk on fixtures, for screenshots: the same view production mounts.
struct DeskScenario: View {
    let phase: OmenDeskView.Phase
    var demo = false
    @State private var selected: String? = "t1"

    var body: some View {
        OmenDeskView(
            phase: phase,
            weekLabel: "Week 7 \u{00B7} Sunday",
            teams: demo ? [FoundationFixtures.teams[0]] : FoundationFixtures.teams,
            selectedTeamID: $selected,
            move: OmenDeskMovePreview(headline: "Start Jakobi Meyers in your flex.", reason: "The Giants put their best corner on Smith and leave the slot to a rookie.", band: nil, isHold: false),
            needs: [.init(id: "waiver", kind: .waiver, title: "Add Tyjae Spears, drop Roschon Johnson", detail: "Covers Bijan\u{2019}s Week 9 bye")]
                + (demo ? [] : [.init(id: "reconnect", kind: .reconnect, title: "Sign in to Yahoo again", detail: "Work League")]),
            team: [FoundationFixtures.puka, FoundationFixtures.bijan, FoundationFixtures.mcbride, FoundationFixtures.meyers],
            teamProvider: "ESPN",
            ledgerLine: "Omen\u{2019}s record: 41\u{2013}19 when it disagreed with ESPN",
            isDemo: demo,
            onTryDemo: {},
            onOpenLedger: {}
        )
    }
}
