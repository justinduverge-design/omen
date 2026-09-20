import SwiftUI

// MARK: - J5, "the scout's nest"
//
// The six artboards of `screen-journeys-v1.md`'s fifth journey: `LeagueTable`, `LeagueWaiver`,
// `LeagueDegraded`, `LeagueNoRosters`, `WaiverNoMove` and `WaiverNotDetermined`. Built to
// `design/native-visual-lock-2026-09-13/` under the 2026-09-18/19 precedence rule — the artboard
// owns composition, placement, type and tone; `CONTRACTS.md` owns data, vocabulary and state.
//
// ## Six artboards, two compositions
//
// `LeagueTable`, `LeagueDegraded` and `LeagueNoRosters` are the SAME screen — same chrome, same
// title ("The Table"), same section order — with different per-section states. `LeagueWaiver`,
// `WaiverNoMove` and `WaiverNotDetermined` are likewise one screen ("The wire") in three states.
// Building six screens would be six places for the section order and the honesty rules to drift
// apart, and `CONTRACTS.md` is explicit that the degraded artboards *are* states of the contract
// rather than separate surfaces: "Every degraded artboard here corresponds to a real `state`
// value the contract already returns."
//
// J2 set the precedent on the same reasoning: `CommandQuiet` and `CommandQuietStraight` are one
// composition and two payloads.
//
// ## The section order is settled and is not a layout preference
//
// `CONTRACTS.md`: **strip → Table → Trade targets → Waiver → Activity**. Terrain, then
// opportunity, then movement. Activity is last because it is partial on ESPN and Yahoo, and a
// degraded section high on a screen teaches people the whole screen is unreliable.
//
// ## The capability contract, on the journey where it matters most
//
// `capability-expression-v1.md`'s four presentation classes, all four of which occur here:
//
//   - *used evidence*   — a section that read and mattered renders in full.
//   - *read, not used*  — named in the foot line, `text-tertiary`, NO evidence styling.
//   - *could not read*  — rendered in the failed section's own place, capability NAMED, plus a
//                         sentence. Never dropped to make room: it is the one class the spec
//                         singles out as having to survive truncation.
//   - *out of scope*    — `not_requested` renders NOTHING. No slot, no label, no dash.
//
// There are no capability glyphs anywhere below. `capability-symbols-v1.md` corrected that
// invented requirement on 2026-09-18: a capability renders as a word.

// MARK: - Section availability

/// A League section's availability. Per-section by contract — `league-overview.v1` reports each
/// section's `status` independently and `CONTRACTS.md` requires the screen to do the same.
///
/// The third case is the one this journey adds over J2's. `LeagueNoRosters` is **not** an outage:
/// it is a permanent provider limit for that league, and the difference is load-bearing, because
/// an outage gets a retry and a limit must not. A single `unread` case would have made the two
/// indistinguishable at the call site and the retry would have been drawn on both.
enum OmenScoutSection<Value: Equatable>: Equatable {
    case read(Value)
    /// Could not read, and it might read next time. Retry is legitimate.
    case unread(capability: String, sentence: String)
    /// A permanent limit of this provider for this league. **No retry, ever.**
    ///
    /// `consequence` is what the user loses by it, stated plainly. Without that second sentence
    /// the screen names a gap and leaves the reader to guess how much it costs them.
    case providerLimit(capability: String, sentence: String, consequence: String)
}

// MARK: - The Table

/// One row of the rank table (`.trow`).
struct OmenScoutTableRow: Equatable, Identifiable {
    let rank: Int
    let crest: String
    let teamName: String
    /// Most recent five, most recent LAST — the order the artboard draws and the order a reader
    /// expects. `nil` when the provider gave no form history; the strip then renders nothing
    /// rather than five empty pips, which would read as five losses.
    let form: [Bool]?
    let record: String
    let isMine: Bool

    var id: Int { rank }
}

/// A `.hole` — an opponent whose roster shape complements yours.
struct OmenScoutTradeTarget: Equatable, Identifiable {
    let crest: String
    let teamName: String
    let read: String

    var id: String { crest + teamName }
}

/// An `.act` row. `category` is the server's own word ("Standings"), rendered verbatim.
struct OmenScoutActivityRow: Equatable, Identifiable {
    let category: String
    let text: String

    var id: String { category + text }
}

/// The playoff cut line, drawn between two rows.
///
/// **Only when the provider actually read playoff settings.** `playoff_picture.settings_known`
/// is `true` on Sleeper ONLY; ESPN and Yahoo are unproven, so on those the line is absent rather
/// than guessed at the halfway point. A cut line in the wrong place is worse than none — it is a
/// claim about who is in the playoffs.
struct OmenScoutCutLine: Equatable {
    /// The rank the line sits BELOW. A line under rank 4 separates 4 from 5.
    let afterRank: Int
    let label: String
}

/// Everything `LeagueTable`, `LeagueDegraded` and `LeagueNoRosters` render.
struct OmenScoutTableState: Equatable {
    /// "Week 7 · 12 teams"
    let weekLabel: String
    /// The `.hatch` banner above the sections. Present only when something screen-wide is true —
    /// on `LeagueDegraded`, that the provider is partial. Absent on the nominal pass: a banner
    /// that always shows teaches people to stop reading it.
    let notice: String?
    let strip: OmenScoutSection<OmenScoutStrip>
    let table: OmenScoutSection<[OmenScoutTableRow]>
    let cutLine: OmenScoutCutLine?
    let tradeTargets: OmenScoutSection<[OmenScoutTradeTarget]>
    let waiver: OmenScoutSection<OmenDeskWaiverMove>
    let activity: OmenScoutSection<[OmenScoutActivityRow]>
    /// The `.hatch` under a PARTIAL activity list. The list is unread, not empty, and this is the
    /// sentence that says which.
    let activityUnreadNote: String?
    /// The `.oneline` foot strip — where *read, not used* lands on a screen with no evidence
    /// surface, exactly as it does on J2's desk.
    let footnote: OmenDeskFootnote?
    /// Present only when retrying could change the answer.
    ///
    /// **Nil on `LeagueNoRosters` and that is the contract, not an oversight.** `CONTRACTS.md`:
    /// "A permanent provider limit for that league, not an outage. Do not build a retry for it."
    /// A retry button on a permanent limit is a promise the product cannot keep, and the user
    /// presses it every week.
    let retryTitle: String?
}

