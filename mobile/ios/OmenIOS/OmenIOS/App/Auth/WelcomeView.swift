import SwiftUI

struct WelcomeView: View {
    let demoModeEnabled: Bool
    let onTryDemo: () -> Void
    let onGetStarted: () -> Void

    var body: some View {
        VStack(spacing: OmenSpacing.step24) {
            Spacer()
            VStack(spacing: OmenSpacing.step8) {
                Text("Welcome to Omen")
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)
                Text("See the move before the league does.")
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                    .multilineTextAlignment(.center)
            }
            Spacer()
            VStack(spacing: OmenSpacing.step12) {
                OmenButton(title: "Get started", action: onGetStarted, variant: .primary, tone: .accent, size: .lg)
                if demoModeEnabled {
                    OmenButton(title: "Try Demo", action: onTryDemo, variant: .secondary, tone: .accent, size: .lg)
                }
            }
        }
        .padding(OmenSpacing.step24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(OmenColor.bg)
    }
}
