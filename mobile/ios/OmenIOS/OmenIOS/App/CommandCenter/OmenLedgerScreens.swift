import SwiftUI

// MARK: - J6, "the receipts"
//
// `Ledger.dc.html` and `LedgerDetail.dc.html` — the two artboards of `screen-journeys-v1.md`'s
// sixth journey, built under the 2026-09-18/19 precedence rule: the artboard owns composition,
// placement, type and tone; `CONTRACTS.md` owns data, vocabulary and state.
//
// ## The Ledger's own honesty rule, which is narrower than the general one
//
// `CONTRACTS.md`: *"Ledger is the receipts: verified outcomes, self-reported action, and unknown
// follow-through stay visually and semantically separate."* `capability-expression-v1.md` then
// says where a screen's rule is narrower than the general one, the narrowing is the screen's to
// declare. It is declared in the type system here rather than in prose:
//
//   - `OmenLedgerAction` is what the **user** did. Every case carries its own provenance, and a
//     self-reported action wears the registry §2.3 **dotted** carrier — never blended with a
//     verified one.
//   - `OmenLedgerOutcome` is what **happened**. It is a separate value with separate cases, so
//     no code path can produce a row where a self-report has been promoted to a verified result.
//   - Unknown follow-through is `OmenLedgerAction.unknown`, a case of its own rather than a nil
//     that renders as nothing. A row that silently omits the action reads as a verified one.
//
// The two axes cannot be collapsed because they answer different questions, and the union type
// that would collapse them is exactly the bug the rule exists to prevent.
//
// ## Confidence is a band
//
// Fact-of-record #16. `OmenConfidenceBandLabel` is the only confidence surface on either screen
// and it has no score initialiser by design.
//
// ## No capability glyphs
//
// `capability-symbols-v1.md`: a capability renders as a word. There is no icon anywhere below.

// MARK: - State

/// Who says the user did what the row claims they did.
///
/// Registry §2.3 gives `provenance · self-reported` a **dotted** treatment and adds "never
/// blended with verified". Dotted is the carrier; the word "Self-reported" is the other one,
/// because colour and form are never the only carriers (D7).
enum OmenLedgerProvenance: Equatable {
    /// Omen watched the roster change. The Ledger says so without qualification.
    case verified
    /// The user told us. A true statement about a claim, not about the roster.
    case selfReported
}

/// What the user did about the call. **Not** what happened afterwards.
enum OmenLedgerAction: Equatable {
    case followed(OmenLedgerProvenance)
    case passed(OmenLedgerProvenance)
    /// Nobody knows. Omen could not read the roster change and the user has not said.
    ///
    /// A case rather than an absence: an action slot rendered empty is read as "followed", which
    /// is the flattering reading and the wrong one.
    case unknown

    /// `.row` is the Ledger's terse chip; `.receipt` is `LedgerDetail`'s sentence.
    ///
    /// Two artboards, two registers, **one set of cases**. `Ledger.dc.html` draws "Followed" in a
    /// strip of four rows where a sentence per row would turn a record into an essay;
    /// `LedgerDetail.dc.html` draws "You followed it", which is right on a screen about exactly
    /// one call.
    ///
    /// The first build shared `label` across both and rendered the Ledger's terse words on the
    /// receipt, which was drift against an approved artboard for no reason other than component
    /// reuse. Splitting the *words* while keeping the *cases* costs one parameter and keeps the
    /// thing that actually matters — that action and outcome are separate values no code path
    /// can merge — in exactly one place.
    enum Voice { case row, receipt }

    var label: String { label(.row) }

    func label(_ voice: Voice) -> String {
        switch (self, voice) {
        case (.followed, .row): return "Followed"
        case (.followed, .receipt): return "You followed it"
        case (.passed, .row): return "You passed"
        case (.passed, .receipt): return "You passed on it"
        // One register. Nobody knowing what you did is not a fact that reads better as a
        // sentence, and inventing a second phrasing would be two strings to keep true.
        case (.unknown, _): return "Follow-through unknown"
        }
    }

    var provenance: OmenLedgerProvenance? {
        switch self {
        case .followed(let provenance), .passed(let provenance): return provenance
        case .unknown: return nil
        }
    }
}

