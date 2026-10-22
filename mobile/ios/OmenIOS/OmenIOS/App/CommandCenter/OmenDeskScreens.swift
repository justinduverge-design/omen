import SwiftUI

// MARK: - J2, "the desk"
//
// The five artboards of `screen-journeys-v1.md`'s second journey: `CommandCenter`,
// `CommandQuiet`, `CommandQuietStraight`, `SwitchSheet` and `SwitchLoading`. Built to
// `design/native-visual-lock-2026-09-13/` under the 2026-09-18/19 precedence rule — the artboard
// owns composition, placement, type and tone; `CONTRACTS.md` owns data, vocabulary and state.
//
// This is the U3 rebuild against `CommandCenter.dc.html`: a scoreboard board, a league rail,
// one waiver card and one ledger line. It is the sole Command composition; the earlier v1.1
// assembly and its reduced state adapters were removed after production, carousel, gallery and
// screenshot evidence all migrated here.
//
// ## The capability contract on a screen with no evidence surface
//
// J2's profile is `consumes`. `capability-expression-v1.md` gives four presentation classes and
// `CONTRACTS.md` gives this screen its own rule: **"Every section fails independently; a dead
// matchup read sits beside live standings."** Those two compose into the design here:
//
//   - *used evidence*      — a section that read and mattered renders in full.
//   - *read, not used*     — named in the foot line, `text-tertiary`, no evidence styling.
//   - *could not read*     — the section renders in place, names the capability, and says in a
//                            sentence what was not read. It is never dropped to make room.
//   - *out of scope*       — absent. `not_requested` renders nowhere, on any screen.
//
// There are no capability glyphs anywhere below. `capability-symbols-v1.md` corrected that
// invented requirement on 2026-09-18: a capability renders as a word.

// MARK: - State

/// One side of the scoreboard (E-board rows).
struct OmenDeskTeam: Equatable {
    let crest: String
    let name: String
    /// "5–2 · you" / "6–1". The server composes it; the screen never derives "you" from a
    /// comparison it would have to guess at.
    let record: String
    let score: String
    let isMine: Bool
}

/// The `.board` block: provider, live status, both teams, the projection and the watch line.
struct OmenDeskMatchup: Equatable {
    let platform: OmenPlatform
    /// "Live · Q2", "Final", "Pre-game". Server wording, rendered verbatim.
    let status: String
    let leader: OmenDeskTeam
    let trailer: OmenDeskTeam
    /// "119.6 – 114.2". Absent when the provider returned no projection for either side —
    /// `league-overview.v1` models `projected` as optional per side and Yahoo often omits it.
    let projection: String?
    /// "Projected · 5.4 ahead"
    let projectionNote: String?
    /// 0...1, the artboard's `--h` on the inset rule.
    ///
    /// **Optional, and nil means the rule renders as a bare hairline.** The artboard draws it at
    /// 66% and the temptation is to reproduce that from the two live scores, but a bar that
    /// claims to show a projected lead cannot be derived from points already scored. Nil is the
    /// honest value until the server sends one.
    let leadFraction: Double?
    let watch: String?
}

/// A section's availability, which on this screen is per-section by contract.
///
/// `unread` carries the capability **name** and a sentence. Both, because
/// `capability-expression-v1.md` acceptance rule 4 requires every unavailable input to be named,
/// and rule 3 forbids dressing it as evidence.
enum OmenDeskSection<Value: Equatable>: Equatable {
    case read(Value)
    case unread(capability: String, sentence: String)
    /// Mid-`POST /api/leagues/active`. Distinct from `unread`: a switch in flight is not a
    /// failure, and per §10.3 the previous team's numbers are discarded rather than shown while
    /// it resolves.
    case switching
}

