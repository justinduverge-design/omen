import SwiftUI

// MARK: - J2, "the desk"
//
// The five artboards of `screen-journeys-v1.md`'s second journey: `CommandCenter`,
// `CommandQuiet`, `CommandQuietStraight`, `SwitchSheet` and `SwitchLoading`. Built to
// `design/native-visual-lock-2026-09-13/` under the 2026-09-18/19 precedence rule — the artboard
// owns composition, placement, type and tone; `CONTRACTS.md` owns data, vocabulary and state.
//
// ## Why these are new compositions rather than edits to `OmenCommandCenterScreen`
//
// That screen is the v1.1 assembly built against `omen-mobile-visual-briefs-v1.md`: context
// strip, matchup hero, widget pager, platform strip. The canvas folder's own README says the
// card "stays Command Center's until `U3` rebuilds that destination against
// `CommandCenter.dc.html`". This is that rebuild, and it is a different composition rather than
// a re-skin — a scoreboard board, a league rail, one waiver card and one ledger line.
//
// The old assembly is NOT deleted here. It still serves the carousel account, the platform
// detail sheets and three screenshot scenarios that certify them, and deleting it to land a
// journey would take those with it.
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
    let risk: OmenRiskLevel
    let riskReason: String?
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

// MARK: - CommandCenter

