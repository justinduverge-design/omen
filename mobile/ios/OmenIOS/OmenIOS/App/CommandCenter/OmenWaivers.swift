import SwiftUI

// Waivers on the foundation (frame: Waivers). The one add worth making and what it replaces, a bid only when
// the server sends one, a short list of others, then the hand-off to the provider. Omen never makes the claim.

/// Everything Waivers draws, as plain values, so a screenshot fixture can mount it without a session.
struct OmenWaiversState: Equatable {
    struct Other: Equatable, Identifiable {
        let id: String
        let player: OmenPlayerSummary
        let note: String?
    }

    var eyebrow: String
    /// "Add Tyjae Spears. Drop Roschon Johnson." Nil when there is no move worth making.
    var headline: String?
    var reason: String?
    var add: OmenPlayerSummary?
    var drop: OmenPlayerSummary?
    /// "Bid $6", only when the server sends a bid.
    var bid: String?
    var bidNote: String?
    var others: [Other]
    /// The honest empty answer when there is no move: title and one line.
    var empty: (title: String, message: String)?
    var providerName: String

    static func == (a: OmenWaiversState, b: OmenWaiversState) -> Bool {
        a.eyebrow == b.eyebrow && a.headline == b.headline && a.reason == b.reason && a.add == b.add && a.drop == b.drop
            && a.bid == b.bid && a.bidNote == b.bidNote && a.others == b.others && a.empty?.title == b.empty?.title
            && a.empty?.message == b.empty?.message && a.providerName == b.providerName
    }
}

extension OmenWaiversState {
    init(analysis: WaiverAnalysis, providerName: String) {
        func summary(_ p: WaiverAnalysis.Player?, id: String) -> OmenPlayerSummary? {
            guard let p, let name = p.name?.nilIfEmpty else { return nil }
            let lead: OmenPlayerSummary.Lead = switch p.omenRead?.authority?.state {
            case "omen_leads": .omen
            case "provider_leads": .provider
            default: .unresolved
            }
            return OmenPlayerSummary(
                id: id, name: name, position: p.position?.uppercased(), team: p.team,
                omenPoints: p.omenRead?.points, providerPoints: p.projectedPoints, providerName: providerName,
                grade: p.omenRead?.grade, lead: lead, injury: OmenPlayerSummary.injuryWord(p.status)
            )
        }
        let move = analysis.state == .confirmedOpportunity ? analysis.bestMove : nil
        let add = summary(move?.add, id: "add")
        let drop = summary(move?.drop, id: "drop")
        let headline: String? = add.map { add in
            drop.map { "Add \(add.name). Drop \($0.name)." } ?? "Add \(add.name)."
        }
        let bid = move?.bid?.amount.map { "Bid $\(Int($0.rounded()))" }
        self.init(
            eyebrow: ["Waivers", analysis.deadline.map { "claims run \($0)" }].compactMap { $0 }.joined(separator: " \u{00B7} "),
            headline: headline,
            reason: move?.whyNow?.nilIfEmpty,
            add: add,
            drop: drop,
            bid: bid,
            bidNote: bid == nil ? nil : (move?.bid?.basis?.nilIfEmpty ?? analysis.waiverSystem?.budgetText),
            others: analysis.alternatives.enumerated().compactMap { index, alt in
                summary(alt.player, id: "alt\(index)").map { Other(id: $0.id, player: $0, note: alt.tradeoff?.nilIfEmpty) }
            },
            empty: headline != nil ? nil : (
                title: analysis.state == .offSeason ? "No waivers in the off-season" : "Nothing on the wire beats your bench",
                message: analysis.message?.nilIfEmpty ?? "Omen checked the free agents against your roster this week."
            ),
            providerName: providerName
        )
    }
}

struct OmenWaiversScreen: View {
    let state: OmenWaiversState
    var onOpenProvider: (() -> Void)?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                Text(state.eyebrow.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textTertiary)
                if let headline = state.headline {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text(headline).omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.isHeader)
                        if let reason = state.reason {
                            Text(reason).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    if let add = state.add { side("Add", add) }
                    if let drop = state.drop { side("Drop", drop) }
                    if let bid = state.bid {
                        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                            Text(bid).omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                            if let note = state.bidNote {
                                Text(note).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                            }
                        }
                        .accessibilityElement(children: .combine)
                    }
                } else if let empty = state.empty {
                    OmenStateBlock(kind: .nothingWorthDoing, title: empty.title, message: empty.message)
                }
                if !state.others.isEmpty {
                    VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                        OmenSectionHeader(title: state.headline == nil ? "Worth a look" : "Also worth a look")
                        ForEach(state.others) { other in
                            OmenPlayerRow(player: { var p = other.player; p.detail = other.note ?? p.detail; return p }(), variant: .display)
                            OmenHairline().padding(.leading, 56)
                        }
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .safeAreaInset(edge: .bottom) {
            if state.headline != nil, let onOpenProvider {
                OmenBottomDock {
                    OmenButton(title: "Make this claim in \(state.providerName)", action: onOpenProvider, variant: .primary, size: .lg, fullWidth: true)
                }
            }
        }
        .omenScreenReady("waivers")
    }

    private func side(_ title: String, _ player: OmenPlayerSummary) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            OmenSectionHeader(title: title)
            OmenPlayerRow(player: player, variant: .display)
        }
    }
}