/// The waiver hero card's move (`.card.hero` → `.swap`).
///
/// Everything but the incoming player is optional. The artboard draws the best case — an add,
/// a drop and two projections — and `waiver-analysis.v1` frequently has less: `best_move.bid` is
/// `null` rather than `0` when any input is missing, and a drop candidate is only present when
/// the roster read succeeded. Modelling the artboard's best case as required would force a
/// client to invent the rest, which is the failure this whole contract exists to prevent.
struct OmenDeskWaiverMove: Equatable {
    let addName: String
    let addMeta: String
    let addPoints: String?
    let dropName: String?
    let dropMeta: String?
    let dropPoints: String?
    let reasoning: String
    let band: OmenConfidenceBand?
    /// Nil when the payload carries no risk. `waiver-analysis.v1` has neither a band nor a risk,
    /// and a hardcoded "Confident · Low risk" on every claim is a fabricated read.
    let risk: OmenRiskLevel?
    let riskReason: String?
    /// Omen's read for each side ("9.9"), from the `sight` block the server attaches. Nil when
    /// Omen has no read for that player; the line then shows the provider number alone.
    var addOmenPoints: String? = nil
    var dropOmenPoints: String? = nil
}

/// The single `.lrow` under "The Ledger".
struct OmenDeskLedgerLine: Equatable {
    let summary: String
    /// "This week · start / sit · you followed it"
    let meta: String
    let outcome: OmenDeskLedgerOutcome
}

/// `moves-history.v2` maps stored `win`/`loss` to these. The raw column is never surfaced.
enum OmenDeskLedgerOutcome: Equatable {
    case worked
    case didNotWork
    case pending
    case notVerified

    var label: String {
        switch self {
        case .worked: return "Worked"
        case .didNotWork: return "Did not work"
        case .pending: return "Pending"
        case .notVerified: return "Not verified"
        }
    }
}

/// The `.oneline` foot strip.
///
/// This is where the *read, not used* class lands on a screen with no evidence surface. The
/// artboard puts a `.oneline` on `CommandQuiet`, `CommandQuietStraight` and `SwitchLoading` and
/// omits it from `CommandCenter`; carrying it onto `CommandCenter` for the degraded pass is
/// recorded drift rather than a new component, and the degraded state of that artboard was never
/// drawn at all.
struct OmenDeskFootnote: Equatable {
    let text: String
    /// Rendered `text-primary` and bold, per `.oneline .tx b`. Used for the one clause that must
    /// not be skimmed — on `SwitchLoading` it is the discard guarantee.
    let emphasis: String?
}

/// Everything `CommandCenter`, and `SwitchLoading` as its mid-switch state, renders.
struct OmenDeskState: Equatable {
    /// "Week 7 · Sunday". `game_week.phase` rotates this server-side.
    let weekLabel: String
    /// "Lineups lock" over "1:00 PM". Absent when nothing is due, rather than rendered empty.
    let deadlineLabel: String?
    let deadlineTime: String?
    let matchup: OmenDeskSection<OmenDeskMatchup>
    /// The league rail's dots. `count` is how many leagues the directory returned; the screen
    /// does not invent a rail for an account with one league.
    let railCount: Int
    let railIndex: Int
    let waiver: OmenDeskSection<OmenDeskWaiverMove>
    let ledger: OmenDeskSection<OmenDeskLedgerLine>
    let footnote: OmenDeskFootnote?
}

/// "This week's move": the Omen call previewed on the desk (whole-app canvas, `Desk.dc.html`).
///
/// A preview, never a second engine: every field is copied from the brief the Omen tab already
/// renders, and tapping it opens that tab.
struct OmenDeskMovePreview: Equatable {
    let headline: String
    let reason: String?
    let band: OmenConfidenceBand?
    let isHold: Bool
}

extension OmenDeskMovePreview {
    /// Nil hides the section. With no league, off-season or no call, the desk does not invent one.
    static func section(from brief: OmenDecisionBriefState) -> OmenDeskSection<OmenDeskMovePreview>? {
        switch brief {
        case .success(let payload), .stale(let payload, _), .mock(let payload), .demo(let payload):
            return .read(OmenDeskMovePreview(
                headline: payload.verdict,
                reason: payload.explanation.first ?? payload.move,
                band: payload.confidenceBand,
                isHold: false
            ))
        case .hold(let hold):
            return .read(OmenDeskMovePreview(headline: hold.headline, reason: hold.summary, band: nil, isHold: true))
        case .loading:
            return .switching
        case .error(let message, _):
            return .unread(capability: "This week's move", sentence: message)
        case .empty, .disconnected, .offSeason:
            return nil
        }
    }
}

