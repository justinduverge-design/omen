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

    /// Everything the sheet needs that it must not read for itself. The screen a user is
    /// reporting on and their provider state belong to the caller — a composer that resolved
    /// its own "current screen" would name the composer.
    let screen: OmenBetaReportScreen
    let connectionState: OmenBetaReportConnectionState
    var recentErrorCodes: [String] = []
    let repository: OmenBetaReportRepository
    /// Nil in demo mode and in screenshot scenarios, where there is no session. The send button
    /// is disabled and says why rather than failing on tap.
    var accessToken: String?
    var onDismiss: () -> Void

    /// Screenshot scenarios mount the sheet directly in a state. Production starts `.composing`.
    @State var phase: Phase = .composing
    @State var schema: OmenBetaReportSchema?
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
            disclosureAccepted: disclosureAccepted
        )
    }

    var body: some View {
        OmenModalSheet(title: "Report a problem") {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                switch phase {
                case .composing, .sending:
                    composer
                case .done(let outcome):
                    result(outcome)
                }
            }
        }
        .accessibilityIdentifier("chrome.report-composer")
        .task {
            // `CONTRACTS.md`: schema first, then POST. The read is what supplies the disclosure
            // the user accepts, so it is not an optimisation that can be skipped.
            if schema == nil { schema = await repository.schema() }
        }
    }

    // MARK: - Composing

    @ViewBuilder private var composer: some View {
        Text("Omen sends the facts below and nothing else. It never sends your league, your roster, a screenshot, or anything you signed in with.")
            .omenTextStyle(OmenTypography.body)
            .foregroundStyle(OmenColor.textSecondary)
            .fixedSize(horizontal: false, vertical: true)

        OmenFormField(label: "What happened?") {
            OmenTextField(
                value: $note,
                label: "What happened?",
                placeholder: "What you did, and what Omen did.",
                size: .lg,
                enabled: phase == .composing
            )
        }

        disclosedFields

        if let schema {
            // The server's sentence, rendered as the server's sentence. It is above the accept
            // control because consent to a disclosure you scroll past afterwards is not consent.
            Text(schema.disclosure)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("chrome.report-composer.disclosure")

            if !schema.screenshotsSupported {
                // Stated, not silently absent. "Attach a screenshot" is the first thing a beta
                // tester looks for, and its absence reads as a missing feature rather than a
                // deliberate one. `beta-report.v1` says `screenshots_supported: false` and the
                // server rejects attachments outright.
                Text("Screenshots can\u{2019}t be attached. Describe what you saw instead.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }

        OmenCanvasTextAction(
            title: disclosureAccepted ? "\u{2713}  I understand what this sends" : "I understand what this sends",
            action: { disclosureAccepted.toggle() },
            color: disclosureAccepted ? OmenColor.accent : OmenColor.textSecondary,
            enabled: phase == .composing
        )
        .accessibilityIdentifier("chrome.report-composer.accept")
        .accessibilityAddTraits(disclosureAccepted ? .isSelected : [])

        OmenButton(
            title: "Send report",
            action: { Task { await send() } },
            variant: .primary,
            size: .lg,
            // `disclosure_accepted: true` is a server requirement, so an unaccepted report is
            // not a report. Disabled rather than hidden: the user should be able to see what
            // they have not done yet.
            enabled: accessToken != nil && report.isSendable && phase == .composing,
            loading: phase == .sending
        )
        .accessibilityIdentifier("chrome.report-composer.send")

        if accessToken == nil {
            Text("Sign in to send a report.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
        }

        OmenButton(title: "Cancel", action: onDismiss, variant: .link, size: .sm)
    }

    /// The payload, itemised. Rendered from `report.disclosedLines`, which is derived from the
    /// struct that gets encoded — so this list and the request cannot disagree.
    private var disclosedFields: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text("What this sends")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.textTertiary)
            ForEach(report.disclosedLines, id: \.field) { line in
                HStack(alignment: .firstTextBaseline, spacing: OmenSpacing.step8) {
                    Text(line.field)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textTertiary)
                        .frame(width: 128, alignment: .leading)
                    Text(line.value)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .padding(OmenSpacing.step12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(OmenColor.surface2)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .accessibilityIdentifier("chrome.report-composer.disclosed-fields")
    }

    // MARK: - Result

    @ViewBuilder private func result(_ outcome: OmenBetaReportOutcome) -> some View {
        switch outcome {
        case .received(let id):
            // Not an `OmenStateSurface`: its kinds are `empty / loading / error / disconnected
            // / stale / mock` and none of them is "this worked". Inventing a `success` kind to
            // reuse the component would put a seventh state into a primitive for one call site.
            OmenCard(variant: .outlined, tone: .omen) {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text("Report received")
                        .omenTextStyle(OmenTypography.h3)
                        .foregroundStyle(OmenColor.textPrimary)
                    // The server's own word, and the id it issued. No promise about what
                    // happens next: `beta-report.v1` says a report was received and says
                    // nothing about it being read, and neither does this.
                    Text(id.isEmpty ? "Omen has your report." : "Omen has your report. Reference \(id).")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        case .notSaved:
            OmenStateSurface(
                kind: .error,
                title: "Your report was not saved",
                // The storage gate, in the only words that are true: nothing was kept. The
                // advice is the useful half — a user told this can put the detail somewhere
                // that survives, which is exactly what they cannot do if we say "sent".
                message: "Omen could not store it, so nothing was kept. Nothing about your league left the device. Write down what happened if you want to send it again later."
            )
        case .rejected(let message), .failed(let message):
            OmenStateSurface(kind: .error, title: "Not sent", message: message)
        }
        OmenButton(title: "Done", action: onDismiss, variant: .secondary, size: .lg)
    }

    private func send() async {
        guard let accessToken else { return }
        phase = .sending
        phase = .done(await repository.send(report, accessToken: accessToken))
    }
}
