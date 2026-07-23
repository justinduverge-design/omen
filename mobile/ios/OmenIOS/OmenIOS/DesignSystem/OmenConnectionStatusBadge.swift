import SwiftUI

/// Union of the connection states named in registry §3.2 for ConnectionStatusBadge
/// (connected/disconnected/reauth/recovery) and PlatformConnectionCard (adds error/pending).
/// One enum keeps native clients from inventing a second status vocabulary. The text label
/// lives on the badge so meaning survives grayscale (registry §1, §4).
enum OmenConnectionStatus { case connected, disconnected, needsReauth, error, pending, recovering }

extension OmenConnectionStatus {
    fileprivate var badgeTone: OmenBadgeTone {
        switch self {
        case .connected: return .success
        case .disconnected: return .neutral
        case .needsReauth, .error: return .risk
        case .pending, .recovering: return .stub
        }
    }

    fileprivate var label: String {
        switch self {
        case .connected: return "Connected"
        case .disconnected: return "Disconnected"
        case .needsReauth: return "Reauth needed"
        case .error: return "Error"
        case .pending: return "Pending"
        case .recovering: return "Recovering"
        }
    }
}

/// Registry §3.2 ConnectionStatusBadge. Renders the current connection state as a labeled
/// badge. Callers must not derive their own status text — the enum is the label source.
struct OmenConnectionStatusBadge: View {
    let status: OmenConnectionStatus

    var body: some View {
        OmenBadge(label: status.label, tone: status.badgeTone)
    }
}

/// Exposed for PlatformConnectionCard and equivalent higher-level compositions that need to
/// query the settled badge label without re-declaring the switch.
func omenConnectionStatusLabel(_ status: OmenConnectionStatus) -> String { status.label }

#if DEBUG
#Preview {
    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
        OmenConnectionStatusBadge(status: .connected)
        OmenConnectionStatusBadge(status: .disconnected)
        OmenConnectionStatusBadge(status: .needsReauth)
        OmenConnectionStatusBadge(status: .error)
        OmenConnectionStatusBadge(status: .pending)
        OmenConnectionStatusBadge(status: .recovering)
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
