import SwiftUI

/// M5 slice G — the Trade destination.
///
/// Built against the ratified `M1-Screen-Trade` contract. Two properties are load-bearing and
/// deliberate:
///
/// 1. **The verdict comes from the server and only from the server.** The screen reads
///    `verdict_state` and never `verdict`, and never derives a verdict from `net_value`. A
///    client that recomputed the call could disagree with the server on screen.
/// 2. **`insufficient_data` is a first-class answer, not an error.** §9.4: name incomplete
///    input, do not force a verdict.
struct OmenTradeScreen: View {
    let state: TradeViewModel.ViewState
    let offer: TradeOffer
    var onAdd: ((String, TradeViewModel.Side) -> Void)?
    var onRemove: ((Int, TradeViewModel.Side) -> Void)?
    var onCompare: (() -> Void)?

    @State private var sendDraft: String = ""
    @State private var receiveDraft: String = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                header
                side(title: "You send", side: .send, players: offer.send, draft: $sendDraft)
                side(title: "You receive", side: .receive, players: offer.receive, draft: $receiveDraft)
                compareButton
                verdict
            }
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text("Trade")
                .omenTextStyle(OmenTypography.h1)
                .foregroundStyle(OmenColor.textPrimary)
            Text(offer.leagueContext == nil
                 ? "Standard scoring. Connect a league to use your own settings."
                 : "Using your connected league's scoring and roster.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
        }
    }

    // MARK: - Sides

    @ViewBuilder
    private func side(
        title: String,
        side: TradeViewModel.Side,
        players: [String],
        draft: Binding<String>
    ) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text(title)
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.textSecondary)

            ForEach(Array(players.enumerated()), id: \.offset) { index, name in
                OmenTradePlayerRow(
                    name: name,
                    onRemove: { onRemove?(index, side) }
                )
            }

            HStack(spacing: OmenSpacing.step8) {
                OmenTextField(
                    value: draft,
                    label: "Add a player",
                    placeholder: "Player name"
                )
                OmenButton(
                    title: "Add",
                    action: {
                        onAdd?(draft.wrappedValue, side)
                        draft.wrappedValue = ""
                    },
                    variant: .secondary,
                    size: .md
                )
            }
        }
    }

    // MARK: - Compare

    @ViewBuilder
    private var compareButton: some View {
        OmenButton(
            title: "Compare",
            action: { onCompare?() },
            variant: .primary,
            size: .lg,
            enabled: offer.isComparable
        )
        if !offer.isComparable {
            // Says which half is missing rather than leaving a dead button unexplained.
            Text(offer.send.isEmpty && offer.receive.isEmpty
                 ? "Add at least one player to each side."
                 : offer.send.isEmpty ? "Add a player you'd send." : "Add a player you'd receive.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
        }
    }

    // MARK: - Verdict

    @ViewBuilder
    private var verdict: some View {
        switch state {
        case .idle:
            // Deliberately nothing. A verdict surface before the user has asked would be
            // answering a question nobody put.
            EmptyView()
        case .loading:
            OmenStateSurface(
                kind: .loading,
                title: "Weighing the offer",
                message: "Omen is comparing both sides."
            )
        case .demo:
            OmenStateSurface(
                kind: .mock,
                title: "Demo mode",
                message: "Sign in to compare a real offer. Demo mode issues no verdict."
            )
        case .failed(let error):
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                OmenStateSurface(
                    kind: .error,
                    title: "Omen couldn't compare this",
                    message: TradeViewModel.message(for: error)
                )
                OmenButton(title: "Try again", action: { onCompare?() }, variant: .secondary, size: .md)
            }
        case .loaded(let result):
            OmenTradeVerdictCard(result: result)
        }
    }
}

/// One player chip with a remove affordance.
private struct OmenTradePlayerRow: View {
    let name: String
    let onRemove: () -> Void

    var body: some View {
        HStack {
            Text(name)
                .omenTextStyle(OmenTypography.body)
                .foregroundStyle(OmenColor.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)
            OmenButton(title: "Remove", action: onRemove, variant: .link, size: .sm)
        }
        .padding(OmenSpacing.step12)
        .background(OmenColor.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(name), double tap remove to take out of the offer")
    }
}

/// Split out of `OmenTradeScreen` to keep each expression inside the Swift type-checker's
/// budget — the same reason `OmenStandingsRow` is separate.
private struct OmenTradeVerdictCard: View {
    let result: TradeCompare

    /// `insufficient_data` is an honest non-answer, not a failure, so it does not take the
    /// risk tone. Nothing here is coloured by whether the verdict is good news.
    private var tone: OmenBadgeTone {
        switch result.verdictState {
        case .favorsYou: return .success
        case .youGiveUpTooMuch: return .risk
        case .closeNeedsContext: return .neutral
        case .insufficientData: return .unavailable
        }
    }

    private var modeLabel: String {
        result.analysisContext.isPersonalized ? "Personalized" : "Standard scoring"
    }

    var body: some View {
        OmenCard(variant: .outlined) {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                OmenBadge(label: modeLabel, tone: tone)

                Text(result.headline)
                    .omenTextStyle(OmenTypography.h2)
                    .foregroundStyle(OmenColor.textPrimary)

                Text(result.subhead)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)

                // Shown only when the server actually evaluated the offer. Printing a net
                // value beside "Omen can't call this one" would contradict the verdict.
                if result.evaluability.isEvaluable, let net = result.netValue {
                    Text(String(format: "Net value %+.1f", net))
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }

                if let explanation = result.explanation, !explanation.isEmpty {
                    Text(explanation)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }

                // The server says when it could not personalize. Naming the reason beats
                // silently returning a neutral answer the user thinks is personalized.
                if let reason = result.analysisContext.unavailableReason {
                    Text(unavailableCopy(reason))
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textTertiary)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(result.headline). \(result.subhead)")
    }

    private func unavailableCopy(_ reason: String) -> String {
        switch reason {
        case "unauthenticated":
            return "Sign in to compare this with your league's settings."
        case "provider_unsupported":
            return "This provider doesn't support personalized trade analysis yet."
        default:
            return "Omen used standard scoring for this one."
        }
    }
}
