import SwiftUI

/// One side of the matchup spine.
///
/// `scoreText` is the live/final number. `projectedText` is the projection, and when it is
/// supplied the row renders **two labelled columns** — `PROJ` and `SCORE` — instead of one
/// number, per the founder's 2026-09-04 sketch. Both numbers matter at once during a game:
/// where you are, and where you are heading. A single slot forced a choice between them and
/// the projection always lost.
///
/// `projectedText` is nil for a caller that has no projection (or does not want the columns),
/// and the row falls back to the single-number layout it had before. Absent, not zero — a
/// column of dashes beside real numbers is noise, and "0.0" would read as a real projection
/// of nothing.
struct OmenMatchupTeam {
    let name: String
    let record: String
    let scoreText: String
    var projectedText: String?

    init(name: String, record: String, scoreText: String, projectedText: String? = nil) {
        self.name = name
        self.record = record
        self.scoreText = scoreText
        self.projectedText = projectedText
    }
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
            if showsColumns { columnHeader }
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

    /// True when either side carries a projection. Both rows share one layout so the numbers
    /// line up into actual columns — a row with columns above a row without would put the
    /// opponent's score under your projection, which is worse than showing neither.
    private var showsColumns: Bool {
        selectedTeam.projectedText != nil || opponent.projectedText != nil
    }

    /// Column widths are fixed and shared so `123` and `50` sit under `PROJ` and `SCORE`
    /// rather than drifting with the length of a team name.
    private static let projColumnWidth: CGFloat = 64
    private static let scoreColumnWidth: CGFloat = 72

    private var columnHeader: some View {
        HStack(spacing: OmenSpacing.step8) {
            Spacer(minLength: 0)
            Text("PROJ")
                .omenTextStyle(OmenTypography.eyebrow)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(width: Self.projColumnWidth, alignment: .trailing)
            Text("SCORE")
                .omenTextStyle(OmenTypography.eyebrow)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(width: Self.scoreColumnWidth, alignment: .trailing)
        }
        // The headers are read once in each row's own label instead, so VoiceOver hears
        // "Demo Titans, 6-1, projected 123, scoring 50" rather than a stray "proj score".
        .accessibilityHidden(true)
    }

    private func teamRow(team: OmenMatchupTeam, semanticLabel: String) -> some View {
        HStack(spacing: OmenSpacing.step8) {
            HStack(spacing: OmenSpacing.step8) {
                Text(team.name)
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Text(team.record)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }
            Spacer(minLength: OmenSpacing.step8)
            if showsColumns {
                Text(team.projectedText ?? "—")
                    // Smaller than the score: the projection is context, the score is the
                    // fact. Same size would make the reader work out which is which.
                    .font(.system(size: 20, weight: .regular, design: .default))
                    .monospacedDigit()
                    .foregroundStyle(OmenColor.textSecondary)
                    .frame(width: Self.projColumnWidth, alignment: .trailing)
            }
            Text(team.scoreText)
                .font(.system(size: 28, weight: .medium))
                .monospacedDigit()
                .foregroundStyle(OmenColor.textPrimary)
                .frame(
                    width: showsColumns ? Self.scoreColumnWidth : nil,
                    alignment: .trailing
                )
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(rowAccessibilityLabel(team: team, semanticLabel: semanticLabel))
    }

    private func rowAccessibilityLabel(team: OmenMatchupTeam, semanticLabel: String) -> String {
        var parts = [semanticLabel, team.name]
        if !team.record.isEmpty { parts.append(team.record) }
        if showsColumns, let projected = team.projectedText {
            parts.append("projected \(projected)")
        }
        parts.append("scoring \(team.scoreText)")
        return parts.joined(separator: ", ")
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

    /// The line on the connecting rule.
    ///
    /// Both pre-game and live cases used to restate the two projections here. Once PROJ became
    /// its own column that is the same pair of numbers printed twice, three lines apart — so
    /// the rule stands down and says what the columns cannot: which phase you are in. Without
    /// columns it keeps its old job, because then it is the only place a projection appears.
    private var ruleText: String {
        switch state {
        case let .beforeGames(s, o, _, _):
            if showsColumns { return "Not started" }
            return "Projected: \(s.scoreText)–\(o.scoreText)"
        case let .live(_, _, projectedFinish, _):
            if showsColumns { return "Live score" }
            return projectedFinish.map { "Projected finish: \($0)" } ?? "Live score"
        case let .final(_, _, resultSummary, _):
            // Never redundant: the columns carry no result, and a projection is gone by now.
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
