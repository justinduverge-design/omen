import SwiftUI

// The Ledger on the foundation (frames: Ledger, LedgerReceipt). The season's record on calls where Omen
// disagreed with the provider, the weeks as bars, then every call. A receipt is frozen as it was issued.
//
// What the user did and what happened stay two separate values, and a self-reported action says "your word".
// The frames also draw points per call, both players' scores and the confidence at the time; moves-history
// and move-detail carry none of them, so they are not drawn.

// MARK: - Entry types (read by MovesHistory, the Desk and these screens)

/// Who says the user did what the row claims they did.
enum OmenLedgerProvenance: Equatable {
    case verified
    case selfReported
}

/// What the user did about the call. Not what happened afterwards.
enum OmenLedgerAction: Equatable {
    case followed(OmenLedgerProvenance)
    case passed(OmenLedgerProvenance)
    /// Omen could not read the roster change and the user has not said. Never shown as blank.
    case unknown

    var words: String {
        switch self {
        case .followed(.verified): "you made the move"
        case .followed(.selfReported): "you made the move (your word)"
        case .passed(.verified): "you passed"
        case .passed(.selfReported): "you passed (your word)"
        case .unknown: "Omen couldn\u{2019}t see what you did"
        }
    }
}

/// What happened. The four values moves-history.v2 maps the stored column onto; a raw win/loss is never one.
enum OmenLedgerOutcome: Equatable {
    case worked
    case didNotWork
    /// There is a result and nobody has verified it.
    case notVerified
    case pending

    var word: String {
        switch self {
        case .worked: "Right"
        case .didNotWork: "Wrong"
        case .notVerified: "Not verified"
        case .pending: "Pending"
        }
    }
}

/// Lifecycle of the Ledger read, shared by the Desk's Ledger line and this screen.
enum OmenLedgerPreviewState {
    case entries([OmenLedgerEntry])
    case empty
    case notConnected
    case loading
    case error(String)

    var entries: [OmenLedgerEntry] {
        guard case .entries(let entries) = self else { return [] }
        return entries
    }
}

/// One recorded call, as MovesHistory maps it.
struct OmenLedgerEntry: Identifiable {
    let id: String
    let period: String
    let callType: String
    let summary: String
    let outcome: String
    let actionStatus: String?
    let outcomeProvenance: String?
    let action: OmenLedgerAction
    let ledgerOutcome: OmenLedgerOutcome
    var week: Int?

    init(
        id: String,
        period: String,
        callType: String,
        summary: String,
        outcome: String,
        actionStatus: String? = nil,
        outcomeProvenance: String? = nil,
        action: OmenLedgerAction = .unknown,
        ledgerOutcome: OmenLedgerOutcome = .pending,
        week: Int? = nil
    ) {
        self.id = id
        self.period = period
        self.callType = callType
        self.summary = summary
        self.outcome = outcome
        self.actionStatus = actionStatus
        self.outcomeProvenance = outcomeProvenance
        self.action = action
        self.ledgerOutcome = ledgerOutcome
        self.week = week
    }

    var accessibilityLabel: String {
        [period, callType, summary, outcome, actionStatus].compactMap { $0 }.joined(separator: ", ")
    }
}

// MARK: - Ledger

/// Everything the Ledger draws, as plain values.
struct OmenLedgerState: Equatable {
    struct Week: Equatable, Identifiable {
        var id: Int { week }
        let week: Int
        let right: Int
        let wrong: Int
        let pending: Bool
    }

    struct Call: Equatable, Identifiable {
        let id: String
        let title: String
        let detail: String
        let outcome: OmenLedgerOutcome
    }

    var eyebrow: String
    /// "41–19". Nil before any contested call has a result.
    var record: String?
    var recordNote: String
    var weeks: [Week]
    var calls: [Call]
}