/// J2, screen one: the desk.
///
/// `CommandCenter.dc.html`. Declared a **fit** in the canvas README, so it does not scroll and
/// `omenFitProbe` publishes the measurement that proves it rather than leaving it to a
/// screenshot.
struct OmenCommandDeskScreen: View {
    let state: OmenDeskState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onOpenLeague: (() -> Void)?
    var onOpenLedger: (() -> Void)?
    /// Overridden by `OmenSwitchLoadingScreen`, which reuses this composition wholesale. The
    /// identifiers are parameters rather than modifiers applied from outside because
    /// `accessibilityIdentifier` on a composed view does not reliably replace an inner one, and
    /// a D11 probe reporting under the wrong screen's name is worse than no probe.
    var screenIdentifier: String = "j2.command-center"
    var fitProbeIdentifier: String = "j2.fit.command-center"

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            board
            rail
            sectionHeader("Waiver watch", action: onOpenLeague == nil ? nil : "League", perform: onOpenLeague)
            waiverCard
            sectionHeader("The Ledger", action: onOpenLedger == nil ? nil : "See all", perform: onOpenLedger)
            ledgerCard
            Spacer(minLength: OmenSpacing.step8)
            if let footnote = state.footnote {
                OmenDeskFootnoteStrip(footnote: footnote)
                    .padding(.top, OmenSpacing.step12)
            }
            Color.clear.frame(height: OmenSpacing.step12)
        }
        .accessibilityIdentifier(screenIdentifier)
        .omenFitContent()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe(fitProbeIdentifier)
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
    }

    /// `.top`, plus the E017 controls the artboard does not draw.
    ///
    /// **This is the journey's one deliberate departure from its artboard, and it is recorded.**
    /// `CommandCenter.dc.html` puts `Lineups lock / 1:00 PM` alone in the trailing slot; it is
    /// one of only five artboards out of thirty with no account avatar. But `CommandCenterView`'s
    /// own contract says Account "is contextual, reached via the Command Center header profile
    /// control, NOT a permanent tab" — so on the artboard as drawn, Account is unreachable from
    /// the destination that is supposed to reach it.
    ///
    /// Under the 2026-09-19 rule the two are mixed: the deadline text is kept because it is
    /// genuinely better than nothing there, and both controls are added because the product needs
    /// them.
    ///
    /// **The redraw is half done, and the half that is missing is recorded rather than implied.**
    /// `CommandCenter.dc.html` now draws the account avatar beside the deadline text, so the
    /// artboard and the built screen agree that Account is reachable from here. The help control
    /// is still undrawn — on this artboard and on all 25 others carrying E017 — because the
    /// canvas has no vocabulary for it: `_shared.css` defines `.av` and nothing else, and adding
    /// a help glyph means a new class in the shared stylesheet and a re-sync of every artboard.
    /// That is a canvas-system change, not a J2 redraw, so it was flagged instead of improvised.
    /// Inventing CSS inside an artboard is forbidden, and inventing it in `_shared.css` on the
    /// way past would have changed 30 files to close one journey's drift.
    private var header: some View {
        // `.bottom`, not `.lastTextBaseline`. The artboard's `.top` is `align-items:flex-end`, and
        // baseline alignment additionally asks SwiftUI to resolve a text baseline for the E017
        // icon buttons, which have no text — that collapsed their reported frame to the 20pt
        // glyph and put the help control under the 44pt floor. Caught by
        // `J2InteractionUITests`, which is the first test in this repo to measure that control.
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(state.weekLabel)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("Command")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            if let label = state.deadlineLabel, let time = state.deadlineTime {
                VStack(alignment: .trailing, spacing: 0) {
                    Text(label)
                    Text(time)
                }
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                .multilineTextAlignment(.trailing)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(label) at \(time)")
            }
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .commandCenter),
                onOpenAccount: onOpenAccount
            )
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }

    @ViewBuilder private var board: some View {
        switch state.matchup {
        case .read(let matchup):
            OmenDeskBoard(matchup: matchup)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        case .unread(let capability, let sentence):
            OmenDeskUnreadSection(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        case .switching:
            OmenDeskBoardSkeleton()
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        }
    }

    /// `.dots` — the league rail's page indicator.
    ///
    /// Absent below two leagues. An indicator for a rail that cannot move is furniture that
    /// claims an affordance the screen does not have.
    @ViewBuilder private var rail: some View {
        if state.railCount > 1 {
            HStack(spacing: OmenSpacing.step4) {
                ForEach(0..<state.railCount, id: \.self) { index in
                    let isOn = index == state.railIndex
                    RoundedRectangle(cornerRadius: isOn ? 3 : 2.5, style: .continuous)
                        .fill(isOn ? OmenColor.accent : OmenColor.borderSubtle)
                        .frame(width: isOn ? 16 : 5, height: 5)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.top, OmenSpacing.step8)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("League \(state.railIndex + 1) of \(state.railCount)")
        }
    }

    @ViewBuilder private var waiverCard: some View {
        switch state.waiver {
        case .read(let move):
            OmenDeskWaiverCard(move: move)
                .padding(.horizontal, OmenSpacing.step16)
        case .unread(let capability, let sentence):
            OmenDeskUnreadSection(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
        case .switching:
            OmenDeskCardSkeleton(lineWidths: [0.7, 0.9, 0.45])
                .padding(.horizontal, OmenSpacing.step16)
        }
    }

    @ViewBuilder private var ledgerCard: some View {
        switch state.ledger {
        case .read(let line):
            OmenCard(contentPadding: OmenSpacing.step12) {
                OmenDeskLedgerRow(line: line)
            }
            .padding(.horizontal, OmenSpacing.step16)
        case .unread(let capability, let sentence):
            OmenDeskUnreadSection(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
        case .switching:
            OmenDeskCardSkeleton(lineWidths: [0.6, 0.35])
                .padding(.horizontal, OmenSpacing.step16)
        }
    }

    /// `.sh` — an uppercase label and an optional accent link.
    @ViewBuilder private func sectionHeader(
        _ title: String,
        action: String?,
        perform: (() -> Void)?
    ) -> some View {
        HStack {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Spacer(minLength: OmenSpacing.step8)
            if let action, let perform {
                OmenSectionLink(title: action, section: title, action: perform)
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
        .padding(.bottom, OmenSpacing.step6)
    }
}

// MARK: - CommandQuiet / CommandQuietStraight

/// J2, the quiet week — both variants.
///
/// One composition, two payloads. `CommandQuiet.dc.html` and `CommandQuietStraight.dc.html` are
/// pixel-identical apart from the eyebrow and the two sentences, and building them as two screens
/// would be two places for the voice fence to drift apart.
///
/// The fence itself lives in the server: `quiet-week.v1` decides which variant fires, and the
/// screen renders the copy it is given. The `variant` field is carried anyway so a capture, a
/// test and a reviewer can all tell which half of the fence they are looking at.
struct OmenCommandQuietScreen: View {
    let state: OmenQuietState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            quiet
            Spacer(minLength: OmenSpacing.step8)
            if let footnote = state.footnote {
                OmenDeskFootnoteStrip(footnote: footnote)
            }
            Color.clear.frame(height: OmenSpacing.step14)
        }
        .accessibilityIdentifier("j2.command-quiet.\(state.variant.rawValue)")
        .omenFitContent()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe("j2.fit.command-quiet")
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
    }

    private var header: some View {
        // `.bottom`, not `.lastTextBaseline`. The artboard's `.top` is `align-items:flex-end`, and
        // baseline alignment additionally asks SwiftUI to resolve a text baseline for the E017
        // icon buttons, which have no text — that collapsed their reported frame to the 20pt
        // glyph and put the help control under the 44pt floor. Caught by
        // `J2InteractionUITests`, which is the first test in this repo to measure that control.
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(state.weekLabel)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("Command")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .commandCenter),
                onOpenAccount: onOpenAccount
            )
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }

    private var quiet: some View {
        VStack(spacing: OmenSpacing.step12) {
            OmenQuietMark()
            Text(state.headline)
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
                .multilineTextAlignment(.center)
            Text(state.body)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .multilineTextAlignment(.center)
                // `.qp` caps at 30ch. A centred paragraph that runs the full 390pt reads as a
                // wall; the cap is what makes it read as a remark.
                .frame(maxWidth: 260)
            HStack(spacing: OmenSpacing.step14) {
                if let band = state.band { OmenConfidenceBandLabel(band: band) }
                OmenRiskLabel(level: state.risk)
            }
            .padding(.top, OmenSpacing.step2)
            Text(state.nextRead)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, OmenSpacing.step24)
        .padding(.top, OmenSpacing.step32)
    }
}

/// `.quiet`'s 56pt brass mark — a sleeping eye, drawn as the artboard draws it.
///
/// Inline vector rather than an asset because it is four primitives and an asset would need a
/// dark/light pair, an export step and a place in the catalogue to say less.
private struct OmenQuietMark: View {
    var body: some View {
        Canvas { context, size in
            let scale = size.width / 1024
            func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat) -> Path {
                Path(roundedRect: CGRect(x: x * scale, y: y * scale, width: w * scale, height: h * scale),
                     cornerRadius: r * scale)
            }
            let brass = GraphicsContext.Shading.color(OmenColor.accent)
            var eye = Path(ellipseIn: CGRect(x: 298 * scale, y: 150 * scale, width: 428 * scale, height: 724 * scale))
            eye.addEllipse(in: CGRect(x: 360 * scale, y: 212 * scale, width: 304 * scale, height: 600 * scale))
            context.fill(eye, with: brass, style: FillStyle(eoFill: true))
            context.fill(rect(497, 360, 30, 304, 15), with: brass)
            for y in [404.0, 474.0, 544.0] {
                context.fill(rect(455, y, 114, 26, 13), with: brass)
            }
        }
        .frame(width: 56, height: 56)
        .opacity(0.5)
        .accessibilityHidden(true)
    }
}