/// The `.strip` — your own week, one line, at the top of the scout's nest.
struct OmenScoutStrip: Equatable {
    let platform: OmenPlatform
    let myScore: String
    let theirScore: String
    /// "Live · Q2", "Final". Server wording, verbatim.
    let status: String
}

// MARK: - The wire

/// How this league decides who gets a claim.
///
/// **The gate `CONTRACTS.md` §6.2 draws, modelled as a type so it cannot be forgotten.** FAAB
/// appears only for a positively-determined FAAB league; priority only for a determined priority
/// league; NEITHER for `not_determined` — which is what ESPN and Yahoo return today.
///
/// A single optional `budgetText: String?` would have made the third case indistinguishable from
/// "a FAAB league whose budget we happen not to have", and the screen would have shown a claim
/// order beside a missing budget as though the system were known.
enum OmenWaiverSystem: Equatable {
    /// `waiver_system.system: "faab"`, positively determined.
    case faab(budgetText: String, orderText: String?)
    /// `waiver_system.system: "priority"` or `"reverse_standings"`, positively determined.
    case priority(orderText: String)
    /// `waiver_system.system: "not_determined"`. Renders no scope strip at all.
    case notDetermined
}

/// One line of the wire's swap (`.sline`). The out side is optional throughout — see
/// `OmenScoutWireBody.opportunity`.
struct OmenScoutWireMove: Equatable, Identifiable {
    let addName: String
    let addMeta: String
    let addPoints: String?
    /// Absent when there is no defensible drop. The artboard draws that case explicitly, with an
    /// em dash and "no low-cost drop" — which is `waiver-analysis.v1`'s `no_low_cost_drop`
    /// surfacing inside an alternative rather than as a whole screen.
    let dropName: String?
    let dropMeta: String?
    let dropPoints: String?
    let reasoning: String

    var id: String { addName + addMeta }
}

/// A `.lrow` in one of the wire's labelled lists.
struct OmenScoutWireRow: Equatable, Identifiable {
    let title: String
    let detail: String
    let status: OmenScoutWireRowStatus

    var id: String { title + detail }
}

/// The status word on a wire row. A **word**, never a glyph.
enum OmenScoutWireRowStatus: Equatable {
    case live
    case watching
    /// Named, `text-tertiary`, with the reason in `detail`. Acceptance rule 4.
    case unavailable
}

/// The three states of `waiver-analysis.v1` this journey draws.
enum OmenScoutWireBody: Equatable {
    /// `state: "confirmed_opportunity"` — `LeagueWaiver`.
    ///
    /// `suggestedBid` is `String?` and the reason is written into `waiver-analysis.v1` itself:
    /// **`best_move.bid` is `null` — never `0` — when any input is missing.** A "$0" suggestion
    /// is a recommendation to bid nothing, which is a different and wrong piece of advice.
    ///
    /// There is no claim-probability field on this type, on purpose. Claim probability is never
    /// returned, for any league, so a client that had somewhere to put it would eventually put
    /// something there.
    case opportunity(best: OmenScoutWireMove, suggestedBid: String?, alternatives: [OmenScoutWireMove])

    /// `state: "no_credible_move"` or `"no_low_cost_drop"` — `WaiverNoMove`.
    case noMove(
        headline: String,
        body: String,
        costTitle: String,
        cost: String,
        band: OmenConfidenceBand?,
        risk: OmenRiskLevel,
        watchTitle: String,
        watching: [OmenScoutWireRow]
    )

    /// `waiver_system.system: "not_determined"` — `WaiverNotDetermined`.
    ///
    /// Two lists, and the split is the whole screen: what survives not knowing the system, and
    /// what does not. `note` is the sentence that says a figure invented without the budget
    /// would be worse than no figure.
    case notDetermined(
        stillTrueTitle: String,
        stillTrue: [OmenScoutWireRow],
        withheldTitle: String,
        withheld: [OmenScoutWireRow],
        note: String
    )
}

/// Everything `LeagueWaiver`, `WaiverNoMove` and `WaiverNotDetermined` render.
struct OmenScoutWireState: Equatable {
    /// "Week 7 · Waiver"
    let weekLabel: String
    /// "Claims process / Tue 3:00 AM". Both or neither — a label with no time says nothing.
    let processLabel: String?
    let processTime: String?
    let system: OmenWaiverSystem
    /// The `.hatch` banner. On `WaiverNotDetermined` it is the screen's whole premise.
    let notice: String?
    let body: OmenScoutWireBody
    /// The `.oneline` foot strip.
    let footnote: OmenDeskFootnote?
}

// MARK: - The Table screen

