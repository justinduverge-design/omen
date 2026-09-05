import SwiftUI

/// Six one-time-code boxes with a real text field invisible on top of them.
///
/// Moved out of `SignInView.swift`. This is the one violation
/// `PrimitiveEnforcementTests` flagged that could NOT simply become an existing primitive:
/// the `TextField` here is deliberately invisible — `.foregroundStyle(.clear)`,
/// `.tint(.clear)`, `.opacity(0.02)` — because the boxes below it are drawn by hand and it
/// exists only to capture keystrokes, one-time-code autofill and the system keyboard.
/// Swapping it for `OmenTextField` would draw a second, visible field over the boxes and
/// break the screen.
///
/// It is not an exception to the rule, though — it is a primitive that was in the wrong
/// folder. The earlier plan was to allowlist `SignInView.swift` for this one line, which
/// would also have blanket-exempted a 541-line file and hidden every future violation in it.
/// Moving it keeps the allowlist empty, which is the only state in which it stays honest.
///
/// `opacity(0.02)` rather than `0`: a fully transparent field is treated as hidden by the
/// system and stops receiving focus and autofill. Do not "clean this up" to zero.
struct OmenOtpCodeField: View {
    @Binding var code: String
    var digits: Int = 6
    var enabled = true

    /// Normalisation lives here so the field cannot hold something it will not display.
    /// `OtpCodeValidator` is `Core/`, not `App/`, so depending on it does not point this
    /// layer at feature code.
    private var normalized: String {
        String(OtpCodeValidator.normalize(code).prefix(digits))
    }

    private func digit(at index: Int) -> String {
        let value = normalized
        guard index < value.count else { return "" }
        return String(value[value.index(value.startIndex, offsetBy: index)])
    }

    var body: some View {
        ZStack {
            HStack(spacing: OmenSpacing.step8) {
                ForEach(0..<digits, id: \.self) { index in
                    let digit = digit(at: index)
                    Text(digit)
                        .omenTextStyle(OmenTypography.h2)
                        .foregroundStyle(OmenColor.textPrimary)
                        .frame(maxWidth: .infinity, minHeight: 60)
                        .background(digit.isEmpty ? OmenColor.surface1 : OmenColor.accentMuted)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(digit.isEmpty ? OmenColor.border : OmenColor.accent, lineWidth: 1)
                        )
                }
            }
            // The boxes are decoration; the field below carries the label and the value.
            .accessibilityHidden(true)

            TextField(
                "\(digits)-digit code",
                text: Binding(
                    get: { code },
                    set: { code = String(OtpCodeValidator.normalize($0).prefix(digits)) }
                )
            )
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .foregroundStyle(.clear)
            .tint(.clear)
            .opacity(0.02)
            .frame(height: 60)
            .disabled(!enabled)
            .accessibilityLabel("\(digits)-digit code")
        }
    }
}
