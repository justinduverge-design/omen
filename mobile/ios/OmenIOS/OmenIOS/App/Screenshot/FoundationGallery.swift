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
                    OmenRosterRow(player: FoundationFixtures.puka, variant: .browse(onOpen: {}))
                    OmenHairline()
                    OmenRosterRow(player: FoundationFixtures.bijan, variant: .compare(onOpen: {}))
                    OmenHairline()
                    OmenRosterRow(player: FoundationFixtures.smith, variant: .pick(selected: true, onToggle: {}, onInfo: {}), showsGrade: true)
                    OmenHairline()
                    OmenRosterRow(player: FoundationFixtures.pollard, variant: .pick(selected: false, onToggle: {}, onInfo: {}), showsGrade: true)
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