/// J5, the scout's nest. `LeagueTable.dc.html`, `LeagueDegraded.dc.html`,
/// `LeagueNoRosters.dc.html`.
///
/// Declared **scrolls** in the canvas README, all three. `omenFitProbe` is applied anyway so the
/// overflow is a measured number rather than an assertion that it does not matter — D11 asks for
/// the overflow of a declared fit, and knowing by how much a scroller scrolls is what tells the
/// next person whether an edit made it worse.
struct OmenLeagueTableScreen: View {
    let state: OmenScoutTableState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onOpenWaiver: (() -> Void)?
    var onBuildTrade: ((OmenScoutTradeTarget) -> Void)?
    var onRetry: (() -> Void)?
    var screenIdentifier: String = "j5.league-table"
    var fitProbeIdentifier: String = "j5.fit.league-table"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                if let notice = state.notice {
                    OmenScoutNotice(text: notice)
                        .padding(.horizontal, OmenSpacing.step16)
                        .padding(.top, OmenSpacing.step12)
                }
                stripSection
                tableSection
                tradeTargetSection
                waiverSection
                activitySection
                retryControl
                if let footnote = state.footnote {
                    OmenScoutFootnoteStrip(footnote: footnote)
                        .padding(.top, OmenSpacing.step12)
                }
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .accessibilityIdentifier(screenIdentifier)
            .omenFitContent()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe(fitProbeIdentifier)
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
    }

    /// `.top`, plus the E017 controls.
    ///
    /// All six J5 artboards draw a lone 30pt avatar here (`LeagueWaiver` draws the claim time
    /// instead). E017 was resolved by the founder on 2026-09-18 as **both** controls — help then
    /// account — and `OmenScreenShell` implements it, so the extra width is recorded drift
    /// carried forward from J2 and J3 rather than a decision retaken here.
    private var header: some View {
        // `.bottom`, not `.lastTextBaseline`: baseline alignment asks SwiftUI to resolve a text
        // baseline for the E017 icon buttons, which have no text, and that collapses their
        // reported frame to the 20pt glyph — under the 44pt floor. J2 paid for this once.
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(state.weekLabel)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("The Table")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .league),
                onOpenAccount: onOpenAccount
            )
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }

    // MARK: Your week

    @ViewBuilder private var stripSection: some View {
        switch state.strip {
        case .read(let strip):
            OmenScoutStripRow(strip: strip, onOpen: onOpenWaiver == nil ? nil : {})
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        case .unread(let capability, let sentence):
            OmenScoutUnreadBlock(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        case .providerLimit(let capability, let sentence, let consequence):
            OmenScoutLimitBlock(capability: capability, sentence: sentence, consequence: consequence)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        }
    }

    // MARK: The table

    @ViewBuilder private var tableSection: some View {
        sectionHeader("The table", trailing: tableTrailing)
        switch state.table {
        case .read(let rows):
            VStack(spacing: 0) {
                ForEach(rows) { row in
                    OmenScoutTableRowView(row: row)
                    // The cut line is drawn between rows and ONLY when the provider read
                    // playoff settings. See `OmenScoutCutLine`.
                    if let cutLine = state.cutLine, cutLine.afterRank == row.rank {
                        OmenScoutCutLineRow(label: cutLine.label)
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
        case .unread(let capability, let sentence):
            OmenScoutUnreadBlock(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
        case .providerLimit(let capability, let sentence, let consequence):
            OmenScoutLimitBlock(capability: capability, sentence: sentence, consequence: consequence)
                .padding(.horizontal, OmenSpacing.step16)
        }
    }

    private var tableTrailing: String? {
        switch state.table {
        case .read: return "Form · last 5"
        case .unread, .providerLimit: return "Unavailable"
        }
    }

    // MARK: Trade targets

    @ViewBuilder private var tradeTargetSection: some View {
        sectionHeader("Trade targets", trailing: tradeTrailing)
        switch state.tradeTargets {
        case .read(let targets):
            VStack(spacing: OmenSpacing.step8) {
                ForEach(targets) { target in
                    OmenScoutTradeTargetRow(target: target, onBuild: onBuildTrade.map { build in { build(target) } })
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
        case .unread(let capability, let sentence):
            OmenScoutUnreadBlock(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
        case .providerLimit(let capability, let sentence, let consequence):
            OmenScoutLimitBlock(capability: capability, sentence: sentence, consequence: consequence)
                .padding(.horizontal, OmenSpacing.step16)
        }
    }

    private var tradeTrailing: String? {
        switch state.tradeTargets {
        case .read(let targets): return targets.count == 1 ? "1 opening" : "\(targets.count) openings"
        case .unread: return "Unavailable"
        // Not "Unavailable": this league will never have it, and the two words a user needs to
        // tell apart are "came back empty this time" and "cannot happen here".
        case .providerLimit: return "Not possible here"
        }
    }

    // MARK: Waiver

    @ViewBuilder private var waiverSection: some View {
        sectionHeader("Waiver", trailing: waiverTrailing, link: onOpenWaiver == nil ? nil : "The wire", perform: onOpenWaiver)
        switch state.waiver {
        case .read(let move):
            OmenScoutWaiverCard(move: move)
                .padding(.horizontal, OmenSpacing.step16)
        case .unread(let capability, let sentence):
            OmenScoutUnreadBlock(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
        case .providerLimit(let capability, let sentence, let consequence):
            OmenScoutLimitBlock(capability: capability, sentence: sentence, consequence: consequence)
                .padding(.horizontal, OmenSpacing.step16)
        }
    }

    private var waiverTrailing: String? {
        switch state.waiver {
        case .read: return "Best move"
        case .unread, .providerLimit: return "Unavailable"
        }
    }

    // MARK: Activity

    /// Last, and that placement is a decision rather than a leftover. Activity is partial on ESPN
    /// and Yahoo, and a degraded section high on a screen teaches people the screen is unreliable.
    @ViewBuilder private var activitySection: some View {
        sectionHeader("Activity", trailing: activityTrailing)
        switch state.activity {
        case .read(let rows):
            VStack(spacing: 0) {
                ForEach(rows) { row in
                    OmenScoutActivityRowView(row: row)
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
            if let note = state.activityUnreadNote {
                // The list is UNREAD, not empty, and this is the line that says which. It sits
                // under the rows that did arrive rather than replacing them, because the
                // partial case is the common one on ESPN and both halves are true at once.
                OmenScoutNotice(text: note)
                    .padding(.horizontal, OmenSpacing.step16)
                    .padding(.top, OmenSpacing.step8)
            }
        case .unread(let capability, let sentence):
            OmenScoutUnreadBlock(capability: capability, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
        case .providerLimit(let capability, let sentence, let consequence):
            OmenScoutLimitBlock(capability: capability, sentence: sentence, consequence: consequence)
                .padding(.horizontal, OmenSpacing.step16)
        }
    }

    private var activityTrailing: String? {
        switch state.activity {
        case .read: return state.activityUnreadNote == nil ? "Live" : "Partial"
        case .unread: return "Unavailable"
        case .providerLimit: return "Not possible here"
        }
    }

    // MARK: Retry

    @ViewBuilder private var retryControl: some View {
        if let title = state.retryTitle, let onRetry {
            OmenButton(title: title, action: onRetry, variant: .secondary, size: .md)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step14)
        }
    }

    /// `.sh` — an uppercase label, an optional status word and an optional accent link.
    @ViewBuilder private func sectionHeader(
        _ title: String,
        trailing: String?,
        link: String? = nil,
        perform: (() -> Void)? = nil
    ) -> some View {
        HStack(spacing: OmenSpacing.step8) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing {
                Text(trailing)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
            if let link, let perform {
                OmenSectionLink(title: link, section: title, action: perform)
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step14)
        .padding(.bottom, OmenSpacing.step6)
    }
}

// MARK: - The wire screen

/// J5, the wire. `LeagueWaiver.dc.html`, `WaiverNoMove.dc.html`, `WaiverNotDetermined.dc.html`.
///
/// `WaiverNoMove` is the one J5 artboard declared a **fit**, so it is the one the D11 assertion
/// binds. The other two are declared scrollers and publish a measurement anyway.
struct OmenLeagueWireScreen: View {
    let state: OmenScoutWireState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var screenIdentifier: String = "j5.league-wire"
    var fitProbeIdentifier: String = "j5.fit.league-wire"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                scopeStrip
                if let notice = state.notice {
                    OmenScoutNotice(text: notice)
                        .padding(.horizontal, OmenSpacing.step16)
                        .padding(.top, OmenSpacing.step12)
                }
                bodyContent
                if let footnote = state.footnote {
                    OmenScoutFootnoteStrip(footnote: footnote)
                        .padding(.top, OmenSpacing.step12)
                }
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .accessibilityIdentifier(screenIdentifier)
            .omenFitContent()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe(fitProbeIdentifier)
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(state.weekLabel)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("The wire")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            // Both or neither. `LeagueWaiver.dc.html` draws "Claims process / Tue 3:00 AM" here;
            // a label with no time would tell the reader a deadline exists and not when.
            if let label = state.processLabel, let time = state.processTime {
                VStack(alignment: .trailing, spacing: 0) {
                    Text(label)
                    Text(time)
                }
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                .multilineTextAlignment(.trailing)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(label) \(time)")
            }
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .league),
                onOpenAccount: onOpenAccount
            )
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }

    /// `.scope` — budget and claim order.
    ///
    /// **The §6.2 gate, rendered.** FAAB only for a determined FAAB league, priority only for a
    /// determined priority league, and for `not_determined` the strip does not exist — no
    /// placeholder, no dash, no greyed-out "$— of $—". A dashed budget is still a claim that
    /// this is a budget league.
    @ViewBuilder private var scopeStrip: some View {
        switch state.system {
        case .faab(let budgetText, let orderText):
            OmenScoutScopeStrip(items: [budgetText, orderText].compactMap { $0 })
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        case .priority(let orderText):
            OmenScoutScopeStrip(items: [orderText])
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        case .notDetermined:
            EmptyView()
        }
    }

    @ViewBuilder private var bodyContent: some View {
        switch state.body {
        case .opportunity(let best, let suggestedBid, let alternatives):
            sectionHeader("The move", trailing: "Best available")
            OmenScoutWireHeroCard(move: best, suggestedBid: suggestedBid)
                .padding(.horizontal, OmenSpacing.step16)
            if !alternatives.isEmpty {
                sectionHeader(
                    "Also worth a claim",
                    trailing: alternatives.count == 1 ? "1 alternative" : "\(alternatives.count) alternatives"
                )
                VStack(spacing: OmenSpacing.step8) {
                    ForEach(alternatives) { move in
                        OmenScoutWireAlternativeCard(move: move)
                    }
                }
                .padding(.horizontal, OmenSpacing.step16)
            }

        case .noMove(let headline, let body, let costTitle, let cost, let band, let risk, let watchTitle, let watching):
            VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                Text(headline)
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(body)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step24)

            sectionHeader(costTitle, trailing: nil)
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text(cost)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: OmenSpacing.step14) {
                        if let band { OmenConfidenceBandLabel(band: band) }
                        OmenRiskLabel(level: risk)
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step16)

            if !watching.isEmpty {
                sectionHeader(watchTitle, trailing: "Omen will flag these")
                OmenCard(contentPadding: OmenSpacing.step12) {
                    VStack(spacing: 0) {
                        ForEach(watching) { row in
                            OmenScoutWireRowView(row: row)
                        }
                    }
                }
                .padding(.horizontal, OmenSpacing.step16)
            }

        case .notDetermined(let stillTrueTitle, let stillTrue, let withheldTitle, let withheld, let note):
            if !stillTrue.isEmpty {
                sectionHeader(stillTrueTitle, trailing: nil)
                OmenCard(contentPadding: OmenSpacing.step12) {
                    VStack(spacing: 0) {
                        ForEach(stillTrue) { row in
                            OmenScoutWireRowView(row: row)
                        }
                    }
                }
                .padding(.horizontal, OmenSpacing.step16)
            }
            // Every row here is `unavailable` and every one is NAMED. This block is the
            // acceptance-rule-4 surface for the `waiver` profile: the reader is told exactly
            // which three answers they are not getting and what each one needed.
            sectionHeader(withheldTitle, trailing: nil)
            OmenCard(contentPadding: OmenSpacing.step12) {
                VStack(spacing: 0) {
                    ForEach(withheld) { row in
                        OmenScoutWireRowView(row: row)
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
            Text(note)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)
        }
    }

    @ViewBuilder private func sectionHeader(_ title: String, trailing: String?) -> some View {
        HStack(spacing: OmenSpacing.step8) {
            Text(title)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing {
                Text(trailing)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step14)
        .padding(.bottom, OmenSpacing.step6)
    }
}

// MARK: - Blocks

/// `.strip` — your own week, compressed to one line.
private struct OmenScoutStripRow: View {
    let strip: OmenScoutStrip
    var onOpen: (() -> Void)?

    var body: some View {
        HStack(spacing: OmenSpacing.step10) {
            // The provider hex is never the only carrier (D7) — the status word sits beside it
            // and the platform is named in the accessibility label.
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(platformChip)
                .frame(width: 7, height: 7)
                .accessibilityHidden(true)
            Text(strip.myScore)
                .omenTextStyle(OmenTypography.scoreTrail)
                .foregroundStyle(OmenColor.textPrimary)
            Text("VS")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Text(strip.theirScore)
                .omenTextStyle(OmenTypography.scoreTrail)
                .foregroundStyle(OmenColor.textTertiary)
            Spacer(minLength: OmenSpacing.step8)
            Text(strip.status)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
        }
        .padding(.horizontal, OmenSpacing.step12)
        .padding(.vertical, OmenSpacing.step10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(OmenColor.surface1)
                .overlay(alignment: .top) {
                    Rectangle().fill(OmenColor.accent.opacity(0.34)).frame(height: 1)
                }
                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Your week on \(platformName). \(strip.myScore) to \(strip.theirScore). \(strip.status).")
    }

    private var platformName: String {
        switch strip.platform {
        case .espn: return "ESPN"
        case .yahoo: return "Yahoo"
        case .sleeper: return "Sleeper"
        }
    }

    private var platformChip: Color {
        switch strip.platform {
        case .espn: return OmenColor.Data.platformEspnChip
        case .yahoo: return OmenColor.Data.platformYahooChip
        case .sleeper: return OmenColor.Data.platformSleeperChip
        }
    }
}

/// `.trow` — one rank row.
private struct OmenScoutTableRowView: View {
    let row: OmenScoutTableRow

    var body: some View {
        HStack(spacing: OmenSpacing.step10) {
            Text(String(row.rank))
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                .frame(minWidth: 14, alignment: .leading)
            crest
            Text(row.teamName)
                .omenTextStyle(OmenTypography.name)
                .foregroundStyle(row.isMine ? OmenColor.textPrimary : OmenColor.textSecondary)
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(maxWidth: .infinity, alignment: .leading)
            form
            Text(row.record)
                .omenTextStyle(OmenTypography.bodySmall)
                .monospacedDigit()
                .foregroundStyle(row.isMine ? OmenColor.textPrimary : OmenColor.textTertiary)
        }
        .padding(.vertical, OmenSpacing.step8)
        .padding(.horizontal, OmenSpacing.step10)
        .background(row.isMine ? OmenColor.surface2 : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var crest: some View {
        Text(row.crest)
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(row.isMine ? OmenColor.accentHover : OmenColor.textSecondary)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(width: 26, height: 20)
            .background(
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(row.isMine ? OmenColor.accentMuted : OmenColor.surface3)
            )
            .accessibilityHidden(true)
    }

    /// Five pips, most recent last. Absent entirely when the provider gave no history — five
    /// empty pips would read as five losses, which is a result rather than a silence.
    @ViewBuilder private var form: some View {
        if let form = row.form {
            HStack(spacing: 3) {
                ForEach(Array(form.enumerated()), id: \.offset) { _, won in
                    RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                        .fill(won ? OmenColor.accent : OmenColor.surface3)
                        .frame(width: 5, height: 5)
                }
            }
            .accessibilityHidden(true)
        }
    }

    private var accessibilityText: String {
        var parts = ["Rank \(row.rank)", row.teamName, row.record]
        if let form = row.form {
            parts.append("last five: \(form.map { $0 ? "win" : "loss" }.joined(separator: ", "))")
        }
        if row.isMine { parts.append("your team") }
        return parts.joined(separator: ", ")
    }
}

/// `.cutline` — the playoff cut, drawn only when playoff settings were actually read.
private struct OmenScoutCutLineRow: View {
    let label: String

    var body: some View {
        HStack(spacing: OmenSpacing.step8) {
            Rectangle().fill(OmenColor.accent.opacity(0.34)).frame(height: 1)
            Text(label)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.accent)
            Rectangle().fill(OmenColor.accent.opacity(0.34)).frame(height: 1)
        }
        .padding(.vertical, OmenSpacing.step6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
    }
}

/// `.hole` — a trade target.
private struct OmenScoutTradeTargetRow: View {
    let target: OmenScoutTradeTarget
    var onBuild: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step10) {
            Text(target.crest)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(width: 30, height: 30)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous).fill(OmenColor.surface3)
                )
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(target.teamName)
                    .omenTextStyle(OmenTypography.name)
                    .foregroundStyle(OmenColor.textPrimary)
                Text(target.read)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(target.teamName). \(target.read)")
            if let onBuild {
                OmenSectionLink(title: "Build", section: target.teamName, action: onBuild)
            }
        }
        .padding(OmenSpacing.step10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous).fill(OmenColor.surface1)
        )
    }
}

/// `.wrow` — the waiver move as it appears inside the Table screen's Waiver section.
private struct OmenScoutWaiverCard: View {
    let move: OmenDeskWaiverMove

    var body: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                OmenScoutSwap(
                    addName: move.addName, addMeta: move.addMeta, addPoints: move.addPoints,
                    dropName: move.dropName, dropMeta: move.dropMeta, dropPoints: move.dropPoints
                )
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
}

/// `.card.hero` on the wire — the best move plus its bid line.
private struct OmenScoutWireHeroCard: View {
    let move: OmenScoutWireMove
    let suggestedBid: String?

    var body: some View {
        OmenCard(variant: .outlined, contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                OmenScoutSwap(
                    addName: move.addName, addMeta: move.addMeta, addPoints: move.addPoints,
                    dropName: move.dropName, dropMeta: move.dropMeta, dropPoints: move.dropPoints
                )
                Text(move.reasoning)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                // Absent when `best_move.bid` is null, which is what the contract sends whenever
                // any input to the bid is missing. There is no "$0" fallback and no dash: a
                // suggestion of zero is a real and different recommendation.
                if let suggestedBid {
                    Text(suggestedBid)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, OmenSpacing.step10)
                        .overlay(alignment: .top) {
                            Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
                        }
                }
            }
        }
    }
}

/// `.wrow` on the wire — an alternative claim.
private struct OmenScoutWireAlternativeCard: View {
    let move: OmenScoutWireMove

    var body: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                OmenScoutSwap(
                    addName: move.addName, addMeta: move.addMeta, addPoints: move.addPoints,
                    dropName: move.dropName, dropMeta: move.dropMeta, dropPoints: move.dropPoints
                )
                Text(move.reasoning)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

/// `.swap` — the in/out pair against the tick rule. Shared by every card that carries a move,
/// which is the reason it is a type rather than three copies.
private struct OmenScoutSwap: View {
    let addName: String
    let addMeta: String
    let addPoints: String?
    let dropName: String?
    let dropMeta: String?
    let dropPoints: String?

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step8) {
            tick
            VStack(alignment: .leading, spacing: 0) {
                line(name: addName, meta: addMeta, points: addPoints, incoming: true)
                if let dropName {
                    line(name: dropName, meta: dropMeta, points: dropPoints, incoming: false)
                }
            }
        }
    }

    private var tick: some View {
        ZStack(alignment: .top) {
            Capsule().fill(OmenColor.borderSubtle).frame(width: 2)
            Circle().fill(OmenColor.accent).frame(width: 8, height: 8).offset(x: -3)
        }
        .frame(width: 24)
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

/// `.act` — one activity line.
private struct OmenScoutActivityRowView: View {
    let row: OmenScoutActivityRow

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step10) {
            Text(row.category)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                .frame(width: 74, alignment: .leading)
            Text(row.text)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, OmenSpacing.step8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(row.category). \(row.text)")
    }
}

/// `.lrow` — a titled row with a status **word** on the right.
private struct OmenScoutWireRowView: View {
    let row: OmenScoutWireRow

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step10) {
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(row.title)
                    .omenTextStyle(OmenTypography.name)
                    .foregroundStyle(titleColor)
                Text(row.detail)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            status
        }
        .padding(.vertical, OmenSpacing.step8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(row.title). \(row.detail). \(statusWord).")
    }

    /// An `unavailable` row is `text-tertiary` throughout — it is named, and it is not dressed
    /// as evidence. Acceptance rules 3 and 4, on one row.
    private var titleColor: Color {
        row.status == .unavailable ? OmenColor.textTertiary : OmenColor.textPrimary
    }

    private var statusWord: String {
        switch row.status {
        case .live: return "Live"
        case .watching: return "Watching"
        case .unavailable: return "Unavailable"
        }
    }

    /// A word, never a glyph. `capability-symbols-v1.md`: a missing symbol says nothing, a wrong
    /// one says something untrue, and no capability has a symbol at all.
    @ViewBuilder private var status: some View {
        switch row.status {
        case .live:
            OmenBadge(label: statusWord, tone: .live)
        case .watching:
            Text(statusWord)
                .omenTextStyle(OmenTypography.bodySmall)
                .italic()
                .foregroundStyle(OmenColor.textSecondary)
        case .unavailable:
            OmenBadge(label: statusWord, tone: .unavailable)
        }
    }
}

/// `.scope` — the budget / order strip.
private struct OmenScoutScopeStrip: View {
    let items: [String]

    var body: some View {
        HStack(spacing: OmenSpacing.step16) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                Text(item)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, OmenSpacing.step8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(items.joined(separator: ". "))
    }
}

/// `.hatch` — a dashed, hatched banner for something that is not solid live data.
///
/// Registry §2.3's carrier. Colour is never the only carrier (D7), so the sentence does the work
/// and the dash confirms it.
private struct OmenScoutNotice: View {
    let text: String

    var body: some View {
        Text(text)
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textTertiary)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(OmenSpacing.step12)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(OmenColor.surface1.opacity(0.5))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                            .foregroundStyle(OmenColor.border)
                    )
            )
            .accessibilityElement(children: .combine)
            .accessibilityLabel(text)
    }
}

/// The *could not read* class, rendered in the failed section's own place.
private struct OmenScoutUnreadBlock: View {
    let capability: String
    let sentence: String

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            // NAMED. Acceptance rule 4, and the reason this block is never dropped to make
            // room: it is the one class that costs the reader something.
            Text(capability)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            OmenBadge(label: "Unavailable", tone: .unavailable)
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
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(OmenColor.border)
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(capability). Unavailable. \(sentence)")
    }
}

