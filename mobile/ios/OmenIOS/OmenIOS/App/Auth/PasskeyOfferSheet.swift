import SwiftUI

/// The passkey offer (frame: SystemSheets), in the system sheet with the app's surface.
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

    static let title = "Sign in with Face ID next time"
    static let offerCopy = "Save a passkey on this iPhone. No code to wait for, nothing to remember."

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                Image(systemName: "faceid").font(.system(size: 40, weight: .regular)).foregroundStyle(OmenColor.accentHover)
                    .accessibilityHidden(true)
                Text(Self.title).omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                Text(Self.offerCopy).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                OmenButton(title: "Save a passkey", action: onSave, variant: .primary, size: .lg, loading: isRegistering, fullWidth: true)
                OmenButton(title: "Not now", action: onNotNow, variant: .secondary, size: .lg, fullWidth: true)
                if let errorMessage {
                    Text(errorMessage).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.Data.riskMedium)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
        }
        .background(OmenColor.surface1.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .omenScreenReady("passkey-offer")
    }
}
