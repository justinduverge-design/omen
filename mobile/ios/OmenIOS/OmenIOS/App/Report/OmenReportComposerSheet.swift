import SwiftUI

/// The sheet `OmenReportPill` opens, and the one the Account screen's "Report a problem" row
/// opens. One composer, two doors — `screen-journeys-v1.md` calls both of these chrome,
/// reachable from anywhere, and two composers would be two disclosures to keep true.
///
/// # What this screen tells a user about where their report goes
///
/// This is the part of the build that had to be got right rather than merely finished, so it is
/// written down here in full.
///
/// `POST /api/beta/reports` **exists** and is bound. Its handler inserts into a `beta_reports`
/// table whose SQL is `sql/2026-09-14_beta_reports_review.sql` — **review-only until migration
/// approval** (fact-of-record #8: authoring SQL and applying it are distinct acts). If that
/// migration has not been applied, the insert throws and the route answers
/// `503 report_storage_unavailable`: *"Your report was not saved."*
///
/// A client cannot know which of those two worlds it is in before it sends. So this composer
/// makes **no claim about storage at any point before the send**, and after the send it repeats
/// only what the server said about that one request:
///
///   - Before sending it states what the report *contains* — a list built from the payload
///     itself, so it cannot describe a report the app is not sending — and shows the **server's
///     own** disclosure string from `GET /api/beta/reports/schema`. That sentence is a claim
///     about processing and it belongs to whoever operates the processing. Copying it into the
///     client would mean still saying it after the server stopped.
///   - On `201` it says **"Report received"** and shows the id the server returned. The server
///     issued both; the id is the evidence.
///   - On `503` it says **"Your report was not saved"** and says so as its own state, not as a
///     generic failure. That is the storage gate's actual user-visible shape, and a user who is
///     told a report was not saved can write the problem down somewhere it will survive.
///
/// What this screen never says, in any state: that a report *will be* read, actioned, replied
/// to, or kept. None of those is evidenceable today and the gate is the reason.
struct OmenReportComposerSheet: View {
    enum Phase: Equatable {
        case composing
        case sending
        case done(OmenBetaReportOutcome)
    }

    /// "Report a problem" as a sheet; "Contact support" as the Support page, which opens on Question.
    var title = "Report a problem"
    let screen: OmenBetaReportScreen
    let connectionState: OmenBetaReportConnectionState
    var recentErrorCodes: [String] = []
    let repository: OmenBetaReportRepository
    /// Nil in demo mode and screenshots: Send stays off and says why.
    var accessToken: String?
    var onDismiss: () -> Void

    /// Screenshot scenarios mount the composer in a state. Production starts `.composing`.
    @State var phase: Phase = .composing
    @State var schema: OmenBetaReportSchema?
    @State var topic: OmenBetaReportTopic = .bug
    @State private var note: String = ""
    @State private var disclosureAccepted: Bool = false

    private var report: OmenBetaReport {
        OmenBetaReport(
            screen: screen,
            appVersion: OmenBetaReportDevice.appVersion,
            build: OmenBetaReportDevice.build,
            osVersion: OmenBetaReportDevice.osVersion,
            deviceModel: OmenBetaReportDevice.deviceModel,
            connectionState: connectionState,
            recentErrorCodes: recentErrorCodes,
            message: note,
            disclosureAccepted: disclosureAccepted,
            topic: topic
        )
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                OmenSheetHeader(title: title, closeTitle: phase.isDone ? "Done" : "Cancel", onClose: onDismiss)
                switch phase {
                case .composing, .sending: composer
                case .done(let outcome): result(outcome)
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step20)
            .padding(.bottom, OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.surface1.ignoresSafeArea())
        .accessibilityIdentifier("chrome.report-composer")
        .omenScreenReady("report")
        // Schema first, then POST: the read supplies the disclosure the user accepts.
        .task { if schema == nil { schema = await repository.schema() } }
    }

