import SwiftUI

/// Registry §3.2 PlatformConnectionCard. Provider identity + current connection state +
/// optional recovery/manage action, all inside a Card. Composes PlatformBadge, the shared
/// OmenConnectionStatus vocabulary, and OmenButton. No provider icons or brand chrome —
/// PlatformBadge already carries brand identity redundantly with its text label.
///
/// `actionLabel == nil` (or `onAction == nil`) renders without a button. `description` is
/// an optional single line of plain-English context under the badges.
///
/// Card tone stays neutral even for Error / NeedsReauth — the status badge carries the
/// urgency and the action button supplies the recovery affordance; painting the whole card
/// red would over-signal for a compact status surface.
struct OmenPlatformConnectionCard: View {
    let platform: OmenPlatform
    let status: OmenConnectionStatus
    let description: String?
    let actionLabel: String?
    let onAction: (() -> Void)?

    init(
        platform: OmenPlatform,
        status: OmenConnectionStatus,
        description: String? = nil,
        actionLabel: String? = nil,
        onAction: (() -> Void)? = nil
    ) {
        self.platform = platform
        self.status = status
        self.description = description
        self.actionLabel = actionLabel
        self.onAction = onAction
    }

    private var buttonVariant: OmenButtonVariant {
        switch status {
        case .needsReauth, .error: return .danger
        default: return .primary
        }
    }

    var body: some View {
        OmenCard(variant: .solid, tone: .neutral) {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                HStack(spacing: OmenSpacing.step8) {
                    OmenPlatformBadge(platform: platform)
                    OmenConnectionStatusBadge(status: status)
                }
                if let description {
                    Text(description)
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                }
                if let actionLabel, let onAction {
                    OmenButton(title: actionLabel, action: onAction, variant: buttonVariant, size: .md)
                }
            }
        }
    }
}

#if DEBUG
#Preview {
    VStack(alignment: .leading, spacing: OmenSpacing.step16) {
        OmenPlatformConnectionCard(
            platform: .sleeper, status: .connected,
            description: "Last synced 4 minutes ago.",
            actionLabel: "Manage league", onAction: {}
        )
        OmenPlatformConnectionCard(
            platform: .yahoo, status: .needsReauth,
            description: "Reconnect to restore this week's roster.",
            actionLabel: "Reconnect Yahoo", onAction: {}
        )
        OmenPlatformConnectionCard(
            platform: .espn, status: .disconnected,
            description: "Connect ESPN to see your live matchup.",
            actionLabel: "Connect ESPN", onAction: {}
        )
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