/// A **permanent** provider limit for this league. Visually a sibling of the unread block and
/// semantically not the same thing: there is no retry beside it and the second sentence says
/// what the user gets instead.
private struct OmenScoutLimitBlock: View {
    let capability: String
    let sentence: String
    let consequence: String

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            Text(capability)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            OmenBadge(label: "Unavailable", tone: .unavailable)
            Text(sentence)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            Text(consequence)
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
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(OmenColor.border)
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(capability). Unavailable. \(sentence) \(consequence)")
    }
}

/// `.oneline` — the foot strip. Where *read, not used* lands.
private struct OmenScoutFootnoteStrip: View {
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
            // `text-tertiary`, and no evidence styling. Acceptance rule 3: a source that was read
            // and did not decide anything must not look like one that did.
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textTertiary)
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

// MARK: - Binding the scout's nest to the real read

extension OmenScoutTableState {
    /// Builds the Table screen from `league-overview.v1`.
    ///
    /// **Nothing here invents a value.** Where the payload does not carry what the artboard
    /// draws, the element does not render or the section becomes `unread` with the capability
    /// named and the server's own reason quoted.
    ///
    /// Sections resolve independently, which is `CONTRACTS.md`'s rule for this screen rather
    /// than a convenience: a dead trade-target read must be able to sit beside a live table.
    static func from(
        overview: LeagueOverview,
        waiver: OmenScoutSection<OmenDeskWaiverMove>,
        tradeTargets: OmenScoutSection<[OmenScoutTradeTarget]>,
        notice: String? = nil,
        footnote: OmenDeskFootnote? = nil,
        retryTitle: String? = nil
    ) -> OmenScoutTableState {
        OmenScoutTableState(
            weekLabel: weekLabel(overview),
            notice: notice,
            strip: strip(overview),
            table: table(overview),
            cutLine: cutLine(overview),
            tradeTargets: tradeTargets,
            waiver: waiver,
            activity: activity(overview),
            activityUnreadNote: activityUnreadNote(overview),
            footnote: footnote,
            retryTitle: retryTitle
        )
    }

