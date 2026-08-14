import SwiftUI

/// State for one row of the Command Center platforms compact strip.
///
/// Contract: `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`
/// → "Command Center Platforms Compact Strip — client state contract".
/// Figma: node `73:2` (`APPROVED COMPOSITION — Justin, 2026-08-01`).
///
/// `lastSyncText` arrives **pre-formatted** from the caller. The client deliberately does not
/// compute relative time, so a screen left open cannot silently age into a wrong claim.
struct OmenPlatformRowState: Identifiable, Equatable {
    let platform: OmenPlatform
    let status: OmenConnectionStatus
    let lastSyncText: String?

    init(platform: OmenPlatform, status: OmenConnectionStatus, lastSyncText: String? = nil) {
        self.platform = platform
        self.status = status
        self.lastSyncText = lastSyncText
    }

    var id: String { String(describing: platform) }

    /// Last sync renders for `connected` only. Showing "4m ago" beside "Reauth needed" would read
    /// as "working, recently" — the design house forbids status that hides.
    var resolvedLastSyncText: String? {
        guard status == .connected else { return nil }
        return lastSyncText
    }

    var isConnected: Bool { status == .connected }

    /// One row is one accessible element: platform, status, and last sync as a single label.
    var accessibilityLabel: String {
        var parts = [platformName, omenConnectionStatusLabel(status)]
        if let sync = resolvedLastSyncText { parts.append("last sync \(sync)") }
        return parts.joined(separator: ", ")
    }

    var platformName: String {
        switch platform {
        case .sleeper: return "Sleeper"
        case .yahoo: return "Yahoo"
        case .espn: return "ESPN"
        }
    }
}

/// Registry-composed single-line platform row. Connected rows are a whole-row button carrying a
/// trailing chevron into the detail sheet; disconnected rows expose an inline Connect action.
///
/// Deliberately not a `PlatformConnectionCard` variant: the card's full content is not deleted,
/// it moves into the tap-through detail sheet. This row is the surface, the card is the detail.
struct OmenPlatformCompactRow: View {
    let state: OmenPlatformRowState
    let onOpenDetail: () -> Void
    let onConnect: (() -> Void)?

    init(
        state: OmenPlatformRowState,
        onOpenDetail: @escaping () -> Void,
        onConnect: (() -> Void)? = nil
    ) {
        self.state = state
        self.onOpenDetail = onOpenDetail
        self.onConnect = onConnect
    }

    var body: some View {
        if state.isConnected {
            Button(action: onOpenDetail) { rowContent }
                .buttonStyle(.plain)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(state.accessibilityLabel)
                .accessibilityHint("Opens platform details")
                .accessibilityAddTraits(.isButton)
        } else {
            rowContent
                .accessibilityElement(children: .contain)
        }
    }

    private var rowContent: some View {
        HStack(spacing: OmenSpacing.step8) {
            OmenPlatformBadge(platform: state.platform)

            Text(state.platformName)
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.textPrimary)
                .lineLimit(1)

            Text("·")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .accessibilityHidden(true)

            // Text carries the status; the tone only reinforces it.
            Text(omenConnectionStatusLabel(state.status))
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .lineLimit(1)

            if let sync = state.resolvedLastSyncText {
                Text("·")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .accessibilityHidden(true)
                Text(sync)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .lineLimit(1)
            }

            Spacer(minLength: OmenSpacing.step8)

            trailingAffordance
        }
        .padding(.horizontal, OmenSpacing.step12)
        .frame(minHeight: OmenLayout.minTouchTarget)
        .background(OmenColor.surface1)
    }

    @ViewBuilder
    private var trailingAffordance: some View {
        if state.isConnected {
            Image(systemName: "chevron.right")
                .foregroundStyle(OmenColor.accent)
                .accessibilityHidden(true)
        } else if let onConnect {
            OmenButton(title: "Connect", action: onConnect, variant: .secondary, size: .sm)
        }
    }
}

/// The strip itself. Fixed provider order — a strip that reorders as connections change is a
/// moving target for muscle memory and for accessibility focus order.
struct OmenPlatformCompactStrip: View {
    let rows: [OmenPlatformRowState]
    let onOpenDetail: (OmenPlatformRowState) -> Void
    let onConnect: ((OmenPlatformRowState) -> Void)?

    init(
        rows: [OmenPlatformRowState],
        onOpenDetail: @escaping (OmenPlatformRowState) -> Void,
        onConnect: ((OmenPlatformRowState) -> Void)? = nil
    ) {
        self.rows = rows
        self.onOpenDetail = onOpenDetail
        self.onConnect = onConnect
    }

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                if index > 0 {
                    Rectangle()
                        .fill(OmenColor.border)
                        .frame(height: 1)
                        .accessibilityHidden(true)
                }
                OmenPlatformCompactRow(
                    state: row,
                    onOpenDetail: { onOpenDetail(row) },
                    onConnect: onConnect.map { handler in { handler(row) } }
                )
            }
        }
        .background(OmenColor.surface1)
        .clipShape(RoundedRectangle(cornerRadius: OmenSpacing.step12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: OmenSpacing.step12, style: .continuous)
                .stroke(OmenColor.border, lineWidth: 1)
        )
    }
}

#if DEBUG
#Preview {
    VStack(spacing: OmenSpacing.step24) {
        OmenPlatformCompactStrip(
            rows: [
                OmenPlatformRowState(platform: .sleeper, status: .connected, lastSyncText: "4m ago"),
                OmenPlatformRowState(platform: .yahoo, status: .disconnected),
                OmenPlatformRowState(platform: .espn, status: .needsReauth, lastSyncText: "2h ago"),
            ],
            onOpenDetail: { _ in },
            onConnect: { _ in }
        )
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