/// `quiet-week.v1`. The variant is **server-owned** and the copy is locked to the artboard.
enum OmenQuietVariant: String, Equatable {
    /// All positive quiet evidence: empty Omen result, connected platform, last result a win,
    /// live roster, known-healthy starters.
    case neutral
    /// Fires on a loss, an injured starter, a provider failure, or unknown quiet inputs.
    case straight
}

/// The quiet-week screen's payload.
///
/// Every string here comes from the server. The screen has no fallback copy, because the whole
/// point of the split is that playfulness is licensed by evidence — `CONTRACTS.md`: *"Playful is
/// permitted **only** here, and only when the server has positive quiet-week evidence."* A client
/// that could compose the neutral line itself could compose it after a loss.
struct OmenQuietState: Equatable {
    let variant: OmenQuietVariant
    /// "Week 8 · Bye" / "Week 9 · After a loss"
    let weekLabel: String
    let headline: String
    let body: String
    let band: OmenConfidenceBand?
    let risk: OmenRiskLevel
    /// "Next read · Tuesday 3:00 AM waivers"
    let nextRead: String
    let footnote: OmenDeskFootnote?
}

extension OmenQuietState {
    /// Maps `quiet-week.v1` onto the screen's payload. Returns `nil` whenever the response
    /// cannot honestly support the screen — not eligible, an unrecognised variant, or missing
    /// the server-owned copy it is supposed to carry. `weekLabel` comes from the shell's own
    /// `game_week` read (`DashboardSummary.GameWeek`), not from this response, which carries no
    /// week of its own.
    static func from(response: QuietWeekResponse, weekLabel: String) -> OmenQuietState? {
        guard response.eligible,
              let rawVariant = response.variant,
              let variant = OmenQuietVariant(rawValue: rawVariant),
              let headline = response.headline,
              let body = response.body,
              let nextRead = response.nextRead
        else { return nil }
        return OmenQuietState(
            variant: variant,
            weekLabel: weekLabel,
            headline: headline,
            body: body,
            band: .confident,
            risk: .low,
            nextRead: nextRead,
            footnote: nil
        )
    }
}

struct OmenDeskUnreadSection: View {
    let capability: String
    let sentence: String

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            Text(capability)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Text(sentence)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(OmenSpacing.step12)
        .background(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(OmenColor.surface1.opacity(0.5))
                .overlay(
                    // `.hatch`'s dashed border: the registry §2.3 carrier for a source that is
                    // not solid live data. Colour is never the only carrier (D7), so the words
                    // do the work and the dash confirms them.
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(OmenColor.border)
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(capability). Could not read. \(sentence)")
    }
}

/// `.oneline` — the foot strip.
struct OmenDeskFootnoteStrip: View {
    let footnote: OmenDeskFootnote

    var body: some View {
        HStack(spacing: OmenSpacing.step10) {
            Group {
                if let emphasis = footnote.emphasis {
                    Text(footnote.text) + Text(" ") + Text(emphasis).foregroundColor(OmenColor.textPrimary).bold()
                } else {
                    Text(footnote.text)
                }
            }
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textSecondary)
            .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.top, OmenSpacing.step10)
        .padding(.horizontal, OmenSpacing.step16)
        .overlay(alignment: .top) {
            Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
                .padding(.horizontal, OmenSpacing.step16)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel([footnote.text, footnote.emphasis].compactMap { $0 }.joined(separator: " "))
    }
}

// MARK: - Binding the desk to the real reads

extension OmenDeskState {
    /// Builds the desk from the three reads `CommandCenterViewModel` already makes:
    /// `league-overview.v1`, `waiver-analysis.v1` and `moves-history.v2`.
    ///
    /// **Nothing here invents a value.** Where a payload does not carry what the artboard draws,
    /// the field is nil and its element does not render, or the whole section becomes `.unread`
    /// with the capability named and the server's own reason quoted. That is the difference
    /// between this screen and a mockup: the mockup always has a projected score.
    ///
    /// Sections are resolved independently, which is `CONTRACTS.md`'s rule for this screen rather
    /// than a convenience — a dead matchup read must be able to sit beside a live wire.
    static func from(
        overview: LeagueOverview?,
        waiver: OmenDeskSection<OmenDeskWaiverMove>,
        ledger: OmenDeskSection<OmenDeskLedgerLine>,
        weekLabel: String,
        railCount: Int,
        railIndex: Int,
        standingsLine: String?
    ) -> OmenDeskState {
        OmenDeskState(
            weekLabel: weekLabel,
            // `league-overview.v1` carries no lineup-lock time. The artboard draws one; absent
            // it, the slot is empty rather than filled with a guess at 1:00 PM, which would be
            // wrong for every Thursday, Monday and international kickoff.
            deadlineLabel: nil,
            deadlineTime: nil,
            matchup: matchupSection(overview),
            railCount: railCount,
            railIndex: railIndex,
            waiver: waiver,
            ledger: ledger,
            footnote: standingsLine.map { OmenDeskFootnote(text: $0, emphasis: nil) }
        )
    }

