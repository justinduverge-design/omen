import SwiftUI

/// Fixtures and galleries for the foundation v1 patterns, so each piece can be captured and reviewed before
/// any screen uses it (progress file: Foundation). Sample data only; never reachable outside screenshot mode.
enum FoundationFixtures {
    static let puka = OmenPlayerSummary(id: "p1", name: "Puka Nacua", position: "WR", team: "LAR", number: 12, omenPoints: 18.6, providerPoints: 15.9, providerName: "ESPN", grade: 88, lead: .omen, detail: "LAR \u{00B7} Sun 4:25")
    static let bijan = OmenPlayerSummary(id: "p2", name: "Bijan Robinson", position: "RB", team: "ATL", number: 7, omenPoints: 19.8, providerPoints: 18.7, providerName: "ESPN", grade: 91, lead: .omen)
    static let meyers = OmenPlayerSummary(id: "p3", name: "Jakobi Meyers", position: "WR", team: "LV", number: 16, omenPoints: 13.4, providerPoints: 10.6, providerName: "ESPN", grade: 61, lead: .omen)
    static let smith = OmenPlayerSummary(id: "p4", name: "DeVonta Smith", position: "WR", team: "PHI", number: 6, omenPoints: 10.3, providerPoints: 13.4, providerName: "ESPN", grade: 72, lead: .omen)
    static let pollard = OmenPlayerSummary(id: "p5", name: "Tony Pollard", position: "RB", team: "TEN", number: 20, grade: nil, detail: "Out \u{00B7} can\u{2019}t be traded", locked: true)
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