    private static func weekLabel(_ overview: LeagueOverview) -> String {
        let teams = overview.standings.teams.count
        switch (overview.week, teams) {
        case (let week?, let count) where count > 0: return "Week \(week) · \(count) teams"
        case (let week?, _): return "Week \(week)"
        case (nil, let count) where count > 0: return "\(count) teams"
        // No week and no team count. An eyebrow reading "Week —" would look like a bug; nothing
        // is what the payload actually supports.
        default: return ""
        }
    }

    private static func strip(_ overview: LeagueOverview) -> OmenScoutSection<OmenScoutStrip> {
        guard
            let platform = overview.omenPlatform,
            let mine = overview.matchup.you?.points,
            let theirs = overview.matchup.opponent?.points,
            overview.matchup.status != .unavailable
        else {
            return .unread(
                capability: "League matchup",
                sentence: overview.matchup.unavailableReason
                    ?? "The provider did not return this week\u{2019}s scoreboard. The table below read normally."
            )
        }
        return .read(OmenScoutStrip(
            platform: platform,
            myScore: String(format: "%.1f", mine),
            theirScore: String(format: "%.1f", theirs),
            status: overview.matchup.status.scoutLabel
        ))
    }

    private static func table(_ overview: LeagueOverview) -> OmenScoutSection<[OmenScoutTableRow]> {
        switch overview.standings.status {
        case .unavailable:
            return .unread(
                capability: "League standings",
                sentence: "Omen could not read the table this week and will not show you a stale one."
            )
        case .offSeason:
            return .unread(
                capability: "League standings",
                sentence: "Standings return when the regular season starts."
            )
        case .available:
            // Provider rank order, preserved exactly. Omen never reorders a league (§14.1), and
            // re-ranking here would be a claim no contract supports.
            let rows = overview.standings.teams.enumerated().map { index, team in
                OmenScoutTableRow(
                    rank: team.rank ?? index + 1,
                    crest: OmenDeskState.crest(from: team.teamName ?? ""),
                    teamName: team.teamName ?? "Unnamed team",
                    // `league-overview.v1` carries no form history. Nil, not five invented pips.
                    form: nil,
                    record: recordText(team),
                    isMine: team.isCurrentUser
                )
            }
            return .read(rows)
        }
    }