    private static func matchupSection(_ overview: LeagueOverview?) -> OmenDeskSection<OmenDeskMatchup> {
        guard let overview else {
            return .unread(
                capability: "League matchup",
                sentence: "Omen has not read a league yet, so there is no matchup to show."
            )
        }
        guard
            let you = overview.matchup.you,
            let opponent = overview.matchup.opponent,
            let yourName = you.teamName, !yourName.isEmpty,
            let theirName = opponent.teamName, !theirName.isEmpty,
            let yourPoints = you.points,
            let theirPoints = opponent.points
        else {
            return .unread(
                capability: "League matchup",
                // `unavailable_reason` is a code, never copy: the shared mapping says it in words.
                sentence: {
                    switch overview.matchup.unavailableReason {
                    case "league_not_started": return "This league hasn\u{2019}t set its teams yet, so there is no matchup to show."
                    case "off_season": return "No matchups in the off-season."
                    default:
                        return overview.matchup.status == .noMatchup
                            ? "No matchup scheduled for this league this week."
                            : "The provider did not return this week\u{2019}s scoreboard."
                    }
                }()
            )
        }

        let iLead = yourPoints >= theirPoints
        let mine = OmenDeskTeam(
            crest: crest(from: yourName),
            name: yourName,
            record: [you.record, "you"].compactMap { $0 }.joined(separator: " · "),
            score: points(yourPoints),
            isMine: true
        )
        let theirs = OmenDeskTeam(
            crest: crest(from: theirName),
            name: theirName,
            record: opponent.record ?? "",
            score: points(theirPoints),
            isMine: false
        )

        // Both projections or neither. One side's projection beside the other side's live score
        // would read as a scoreline and compare two different things.
        var projection: String?
        if let yourProjected = you.projected, let theirProjected = opponent.projected {
            projection = "\(points(yourProjected)) – \(points(theirProjected))"
        }

        return .read(OmenDeskMatchup(
            platform: platform(from: overview.platform),
            status: overview.matchup.status.deskLabel,
            leader: iLead ? mine : theirs,
            trailer: iLead ? theirs : mine,
            projection: projection,
            projectionNote: projection == nil ? nil : "Projected",
            // Nil until the server sends a lead figure. See `OmenDeskMatchup.leadFraction`.
            leadFraction: nil,
            watch: nil
        ))
    }

    /// A crest is a claim about identity, so it is derived from the name the provider gave and
    /// never invented — the same rule `OmenLeagueSwitcherBar` states for its own.
    ///
    /// Delegates to `omenCompactTeamLabel`, the function the league chip uses, so the chip and the
    /// switcher sheet always agree ("Puk Around & Find Out" is "PAF" in both; the sheet used to
    /// say "PA&" because it took the first character of every space-separated token, ampersands
    /// included). Non-alphanumeric tokens are skipped.
    static func crest(from name: String) -> String {
        guard name.contains(where: { $0.isLetter || $0.isNumber }) else { return "\u{2014}" }
        return omenCompactTeamLabel(name)
    }

    private static func points(_ value: Double) -> String {
        String(format: "%.1f", value)
    }

