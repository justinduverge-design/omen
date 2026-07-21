import SwiftUI

/// Registry §3.1 ConfirmationDialog variant. Destructive routes the confirm button through
/// the SwiftUI `.destructive` role so the system renders it as danger; the label still
/// carries the meaning (registry §4; facts-of-record #7).
enum OmenConfirmationVariant { case `default`, destructive }

/// SwiftUI matches the registry §3.1 spec: `.confirmationDialog(...)` is the platform
/// primitive. This modifier keeps every caller on the same tokens/roles.
///
/// Not a login/OTP flow, not a multi-option sheet — for those, see [OmenModalSheet]. Cancel
/// gets an implicit `.cancel`-role button so system a11y and outside-touch dismissal work
/// unchanged.
extension View {
    func omenConfirmationDialog(
        title: String,
        message: String,
        isPresented: Binding<Bool>,
        confirmLabel: String,
        cancelLabel: String,
        variant: OmenConfirmationVariant = .default,
        onConfirm: @escaping () -> Void
    ) -> some View {
        confirmationDialog(
            title,
            isPresented: isPresented,
            titleVisibility: .visible
        ) {
            switch variant {
            case .default:
                Button(confirmLabel, action: onConfirm)
            case .destructive:
                Button(confirmLabel, role: .destructive, action: onConfirm)
            }
            Button(cancelLabel, role: .cancel) {}
        } message: {
            Text(message)
        }
    }
}