/// What happened. The four values `moves-history.v2` maps the raw stored column onto.
///
/// There is deliberately no `win` or `loss` here. The raw column is translated by the server and
/// `MovesHistory.outcomeText(for:)` refuses to surface it if an untranslated payload arrives, so
/// there is no type in which a raw token can reach this screen.
enum OmenLedgerOutcome: Equatable {
    case worked
    case didNotWork
    /// There is a result and nobody has verified it. Distinct from `pending`, which is a call
    /// the week has not finished answering yet.
    case notVerified
    case pending

    var label: String { label(.row) }

    /// The same split as `OmenLedgerAction.label(_:)`, for the same reason.
    func label(_ voice: OmenLedgerAction.Voice) -> String {
        switch (self, voice) {
        case (.worked, .row): return "Worked"
        case (.worked, .receipt): return "It worked"
        case (.didNotWork, .row): return "Didn\u{2019}t work"
        case (.didNotWork, .receipt): return "It did not work"
        // "Not verified" and "Outcome pending" are already statements rather than verdicts and
        // read correctly in both places.
        case (.notVerified, _): return "Not verified"
        case (.pending, _): return "Outcome pending"
        }
    }
}

/// One `.lg` row.
struct OmenLedgerCall: Identifiable, Equatable {
    let id: String
    /// `.lgt b` — the call itself. The recommendation IS the row.
    let summary: String
    /// `.lgt em` — "Start / sit", "Waiver", "Trade".
    let callType: String
    let action: OmenLedgerAction
    let outcome: OmenLedgerOutcome
    /// `.rsn` — present only when there is something true to add. The artboard puts it on two
    /// rows out of five and leaves it off the others, which is the pattern rather than an
    /// oversight: a sentence per row would turn a record into an essay.
    var note: String?
}

/// One `.sh` heading and the rows under it — "Week 7 · 1 open", "Weeks 1–6 · 9 closed".
struct OmenLedgerGroup: Identifiable, Equatable {
    var id: String { title }
    let title: String
    /// The trailing count. Server-composed; the screen does not derive "1 open" from the rows,
    /// because the rows are a page of a scoped index and the count is of the whole group.
    let count: String
    let calls: [OmenLedgerCall]
}

/// Everything `Ledger.dc.html` renders.
struct OmenLedgerState: Equatable {
    /// `.top .kick` — "11 calls".
    let kicker: String
    let groups: [OmenLedgerGroup]
    /// The *could not read* class. Named, with a sentence, and never dropped to make room —
    /// `capability-expression-v1.md` singles this class out as the one that must survive
    /// truncation, since it is the only one that costs the reader something.
    var unread: OmenLedgerUnread?
    /// The *read, not used* class, on a screen with no evidence surface. Same place J2 puts it.
    var footnote: OmenDeskFootnote?
}

/// A named capability the screen could not read, and the sentence saying so.
struct OmenLedgerUnread: Equatable {
    let capability: String
    let sentence: String
}

/// How one row of `LedgerDetail`'s evidence block stood at issue time.
///
/// The three classes `capability-expression-v1.md` allows a screen to render. `not_requested` is
/// absent from this enum on purpose: it is the fourth class and the contract says it renders
/// nowhere, so there must be no value that can carry it onto the screen.
enum OmenReceiptEvidenceClass: Equatable {
    /// `state: live`, `used: true` — full prominence, `text-secondary`, and the `Live` chip.
    case used
    /// `state: live`, `used: false` — `text-tertiary`, **no evidence styling and no chip**.
    case readNotUsed
    /// `state: unavailable` or still `pending` at render. Named, plus a sentence saying what was
    /// not read. Never a spinner: the answer has already been given.
    case couldNotRead
}

/// One `.evr` row.
struct OmenReceiptEvidence: Identifiable, Equatable {
    var id: String { key }
    /// `.evr .k` — "Snaps", "Corum", "Game script".
    let key: String
    /// `.evr .v` — the sentence.
    let statement: String
    let kind: OmenReceiptEvidenceClass
}