    private static func recordText(_ team: LeagueStandings.Team) -> String {
        guard let wins = team.wins, let losses = team.losses else { return "" }
        return "\(wins)\u{2013}\(losses)"
    }

    /// **Sleeper only, today.** `playoff_picture.settings_known` is `true` on Sleeper ONLY; ESPN
    /// and Yahoo are unproven, and on an unproven provider the line is absent rather than drawn
    /// at a guessed rank. A cut line in the wrong place is a claim about who makes the playoffs.
    private static func cutLine(_ overview: LeagueOverview) -> OmenScoutCutLine? {
        guard
            let picture = overview.standings.playoffPicture,
            picture.settingsKnown,
            let note = picture.cutLineNote
        else { return nil }
        return OmenScoutCutLine(afterRank: picture.rank, label: note)
    }

    private static func activity(_ overview: LeagueOverview) -> OmenScoutSection<[OmenScoutActivityRow]> {
        if overview.activity.status == .unavailable {
            return .unread(
                capability: "League activity",
                sentence: "Adds, drops and trades are not in this list. The list is not empty \u{2014} it is unread, and those are different things."
            )
        }
        return .read(overview.activity.items.map { OmenScoutActivityRow(category: $0.category, text: $0.text) })
    }

    /// The missing family is NAMED, which the screen can only do because the contract carries it.
    private static func activityUnreadNote(_ overview: LeagueOverview) -> String? {
        let families = overview.activity.unavailableFamilies
        guard !families.isEmpty, overview.activity.status != .unavailable else { return nil }
        return "\(families.joined(separator: ", ")) unavailable for \(providerName(overview)) right now \u{2014} those entries are missing from this list, which is unread rather than empty."
    }