extension OmenLedgerState {
    /// `record` is the server's contested count; the bars and rows are the page of calls that arrived.
    init(entries: [OmenLedgerEntry], record: MovesHistory.Record?, providerName: String, season: Int? = nil) {
        let worked = record?.contestedWorked, lost = record?.contestedDidNotWork
        let hasRecord = (worked ?? 0) + (lost ?? 0) > 0
        var byWeek: [Int: (right: Int, wrong: Int, pending: Bool)] = [:]
        for entry in entries {
            guard let week = entry.week else { continue }
            var bucket = byWeek[week] ?? (0, 0, false)
            switch entry.ledgerOutcome {
            case .worked: bucket.right += 1
            case .didNotWork: bucket.wrong += 1
            case .pending: bucket.pending = true
            case .notVerified: break
            }
            byWeek[week] = bucket
        }
        self.init(
            eyebrow: "The Ledger \u{00B7} " + (season.map { "\($0) season" } ?? "this season"),
            record: hasRecord ? "\(worked ?? 0)\u{2013}\(lost ?? 0)" : nil,
            recordNote: hasRecord
                ? "when Omen disagreed with \(providerName). Easy calls don\u{2019}t count: only ones where the other choice was a real option."
                : "No graded calls yet. Omen grades a call once its week is played, and only counts ones where the other choice was a real option.",
            weeks: byWeek.keys.sorted().compactMap { week in
                let b = byWeek[week]!
                guard b.right + b.wrong > 0 || b.pending else { return nil }
                return Week(week: week, right: b.right, wrong: b.wrong, pending: b.pending && b.right + b.wrong == 0)
            },
            calls: entries.map { entry in
                Call(
                    id: entry.id,
                    title: entry.summary,
                    detail: [entry.week.map { "Week \($0)" }, entry.action.words, entry.ledgerOutcome == .notVerified ? "not verified" : nil]
                        .compactMap { $0 }.joined(separator: " \u{00B7} "),
                    outcome: entry.ledgerOutcome
                )
            }
        )
    }
}

