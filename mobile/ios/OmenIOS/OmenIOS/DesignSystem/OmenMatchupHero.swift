import SwiftUI

/// One side of the matchup spine.
/// `scoreText` is the strongest number on the row. For `BeforeGames` this is a projection
/// and the caller should format it as such (e.g. "119.6 proj").
struct OmenMatchupTeam {
    let name: String
    let record: String
    let scoreText: String
}

/// Registry §3.2 MatchupHero (Matchup Spine, Figma node `25:26`, approved 2026-07-20).
/// Selected team on top, opponent on bottom, centered projection/final rule between them,
/// and — when wide enough — a right-side "What to Watch" rail with exactly one factual
/// signal. Deliberate absences per mobile-briefs §1.2: no literal tournament bracket,
/// no mini field, no player headshots, no giant logos. Records sit beside team names in
/// smaller muted type, never beneath.
enum OmenMatchupHeroState {
    case beforeGames(selectedTeam: OmenMatchupTeam, opponent: OmenMatchupTeam, startTime: String, whatToWatch: String?)
    case live(selectedTeam: OmenMatchupTeam, opponent: OmenMatchupTeam, projectedFinish: String?, whatToWatch: String?)
    case final(selectedTeam: OmenMatchupTeam, opponent: OmenMatchupTeam, resultSummary: String, whatToWatch: String?)
    case noMatchup(reason: String)
}

struct OmenMatchupHero: View {
    let state: OmenMatchupHeroState
    let onOpen: (() -> Void)?

    init(state: OmenMatchupHeroState, onOpen: (() -> Void)? = nil) {
        self.state = state
        self.onOpen = onOpen
    }

    var body: some View {
        let a11y = omenMatchupHeroAccessibilityLabel(state)
        Group {
            if let onOpen {
                Button(action: onOpen) { card }
                    .buttonStyle(.plain)
                    .accessibilityLabel(a11y)
                    .accessibilityHint("View matchup")
            } else {
                card.accessibilityLabel(a11y)
            }
        }
    }

