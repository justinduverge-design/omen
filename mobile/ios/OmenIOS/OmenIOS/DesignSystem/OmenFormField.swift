import SwiftUI

/// Registry §3.1 form wrapper: label plus optional hint, error, or success feedback.
struct OmenFormField<Content: View>: View {
    let label: String
    var hint: String?
    var errorMessage: String?
    var successMessage: String?
    @ViewBuilder let content: Content

    private var feedback: String? { errorMessage ?? successMessage }
    private var feedbackColor: Color { errorMessage == nil ? OmenColor.Data.riskLow : OmenColor.Data.riskHigh }

    init(
        label: String,
        hint: String? = nil,
        errorMessage: String? = nil,
        successMessage: String? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.label = label
        self.hint = hint
        self.errorMessage = errorMessage
        self.successMessage = successMessage
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text(label)
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.textSecondary)
            content
            if let feedback {
                Text(feedback)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(feedbackColor)
                    .accessibilityLabel(errorMessage == nil ? "Success: \(feedback)" : "Error: \(feedback)")
            } else if let hint {
                Text(hint)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
            }
        }
    }
}