struct OmenLedgerScreen: View {
    let state: OmenLedgerState
    var onOpenCall: ((String) -> Void)?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text(state.eyebrow.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                    if let record = state.record {
                        Text(record).omenTextStyle(OmenTypography.heroNumber).foregroundStyle(OmenColor.textPrimary)
                            .accessibilityLabel(record.replacingOccurrences(of: "\u{2013}", with: " right, ") + " wrong")
                            .accessibilityAddTraits(.isHeader)
                    }
                    Text(state.recordNote).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if !state.weeks.isEmpty { OmenLedgerWeeks(weeks: state.weeks) }
                VStack(alignment: .leading, spacing: 0) {
                    OmenSectionHeader(title: "Calls")
                    if state.calls.isEmpty {
                        OmenStateBlock(kind: .nothingWorthDoing, title: "No calls on the record yet", message: "Omen records a call when it disagrees with your provider.")
                            .padding(.top, OmenSpacing.step12)
                    }
                    ForEach(Array(state.calls.enumerated()), id: \.element.id) { index, call in
                        OmenPressable(action: { onOpenCall?(call.id) }) { row(call) }
                            .accessibilityLabel("\(call.outcome.word). \(call.title). \(call.detail)")
                            .accessibilityHint("Opens the receipt")
                        if index < state.calls.count - 1 { OmenHairline().padding(.leading, 38) }
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .omenScreenReady("ledger")
    }

    private func row(_ call: OmenLedgerState.Call) -> some View {
        HStack(spacing: OmenSpacing.step12) {
            OmenLedgerMark(outcome: call.outcome)
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(call.title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(call.detail).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, OmenSpacing.step10)
        .frame(minHeight: 62)
        .contentShape(Rectangle())
    }
}

/// Right is a filled check, wrong an outlined cross, pending a dashed ring, not verified a plain ring.
struct OmenLedgerMark: View {
    let outcome: OmenLedgerOutcome

    var body: some View {
        ZStack {
            switch outcome {
            case .worked:
                Circle().fill(OmenColor.accent)
                Image(systemName: "checkmark").font(.system(size: 11, weight: .heavy)).foregroundStyle(OmenColor.textOnAccent)
            case .didNotWork:
                Circle().strokeBorder(OmenColor.border, lineWidth: 2)
                Image(systemName: "xmark").font(.system(size: 10, weight: .bold)).foregroundStyle(OmenColor.textSecondary)
            case .pending:
                Circle().strokeBorder(OmenColor.border, style: StrokeStyle(lineWidth: 2, dash: [3, 3]))
            case .notVerified:
                Circle().strokeBorder(OmenColor.border, lineWidth: 2)
            }
        }
        .frame(width: 26, height: 26)
        .accessibilityHidden(true)
    }
}

private struct OmenLedgerWeeks: View {
    let weeks: [OmenLedgerState.Week]

    var body: some View {
        let most = max(1, weeks.map { $0.right + $0.wrong }.max() ?? 1)
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
                ForEach(weeks) { week in
                    VStack(spacing: 2) {
                        Spacer(minLength: 0)
                        if week.pending {
                            RoundedRectangle(cornerRadius: 4).strokeBorder(OmenColor.border, style: StrokeStyle(lineWidth: 1.5, dash: [3, 3])).frame(height: 8)
                        } else {
                            if week.right > 0 { RoundedRectangle(cornerRadius: 4).fill(OmenColor.accent).frame(height: 56 * CGFloat(week.right) / CGFloat(most)) }
                            if week.wrong > 0 { RoundedRectangle(cornerRadius: 3).fill(OmenColor.surface3).frame(height: 56 * CGFloat(week.wrong) / CGFloat(most)) }
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 64)
            HStack(spacing: OmenSpacing.step8) {
                ForEach(weeks) { week in
                    Text("W\(week.week)").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).frame(maxWidth: .infinity)
                }
            }
            HStack(spacing: OmenSpacing.step16) {
                legend("right") { RoundedRectangle(cornerRadius: 2).fill(OmenColor.accent) }
                legend("wrong") { RoundedRectangle(cornerRadius: 2).fill(OmenColor.surface3) }
                if weeks.contains(where: \.pending) {
                    legend("pending") { RoundedRectangle(cornerRadius: 2).strokeBorder(OmenColor.border, style: StrokeStyle(lineWidth: 1.5, dash: [2, 2])) }
                }
            }
            .padding(.top, OmenSpacing.step2)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(weeks.map { w in
            w.pending ? "Week \(w.week), pending" : "Week \(w.week), \(w.right) right, \(w.wrong) wrong"
        }.joined(separator: ". "))
    }

    private func legend<Swatch: View>(_ word: String, @ViewBuilder swatch: () -> Swatch) -> some View {
        HStack(spacing: OmenSpacing.step6) {
            swatch().frame(width: 10, height: 10)
            Text(word).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
        }
    }
}

// MARK: - Receipt

/// Everything a receipt draws. A frozen snapshot: nothing here is re-read at view time.
struct OmenLedgerReceiptState: Equatable {
    struct Said: Equatable, Identifiable {
        let id: Int
        let text: String
        /// An input Omen could not read when it made the call.
        let unread: Bool
    }

    var eyebrow: String
    var outcome: OmenLedgerOutcome
    var headline: String
    var detail: String
    /// What happened, in the server's words. Nil while the week is open.
    var result: String?
    var fairnessNote: String
    var said: [Said]
    var issued: String
    var choice: String
}

extension OmenLedgerReceiptState {
    init(entry: OmenLedgerEntry, receipt: MoveReceipt) {
        let evidence: [Said]
        if let capabilities = receipt.capabilities, !capabilities.isEmpty {
            // not_requested renders nowhere; read-but-unused inputs are not what Omen said.
            evidence = capabilities.enumerated().compactMap { index, c in
                guard let statement = c.statement?.nilIfEmpty, c.state?.lowercased() != "not_requested" else { return nil }
                let live = c.state?.lowercased() == "live"
                if live, c.used != true { return nil }
                return Said(id: index, text: statement, unread: !live)
            }
        } else {
            evidence = receipt.evidenceAtTheTime.enumerated().map { index, row in
                Said(id: index, text: row.statement, unread: row.kind.lowercased() == "limitation")
            }
        }
        self.init(
            eyebrow: [entry.ledgerOutcome.word, entry.week.map { "Week \($0)" }].compactMap { $0 }.joined(separator: " \u{00B7} "),
            outcome: entry.ledgerOutcome,
            headline: receipt.snapshot.recommendation?.nilIfEmpty ?? entry.summary,
            detail: entry.callType.capitalized,
            result: receipt.observedOutcome.known ? receipt.observedOutcome.statement.nilIfEmpty : nil,
            fairnessNote: receipt.fairnessNote,
            said: evidence,
            issued: Self.issuedLabel(issuedAt: receipt.snapshot.issuedAt, timezone: receipt.snapshot.issuedAtTimezone),
            choice: Self.choice(receipt.userAction, fallback: entry.action)
        )
    }

    /// The action as the receipt recorded it. A self-report keeps "your word"; the live row is only a fallback.
    static func choice(_ recorded: MoveReceipt.Statement, fallback: OmenLedgerAction) -> String {
        guard recorded.known, !recorded.statement.isEmpty else {
            return fallback.words.prefix(1).uppercased() + fallback.words.dropFirst()
        }
        let selfReported: Bool = switch fallback {
        case .followed(.selfReported), .passed(.selfReported): true
        default: false
        }
        let said = recorded.statement.lowercased()
        return selfReported && !said.contains("your word") && !said.contains("reported") ? recorded.statement + " (your word)" : recorded.statement
    }

    /// "Issued Tue 3:00 AM" in the zone the call was issued in. A missing zone says so; it never falls back to UTC.
    static func issuedLabel(issuedAt: String?, timezone: String?) -> String {
        guard let issuedAt, !issuedAt.isEmpty else { return "Issue time not recorded" }
        guard let zone = timezone.flatMap(TimeZone.init(identifier:)) else { return "Issue time zone unavailable" }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = parser.date(from: issuedAt) ?? {
            let plain = ISO8601DateFormatter()
            plain.formatOptions = [.withInternetDateTime]
            return plain.date(from: issuedAt)
        }()
        guard let date else { return "Issue time not recorded" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = zone
        formatter.dateFormat = "EEE h:mm a"
        return "Issued \(formatter.string(from: date))"
    }
}

struct OmenLedgerReceiptScreen: View {
    let state: OmenLedgerReceiptState

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    HStack(spacing: OmenSpacing.step8) {
                        OmenLedgerMark(outcome: state.outcome).scaleEffect(0.85)
                        Text(state.eyebrow.uppercased()).omenTextStyle(OmenTypography.eyebrow)
                            .foregroundStyle(state.outcome == .worked ? OmenColor.accentHover : OmenColor.textTertiary)
                    }
                    Text(state.headline).omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    Text(state.detail).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                }
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text(state.result ?? (state.outcome == .pending ? "The week hasn\u{2019}t been played yet" : "Result not verified"))
                        .omenTextStyle(OmenTypography.h2)
                        .foregroundStyle(state.outcome == .worked ? OmenColor.accentHover : OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(state.fairnessNote).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if !state.said.isEmpty {
                    VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                        OmenSectionHeader(title: "What Omen said then")
                        ForEach(state.said) { said in
                            Text(said.unread ? "Couldn\u{2019}t read: \(said.text)" : "\u{201C}\(said.text)\u{201D}")
                                .omenTextStyle(OmenTypography.body)
                                .foregroundStyle(said.unread ? OmenColor.textTertiary : OmenColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                VStack(spacing: 0) {
                    OmenKeyValueRow(key: "Issued", value: state.issued.replacingOccurrences(of: "Issued ", with: ""))
                    OmenKeyValueRow(key: "Your choice", value: state.choice)
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .omenScreenReady("ledger-receipt")
    }
}

/// Loads one frozen receipt and shows it, or says it didn't load.
struct LedgerReceiptView: View {
    let entry: OmenLedgerEntry
    let load: ((String) async -> Result<MoveReceipt, OmenApiError>)?
    @State private var result: Result<MoveReceipt, OmenApiError>?

    var body: some View {
        Group {
            switch result {
            case .success(let receipt):
                OmenLedgerReceiptScreen(state: OmenLedgerReceiptState(entry: entry, receipt: receipt))
            case .failure:
                block(OmenStateBlock(kind: .failed, title: "The receipt didn\u{2019}t load", message: "Go back to the Ledger and open it again."))
            case nil:
                block(OmenStateBlock(kind: .loading, title: "Reading the receipt"))
            }
        }
        .background(OmenColor.bg)
        .task(id: entry.id) { result = nil; result = await load?(entry.id) ?? .failure(.network) }
    }

    private func block(_ content: OmenStateBlock) -> some View {
        content.padding(OmenSpacing.step20).frame(maxHeight: .infinity, alignment: .top)
    }
}