// MARK: - Shared blocks

/// `.board` — the scoreboard.
private struct OmenDeskBoard: View {
    let matchup: OmenDeskMatchup

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            head
            row(matchup.leader, isLeading: true)
            middle
            row(matchup.trailer, isLeading: false)
            if let watch = matchup.watch {
                Text(watch)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .padding(.top, OmenSpacing.step8)
                    .overlay(alignment: .top) {
                        Rectangle().fill(OmenColor.textPrimary.opacity(0.08)).frame(height: 1)
                    }
                    .padding(.top, OmenSpacing.step8)
            }
        }
        .padding(OmenSpacing.step12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(LinearGradient(colors: [OmenColor.surface2, OmenColor.surface1], startPoint: .top, endPoint: .bottom))
                .overlay(alignment: .top) {
                    Rectangle().fill(OmenColor.accent.opacity(0.34)).frame(height: 1)
                }
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        )
    }

    private var head: some View {
        HStack {
            HStack(spacing: OmenSpacing.step4) {
                // The provider hex, never the only carrier — the provider is named beside it (D7).
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(platformChip)
                    .frame(width: 7, height: 7)
                    .accessibilityHidden(true)
                Text(platformName)
            }
            Spacer(minLength: OmenSpacing.step8)
            Text(matchup.status)
        }
        .omenTextStyle(OmenTypography.micro)
        .foregroundStyle(OmenColor.textTertiary)
        .padding(.bottom, OmenSpacing.step10)
    }

    private func row(_ team: OmenDeskTeam, isLeading: Bool) -> some View {
        HStack(spacing: OmenSpacing.step10) {
            crest(team)
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(team.name)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .fontWeight(.bold)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                Text(team.record)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Text(team.score)
                .omenTextStyle(isLeading ? OmenTypography.scoreLead : OmenTypography.scoreTrail)
                .foregroundStyle(isLeading ? OmenColor.textPrimary : OmenColor.textTertiary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(team.name), \(team.record), \(team.score) points")
    }

    /// `.bmid` — the inset rule and the projection line.
    private var middle: some View {
        HStack(spacing: OmenSpacing.step10) {
            ZStack(alignment: .bottom) {
                Capsule().fill(OmenColor.borderSubtle)
                if let fraction = matchup.leadFraction {
                    Capsule()
                        .fill(OmenColor.accent)
                        .frame(height: 22 * max(0, min(1, fraction)))
                }
            }
            .frame(width: 2, height: 22)
            .frame(width: 30)
            .accessibilityHidden(true)
            HStack(spacing: OmenSpacing.step8) {
                if let projection = matchup.projection {
                    Text(projection)
                        .foregroundStyle(OmenColor.textSecondary)
                }
                if let note = matchup.projectionNote {
                    Text(note)
                        .foregroundStyle(OmenColor.textTertiary)
                }
            }
            .omenTextStyle(OmenTypography.micro)
            Spacer(minLength: 0)
        }
        .padding(.vertical, OmenSpacing.step6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel([matchup.projection, matchup.projectionNote].compactMap { $0 }.joined(separator: ". "))
    }

    private func crest(_ team: OmenDeskTeam) -> some View {
        Text(team.crest)
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(team.isMine ? OmenColor.accentHover : OmenColor.textSecondary)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(width: 30, height: 30)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(team.isMine ? OmenColor.accentMuted : OmenColor.surface3)
            )
            .accessibilityHidden(true)
    }

    private var platformName: String {
        switch matchup.platform {
        case .espn: return "ESPN"
        case .yahoo: return "Yahoo"
        case .sleeper: return "Sleeper"
        }
    }

    private var platformChip: Color {
        switch matchup.platform {
        case .espn: return OmenColor.Data.platformEspnChip
        case .yahoo: return OmenColor.Data.platformYahooChip
        case .sleeper: return OmenColor.Data.platformSleeperChip
        }
    }
}

/// `.card.hero` — the waiver move.
private struct OmenDeskWaiverCard: View {
    let move: OmenDeskWaiverMove

    var body: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                swap
                Text(move.reasoning)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: OmenSpacing.step14) {
                    if let band = move.band { OmenConfidenceBandLabel(band: band) }
                    OmenRiskLabel(level: move.risk, reason: move.riskReason)
                }
            }
        }
    }

    /// `.swap` — the in/out pair against the tick rule.
    private var swap: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step8) {
            tick
            VStack(alignment: .leading, spacing: 0) {
                line(name: move.addName, meta: move.addMeta, points: move.addPoints, incoming: true)
                if let dropName = move.dropName {
                    line(name: dropName, meta: move.dropMeta, points: move.dropPoints, incoming: false)
                }
            }
        }
    }

    private var tick: some View {
        ZStack(alignment: .top) {
            Capsule().fill(OmenColor.borderSubtle).frame(width: 2)
            Circle().fill(OmenColor.accent).frame(width: 8, height: 8)
                .offset(x: -3)
        }
        .frame(width: 26)
        .overlay(alignment: .bottom) {
            Circle().fill(OmenColor.surface3).frame(width: 6, height: 6).offset(x: -2)
        }
        .accessibilityHidden(true)
    }

    private func line(name: String, meta: String?, points: String?, incoming: Bool) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: OmenSpacing.step6) {
            Text(name)
                .omenTextStyle(OmenTypography.name)
                .fontWeight(incoming ? .bold : .medium)
                .foregroundStyle(incoming ? OmenColor.textPrimary : OmenColor.textTertiary)
                .lineLimit(1)
            if let meta {
                Text(meta)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
            Spacer(minLength: OmenSpacing.step8)
            // No points column when the provider gave none. A dash or a zero would both read as
            // a projection, and `waiver-analysis.v1` is explicit that a missing input is null
            // rather than zero for exactly this reason.
            if let points {
                Text(points)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .fontWeight(.heavy)
                    .monospacedDigit()
                    .foregroundStyle(incoming ? OmenColor.textPrimary : OmenColor.textTertiary)
            }
        }
        .padding(.vertical, OmenSpacing.step2)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            [incoming ? "Add" : "Drop", name, meta, points.map { "\($0) projected" }]
                .compactMap { $0 }.joined(separator: ", ")
        )
    }
}