    private static func platform(from raw: String) -> OmenPlatform {
        switch raw.lowercased() {
        case "yahoo": return .yahoo
        case "sleeper": return .sleeper
        default: return .espn
        }
    }
}

private extension LeagueOverview.Matchup.Status {
    /// The board's status word. Server-owned states, rendered as the artboard words them.
    var deskLabel: String {
        switch self {
        case .live: return "Live"
        case .final: return "Final"
        case .pregame: return "Pre-game"
        // A league with no matchup this week is not a failure and must not read as one — a bye
        // and an outage look identical if both say "Unavailable".
        case .noMatchup: return "No matchup"
        case .unavailable: return "Unavailable"
        }
    }
}

// MARK: - Production binding (the lock's Command Center, mounted)

extension OmenDeskSection where Value == OmenDeskWaiverMove {
    /// `waiver-analysis.v1` → the desk's waiver card. `nil` (no read yet, or the route was never
    /// asked) resolves to an explicit resting state rather than a skeleton that never ends.
    static func from(analysis: WaiverAnalysis?) -> OmenDeskSection<OmenDeskWaiverMove> {
        guard let analysis else {
            return .unread(
                capability: "Waivers",
                sentence: "Omen has not read this league's waiver wire yet."
            )
        }
        // Only a confirmed opportunity with a real add becomes a move; every other state says why.
        guard analysis.state == .confirmedOpportunity, let best = analysis.bestMove, let add = best.add,
              let name = add.name?.nilIfEmpty else {
            return .unread(
                capability: "Waivers",
                sentence: analysis.message?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
                    ?? "Omen has no claim worth making on this wire right now."
            )
        }
        return .read(OmenDeskWaiverMove(
            addName: name,
            addMeta: [add.position, add.team].compactMap { $0 }.joined(separator: " \u{00B7} "),
            addPoints: add.projectedPoints.map { String(format: "%.1f", $0) },
            dropName: best.drop?.name,
            dropMeta: best.drop.map { [$0.position, $0.team].compactMap { $0 }.joined(separator: " \u{00B7} ") }?.nilIfEmpty,
            dropPoints: best.drop?.projectedPoints.map { String(format: "%.1f", $0) },
            reasoning: best.whyNow?.nilIfEmpty ?? "Omen found this as the strongest available roster move.",
            band: nil,
            risk: nil,
            riskReason: nil,
            addOmenPoints: add.omenRead?.points.map { String(format: "%.1f", $0) },
            dropOmenPoints: best.drop?.omenRead?.points.map { String(format: "%.1f", $0) }
        ))
    }
}

extension OmenDeskSection where Value == OmenDeskLedgerLine {
    /// `START_SIT` is a database enum, not a sentence. The artboard reads "start / sit".
    static func callTypeWords(_ raw: String) -> String {
        switch raw.lowercased() {
        case "start_sit": return "start / sit"
        default: return raw.lowercased().replacingOccurrences(of: "_", with: " ")
        }
    }

    /// The Ledger preview's own honest states, carried onto the desk unchanged. `.loading` is the
    /// one case that may show a skeleton; an unreadable Ledger says so and never claims "empty".
    static func from(ledger: OmenLedgerPreviewState) -> OmenDeskSection<OmenDeskLedgerLine> {
        switch ledger {
        case .entries(let entries):
            guard let entry = entries.first else {
                return .unread(capability: "The Ledger", sentence: "No calls on the record yet.")
            }
            let action: String?
            switch entry.action {
            case .followed: action = "you followed it"
            case .passed: action = "you passed"
            case .unknown: action = nil
            }
            let outcome: OmenDeskLedgerOutcome
            switch entry.ledgerOutcome {
            case .worked: outcome = .worked
            case .didNotWork: outcome = .didNotWork
            case .notVerified: outcome = .notVerified
            case .pending: outcome = .pending
            }
            return .read(OmenDeskLedgerLine(
                summary: entry.summary,
                meta: [entry.period, Self.callTypeWords(entry.callType), action]
                    .compactMap { $0 }
                    .joined(separator: " \u{00B7} "),
                outcome: outcome
            ))
        case .empty:
            return .unread(capability: "The Ledger", sentence: "No calls on the record yet.")
        case .notConnected:
            return .unread(capability: "The Ledger", sentence: "Connect a league and Omen starts keeping the record.")
        case .loading:
            return .switching
        case .error(let message):
            return .unread(capability: "The Ledger", sentence: message)
        }
    }
}