    @ViewBuilder
    private var card: some View {
        if case let .noMatchup(reason) = state {
            OmenCard(variant: .solid) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    eyebrow("MATCHUP")
                    Text(reason)
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                }
            }
        } else {
            OmenCard(variant: .solid) {
                GeometryReader { proxy in
                    let narrow = proxy.size.width < 380
                    Group {
                        if narrow || whatToWatch == nil {
                            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                                spine
                                if let signal = whatToWatch {
                                    watchRail(signal: signal)
                                }
                            }
                        } else {
                            HStack(alignment: .top, spacing: OmenSpacing.step16) {
                                spine.frame(maxWidth: .infinity, alignment: .leading)
                                if let signal = whatToWatch {
                                    watchRail(signal: signal).frame(width: 160)
                                }
                            }
                        }
                    }
                }
                .frame(minHeight: 220)
            }
        }
    }

    private var spine: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            eyebrow(eyebrowText)
            teamRow(team: selectedTeam, semanticLabel: "Your team")
            connectingRule
            teamRow(team: opponent, semanticLabel: "Opponent")
            if onOpen != nil {
                Text("View matchup →")
                    .omenTextStyle(OmenTypography.label)
                    .foregroundStyle(OmenColor.accent)
            }
        }
    }

    private func teamRow(team: OmenMatchupTeam, semanticLabel: String) -> some View {
        HStack {
            HStack(spacing: OmenSpacing.step8) {
                Text(team.name)
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)
                Text(team.record)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }
            Spacer(minLength: OmenSpacing.step8)
            Text(team.scoreText)
                .font(.system(size: 28, weight: .medium, design: .monospaced))
                .foregroundStyle(OmenColor.textPrimary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(semanticLabel)
    }

    private var connectingRule: some View {
        VStack(spacing: OmenSpacing.step4) {
            Rectangle()
                .fill(OmenColor.accent)
                .frame(height: 1)
            if !ruleText.isEmpty {
                Text(ruleText)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }
        }
    }

    private func watchRail(signal: String) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text("WHAT TO WATCH")
                .omenTextStyle(OmenTypography.eyebrow)
                .foregroundStyle(OmenColor.textSecondary)
            Text(signal)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textPrimary)
                .lineLimit(3)
        }
    }

    private func eyebrow(_ text: String) -> some View {
        Text(text)
            .omenTextStyle(OmenTypography.eyebrow)
            .foregroundStyle(OmenColor.textSecondary)
    }

    // MARK: state accessors

    private var selectedTeam: OmenMatchupTeam {
        switch state {
        case let .beforeGames(t, _, _, _),
             let .live(t, _, _, _),
             let .final(t, _, _, _):
            return t
        case .noMatchup:
            return OmenMatchupTeam(name: "", record: "", scoreText: "")
        }
    }

    private var opponent: OmenMatchupTeam {
        switch state {
        case let .beforeGames(_, o, _, _),
             let .live(_, o, _, _),
             let .final(_, o, _, _):
            return o
        case .noMatchup:
            return OmenMatchupTeam(name: "", record: "", scoreText: "")
        }
    }

    private var whatToWatch: String? {
        switch state {
        case let .beforeGames(_, _, _, w),
             let .live(_, _, _, w),
             let .final(_, _, _, w):
            return w
        case .noMatchup:
            return nil
        }
    }

    private var eyebrowText: String {
        switch state {
        case let .beforeGames(_, _, startTime, _): return "MATCHUP · \(startTime)"
        case .live: return "LIVE"
        case .final: return "FINAL"
        case .noMatchup: return "MATCHUP"
        }
    }

    private var ruleText: String {
        switch state {
        case let .beforeGames(s, o, _, _):
            return "Projected: \(s.scoreText)–\(o.scoreText)"
        case let .live(_, _, projectedFinish, _):
            return projectedFinish.map { "Projected finish: \($0)" } ?? "Live score"
        case let .final(_, _, resultSummary, _):
            return resultSummary
        case .noMatchup:
            return ""
        }
    }
}

/// Publicly exposed for tests + accessibility auditing.
func omenMatchupHeroAccessibilityLabel(_ state: OmenMatchupHeroState) -> String {
    switch state {
    case let .beforeGames(s, o, startTime, _):
        return "Matchup starts at \(startTime). Your team \(s.name) (\(s.record)) projected \(s.scoreText). Opponent \(o.name) (\(o.record)) projected \(o.scoreText)."
    case let .live(s, o, projectedFinish, _):
        var base = "Live: \(s.name) \(s.scoreText), \(o.name) \(o.scoreText)."
        if let projectedFinish { base += " Projected finish: \(projectedFinish)." }
        return base
    case let .final(s, o, resultSummary, _):
        return "Final: \(s.name) \(s.scoreText), \(o.name) \(o.scoreText). \(resultSummary)"
    case let .noMatchup(reason):
        return "No matchup this week. \(reason)"
    }
}

#if DEBUG
#Preview("Matchup — Live + Before + Final + None") {
    VStack(spacing: OmenSpacing.step16) {
        OmenMatchupHero(state: .live(
            selectedTeam: OmenMatchupTeam(name: "Justin Titans", record: "6–1", scoreText: "64.8"),
            opponent: OmenMatchupTeam(name: "Marcus's Team", record: "5–2", scoreText: "58.1"),
            projectedFinish: "119.6–114.2",
            whatToWatch: "Opponent has two players remaining Monday night."
        ), onOpen: {})
        OmenMatchupHero(state: .beforeGames(
            selectedTeam: OmenMatchupTeam(name: "Justin Titans", record: "6–1", scoreText: "119.6"),
            opponent: OmenMatchupTeam(name: "Marcus's Team", record: "5–2", scoreText: "114.2"),
            startTime: "Sun 1:00p ET",
            whatToWatch: "Projected within 5.4 points."
        ))
        OmenMatchupHero(state: .noMatchup(reason: "No matchup this week — bye."))
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
