import SwiftUI

// MARK: - T3, "reviewing what Omen found"
//
// `TradeFindReview` — the swipeable candidate-review screen from
// `Blueprints/specs/design/screen-contracts/TradeFindReview-v1.md`, compiled from
// `design/native-visual-lock-2026-09-13/TradeFindReview.dc.html`.
//
// Two decisions carried over from the design session, both non-negotiable per the contract's
// "Build acceptance" section:
//
//   1. **Reasoning is never behind a second tap.** `OmenTradeFindCandidateCard` renders
//      `Your need` / `Their need` / `Evidence` unconditionally with the card.
//   2. **Every gesture has an always-visible button doing the identical thing.** The drag on
//      `OmenTradeFindCandidateCard` is a shortcut; `Pass` and `Save for later`
//      (`OmenTradeFindActionRow`) are the real interface and work with VoiceOver/TalkBack alone.
//
// New, screen-specific compositions (none touch shared cross-screen control definitions, per the
// contract's own coordination note): `OmenTradeFindCandidateCard`, `OmenTradeFindNeedBadge`,
// `OmenTradeFindBatchProgressBar`, `OmenTradeFindGestureStamp`, `OmenTradeFindActionRow`.
//
// **Flagged contract drift**, recorded rather than silently resolved: the contract's E034
// data-binding row names `reasoning.opponent_receives.need.status`/`.position` for the header
// `NeedBadge`, but on the contract's OWN literal fixture that field is `{position: "WR",
// status: "surplus"}` (Jaylen Waddle WR out) — which would render "No hole", not the literal
// "Needs RB" the artboard draws. `reasoning.user_receives` (`{position: "RB", status: "hole"}`)
// is what actually reproduces "Needs RB" for this exact fixture, and it also matches the
// header's evident intent — "why does this candidate matter to you at a glance." This file binds
// `OmenTradeFindNeedBadge` to `user_receives`, matching the literal example and the visual
// intent, and disagrees with the binding table's field name. Surfaced in this session's report
// per the contract's own precedent of flagging a binding ambiguity rather than guessing silently.
struct OmenTradeFindReviewScreen: View {
    @ObservedObject var viewModel: TradeFindReviewViewModel
    let platform: String
    let leagueId: String
    let teamId: String
    var week: Int?
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    /// Where `Batch-exhausted`'s and `Zero-candidates`'s single secondary button goes — the
    /// contract leaves the destination to the builder ("Trade or League").
    var onExit: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                OmenTradeFindReviewHeader(onOpenAccount: onOpenAccount)
                content
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityIdentifier("trade-find-review-screen")
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
        .task {
            await viewModel.load(platform: platform, leagueId: leagueId, teamId: teamId, week: week)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.viewState {
        case .loading:
            OmenTradeFindLoadingBlock()

        case .reviewing:
            reviewingContent

        case .batchExhausted:
            OmenStateSurface(
                kind: .empty,
                title: "That's everyone this week.",
                message: exhaustedMessage
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step32)
            OmenButton(title: "Back to Trade", action: { onExit?() }, variant: .secondary, size: .lg)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)

        case .zeroCandidates:
            OmenStateSurface(
                kind: .empty,
                title: "No real gaps to fill.",
                message: "Omen checked \(viewModel.response?.totalOtherTeams ?? 0) teams against your roster and found nothing that clearly helps you. That's not a miss — some weeks there's nothing there."
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step32)
            OmenButton(title: "Back to Trade", action: { onExit?() }, variant: .secondary, size: .lg)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step12)

        case .routeElsewhere:
            // Not this screen's job to render (own-roster-unreadable / league-not-active /
            // team-not-found route to the existing ConnectFailed/LeagueDegraded family). This is
            // the honest placeholder for a hosting flow that has not yet wired that redirect.
            OmenStateSurface(
                kind: .disconnected,
                title: "Omen can't check this league right now",
                message: "This isn't a \"no candidates found\" answer — Omen couldn't read what it needed to check. Try again from League."
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step32)