/// One `.lrow` under The Ledger.
private struct OmenDeskLedgerRow: View {
    let line: OmenDeskLedgerLine

    var body: some View {
        HStack(spacing: OmenSpacing.step10) {
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(line.summary)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .fontWeight(.bold)
                    .foregroundStyle(OmenColor.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.tail)
                Text(line.meta)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            outcome
        }
        .padding(.vertical, OmenSpacing.step8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(line.summary). \(line.meta). \(line.outcome.label).")
    }

    /// `pending` is italic and **deliberately not brass** — `.lrow .lo.pend` says so and the
    /// Ledger's own `.o-p` matches it. Italic is the form carrier; giving an unresolved call the
    /// accent would read as a result.
    @ViewBuilder private var outcome: some View {
        switch line.outcome {
        case .worked:
            Text(line.outcome.label)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textPrimary)
        case .didNotWork, .notVerified:
            Text(line.outcome.label)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
        case .pending:
            Text(line.outcome.label)
                .omenTextStyle(OmenTypography.bodySmall)
                .italic()
                .foregroundStyle(OmenColor.textSecondary)
        }
    }
}

/// The *could not read* class, rendered in the failed section's own place.
///
/// Named plus a sentence, per `capability-expression-v1.md` acceptance rules 3 and 4. It carries
/// no evidence styling and it is never dropped to make room: the spec singles this class out as
/// the one that must survive truncation, since it is the only one that costs the reader anything.
private struct OmenDeskUnreadSection: View {
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
private struct OmenDeskFootnoteStrip: View {
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

// MARK: - SwitchLoading

/// `.skel` — one shimmering placeholder line.
private struct OmenSkeletonLine: View {
    var widthFraction: CGFloat = 1
    var height: CGFloat = 12

