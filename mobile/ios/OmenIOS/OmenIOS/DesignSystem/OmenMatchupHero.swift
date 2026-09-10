import SwiftUI

/// Compact fantasy-team label for surfaces where a full team name competes with score columns.
///
/// Multi-word names use initials. One-word names use the first three alphanumeric characters,
/// uppercased, so names like "Scaries" still produce a useful short label.
func omenCompactTeamLabel(_ name: String, maxCharacters: Int = 3) -> String {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return trimmed }
    let normalized = trimmed.replacingOccurrences(
        of: #"(?i)'s\b"#,
        with: "",
        options: .regularExpression
    )

    let words = normalized
        .components(separatedBy: CharacterSet.alphanumerics.inverted)
        .filter { !$0.isEmpty }

    if words.count > 1 {
        let initials = words.prefix(maxCharacters).compactMap(\.first)
        let label = String(initials).uppercased()
        return label.isEmpty ? trimmed : label
    }

    let source = words.first ?? trimmed
    let label = String(source.prefix(maxCharacters)).uppercased()
    return label.isEmpty ? trimmed : label
}

/// Card width, measured without participating in layout so the card can size to its content.
private struct MatchupHeroWidthKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

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

    /// Card width. Starts at 0, which reads as narrow — see the layout note below.
    @State private var measuredWidth: CGFloat = 0

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
        } else if whatToWatch == nil {
            // No rail to place, so no measuring and no reserved height. This branch used to go
            // through the GeometryReader below, which always expands and carried a
            // `minHeight: 220` — so a spine-only card reserved roughly 100pt of empty space
            // under itself, on the exact screen where vertical room is scarcest.
            OmenCard(variant: .solid) { spine }
        } else {
            OmenCard(variant: .solid) {
                // The width test used to live in a `GeometryReader` wrapped around this
                // content. A GeometryReader is greedy — it claims all offered height and has
                // no intrinsic height of its own — so the card could never size to what it
                // actually contained and sat at a flat 220 with dead space under the spine.
                // The width is now read from a `.background`, which measures without taking
                // part in layout, and the stack decides the height. Unknown width reads as
                // narrow so the first frame renders the stacked layout, which is correct on
                // every phone; the wide branch is for regular-width iPad only.
                let narrow = measuredWidth < 380
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
                .frame(maxWidth: .infinity, minHeight: 150, alignment: .leading)
                .background(
                    GeometryReader { proxy in
                        Color.clear.preference(key: MatchupHeroWidthKey.self, value: proxy.size.width)
                    }
                )
                .onPreferenceChange(MatchupHeroWidthKey.self) { width in
                    guard width > 0, width != measuredWidth else { return }
                    measuredWidth = width
                }
            }
        }
    }

    private var spine: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            eyebrow(eyebrowText)
            if showsColumns { columnHeader }
            teamRow(team: selectedTeam, semanticLabel: "Your team", isYours: true)
            connectingRule
            teamRow(team: opponent, semanticLabel: "Opponent", isYours: false)
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
    ///
    /// Narrowed from 64/72 on 2026-09-06. The numbers now render in the monospaced family
    /// (`OmenTypography.numeric`) rather than the proportional system face, and mono digits at
    /// these sizes need less room than the old reservation — a real `100.7` fits 78pt at 24pt
    /// with margin. Every point taken back here goes to the team name beside it, which was
    /// truncating to "Puk Around &…" on a 393pt phone.
    private static let projColumnWidth: CGFloat = 58
    private static let scoreColumnWidth: CGFloat = 78

    /// The scoreboard numbers, as **derivations of the `numeric` role** rather than raw
    /// `.system` sizes. Both were `.font(.system(size:))` literals, which resolve to the
    /// platform sans whatever family the role owns — so the two biggest numbers on the screen
    /// were the only text in the card not speaking the app's type system, and they would not
    /// have followed DM Mono in when the real font resources land.
    private static let scoreStyle = OmenTypography.numeric.at(size: 24, weight: .semibold)
    /// Smaller and lighter than the score: the projection is context, the score is the fact.
    private static let projStyle = OmenTypography.numeric.at(size: 18, weight: .regular)
    /// Records are a stat, not prose. They were `bodySmall`, which is the **serif** role — a
    /// serif "6-1" sat beside a sans team name and a mono column header in one 40pt-tall row,
    /// which is most of why this card read as three fonts arguing.
    private static let recordStyle = OmenTypography.numeric.at(size: 13, weight: .regular)

    private var columnHeader: some View {
        HStack(spacing: OmenSpacing.step8) {
            // Matches the leading accent bar in `teamRow` so `PROJ`/`SCORE` stay over their
            // own columns rather than drifting 3pt left of them.
            Color.clear.frame(width: 3, height: 0)
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

    /// `isYours` draws a short accent bar down the leading edge of your own row.
    ///
    /// Both rows were styled identically, so on a card showing two unfamiliar league names the
    /// reader had to know their own team name to know which line was theirs — the position
    /// convention (yours on top) is real but invisible, and it is the *only* thing that carried
    /// it. A rule, not a colour swap on the text: the row keeps `textPrimary` at full contrast
    /// either way, and VoiceOver already says "Your team" first, so this adds a sighted cue to
    /// match one the label always had.
    private func teamRow(team: OmenMatchupTeam, semanticLabel: String, isYours: Bool) -> some View {
        HStack(spacing: OmenSpacing.step8) {
            Capsule()
                .fill(isYours ? OmenColor.accent : Color.clear)
                .frame(width: 3)
                .frame(maxHeight: .infinity)
                .accessibilityHidden(true)

            HStack(spacing: OmenSpacing.step8) {
                Text(matchupDisplayName(team.name, semanticLabel: semanticLabel))
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .minimumScaleFactor(isYours ? 0.8 : 0.65)
                if !team.record.isEmpty {
                    Text(team.record)
                        .omenTextStyle(Self.recordStyle)
                        .foregroundStyle(OmenColor.textSecondary)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if showsColumns {
                Text(team.projectedText ?? "—")
                    .omenTextStyle(Self.projStyle)
                    .foregroundStyle(OmenColor.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(width: Self.projColumnWidth, alignment: .trailing)
            }
            Text(team.scoreText)
                .omenTextStyle(Self.scoreStyle)
                .foregroundStyle(OmenColor.textPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(
                    width: showsColumns ? Self.scoreColumnWidth : nil,
                    alignment: .trailing
                )
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(rowAccessibilityLabel(team: team, semanticLabel: semanticLabel))
    }

    private func matchupDisplayName(_ name: String, semanticLabel: String) -> String {
        semanticLabel == "Your team" ? omenCompactTeamLabel(name) : name
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
            // Empty, not "Not started". The eyebrow directly above already reads
            // "MATCHUP · NOT STARTED" — printing it again three lines down inside the rule put
            // the same two words on screen twice with a hairline between them, which is what
            // the founder was looking at on 2026-09-06. With columns present the rule has
            // nothing left to say, so it says nothing and stays a hairline.
            if showsColumns { return "" }
            // Both sides carry an em dash before kickoff when the provider gave no projection,
            // and "Projected: —–—" is a label with nothing behind it. Seen on a real ESPN
            // league. Say the true thing instead.
            let hasNumbers = s.scoreText != "—" || o.scoreText != "—"
            guard hasNumbers else { return "Not started" }
            return "Projected: \(s.scoreText)–\(o.scoreText)"
        case let .live(_, _, projectedFinish, _):
            // Same reason: the eyebrow says "LIVE", so "Live score" here is an echo.
            if showsColumns { return "" }
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
        // `projectedText ?? scoreText`, not `scoreText`. Before kickoff `scoreText` is an em
        // dash by design — nobody has scored, and a `0.0` there would read as a real score of
        // nothing — so once the PROJ column shipped this label started announcing "projected —"
        // while the screen showed 100.7. The number moved into its own field and the label was
        // never re-pointed at it. Falls back to `scoreText` for a caller with no projection,
        // which is the shape this label was written for and still the pre-column behaviour.
        let mine = s.projectedText ?? s.scoreText
        let theirs = o.projectedText ?? o.scoreText
        return "Matchup starts at \(startTime). Your team \(s.name) (\(s.record)) projected \(mine). Opponent \(o.name) (\(o.record)) projected \(theirs)."
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