    private static func providerName(_ overview: LeagueOverview) -> String {
        switch overview.omenPlatform {
        case .espn: return "ESPN"
        case .yahoo: return "Yahoo"
        case .sleeper: return "Sleeper"
        case nil: return "this provider"
        }
    }
}

private extension LeagueOverview.Matchup.Status {
    /// The strip's status word. Server-owned states, worded as the artboard words them.
    var scoutLabel: String {
        switch self {
        case .live: return "Live"
        case .final: return "Final"
        case .pregame: return "Pre-game"
        case .noMatchup: return "No matchup"
        case .unavailable: return "Unavailable"
        }
    }
}

extension OmenScoutWireState {
    /// Builds the wire from `waiver-analysis.v1`.
    ///
    /// The three states it maps are exactly the three the contract already returns, which is
    /// `CONTRACTS.md`'s point about `no_credible_move` and `no_low_cost_drop` being "the most
    /// under-used thing in it". Everything else resolves to the not-determined surface, because
    /// a state this client does not recognise is one it must not narrate.
    static func from(
        analysis: WaiverAnalysis,
        weekLabel: String,
        footnote: OmenDeskFootnote? = nil
    ) -> OmenScoutWireState {
        let system = OmenWaiverSystem(analysis.waiverSystem)
        return OmenScoutWireState(
            weekLabel: weekLabel,
            processLabel: analysis.deadline == nil ? nil : "Claims process",
            processTime: analysis.deadline,
            system: system,
            notice: system == .notDetermined ? notDeterminedNotice(analysis) : nil,
            body: body(analysis, system: system),
            footnote: footnote
        )
    }

    private static func notDeterminedNotice(_ analysis: WaiverAnalysis) -> String {
        "Omen could not tell which waiver system this league uses. The setting did not come back, and budget, rolling priority and reverse standings each change the advice completely."
    }

    private static func body(_ analysis: WaiverAnalysis, system: OmenWaiverSystem) -> OmenScoutWireBody {
        // The gate comes first. A confirmed opportunity in a league whose waiver system is
        // unknown still cannot carry a bid or a claim order, so the not-determined surface wins
        // over the opportunity one and the player read survives inside it.
        if system == .notDetermined {
            return .notDetermined(
                stillTrueTitle: "What is still true",
                stillTrue: stillTrueRows(analysis),
                withheldTitle: "What Omen will not tell you",
                withheld: [
                    OmenScoutWireRow(
                        title: "Suggested bid",
                        detail: "needs a confirmed budget",
                        status: .unavailable
                    ),
                    OmenScoutWireRow(
                        title: "Your claim order",
                        detail: "needs a confirmed priority system",
                        status: .unavailable
                    ),
                    // Reworded against the artboard, deliberately. The artboard files this as
                    // "needs both", which implies Omen would give you odds if it knew the
                    // system. It would not: claim probability is never returned, for ANY
                    // league. The artboard owns the shape of this row; the contract owns what
                    // it may say.
                    OmenScoutWireRow(
                        title: "Odds you win the claim",
                        detail: "Omen never estimates this, in any league",
                        status: .unavailable
                    )
                ],
                note: "A bid figure invented without the budget would be worse than no figure. The player read above is unaffected \u{2014} it does not depend on the waiver system."
            )
        }

        switch analysis.state {
        case .confirmedOpportunity:
            guard let best = analysis.bestMove, let move = OmenScoutWireMove(bestMove: best) else {
                return noMove(analysis)
            }
            return .opportunity(
                best: move,
                // Null, never zero. `Bid.amount` is optional for exactly this reason and the
                // line disappears rather than reading "$0".
                suggestedBid: best.bid?.amount.map { amount in
                    let basis = best.bid?.basis.flatMap { $0.isEmpty ? nil : $0 }
                    let figure = "Suggested bid $\(Int(amount.rounded()))"
                    return basis.map { "\(figure) \u{2014} \($0)" } ?? figure
                },
                alternatives: analysis.alternatives.compactMap(OmenScoutWireMove.init(alternative:))
            )
        default:
            return noMove(analysis)
        }
    }