        case .failed(let error):
            OmenStateSurface(kind: .error, title: "Omen couldn't load candidates", message: OmenTradeFindReviewScreen.message(for: error))
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step32)
        }
    }

    private var exhaustedMessage: String {
        let teamsConsidered = viewModel.response?.teamsConsidered ?? 0
        let found = viewModel.response?.candidates.count ?? 0
        return "Omen scanned \(teamsConsidered) teams and found \(found) worth a look. Come back once your league's rosters move."
    }

    @ViewBuilder
    private var reviewingContent: some View {
        OmenTradeFindBatchProgressBar(
            positionLabel: viewModel.positionLabel,
            teamsScannedLabel: viewModel.teamsScannedLabel,
            currentIndex: viewModel.currentIndex,
            total: viewModel.candidates.count
        )
        if let showing = viewModel.degradedShowingLabel, let sentence = viewModel.degradedSentence {
            OmenTradeFindDegradedBanner(showingLabel: showing, sentence: sentence)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step10)
        }
        if let candidate = viewModel.currentCandidate {
            OmenTradeFindCandidateCard(
                candidate: candidate,
                onPass: { viewModel.pass() },
                onSave: { Task { await viewModel.save() } }
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)

            Text("Swipe right to save, left to pass — or use the buttons below.")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step10)

            OmenTradeFindActionRow(
                saveState: viewModel.saveState(for: candidate.id),
                onPass: { viewModel.pass() },
                onSave: { Task { await viewModel.save() } }
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step8)

            Text("Saved picks keep this reasoning.")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, OmenSpacing.step16)
                .padding(.top, OmenSpacing.step8)
        }
    }

    static func message(for error: OmenApiError) -> String {
        switch error {
        case .network: return "Omen couldn't reach the server. Check your connection and try again."
        case .unauthorized: return "Your session expired. Sign in again to see your league's candidates."
        case .server: return "Omen is having trouble on our side. Try again in a moment."
        case .decode: return "Omen sent something this version of the app couldn't read."
        }
    }
}

/// `.top` — the eyebrow, the title, and E017's two controls. Screen-specific rather than reused
/// from `OmenTradeJourneyHeader` (private to `OmenTradeJourneyScreens.swift`) — this screen's
/// title pairing ("Find a trade" / "Review picks") is its own and duplicating a four-line layout
/// once here is cheaper than promoting a second header type into shared design system code this
/// session was not asked to touch.
private struct OmenTradeFindReviewHeader: View {
    var onOpenAccount: (() -> Void)?

    var body: some View {
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text("Find a trade")
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("Review picks")
                    .omenTextStyle(OmenTypography.screenTitle)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenScreenHeaderControls(
                topic: OmenContextualHelpContent.topic(for: .trade),
                onOpenAccount: onOpenAccount
            )
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
    }
}

/// Loading state: same chrome, "Scanning your league…", four skeleton lines sized to the card's
/// own rhythm. No buttons — nothing to act on yet.
private struct OmenTradeFindLoadingBlock: View {
    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
            Text("Scanning your league…")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            OmenTradeFindSkeletonLine(height: 20, widthFraction: 0.4)
            OmenTradeFindSkeletonLine(height: 55)
            OmenTradeFindSkeletonLine(height: 55)
            OmenTradeFindSkeletonLine(height: 34, widthFraction: 0.9)
            OmenTradeFindSkeletonLine(height: 34, widthFraction: 0.85)
            OmenTradeFindSkeletonLine(height: 34, widthFraction: 0.7)
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step16)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Scanning your league")
    }
}

private struct OmenTradeFindSkeletonLine: View {
    var height: CGFloat
    var widthFraction: CGFloat = 1

    var body: some View {
        RoundedRectangle(cornerRadius: 6, style: .continuous)
            .fill(LinearGradient(colors: [OmenColor.surface1, OmenColor.surface2, OmenColor.surface1], startPoint: .leading, endPoint: .trailing))
            .frame(height: height)
            .frame(maxWidth: .infinity, alignment: .leading)
            .scaleEffect(x: widthFraction, y: 1, anchor: .leading)
            .accessibilityHidden(true)
    }
}

