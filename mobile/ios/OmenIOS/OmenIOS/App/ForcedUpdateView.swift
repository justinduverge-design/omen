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

    var body: some View {
        VStack {
            Spacer()
            OmenCard(variant: .outlined, tone: .risk) {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    Text("Update required")
                        .omenTextStyle(OmenTypography.h2)
                        .foregroundStyle(OmenColor.textPrimary)
                    Text("This version of Omen is no longer supported. Update to at least version \(minimumVersion) to keep using the app.")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                    if storeURL != nil {
                        OmenButton(
                            title: "Update now",
                            action: onUpdate,
                            variant: .primary,
                            size: .lg
                        )
                    } else {
                        Text("Update Omen from the App Store to continue.")
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                }
            }
            .padding(OmenSpacing.step24)
            Spacer()
        }
        // Explicit brand background. Without it this screen inherits the system default
        // (pure black/white), which is close enough to `OmenColor.bg` to pass a code read
        // and visibly wrong on device. Every other full-screen composition sets this.
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(OmenColor.bg)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
    }
}