/// Everything `LedgerDetail.dc.html` renders. An **immutable snapshot**: nothing on this screen
/// is re-read at view time, including the capability list.
struct OmenLedgerReceiptState: Equatable {
    /// `.top .kick` — "Week 4 · Start / sit".
    let kicker: String
    /// `.scope` left — "Issued Tue 3:00 AM", built from `issued_at` **and**
    /// `issued_at_timezone`. See `issuedLabel(issuedAt:timezone:)`.
    let issuedLabel: String
    let callType: String
    let headline: String
    /// **Optional, and nil is the common production case.** `move-detail.v1`'s `snapshot`
    /// carries `recommendation`, `issued_at` and `issued_at_timezone` and nothing else, so the
    /// reasoning line the artboard draws has no source on a real receipt. See
    /// `OmenLedgerReceiptState.from(entry:receipt:)`.
    var reasoning: String?
    /// Same gap. A band taken from the *current* brief would be the worst possible cheat on a
    /// screen whose entire claim is that it shows what was true at issue time.
    var band: OmenConfidenceBand?
    var risk: OmenRiskLevel?
    var riskReason: String?
    /// `.sh` trailing word on "What happened" — "Closed", "Open".
    let status: String
    let action: OmenLedgerAction
    let outcome: OmenLedgerOutcome
    /// `.rsn b` — the one clause that must not be skimmed. "Williams went for 21.4."
    var noteLead: String?
    var note: String?
    let evidence: [OmenReceiptEvidence]
    /// `.note` — "This receipt is frozen as it was issued. Losses stay in the Ledger…"
    let fairnessNote: String
}

