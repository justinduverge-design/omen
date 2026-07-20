import SwiftUI

/// Registry §3.1 text/email/number/password variants.
enum OmenTextFieldVariant { case text, email, number, password }

enum OmenFieldSize { case sm, md, lg }

/// Foundation text input backed by SwiftUI `TextField` / `SecureField` (registry §3.1).
/// Validation copy belongs in `OmenFormField`; `isError` conveys the matching native state.
struct OmenTextField: View {
    @Binding var value: String
    let label: String
    var placeholder: String?
    var variant: OmenTextFieldVariant = .text
    var size: OmenFieldSize = .md
    var enabled: Bool = true
    var isError: Bool = false

    @FocusState private var isFocused: Bool

    private var height: CGFloat {
        switch size {
        case .sm: return OmenLayout.minTouchTarget
        case .md: return 52
        case .lg: return 60
        }
    }

    private var keyboardType: UIKeyboardType {
        switch variant {
        case .text, .password: return .default
        case .email: return .emailAddress
        case .number: return .numberPad
        }
    }

    var body: some View {
        input
            .omenTextStyle(OmenTypography.body)
            .foregroundStyle(enabled ? OmenColor.textPrimary : OmenColor.textTertiary)
            .keyboardType(keyboardType)
            .textInputAutocapitalization(variant == .email ? .never : .sentences)
            .autocorrectionDisabled(variant == .email || variant == .password)
            .padding(.horizontal, OmenSpacing.step12)
            .frame(minHeight: height)
            .background(OmenColor.surface1)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isError ? OmenColor.Data.riskHigh : OmenColor.border, lineWidth: 1)
            )
            .focused($isFocused)
            .omenFocusRing(isFocused: isFocused, cornerRadius: 8)
            .disabled(!enabled)
            .accessibilityLabel(label)
            .accessibilityValue(isError ? "Error" : "")
    }

    @ViewBuilder
    private var input: some View {
        if variant == .password {
            SecureField(placeholder ?? label, text: $value)
        } else {
            TextField(placeholder ?? label, text: $value)
        }
    }
}