/// `BatchProgressBar` — "Candidate 3 of 6" and "5 of 6 teams scanned" side by side, plus a dot
/// pager. Two different numbers from two different fields; never conflated (contract's own
/// warning).
private struct OmenTradeFindBatchProgressBar: View {
    let positionLabel: String?
    let teamsScannedLabel: String?
    let currentIndex: Int
    let total: Int

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            HStack {
                if let positionLabel {
                    (Text("Candidate ").foregroundStyle(OmenColor.textTertiary)
                        + Text(positionLabel).foregroundStyle(OmenColor.textPrimary))
                        .omenTextStyle(OmenTypography.micro)
                }
                Spacer(minLength: OmenSpacing.step8)
                if let teamsScannedLabel {
                    Text(teamsScannedLabel)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.textTertiary)
                }
            }
            if total > 0 {
                HStack(spacing: OmenSpacing.step4) {
                    ForEach(0..<total, id: \.self) { index in
                        Capsule()
                            .fill(index == currentIndex ? OmenColor.accent : OmenColor.borderSubtle)
                            .frame(width: index == currentIndex ? 16 : 5, height: 5)
                    }
                }
                .accessibilityHidden(true)
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
        .accessibilityElement(children: .combine)
    }
}

/// Reuses the `.hatch`/`SampleDataPanel` dashed-hairline treatment `LeagueDegraded.dc.html`
/// already established for partial-provider-data, per the contract's explicit instruction that
/// this is real data with a named gap — not the stub/mock use of the same carrier — so the
/// wording (not a new visual) disambiguates it.
private struct OmenTradeFindDegradedBanner: View {
    let showingLabel: String
    let sentence: String

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            Text(showingLabel)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
            Text(sentence)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(OmenSpacing.step12)
        .background(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(LinearGradient(colors: [OmenColor.surface2, OmenColor.surface1], startPoint: .top, endPoint: .bottom))
                .overlay(
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(OmenColor.border)
                )
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(showingLabel) \(sentence)")
    }
}

/// `NeedBadge` — "Needs RB" / "No hole". See this file's header note on which field this binds
/// to and why it disagrees with the contract's own binding table for this one element.
private struct OmenTradeFindNeedBadge: View {
    let need: TradeFindPositionNeed

    private var label: String {
        need.need.status == "hole" ? "Needs \(need.position)" : "No hole"
    }

    var body: some View {
        Text(label)
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(OmenColor.accent)
    }
}

/// `CandidateSwipeCard` — the primary drawn state (E031–E064). Reasoning renders unconditionally;
/// there is no collapsed/expandable state for it. Carries the drag gesture (E065/E066's stamps),
/// while `OmenTradeFindActionRow` below carries the same two actions as always-visible buttons.
private struct OmenTradeFindCandidateCard: View {
    let candidate: TradeFindCandidate
    var onPass: () -> Void
    var onSave: () -> Void

