import SwiftUI

/// Registry §3.1 default and interactive ListRow. `action == nil` keeps the row display-only.
struct OmenListRow<Leading: View, Trailing: View>: View {
    let title: String
    let subtitle: String?
    let enabled: Bool
    let action: (() -> Void)?
    let leading: Leading
    let trailing: Trailing

    init(
        title: String,
        subtitle: String? = nil,
        enabled: Bool = true,
        action: (() -> Void)? = nil,
        @ViewBuilder leading: () -> Leading,
        @ViewBuilder trailing: () -> Trailing
    ) {
        self.title = title
        self.subtitle = subtitle
        self.enabled = enabled
        self.action = action
        self.leading = leading()
        self.trailing = trailing()
    }

    private var content: some View {
        VStack(spacing: 0) {
            HStack(spacing: OmenSpacing.step12) {
                leading
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    Text(title).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
                    if let subtitle {
                        Text(subtitle).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
                    }
                }
                Spacer(minLength: OmenSpacing.step8)
                trailing
            }
            .padding(.vertical, OmenSpacing.step12)
            .padding(.horizontal, OmenSpacing.step16)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            Rectangle().fill(OmenColor.borderSubtle).frame(height: 1)
        }
        .background(OmenColor.surface1)
    }

    var body: some View {
        if let action {
            Button(action: action) { content }
                .buttonStyle(.plain)
                .disabled(!enabled)
                .accessibilityHint("Double tap to open")
        } else {
            content
        }
    }
}

extension OmenListRow where Leading == EmptyView, Trailing == EmptyView {
    init(title: String, subtitle: String? = nil, enabled: Bool = true, action: (() -> Void)? = nil) {
        self.init(title: title, subtitle: subtitle, enabled: enabled, action: action, leading: EmptyView.init, trailing: EmptyView.init)
    }
}
