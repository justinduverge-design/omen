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
///
/// Hit area: `.frame(height: 60)` centres the field inside a 60pt box but does NOT grow what
/// touch can reach — the live region stays the field's natural ~25pt line height, so taps on
/// the top and bottom thirds of the drawn boxes landed on nothing and the keyboard never came
/// up. `.contentShape(Rectangle())` after the frame is what actually makes all 60pt tappable,
/// and the ZStack carries its own shape + tap so a miss anywhere over the boxes still focuses.
/// Removing either one silently returns the field to a thin unreachable strip.
struct OmenOtpCodeField: View {
    @Binding var code: String
    var digits: Int = 6
    var enabled = true

    @FocusState private var focused: Bool

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
            .focused($focused)
            .foregroundStyle(.clear)
            .tint(.clear)
            .opacity(0.02)
            .frame(maxWidth: .infinity, minHeight: 60)
            .contentShape(Rectangle())
            .disabled(!enabled)
            .accessibilityLabel("\(digits)-digit code")
        }
        // A tap that misses the field itself still belongs to the code entry.
        .contentShape(Rectangle())
        .onTapGesture { focused = enabled }
        // The code screen exists only to take a code, so it opens with the caret already in
        // it. The hop to the next runloop is required: setting @FocusState during the same
        // transition that inserts this view into the ScrollView is dropped by SwiftUI.
        .task {
            guard enabled else { return }
            try? await Task.sleep(nanoseconds: 350_000_000)
            focused = true
        }
    }
}