    @State private var dragTranslationWidth: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Distance a drag must travel before it commits, matching the deck-swipe precedent's own
    /// "past the commit threshold" language.
    private static let commitThreshold: CGFloat = 96

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            header
            chips
            legs
            reasoningLine
            evidence
        }
        .padding(OmenSpacing.step14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(LinearGradient(colors: [OmenColor.surface2, OmenColor.surface1], startPoint: .top, endPoint: .bottom))
                .overlay(alignment: .top) {
                    Rectangle().fill(OmenColor.accent.opacity(0.34)).frame(height: 1)
                }
        )
        .overlay(alignment: .topLeading) {
            OmenTradeFindGestureStamp(label: "Pass", tone: .pass)
                .opacity(passStampOpacity)
                .padding(.leading, OmenSpacing.step14)
                .padding(.top, OmenSpacing.step32)
        }
        .overlay(alignment: .topTrailing) {
            OmenTradeFindGestureStamp(label: "Save", tone: .save)
                .opacity(saveStampOpacity)
                .padding(.trailing, OmenSpacing.step14)
                .padding(.top, OmenSpacing.step32)
        }
        .offset(x: dragTranslationWidth)
        .rotationEffect(.degrees(Double(dragTranslationWidth / 24)))
        .gesture(dragGesture)
        // Deliberately NOT a single combined accessibility element: the contract requires
        // VoiceOver to read the card "in document order (opponent, need badges, send/receive
        // rows, reasoning, evidence)" rather than one collapsed summary, so each subview below
        // keeps its own label and only the leg rows group internally (mirroring
        // `OmenTradeLegBlock`'s row treatment).
    }

    private var passStampOpacity: Double {
        dragTranslationWidth < 0 ? min(1, Double(-dragTranslationWidth / Self.commitThreshold)) : 0
    }

    private var saveStampOpacity: Double {
        dragTranslationWidth > 0 ? min(1, Double(dragTranslationWidth / Self.commitThreshold)) : 0
    }

    private var dragGesture: some Gesture {
        DragGesture(minimumDistance: 12)
            .onChanged { value in
                dragTranslationWidth = value.translation.width
            }
            .onEnded { value in
                let translation = value.translation.width
                let animation: Animation? = reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.8)
                if translation <= -Self.commitThreshold {
                    withAnimation(animation) { dragTranslationWidth = 0 }
                    onPass()
                } else if translation >= Self.commitThreshold {
                    withAnimation(animation) { dragTranslationWidth = 0 }
                    onSave()
                } else {
                    withAnimation(animation) { dragTranslationWidth = 0 }
                }
            }
    }

    private var header: some View {
        HStack(alignment: .center) {
            Text("vs \(candidate.opponentDisplayName)")
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)
                .lineLimit(1)
            Spacer(minLength: OmenSpacing.step8)
            // See this file's header note: bound to `user_receives`, not the binding table's
            // named `opponent_receives`, to match the contract's own literal example.
            OmenTradeFindNeedBadge(need: candidate.reasoning.userReceives)
        }
    }

    @ViewBuilder
    private var chips: some View {
        let fillsFor = candidate.reasoning.fillsNeedFor
        if fillsFor == ["no_named_hole_on_either_side"] {
            Text("No named hole on either side")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
        } else {
            HStack(spacing: OmenSpacing.step8) {
                if fillsFor.contains("user") {
                    fillsChip(position: candidate.reasoning.userReceives.position, pronoun: "your")
                }
                if fillsFor.contains("opponent") {
                    fillsChip(position: candidate.reasoning.opponentReceives.position, pronoun: "their")
                }
            }
        }
    }

    private func fillsChip(position: String, pronoun: String) -> some View {
        Text("Fills \(pronoun) \(position) hole")
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(OmenColor.accent)
            .padding(.horizontal, OmenSpacing.step10)
            .frame(minHeight: OmenLayout.minTouchTarget)
            .background(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .strokeBorder(OmenColor.accent.opacity(0.38), lineWidth: 1)
            )
    }

    private var legs: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            legHeading("You send")
            legRow(label: "Out", labelColor: OmenColor.textTertiary, player: candidate.give)
            legHeading("You receive")
            legRow(label: "In", labelColor: OmenColor.accent, player: candidate.receive)
        }
        .padding(.top, OmenSpacing.step2)
    }

    private func legHeading(_ text: String) -> some View {
        HStack(spacing: OmenSpacing.step8) {
            Text(text).omenTextStyle(OmenTypography.micro).foregroundStyle(OmenColor.textTertiary)
            Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
        }
    }

    private func legRow(label: String, labelColor: Color, player: TradeFindPlayer) -> some View {
        HStack(spacing: OmenSpacing.step10) {
            Text(label)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(labelColor)
                .frame(width: 22, alignment: .leading)
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(player.name).omenTextStyle(OmenTypography.name).foregroundStyle(OmenColor.textPrimary).lineLimit(1)
                Text(player.meta).omenTextStyle(OmenTypography.micro).foregroundStyle(OmenColor.textTertiary).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Text(player.pointsLabel)
                .omenTextStyle(OmenTypography.micro)
                .monospacedDigit()
                .foregroundStyle(OmenColor.textTertiary)
        }
        .padding(OmenSpacing.step10)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(OmenColor.surface1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label), \(player.name), \(player.meta), \(player.pointsLabel)")
    }

    private var reasoningLine: some View {
        let userSign = candidate.userLineupDelta.map(Self.signedString) ?? "—"
        let oppSign = candidate.opponentLineupDelta.map(Self.signedString) ?? "—"
        return (
            Text(userSign).foregroundStyle(OmenColor.textPrimary).bold()
                + Text(" to your starting lineup this week · ").foregroundStyle(OmenColor.textSecondary)
                + Text(oppSign).foregroundStyle(OmenColor.textSecondary).bold()
                + Text(" to theirs.").foregroundStyle(OmenColor.textSecondary)
        )
        .omenTextStyle(OmenTypography.bodySmall)
    }

    private static func signedString(_ value: Double) -> String {
        value >= 0 ? String(format: "+%.1f", value) : String(format: "%.1f", value)
    }

    /// `Your need` / `Their need` / `Evidence` — always visible, no `onOpenFullArgument`. This
    /// is the contract's central, load-bearing decision: the reasoning is never a second tap.
    private var evidence: some View {
        OmenEvidenceDisclosure(
            rows: [
                (key: "Your need", statement: Self.needSentence(candidate.reasoning.userReceives, isSelf: true)),
                (key: "Their need", statement: Self.needSentence(candidate.reasoning.opponentReceives, isSelf: false)),
                (key: "Evidence", statement: Self.evidenceSentence(candidate.reasoning.evidence)),
            ],
            onOpenFullArgument: nil
        )
    }

    private static func needSentence(_ positionNeed: TradeFindPositionNeed, isSelf: Bool) -> String {
        let position = positionNeed.position
        let need = positionNeed.need
        let have = need.have.map(String.init) ?? "an unknown number of"
        let required = need.required.map(String.init) ?? "an unknown number of"
        switch need.status {
        case "hole":
            return isSelf
                ? "\(position) is a hole — you start \(have), the league needs \(required)."
                : "\(position) is a hole for them — they start \(have), the league needs \(required)."
        case "surplus":
            return isSelf
                ? "\(position) is surplus for you — you start \(required), roster \(have)."
                : "\(position) is surplus for them — they start \(required), roster \(have)."
        case "balanced":
            return isSelf
                ? "\(position) is even for you — you start \(required), roster \(have)."
                : "\(position) is even for them — they start \(required), roster \(have)."
        default:
            return "\(position) isn't tracked for this league shape."
        }
    }

    private static let evidenceLabels: [String: String] = [
        "live_roster_depth": "Live roster depth",
        "live_lineup_projection_delta": "Live lineup-projection delta",
        "missing_projection_for_some_players": "Missing a projection for some players",
    ]

    private static func evidenceSentence(_ slugs: [String]) -> String {
        // The caveat trails, per the contract's "render this one distinctly, e.g. trailing"
        // instruction — it's a caveat, not a strength.
        let ordered = slugs.sorted { lhs, rhs in
            (lhs == "missing_projection_for_some_players" ? 1 : 0) < (rhs == "missing_projection_for_some_players" ? 1 : 0)
        }
        return ordered
            .map { evidenceLabels[$0] ?? $0.replacingOccurrences(of: "_", with: " ").capitalized }
            .joined(separator: " · ")
    }
}