extension OmenLedgerReceiptState {
    /// `.scope`'s left-hand label, from `move-detail.v1`'s two fields.
    ///
    /// `CONTRACTS.md` requires both: *"`issued_at` carries `issued_at_timezone`."* The artboard
    /// draws "Issued Tue 3:00 AM" — a wall-clock time, which is only meaningful in a zone.
    ///
    /// **A bare UTC timestamp is not an acceptable fallback.** A receipt issued at Tuesday
    /// 3:00 AM Eastern renders as 07:00 in UTC, and a user checking whether Omen called it
    /// before or after the waiver ran would read that as the wrong day's answer. When the zone
    /// is missing the screen says the zone is missing, which is the true statement.
    static func issuedLabel(issuedAt: String?, timezone: String?) -> String {
        guard let issuedAt, !issuedAt.isEmpty else { return "Issue time not recorded" }
        guard let zone = timezone.flatMap(TimeZone.init(identifier:)) else {
            return "Issue time zone unavailable"
        }
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

// MARK: - Ledger

/// J6, screen one: the record.
///
/// `Ledger.dc.html`, declared a **scroll** in the canvas README. It carries `omenFitProbe`
/// anyway: `screen-journeys-v1.md` asks for the overflow of a declared fit in px, and the
/// cheapest way to know a declared scroll has not quietly become a fit — or grown past what a
/// scroll can excuse — is to measure it too. The number is reported, not asserted.
struct OmenLedgerScreen: View {
    let state: OmenLedgerState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    var onOpenCall: ((OmenLedgerCall) -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                if let unread = state.unread {
                    OmenDeskUnreadSection(capability: unread.capability, sentence: unread.sentence)
                        .padding(.horizontal, OmenSpacing.step16)
                        .padding(.top, OmenSpacing.step12)
                }
                ForEach(state.groups) { group in
                    sectionHeader(group.title, trailing: group.count)
                    ForEach(group.calls) { call in
                        row(call)
                    }
                }
                if let footnote = state.footnote {
                    OmenDeskFootnoteStrip(footnote: footnote)
                        .padding(.top, OmenSpacing.step12)
                }
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .accessibilityIdentifier("j6.ledger")
            .omenFitContent()
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe("j6.fit.ledger")
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
    }

    /// `.top`, plus the E017 controls.
    ///
    /// The artboard draws the account avatar alone in this slot, as 25 of the 30 do. The help
    /// control beside it is the **recorded drift carried forward from J2**, where the founder
    /// resolved E017 as both controls on 2026-09-18. The redraw is still the one J2 flagged and
    /// did not improvise: `_shared.css` defines `.av` and has no vocabulary for a help glyph, so
    /// drawing one means a new class in the shared stylesheet and a re-sync of all 30 artboards.
    /// That is a canvas-system change, not a J6 redraw.
    private var header: some View {
        // `.bottom`, not `.lastTextBaseline` — J2 recorded why: baseline alignment asks SwiftUI
        // to resolve a text baseline for icon buttons that have no text, which collapses their
        // reported frame to the glyph and puts them under the 44pt floor.
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(state.kicker)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("The Ledger")
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

    /// `.sh` — an uppercase label and an uppercase count. No link: the group heading is not a
    /// destination, and `.sh span` is drawn as text on this artboard rather than as `.sh a`.
    private func sectionHeader(_ title: String, trailing: String) -> some View {
        HStack {
            Text(title)
            Spacer(minLength: OmenSpacing.step8)
            Text(trailing)
        }
        .omenTextStyle(OmenTypography.micro)
        .foregroundStyle(OmenColor.textTertiary)
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
        .padding(.bottom, OmenSpacing.step6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title), \(trailing)")
    }

    /// One `.lg`.
    ///
    /// A row is a button only when there is a receipt to open. A row that looks tappable and is
    /// not is the same lie `OmenLeagueSwitcherBar` refuses to tell with its chevron.
    @ViewBuilder private func row(_ call: OmenLedgerCall) -> some View {
        if let onOpenCall {
            Button { onOpenCall(call) } label: { rowBody(call) }
                .buttonStyle(.plain)
                .accessibilityLabel(Self.rowAccessibilityLabel(call))
                .accessibilityHint("Opens the receipt")
        } else {
            rowBody(call)
                .accessibilityElement(children: .combine)
                .accessibilityLabel(Self.rowAccessibilityLabel(call))
        }
    }

    private func rowBody(_ call: OmenLedgerCall) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            // `.lgt` — baseline-aligned, the call against its type.
            HStack(alignment: .firstTextBaseline, spacing: OmenSpacing.step8) {
                Text(call.summary)
                    .omenTextStyle(OmenTypography.name)
                    .foregroundStyle(OmenColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(call.callType)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textTertiary)
                    .lineLimit(1)
            }
            OmenLedgerOutcomeStrip(action: call.action, outcome: call.outcome)
            if let note = call.note {
                Text(note)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        // `.lg` is 10px 16px with a hairline under it. The vertical padding is raised to 12 so
        // the tappable row clears 44pt on its own content — the artboard's 10 leaves a
        // two-line row at 43.6 and `V-CanvasConformance` requires the target, not the type,
        // to grow. Recorded drift: 2pt of vertical padding.
        .padding(.vertical, OmenSpacing.step12)
        .padding(.horizontal, OmenSpacing.step16)
        .frame(maxWidth: .infinity, minHeight: OmenLayout.minTouchTarget, alignment: .leading)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(OmenColor.textPrimary.opacity(0.05))
                .frame(height: 1)
        }
    }

    /// VoiceOver hears the three facts in the order the rule separates them: what you did, who
    /// says so, and what happened.
    static func rowAccessibilityLabel(_ call: OmenLedgerCall) -> String {
        var parts = [call.summary, call.callType, call.action.label]
        if call.action.provenance == .selfReported { parts.append("Self-reported") }
        parts.append(call.outcome.label)
        if let note = call.note { parts.append(note) }
        return parts.joined(separator: ". ")
    }
}

/// `.outcome` — the chip strip.
///
/// **Action first, then provenance, then outcome.** Four of the artboard's five rows are drawn
/// in that order and the fifth puts the outcome first; one row differing from four is a drawing
/// slip rather than a second pattern, so the order is normalised here and the difference is
/// recorded rather than reproduced.
///
/// The separator is `.outcome>span+span::before` — a `·` between chips, drawn `text-tertiary` at
/// regular weight so it never reads as part of either word.
private struct OmenLedgerOutcomeStrip: View {
    let action: OmenLedgerAction
    let outcome: OmenLedgerOutcome
    var voice: OmenLedgerAction.Voice = .row

    var body: some View {
        HStack(spacing: OmenSpacing.step8) {
            chip(action.label(voice), tone: actionTone)
            if action.provenance == .selfReported {
                separator
                // `.o-s` — dotted underline, `text-secondary`. Registry §2.3's provenance
                // carrier, and the one thing on this screen that must never be blended with a
                // verified row.
                Text("Self-reported")
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textSecondary)
                    .underline(true, pattern: .dot)
            }
            separator
            chip(outcome.label(voice), tone: outcomeTone)
            Spacer(minLength: 0)
        }
        .accessibilityHidden(true)
    }

    private var separator: some View {
        Text("\u{00B7}")
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textTertiary)
            .accessibilityHidden(true)
    }

    private enum Tone { case affirmed, muted, pendingItalic }

    /// An unknown follow-through is muted, never affirmed. It is the one that costs the reader
    /// something and it must not read like a result.
    private var actionTone: Tone {
        switch action {
        case .followed: return .affirmed
        case .passed, .unknown: return .muted
        }
    }