    var body: some View {
        RoundedRectangle(cornerRadius: 6, style: .continuous)
            .fill(LinearGradient(colors: [OmenColor.surface1, OmenColor.surface2, OmenColor.surface1], startPoint: .leading, endPoint: .trailing))
            .frame(height: height)
            .frame(maxWidth: .infinity, alignment: .leading)
            .scaleEffect(x: widthFraction, y: 1, anchor: .leading)
            .accessibilityHidden(true)
    }
}

private struct OmenDeskCardSkeleton: View {
    let lineWidths: [CGFloat]

    var body: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                ForEach(Array(lineWidths.enumerated()), id: \.offset) { _, width in
                    OmenSkeletonLine(widthFraction: width)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading")
    }
}

/// The board mid-switch. Note what is **not** here: any number from the previous team.
///
/// §10.3 is explicit — *"The previous team's numbers are discarded, never reused while loading."*
/// Keeping the outgoing scoreboard visible under a spinner would be the cheaper animation and a
/// false claim: for the second it took to resolve, the screen would be showing one team's numbers
/// under another team's name.
private struct OmenDeskBoardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
            HStack {
                Text("Reading")
                Spacer(minLength: OmenSpacing.step8)
                Text("Loading")
            }
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(OmenColor.textTertiary)

            ForEach(0..<2, id: \.self) { _ in
                HStack(spacing: OmenSpacing.step10) {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(OmenColor.surface3)
                        .frame(width: 30, height: 30)
                    VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                        OmenSkeletonLine(widthFraction: 0.6)
                        OmenSkeletonLine(widthFraction: 0.3, height: 9)
                    }
                    OmenSkeletonLine(widthFraction: 1, height: 22).frame(width: 52)
                }
            }
        }
        .padding(OmenSpacing.step12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(LinearGradient(colors: [OmenColor.surface2, OmenColor.surface1], startPoint: .top, endPoint: .bottom))
        )
        // The artboard dims the whole board to .55 while it resolves.
        .opacity(0.55)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading the new team's matchup")
    }
}

/// J2, screen three: mid-switch.
///
/// `SwitchLoading.dc.html`. Not a separate screen so much as `CommandCenter` with every section
/// at `.switching` and the switcher bar already showing the **new** team — which is the whole
/// point of the frame: the bar commits immediately so the user can see their tap landed, and the
/// numbers arrive when they arrive.
struct OmenSwitchLoadingScreen: View {
    /// The team being switched **to**. The bar updates first; nothing below it does.
    let context: OmenScreenContext
    let weekLabel: String
    let footnote: OmenDeskFootnote
    var onOpenAccount: (() -> Void)?

    var body: some View {
        OmenCommandDeskScreen(
            state: OmenDeskState(
                weekLabel: weekLabel,
                deadlineLabel: nil,
                deadlineTime: nil,
                matchup: .switching,
                railCount: 0,
                railIndex: 0,
                waiver: .switching,
                ledger: .switching,
                footnote: footnote
            ),
            context: context,
            onOpenAccount: onOpenAccount,
            screenIdentifier: "j2.switch-loading",
            fitProbeIdentifier: "j2.fit.switch-loading"
        )
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
                // The server's own reason, rendered verbatim. A client-authored explanation
                // would be a guess at someone else's failure.
                sentence: overview.matchup.unavailableReason
                    ?? "The provider did not return this week's matchup. Everything else below read normally."
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
    static func crest(from name: String) -> String {
        let initials = name
            .split(whereSeparator: { $0 == " " || $0 == "'" || $0 == "\u{2019}" })
            .prefix(3)
            .compactMap { $0.first }
            .map(String.init)
            .joined()
            .uppercased()
        return initials.isEmpty ? "—" : initials
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