    private static func noMove(_ analysis: WaiverAnalysis) -> OmenScoutWireBody {
        .noMove(
            headline: "Nothing on this wire beats what you have.",
            // The server's own message when it sent one. A client-authored explanation of
            // someone else's decision is a guess.
            body: analysis.message?.trimmingCharacters(in: .whitespacesAndNewlines).nonEmptyOrNil
                ?? "Omen checked the available free agents against your starting slots and found nothing that clears the noise.",
            costTitle: "What it would have cost",
            cost: "Claiming the best available means dropping someone worth more to you than the claim. Doing nothing is the move this week.",
            band: .confident,
            risk: .low,
            watchTitle: "Watch list",
            watching: []
        )
    }

    private static func stillTrueRows(_ analysis: WaiverAnalysis) -> [OmenScoutWireRow] {
        // The player read does not depend on the waiver system, so it survives — which is the
        // entire argument of this screen.
        var rows: [OmenScoutWireRow] = []
        if let add = analysis.bestMove?.add, let name = add.name, !name.isEmpty {
            rows.append(OmenScoutWireRow(
                title: name,
                detail: [add.position, add.team].compactMap { $0 }.joined(separator: " \u{00B7} "),
                status: .live
            ))
        }
        for alternative in analysis.alternatives {
            guard let player = alternative.player, let name = player.name, !name.isEmpty else { continue }
            rows.append(OmenScoutWireRow(
                title: name,
                detail: [player.position, player.team].compactMap { $0 }.joined(separator: " \u{00B7} "),
                status: .live
            ))
        }
        return rows
    }
}

extension OmenWaiverSystem {
    /// Maps `waiver_system` onto the gate.
    ///
    /// **Anything that is not a positively determined system is `notDetermined`.** An unknown
    /// wire value resolves here rather than to a guess, because the one thing worse than not
    /// knowing the system is assuming FAAB — which is what ESPN and Yahoo would get.
    init(_ system: WaiverAnalysis.WaiverSystem?) {
        guard let system else { self = .notDetermined; return }
        switch system.system {
        case .faab:
            guard let budget = system.budgetText else { self = .notDetermined; return }
            self = .faab(budgetText: budget, orderText: system.orderText)
        case .priority:
            guard let order = system.orderText else { self = .notDetermined; return }
            self = .priority(orderText: order)
        case .notDetermined:
            self = .notDetermined
        }
    }
}

private extension OmenScoutWireMove {
    init?(bestMove: WaiverAnalysis.BestMove) {
        guard let add = bestMove.add, let name = add.name, !name.isEmpty else { return nil }
        self.init(
            addName: name,
            addMeta: [add.position, add.team].compactMap { $0 }.joined(separator: " \u{00B7} "),
            addPoints: add.projectedPoints.map { String(format: "%.1f", $0) },
            dropName: bestMove.drop?.name,
            dropMeta: [bestMove.drop?.position, bestMove.drop?.team].compactMap { $0 }.joined(separator: " \u{00B7} ").nonEmptyOrNil,
            dropPoints: bestMove.drop?.projectedPoints.map { String(format: "%.1f", $0) },
            reasoning: bestMove.whyNow?.nonEmptyOrNil ?? "Omen found this as the strongest available roster move."
        )
    }

    init?(alternative: WaiverAnalysis.Alternative) {
        guard let player = alternative.player, let name = player.name, !name.isEmpty else { return nil }
        self.init(
            addName: name,
            addMeta: [player.position, player.team].compactMap { $0 }.joined(separator: " \u{00B7} "),
            addPoints: player.projectedPoints.map { String(format: "%.1f", $0) },
            dropName: nil,
            dropMeta: nil,
            dropPoints: nil,
            reasoning: alternative.tradeoff?.nonEmptyOrNil ?? "An alternative claim if the first one does not land."
        )
    }
}

private extension String {
    var nonEmptyOrNil: String? { isEmpty ? nil : self }
}

// MARK: - The Waiver section on the Table screen

extension WaiverAnalysis {
    /// The one-card summary the Table screen's Waiver section shows.
    ///
    /// Only a confirmed opportunity with a real add becomes a card. Every other state — no
    /// credible move, no low-cost drop, availability unknown, engine limitation, off-season —
    /// resolves to the *could not read* / *nothing to show* block with a sentence, because a
    /// blank Waiver section on the scout's nest is indistinguishable from a wire nobody read.
    var scoutSummary: OmenScoutSection<OmenDeskWaiverMove> {
        guard state == .confirmedOpportunity, let best = bestMove, let add = best.add,
              let name = add.name, !name.isEmpty else {
            return .unread(
                capability: "Waivers",
                sentence: message?.trimmingCharacters(in: .whitespacesAndNewlines).scoutNonEmpty
                    ?? "Omen has no claim worth making on this wire right now. Open the wire for what it checked."
            )
        }
        return .read(OmenDeskWaiverMove(
            addName: name,
            addMeta: [add.position, add.team].compactMap { $0 }.joined(separator: " \u{00B7} "),
            addPoints: add.projectedPoints.map { String(format: "%.1f", $0) },
            dropName: best.drop?.name,
            dropMeta: [best.drop?.position, best.drop?.team].compactMap { $0 }.joined(separator: " \u{00B7} ").scoutNonEmpty,
            dropPoints: best.drop?.projectedPoints.map { String(format: "%.1f", $0) },
            reasoning: best.whyNow?.scoutNonEmpty ?? "Omen found this as the strongest available roster move.",
            band: .confident,
            risk: .low,
            riskReason: nil
        ))
    }
}

private extension String {
    var scoutNonEmpty: String? { isEmpty ? nil : self }
}
