import SwiftUI

/// The Omen call (frames: Main Omen call, OmenTradeCall, States "hold", FullArgument). Built only from the
/// foundation. Order: the call in one sentence, why in one more, the two sides, the numbers that matter,
/// what moved it, then what to do. Everything technical lives in the full argument (spec § 2).
struct OmenCallView: View {
    let state: OmenDecisionBriefState
    var startSit: StartSitDetail?
    var weekLabel: String?
    /// "ESPN", "Yahoo", "Sleeper". Names the hand-off button; nil hides it.
    var providerName: String?
    var teamControl: (platform: String, team: String)?
    var onSwitchTeam: () -> Void = {}
    var onMakeMove: (() -> Void)?
    var onDecline: (() -> Void)?
    /// Re-reads the start/sit detail when it failed to load.
    var onRetryStartSit: (() -> Void)?
    var onOpenFullArgument: () -> Void = {}
    var onReport: () -> Void = {}
    var onReviewTrade: ((OmenTradeCall) -> Void)?
    var onFindOtherTrades: (() -> Void)?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                if let teamControl {
                    OmenTeamControl(platform: teamControl.platform, teamName: teamControl.team, action: onSwitchTeam)
                }
                content
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, 120)
        }
        .background(OmenColor.bg)
        .omenScreenReady("omen-call", when: !isLoading)
    }

    private var isLoading: Bool { if case .loading = state { return true } else { return false } }

    @ViewBuilder
    private var content: some View {
        switch state {
        case .success(let payload): call(payload, label: nil)
        case .stale(let payload, let lastSynced): call(payload, label: "Updated \(lastSynced)")
        case .mock(let payload): call(payload, label: "SAMPLE")
        case .demo(let payload): call(payload, label: "DEMO")
        case .hold(let hold): holdView(hold)
        case .loading:
            OmenStateBlock(kind: .loading, title: "Reading your league", message: "Omen is checking every lineup swap and the wire.")
        case .empty(let message):
            OmenStateBlock(kind: .nothingWorthDoing, title: "Nothing worth doing this week", message: message)
        case .error(let message, let retry):
            OmenStateBlock(kind: .failed, title: "Omen couldn\u{2019}t make this week\u{2019}s call", message: message, actionTitle: retry == nil ? nil : "Try again", action: retry)
        case .disconnected(let connect):
            OmenStateBlock(kind: .notEnoughToGoOn, title: "Connect a league for a call", message: "Omen makes one call a week for each team you connect.", actionTitle: connect == nil ? nil : "Connect a league", action: connect)
        case .offSeason:
            OmenStateBlock(kind: .nothingWorthDoing, title: "No games this week", message: "Calls start again when the season does.")
        }
    }

    // MARK: The call

    @ViewBuilder
    private func call(_ payload: OmenDecisionBriefPayload, label: String?) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
            HStack(spacing: OmenSpacing.step8) {
                if let label {
                    Text(label).omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(label == "DEMO" || label == "SAMPLE" ? OmenColor.Data.demoText : OmenColor.textSecondary)
                        .accessibilityLabel(label == "DEMO" ? "Demo, sample data" : label == "SAMPLE" ? "Sample data, not your league" : label)
                }
                Text(eyebrow(payload)).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
            }
            Text(payload.verdict)
                .omenTextStyle(OmenTypography.pageTitle)
                .foregroundStyle(OmenColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            if let why = payload.explanation.first ?? payload.move.nilIfEmpty {
                Text(why)
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }

        if let trade = payload.tradeCall {
            tradeSides(trade)
        } else if let rec = startSit?.recommendation, let start = rec.start, let over = rec.over {
            OmenSidePair(
                primary: .init(label: "Start", player: summary(start), value: start.projectedPoints.map(OmenPlayerSummary.one), valueCaption: providerName.map { "\($0) projection" }),
                secondary: .init(label: "Sit", player: summary(over), value: over.projectedPoints.map(OmenPlayerSummary.one), valueCaption: providerName.map { "\($0) projection" })
            )
        } else if let startSit, startSit.recommendation?.start == nil, payload.callType == "start_sit" {
            OmenStateBlock(
                kind: .notEnoughToGoOn,
                title: "The lineup detail didn\u{2019}t load",
                message: startSit.message ?? "The call above still stands. The side-by-side needs one more read.",
                actionTitle: onRetryStartSit == nil ? nil : "Try again",
                action: onRetryStartSit
            )
        }

        HStack(alignment: .top, spacing: OmenSpacing.step24) {
            if let points = Self.leadingNumber(payload.impact) { OmenFigure(value: points, label: "points better", emphasized: true) }
            OmenFigure(value: riskWord(payload.risk), label: "risk")
            if let band = payload.confidenceBand { OmenFigure(value: band.label, label: "confidence") }
        }
        .accessibilityElement(children: .combine)

        if let comparison = payload.readComparison {
            OmenReadBlock(player: readPlayer(comparison, payload: payload), title: "Omen\u{2019}s read")
        }

        // Only football reasons belong on the call. Which sources were read, used or missing is the
        // full argument's job (founder, 2026-10-21: "the user doesn't care, only the computer cares").
        let reasons = payload.readComparison?.portents ?? []
        if !reasons.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                OmenSectionHeader(title: "What moved the call")
                ForEach(reasons, id: \.self) { reason in
                    Text(reason)
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textPrimary)
                        .padding(.vertical, OmenSpacing.step10)
                        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                        .overlay(alignment: .bottom) { OmenHairline() }
                }
            }
        }

        actions(payload)
    }

    private func eyebrow(_ payload: OmenDecisionBriefPayload) -> String {
        let kind = payload.tradeCall != nil ? "TRADE" : payload.callType.map { $0.replacingOccurrences(of: "_", with: " / ").uppercased() }
        return (["OMEN", weekLabel?.uppercased(), kind].compactMap { $0 }).joined(separator: " \u{00B7} ")
    }

    private func tradeSides(_ trade: OmenTradeCall) -> some View {
        let send = trade.gives.map { OmenPlayerSummary(id: $0.playerKey ?? $0.name, name: $0.name, position: $0.position, team: $0.team) }
        let get = trade.receives.map { OmenPlayerSummary(id: $0.playerKey ?? $0.name, name: $0.name, position: $0.position, team: $0.team) }
        return Group {
            if let firstGet = get.first, let firstSend = send.first {
                OmenSidePair(
                    primary: .init(label: "You get", player: firstGet, more: Array(get.dropFirst())),
                    secondary: .init(label: "You send", player: firstSend, more: Array(send.dropFirst()))
                )
            }
        }
    }

    @ViewBuilder
    private func actions(_ payload: OmenDecisionBriefPayload) -> some View {
        VStack(spacing: OmenSpacing.step10) {
            if let trade = payload.tradeCall {
                if let onReviewTrade {
                    OmenButton(title: "Check it in the builder", action: { onReviewTrade(trade) }, variant: .primary, size: .lg, fullWidth: true)
                }
                if let onFindOtherTrades {
                    OmenButton(title: "See other trades", action: onFindOtherTrades, variant: .secondary, size: .lg, fullWidth: true)
                }
            } else {
                // Omen hands the move over; it never makes it (submission is hand-off only).
                if let providerName, let onMakeMove {
                    OmenButton(title: "Make this move in \(providerName)", action: onMakeMove, variant: .primary, size: .lg, fullWidth: true)
                }
                if let onDecline {
                    OmenButton(title: "Not this week", action: onDecline, variant: .secondary, size: .lg, fullWidth: true)
                }
            }
            HStack {
                OmenBarTextButton(title: "See the full argument", action: onOpenFullArgument)
                Spacer()
                OmenBarTextButton(title: "Report this", tone: OmenColor.textSecondary, action: onReport)
            }
            Text("Every call lands in the Ledger, whether you take it or not.")
                .omenTextStyle(OmenTypography.quiet)
                .foregroundStyle(OmenColor.textTertiary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: Hold

    @ViewBuilder
    private func holdView(_ hold: OmenHoldPayload) -> some View {
        OmenStateBlock(
            kind: hold.cannotRank ? .notEnoughToGoOn : .hold,
            title: hold.headline,
            message: hold.summary
        )
        if !hold.reasons.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                OmenSectionHeader(title: "Why hold")
                ForEach(hold.reasons) { reason in
                    Text(reason.text)
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textPrimary)
                        .padding(.vertical, OmenSpacing.step10)
                        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                        .overlay(alignment: .bottom) { OmenHairline() }
                }
            }
        }
        if let alternative = hold.alternative {
            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                OmenSectionHeader(title: "Closest call")
                Text(alternative.title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                if let figures = alternative.figures {
                    Text(figures).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                }
                if let why = alternative.whyItLost {
                    Text(why).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                }
            }
            .accessibilityElement(children: .combine)
        }
        if let coverage = hold.coverage {
            Text(coverage).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
        }
        HStack {
            OmenBarTextButton(title: "See the full argument", action: onOpenFullArgument)
            Spacer()
            OmenBarTextButton(title: "Report this", tone: OmenColor.textSecondary, action: onReport)
        }
    }

    // MARK: Adapters

    private func summary(_ player: StartSitDetail.Player) -> OmenPlayerSummary {
        OmenPlayerSummary(id: player.playerKey ?? player.name ?? "player", name: player.name ?? "Unnamed player", position: player.position, team: player.team, detail: player.status)
    }

    private func readPlayer(_ comparison: OmenReadComparison, payload: OmenDecisionBriefPayload) -> OmenPlayerSummary {
        let lead: OmenPlayerSummary.Lead = switch comparison.authority {
        case .omenLeads, .singleSourceOnly: .omen
        case .providerLeads: .provider
        default: .unresolved
        }
        return OmenPlayerSummary(
            id: "read",
            name: payload.verdict,
            omenPoints: comparison.omenPoints,
            providerPoints: comparison.providerPoints,
            providerName: comparison.providerLabel,
            lead: lead
        )
    }

    /// "+3.1 projected (meaningful)" -> "+3.1". The server's phrase stays in the full argument.
    static func leadingNumber(_ text: String?) -> String? {
        guard let text, let range = text.range(of: #"^[+\-\u2212]?\d+(\.\d+)?"#, options: .regularExpression) else { return nil }
        return String(text[range])
    }

    private func riskWord(_ risk: OmenRiskLevel) -> String {
        switch risk {
        case .low: "Low"
        case .medium: "Medium"
        case .high: "High"
        }
    }
}

