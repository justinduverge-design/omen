import SwiftUI

/// The "Save a passkey?" offer, in the system sheet's own chrome.
///
/// Walk-1 P1-7 / founder note: the previous version wrapped its content in `OmenModalSheet`
/// (a custom frame with its own title bar and borders) at a fixed `.medium` detent, which cut
/// the body copy off mid-sentence ("...without waiting for an..."). This one uses a
/// `NavigationStack` for the standard sheet title, scrolls if Dynamic Type needs more room, and
/// offers `.large` so nothing is ever clipped.
struct PasskeyOfferSheet: View {
    let isRegistering: Bool
    let errorMessage: String?
    let onSave: () -> Void
    let onNotNow: () -> Void

    static let title = "Save a passkey?"
    static let offerCopy = "Use Face ID to sign in next time, without waiting for an email code."

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    Text(Self.offerCopy)
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    OmenButton(
                        title: "Save passkey",
                        action: onSave,
                        variant: .primary,
                        size: .lg,
                        loading: isRegistering
                    )
                    OmenButton(
                        title: "Not now",
                        action: onNotNow,
                        variant: .secondary,
                        size: .lg
                    )
                    if let errorMessage {
                        Text(errorMessage)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.Data.riskHigh)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(OmenSpacing.step24)
            }
            .background(OmenColor.bg)
            .navigationTitle(Self.title)
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}