    /// `.o-p` is italic and **deliberately not brass**: giving an unresolved call the accent
    /// would read as a result. J2's ledger row made the same choice from the same CSS.
    private var outcomeTone: Tone {
        switch outcome {
        case .worked: return .affirmed
        case .didNotWork, .notVerified: return .muted
        case .pending: return .pendingItalic
        }
    }

    @ViewBuilder private func chip(_ text: String, tone: Tone) -> some View {
        switch tone {
        case .affirmed:
            Text(text)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textPrimary)
        case .muted:
            Text(text)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
        case .pendingItalic:
            Text(text)
                .omenTextStyle(OmenTypography.micro)
                .italic()
                .foregroundStyle(OmenColor.textTertiary)
        }
    }
}

// MARK: - LedgerDetail

/// J6, screen two: one call, in full — including a loss.
///
/// `LedgerDetail.dc.html`, declared a **scroll**. An **immutable snapshot**: every value here
/// was resolved when the call was issued, and nothing on the screen re-reads anything. That is
/// why `capabilities` on `MoveReceipt` is documented as issue-time only — a receipt that
/// refreshed its own evidence would stop being a receipt.
struct OmenLedgerDetailScreen: View {
    let state: OmenLedgerReceiptState
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                scope
                call
                sectionHeader("What happened", trailing: state.status)
                happened
                sectionHeader("The evidence as it stood then", trailing: nil)
                evidence
                note
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .accessibilityIdentifier("j6.ledger-detail")
            .omenFitContent()
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .omenFitProbe("j6.fit.ledger-detail")
        .safeAreaInset(edge: .top, spacing: 0) {
            if let context { context.bar }
        }
        .background(OmenColor.bg)
    }

    private var header: some View {
        HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(state.kicker)
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.accent)
                Text("The receipt")
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

    /// `.scope` — when it was issued, and the promise that it has not changed since.
    private var scope: some View {
        HStack {
            Text(state.issuedLabel)
            Spacer(minLength: OmenSpacing.step8)
            Text("Immutable")
        }
        .omenTextStyle(OmenTypography.micro)
        .foregroundStyle(OmenColor.textTertiary)
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(state.issuedLabel). This receipt is immutable.")
    }

    /// `.call` — the recommendation as it was made.
    private var call: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
            Text(state.callType)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            Text(state.headline)
                .omenTextStyle(OmenTypography.h2)
                .foregroundStyle(OmenColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
            if let reasoning = state.reasoning {
                Text(reasoning)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if state.band != nil || state.risk != nil {
                HStack(spacing: OmenSpacing.step14) {
                    if let band = state.band { OmenConfidenceBandLabel(band: band) }
                    if let risk = state.risk { OmenRiskLabel(level: risk, reason: state.riskReason) }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(OmenSpacing.step14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(LinearGradient(colors: [OmenColor.surface2, OmenColor.surface1], startPoint: .top, endPoint: .bottom))
                .overlay(alignment: .top) {
                    Rectangle().fill(OmenColor.accent.opacity(0.34)).frame(height: 1)
                }
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        )
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step10)
    }

    /// `.card` under "What happened" — the action and the outcome, still separate.
    private var happened: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                OmenLedgerOutcomeStrip(action: state.action, outcome: state.outcome, voice: .receipt)
                if state.noteLead != nil || state.note != nil {
                    // `.rsn b` is `text-primary` and bold — the clause that must not be skimmed.
                    // On the artboard it is "Williams went for 21.4.", the fact that settles it.
                    (Text(state.noteLead ?? "").foregroundColor(OmenColor.textPrimary).bold()
                        + Text(state.noteLead == nil ? "" : " ")
                        + Text(state.note ?? ""))
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            [state.action.label(.receipt),
             state.action.provenance == .selfReported ? "Self-reported" : nil,
             state.outcome.label(.receipt),
             state.noteLead,
             state.note].compactMap { $0 }.joined(separator: ". ")
        )
    }

    /// `.card` of `.evr` rows — the evidence as it stood then, in the three classes.
    private var evidence: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                ForEach(state.evidence) { row in
                    OmenReceiptEvidenceRow(evidence: row)
                }
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
    }

    /// `.note` — the fairness note. The artboard's own words, and they are the point of the
    /// screen: *"Losses stay in the Ledger — a record that only shows wins is marketing."*
    private var note: some View {
        Text(state.fairnessNote)
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textSecondary)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(OmenSpacing.step12)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(OmenColor.surface1)
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)
    }

    @ViewBuilder private func sectionHeader(_ title: String, trailing: String?) -> some View {
        HStack {
            Text(title)
            Spacer(minLength: OmenSpacing.step8)
            if let trailing { Text(trailing) }
        }
        .omenTextStyle(OmenTypography.micro)
        .foregroundStyle(OmenColor.textTertiary)
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.top, OmenSpacing.step12)
        .padding(.bottom, OmenSpacing.step6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel([title, trailing].compactMap { $0 }.joined(separator: ", "))
    }
}

