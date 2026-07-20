import SwiftUI

enum OmenPickerStyle { case inline, menu }

/// Registry §3.1 picker/select foundation using SwiftUI's native `Picker` expression.
struct OmenPicker: View {
    let label: String
    @Binding var selectedOption: String
    let options: [String]
    var style: OmenPickerStyle = .menu
    var enabled: Bool = true
    var isError: Bool = false

    @FocusState private var isFocused: Bool

    var body: some View {
        Group {
            if style == .menu {
                picker.pickerStyle(.menu)
            } else {
                picker.pickerStyle(.inline)
            }
        }
        .omenTextStyle(OmenTypography.body)
        .foregroundStyle(enabled ? OmenColor.textPrimary : OmenColor.textTertiary)
        .padding(.horizontal, OmenSpacing.step12)
        .frame(minHeight: OmenLayout.minTouchTarget, alignment: .leading)
        .background(OmenColor.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isError ? OmenColor.Data.riskHigh : OmenColor.border, lineWidth: 1)
        )
        .focused($isFocused)
        .omenFocusRing(isFocused: isFocused, cornerRadius: 8)
        .disabled(!enabled)
        .accessibilityValue(isError ? "Error" : selectedOption)
    }

    private var picker: some View {
        Picker(label, selection: $selectedOption) {
            ForEach(options, id: \.self) { option in
                Text(option).tag(option)
            }
        }
    }
}
