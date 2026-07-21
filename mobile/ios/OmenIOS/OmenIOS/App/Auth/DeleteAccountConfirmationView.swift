import SwiftUI

/// Phrase-gated in-app account deletion (M0c §2.3, App Store 5.1.1). Mirrors Android's
/// `AccountDeletion` phrase gate: the confirm button only enables on an exact match, and the
/// same exact-match check runs again server-side.
struct DeleteAccountConfirmationView: View {
    @ObservedObject var sessionManager: SessionManager
    @Environment(\.omenEnvironment) private var environment
    @Environment(\.dismiss) private var dismiss

    @State private var confirmationText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?

    var body: some View {
        OmenModalSheet(title: "Delete your Omen data") {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                Text("This permanently deletes your Omen account and data. This can't be undone.")
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)

                OmenFormField(
                    label: "Type \"\(AccountDeletion.requiredPhrase)\" to confirm",
                    errorMessage: errorMessage
                ) {
                    OmenTextField(value: $confirmationText, label: "Confirmation phrase", enabled: !isDeleting)
                }

                OmenButton(
                    title: "Delete my Omen data",
                    action: { Task { await delete() } },
                    variant: .danger,
                    size: .lg,
                    enabled: AccountDeletion.isConfirmed(confirmationText) && !isDeleting,
                    loading: isDeleting
                )

                OmenButton(title: "Cancel", action: { dismiss() }, variant: .link, size: .sm)
            }
        }
    }

    private func delete() async {
        guard let session = sessionManager.currentSession else {
            errorMessage = "Sign in again to delete your account."
            return
        }
        isDeleting = true
        errorMessage = nil

        let repository = URLSessionAccountRepository(apiBaseURL: environment.apiBaseURL)
        let outcome = await repository.deleteAccount(accessToken: session.accessToken, confirmation: confirmationText)
        isDeleting = false

        switch outcome {
        case .deleted:
            sessionManager.signOut()
            dismiss()
        case .invalidConfirmation:
            errorMessage = "Type the phrase exactly as shown."
        case .unauthorized:
            errorMessage = "Sign in again to delete your account."
        case .retryableError:
            errorMessage = "Couldn't delete right now. Try again."
        }
    }
}