/// One `.evr`.
///
/// The three classes differ by prominence, colour role and wording — never by an icon. The
/// `Live` chip is a **word** (`.ds.live`), which is what `capability-symbols-v1.md` means when
/// it says a capability renders as a word.
private struct OmenReceiptEvidenceRow: View {
    let evidence: OmenReceiptEvidence

    var body: some View {
        HStack(alignment: .top, spacing: OmenSpacing.step10) {
            Text(evidence.key)
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
                .frame(width: 84, alignment: .leading)
            statement
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(evidence.key). \(prefix)\(evidence.statement)")
    }

    @ViewBuilder private var statement: some View {
        switch evidence.kind {
        case .used:
            HStack(alignment: .firstTextBaseline, spacing: OmenSpacing.step8) {
                Text(evidence.statement)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Live")
                    .omenTextStyle(OmenTypography.micro)
                    .foregroundStyle(OmenColor.textPrimary)
                    .padding(.vertical, OmenSpacing.step2)
                    .padding(.horizontal, OmenSpacing.step6)
                    .background(Capsule().fill(OmenColor.surface3))
            }
        case .readNotUsed:
            // Named, de-emphasised, and carrying **no chip**. The chip is evidence styling and
            // `capability-expression-v1.md` acceptance rule 3 forbids it on a `used: false`
            // input — the payload hands you the whole list and this is the easiest claim to
            // overreach on.
            Text(evidence.statement)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
        case .couldNotRead:
            // `.pv-none` — a dashed underline, `text-tertiary`. The artboard's own carrier for
            // "Omen did not read this and is not pretending to."
            Text(evidence.statement)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .underline(true, pattern: .dash)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    /// VoiceOver gets the class in words, because the visual carriers do not survive the
    /// accessibility tree and the class is the part a reader must not miss.
    private var prefix: String {
        switch evidence.kind {
        case .used: return "Read and used. "
        case .readNotUsed: return "Read, not used. "
        case .couldNotRead: return "Could not read. "
        }
    }
}

// MARK: - Binding the receipts to the real reads

extension OmenLedgerState {
    /// Builds the Ledger from the rows `CommandCenterViewModel` already holds.
    ///
    /// **The counts are derived from the rows in hand and say so.** `moves-history.v2` is a
    /// scoped index with a server-side `limit`, so a count composed here is a count of the page,
    /// not of the season. The artboard's "9 closed" is a group total; until the contract carries
    /// one, this renders what is true of what arrived.
    ///
    /// `unread` and `footnote` are passed in rather than inferred. Whether a capability was
    /// unavailable is the server's statement, and a client that inferred it from an empty list
    /// would be manufacturing the gap that `capability-expression-v1.md` forbids inventing.
    static func from(
        entries: [OmenLedgerEntry],
        unread: OmenLedgerUnread? = nil,
        footnote: OmenDeskFootnote? = nil
    ) -> OmenLedgerState {
        var order: [String] = []
        var buckets: [String: [OmenLedgerCall]] = [:]
        for entry in entries {
            if buckets[entry.period] == nil { order.append(entry.period) }
            buckets[entry.period, default: []].append(
                OmenLedgerCall(
                    id: entry.id,
                    summary: entry.summary,
                    callType: entry.callType.capitalized,
                    action: entry.action,
                    outcome: entry.ledgerOutcome,
                    note: nil
                )
            )
        }

        let groups = order.map { period -> OmenLedgerGroup in
            let calls = buckets[period] ?? []
            let open = calls.filter { $0.outcome == .pending }.count
            let closed = calls.count - open
            let count: String
            switch (open, closed) {
            case (0, let c): count = "\(c) closed"
            case (let o, 0): count = "\(o) open"
            case (let o, let c): count = "\(o) open · \(c) closed"
            }
            return OmenLedgerGroup(title: period.capitalized, count: count, calls: calls)
        }

        return OmenLedgerState(
            kicker: entries.count == 1 ? "1 call" : "\(entries.count) calls",
            groups: groups,
            unread: unread,
            footnote: footnote
        )
    }
}

extension OmenLedgerReceiptState {
    /// `move-detail.v1` → the receipt screen.
    ///
    /// ## What this contract does not carry, and is therefore not drawn
    ///
    /// `LedgerDetail.dc.html` draws a confidence band, a risk level and a reasoning sentence
    /// under the headline. **`move-detail.v1` has none of the three.** Its `snapshot` carries
    /// `recommendation`, `issued_at` and `issued_at_timezone`, and nothing else about the call.
    ///
    /// So the production receipt renders thinner than its artboard, and the three fields are
    /// optional in `OmenLedgerReceiptState` rather than filled from somewhere plausible. Taking
    /// the band from the *current* Omen brief would be the obvious cheat and the worst possible
    /// one on this screen: a receipt exists to say what was true at issue time.
    ///
    /// This is a **contract gap**, recorded as a finding rather than papered over.
    static func from(entry: OmenLedgerEntry, receipt: MoveReceipt) -> OmenLedgerReceiptState {
        OmenLedgerReceiptState(
            kicker: "\(entry.period.capitalized) · \(entry.callType.capitalized)",
            issuedLabel: issuedLabel(
                issuedAt: receipt.snapshot.issuedAt,
                timezone: receipt.snapshot.issuedAtTimezone
            ),
            callType: entry.callType.capitalized,
            headline: receipt.snapshot.recommendation ?? entry.summary,
            reasoning: nil,
            band: nil,
            risk: nil,
            riskReason: nil,
            status: entry.ledgerOutcome == .pending ? "Open" : "Closed",
            action: entry.action,
            outcome: entry.ledgerOutcome,
            noteLead: receipt.observedOutcome.known ? receipt.observedOutcome.statement : nil,
            note: receipt.userAction.known ? receipt.userAction.statement : nil,
            evidence: evidence(from: receipt),
            fairnessNote: receipt.fairnessNote
        )
    }

    /// The three presentation classes, from the axis that actually answers them.
    ///
    /// `capabilities` carries `state` and `used` — the two independent axes
    /// `capability-expression-v1.md` is built on — so when it is present it is the only correct
    /// source. `evidence_at_the_time` carries `kind`, which is the input's **role**
    /// (`verified` / `projection` / `model` / `inference` / `limitation`) and is explicitly
    /// independent of availability. Reading a class off `kind` would be the `U1` defect again in
    /// a new place: an icon, or here a treatment, making a claim the field never made.
    ///
    /// With no `capabilities` block the *read, not used* class is **unexpressible**, and that is
    /// stated rather than approximated. A `limitation` row is the one `kind` that does assert
    /// something was not read, so it maps; everything else is rendered as evidence the server
    /// put in the evidence list.
    private static func evidence(from receipt: MoveReceipt) -> [OmenReceiptEvidence] {
        if let capabilities = receipt.capabilities, !capabilities.isEmpty {
            return capabilities.compactMap { capability -> OmenReceiptEvidence? in
                guard let name = capability.name, !name.isEmpty else { return nil }
                let state = capability.state?.lowercased()
                // `not_requested` renders nowhere, on any screen. Rule 2, and the one most
                // likely to be got wrong: a profile only requests what it needs, and printing
                // "we didn't read trade rosters" on a week where trade was never relevant
                // manufactures a gap that does not exist.
                if state == "not_requested" { return nil }
                let kind: OmenReceiptEvidenceClass
                switch (state, capability.used) {
                case ("live", true): kind = .used
                case ("live", _): kind = .readNotUsed
                // `pending` at render resolves to "could not read", never to a spinner.
                default: kind = .couldNotRead
                }
                return OmenReceiptEvidence(
                    key: name.replacingOccurrences(of: "_", with: " ").capitalized,
                    statement: capability.statement ?? "Omen recorded no statement for this input.",
                    kind: kind
                )
            }
        }

        return receipt.evidenceAtTheTime.enumerated().map { index, row in
            OmenReceiptEvidence(
                key: row.kind.replacingOccurrences(of: "_", with: " ").capitalized + (index > 0 ? " \(index + 1)" : ""),
                statement: row.statement,
                kind: row.kind.lowercased() == "limitation" ? .couldNotRead : .used
            )
        }
    }
}
