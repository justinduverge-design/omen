import SwiftUI

/// O7 — full-screen block shown when the server reports this build is below the minimum
/// supported version. Unlike `OmenStateSurface`, this is interactive: it must offer the way
/// out (the store listing), not just describe the state.
struct ForcedUpdateView: View {
    let minimumVersion: String
    /// Nil until the App Store listing exists. When nil the button is **not drawn** — an
    /// affordance that silently does nothing is worse than none, and this screen blocks the
    /// whole shell, so the user has no other route to discover it was a dead end.
    var storeURL: URL?
    let onUpdate: () -> Void

    var currentVersion: String = OmenAccountState.appVersion.replacingOccurrences(of: "Omen ", with: "")

    var body: some View {
        GeometryReader { proxy in
            ScrollView(showsIndicators: false) {
                content.frame(minHeight: proxy.size.height)
            }
        }
        .background(OmenColor.bg.ignoresSafeArea())
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
        .omenScreenReady("forced-update")
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            Spacer()
            Text("OMEN").omenTextStyle(OmenTypography.cardLead).tracking(4.8).foregroundStyle(OmenColor.accentHover)
                .accessibilityHidden(true)
            Text("Update Omen to keep going").omenTextStyle(OmenTypography.h1).foregroundStyle(OmenColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
            Text("This version can no longer read your leagues correctly. The update takes a minute, and your leagues and Ledger are kept.")
                .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            Spacer()
            if storeURL != nil {
                OmenButton(title: "Update in the App Store", action: onUpdate, variant: .primary, size: .lg, fullWidth: true)
            } else {
                Text("Update Omen from the App Store to continue.").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text("You have \(currentVersion). Omen needs \(minimumVersion) or later.")
                .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, OmenSpacing.step24)
        .padding(.bottom, OmenSpacing.step24)
        .frame(maxWidth: .infinity)
    }
}