/// The full argument (frame: FullArgument). Where everything technical lives: whose number leads and why,
/// what went in, what was read but did not decide, what Omen could not read, and why this confidence.
struct OmenFullArgumentScreen: View {
    let payload: OmenDecisionBriefPayload

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                    Text("THE FULL ARGUMENT").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                    Text(payload.verdict).omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                }
                if let comparison = payload.readComparison {
                    section("Whose number leads") {
                        Text(leadSentence(comparison)).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                rows("What went in", payload.signals.filter { $0.used == true && $0.source == .live })
                rows("Read, but it didn\u{2019}t decide this", payload.signals.filter { $0.used == false && $0.source == .live })
                rows("What Omen couldn\u{2019}t read", payload.signals.filter { $0.source == .unavailable })
                if !payload.confidenceDrivers.isEmpty || !payload.confidenceUnavailableReason.isEmpty {
                    section("Why this confidence") {
                        ForEach(payload.confidenceDrivers + payload.confidenceUnavailableReason, id: \.self) { line in
                            Text(line).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                if let intelligence = payload.footballIntelligence {
                    section("System signal") {
                        Text(intelligence.summary).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                        OmenKeyValueRow(key: "Freshness", value: intelligence.freshness)
                        ForEach(intelligence.whatCouldChangeThis, id: \.self) { line in
                            Text(line).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        }
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step48)
        }
        .background(OmenColor.bg)
        .navigationBarTitleDisplayMode(.inline)
        .omenScreenReady("omen-full-argument")
    }

    private func leadSentence(_ c: OmenReadComparison) -> String {
        var parts: [String] = []
        switch c.authority {
        case .omenLeads: parts.append("Omen\u{2019}s read leads here.")
        case .providerLeads: parts.append("\(c.providerLabel)\u{2019}s projection leads here.")
        case .singleSourceOnly: parts.append("Only Omen\u{2019}s read was available.")
        default: parts.append("Neither read has the better record for this yet, so neither leads.")
        }
        if let o = c.omenMAE, let p = c.providerMAE {
            let family = c.scoringFamily.map { $0.replacingOccurrences(of: "_", with: "-").uppercased().replacingOccurrences(of: "HALF-PPR", with: "half-PPR") }
            let scope = [c.position, family].compactMap { $0 }.joined(separator: " in ")
            parts.append("For \(scope.isEmpty ? "this position" : scope), Omen has been off by \(OmenPlayerSummary.one(o)) points a week, \(c.providerLabel) by \(OmenPlayerSummary.one(p))\(c.sampleSize.map { ", over \($0) player-weeks" } ?? "").")
        }
        return parts.joined(separator: " ")
    }

    @ViewBuilder
    private func rows(_ title: String, _ items: [OmenSignalItem]) -> some View {
        if !items.isEmpty {
            section(title) {
                ForEach(items) { item in
                    OmenKeyValueRow(key: item.label, value: item.detail ?? "")
                }
            }
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            OmenSectionHeader(title: title)
            content()
        }
    }
}