/// `GestureStamp` — drawn hidden at rest (opacity 0), fades in during an active drag past the
/// commit threshold. Visual feedback only; never independently tappable (E065/E066).
private struct OmenTradeFindGestureStamp: View {
    enum Tone { case pass, save }
    let label: String
    let tone: Tone

    private var color: Color { tone == .pass ? OmenColor.textTertiary : OmenColor.accent }

    var body: some View {
        Text(label)
            .omenTextStyle(OmenTypography.label)
            .foregroundStyle(color)
            .padding(.horizontal, OmenSpacing.step10)
            .padding(.vertical, OmenSpacing.step4)
            .background(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(OmenColor.bg)
                    .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous).strokeBorder(color, lineWidth: 2))
            )
            .rotationEffect(.degrees(tone == .pass ? -10 : 10))
            .accessibilityHidden(true)
    }
}

/// `SwipeActionRow` — `Pass` and `Save for later`, always visible, always tappable, full-width,
/// 44pt tall (`OmenButton(size: .lg)` already meets the floor). This is the real interface; the
/// drag on the card above is the shortcut.
private struct OmenTradeFindActionRow: View {
    let saveState: TradeFindReviewViewModel.SaveState
    var onPass: () -> Void
    var onSave: () -> Void

    private var saveTitle: String {
        switch saveState {
        case .idle: return "Save for later"
        case .saving: return "Saving…"
        case .saved: return "Saved ✓"
        case .error: return "Couldn't save — try again"
        }
    }

    var body: some View {
        HStack(spacing: OmenSpacing.step10) {
            OmenButton(title: "Pass", action: onPass, variant: .secondary, size: .lg)
                .frame(maxWidth: .infinity)
                .accessibilityLabel("Pass on this candidate")
            OmenButton(
                title: saveTitle,
                action: onSave,
                variant: saveState == .saved ? .secondary : .primary,
                size: .lg,
                enabled: saveState != .saving && saveState != .saved,
                loading: saveState == .saving
            )
            .frame(maxWidth: .infinity)
            .accessibilityLabel(saveState == .saved ? "Saved" : "Save this candidate for later")
        }
    }
}