    @ViewBuilder private var composer: some View {
        Text("A real person reads every one. Replies come to your account email.")
            .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
            .fixedSize(horizontal: false, vertical: true)

        FlowChips(topics: OmenBetaReportTopic.allCases, selected: topic, enabled: phase == .composing) { topic = $0 }

        OmenTextField(value: $note, label: "What happened?", placeholder: "What you did, and what Omen did.", size: .lg, enabled: phase == .composing)

        // The payload itemised from the struct that gets encoded, so this sentence and the request cannot disagree.
        Text("Sent with it: " + report.disclosedLines.map { "\($0.field.lowercased()) \($0.value)" }.joined(separator: ", ") + ".")
            .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityIdentifier("chrome.report-composer.disclosed-fields")
        if let schema {
            Text(schema.disclosure)
                .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("chrome.report-composer.disclosure")
            if !schema.screenshotsSupported {
                Text("Screenshots can\u{2019}t be attached. Describe what you saw instead.")
                    .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
            }
        }

        OmenPressable(action: { disclosureAccepted.toggle() }) {
            HStack(spacing: OmenSpacing.step10) {
                Image(systemName: disclosureAccepted ? "checkmark.square.fill" : "square")
                    .font(.system(size: 20)).foregroundStyle(disclosureAccepted ? OmenColor.accentHover : OmenColor.textTertiary)
                Text("I understand what this sends").omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .disabled(phase != .composing)
        .accessibilityIdentifier("chrome.report-composer.accept")
        .accessibilityAddTraits(disclosureAccepted ? .isSelected : [])

        OmenButton(
            title: "Send",
            action: { Task { await send() } },
            variant: .primary,
            size: .lg,
            // The server requires disclosure_accepted, so an unaccepted report is not a report.
            enabled: accessToken != nil && report.isSendable && phase == .composing,
            loading: phase == .sending,
            fullWidth: true
        )
        .accessibilityIdentifier("chrome.report-composer.send")
        if accessToken == nil {
            Text("Sign in to send a report.").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
        }
    }

    @ViewBuilder private func result(_ outcome: OmenBetaReportOutcome) -> some View {
        switch outcome {
        case .received(let id):
            // The server's word and the id it issued; no promise about when it is read.
            OmenStateBlock(
                kind: .hold,
                title: "Received",
                message: "A person reads every report. Any reply comes to your account email." + (id.isEmpty ? "" : " Reference \(id).")
            )
        case .notSaved:
            OmenStateBlock(
                kind: .failed,
                title: "Your report was not saved",
                message: "Omen could not store it, so nothing was kept. Nothing about your league left the device. Write down what happened if you want to send it again later."
            )
        case .rejected(let message), .failed(let message):
            OmenStateBlock(kind: .failed, title: "Not sent", message: message)
        }
    }

    private func send() async {
        guard let accessToken else { return }
        phase = .sending
        phase = .done(await repository.send(report, accessToken: accessToken))
    }
}

private extension OmenReportComposerSheet.Phase {
    var isDone: Bool { if case .done = self { true } else { false } }
}

/// The four topics as capsules that wrap onto a second line.
private struct FlowChips: View {
    let topics: [OmenBetaReportTopic]
    let selected: OmenBetaReportTopic
    let enabled: Bool
    let onSelect: (OmenBetaReportTopic) -> Void

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: OmenSpacing.step8) { chips(topics) }
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                HStack(spacing: OmenSpacing.step8) { chips(Array(topics.prefix(2))) }
                HStack(spacing: OmenSpacing.step8) { chips(Array(topics.dropFirst(2))) }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("About")
    }

    private func chips(_ list: [OmenBetaReportTopic]) -> some View {
        ForEach(list) { topic in
            let on = topic == selected
            OmenPressable(action: { onSelect(topic) }) {
                Text(topic.title)
                    .omenTextStyle(OmenTypography.cardLead)
                    .foregroundStyle(on ? OmenColor.textOnAccent : OmenColor.textSecondary)
                    .padding(.horizontal, OmenSpacing.step14)
                    .frame(minHeight: 44)
                    .background(on ? OmenColor.accent : OmenColor.surface2, in: Capsule())
                    .fixedSize()
            }
            .disabled(!enabled)
            .accessibilityAddTraits(on ? .isSelected : [])
        }
    }
}
