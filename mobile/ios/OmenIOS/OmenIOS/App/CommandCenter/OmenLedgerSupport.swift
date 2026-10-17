import SwiftUI

/// Fetches a frozen `move-detail.v1` receipt and renders the current Ledger detail screen.
/// This support belongs to the live J6 route, independent of the retired Command composition.
struct LedgerReceiptView: View {
    let entry: OmenLedgerEntry
    let load: ((String) async -> Result<MoveReceipt, OmenApiError>)?
    var onOpenAccount: (() -> Void)?
    @State private var result: Result<MoveReceipt, OmenApiError>?

    var body: some View {
        Group {
            switch result {
            case .success(let receipt):
                OmenLedgerDetailScreen(
                    state: OmenLedgerReceiptState.from(entry: entry, receipt: receipt),
                    onOpenAccount: onOpenAccount
                )
            case .failure:
                surface(OmenStateSurface(
                    kind: .error,
                    title: "The receipt didn\u{2019}t load",
                    message: "The recorded evidence is unavailable. Return to the Ledger and try again."
                ))
            case nil:
                surface(OmenStateSurface(
                    kind: .loading,
                    title: "Reading the receipt",
                    message: "Loading the evidence recorded at issue time."
                ))
            }
        }
        .background(OmenColor.bg)
        .task(id: entry.id) { result = nil; result = await load?(entry.id) ?? .failure(.network) }
    }

    private func surface<Content: View>(_ content: Content) -> some View {
        ScrollView {
            content
                .foregroundStyle(OmenColor.textPrimary)
                .padding(OmenSpacing.step16)
        }
    }
}

/// Structured Ledger identity shared by Moves History, the current Command desk, and J6.
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

    init(
        id: String,
        period: String,
        callType: String,
        summary: String,
        outcome: String,
        actionStatus: String? = nil,
        outcomeProvenance: String? = nil,
        action: OmenLedgerAction = .unknown,
        ledgerOutcome: OmenLedgerOutcome = .pending
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
    }

    var accessibilityLabel: String {
        [period, callType, summary, outcome, actionStatus].compactMap { $0 }.joined(separator: ", ")
    }
}

/// Shared system-sheet container for focused Command and Ledger detail.
struct CommandCenterDetailSheet<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                    content()
                }
                .padding(OmenSpacing.step16)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(OmenColor.bg.ignoresSafeArea())
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
    }
}
