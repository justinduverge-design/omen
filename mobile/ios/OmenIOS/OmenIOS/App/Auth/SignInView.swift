import SwiftUI

/// Sign-in surface for both the cold-start ("Get started") path and the `.needsReauth` path.
/// Two mechanisms only, per M0a §4 / M0c §2.1: Sign in with Apple (native, no browser) and
/// email OTP (not a magic link, to avoid mobile deep-link fragility).
struct SignInView: View {
    @ObservedObject var viewModel: AuthViewModel
    var reauthPrompt = false
    var onBack: (() -> Void)?
    var onSignOut: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                if let onBack {
                    OmenButton(title: "Back", action: onBack, variant: .link, size: .sm)
                }

                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text(reauthPrompt ? "Sign in again" : "Sign in to Omen")
                        .omenTextStyle(OmenTypography.h1)
                        .foregroundStyle(OmenColor.textPrimary)
                    if reauthPrompt {
                        Text("Your session expired. Sign in again to keep going.")
                            .omenTextStyle(OmenTypography.body)
                            .foregroundStyle(OmenColor.textSecondary)
                    }
                }

                if viewModel.appleSignInAvailable {
                    OmenButton(
                        title: "Continue with Apple",
                        action: { viewModel.signInWithApple() },
                        variant: .primary,
                        tone: .accent,
                        size: .lg,
                        enabled: !isBusy,
                        loading: isAppleBusy
                    )

                    HStack(spacing: OmenSpacing.step12) {
                        Rectangle().fill(OmenColor.border).frame(height: 1)
                        Text("or").omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textTertiary)
                        Rectangle().fill(OmenColor.border).frame(height: 1)
                    }
                }

                OmenFormField(label: "Email", errorMessage: emailErrorMessage) {
                    OmenTextField(
                        value: $viewModel.emailField,
                        label: "Email",
                        placeholder: "you@example.com",
                        variant: .email,
                        enabled: !isBusy && !awaitingOtp
                    )
                }

                if awaitingOtp || isOtpBusy {
                    OmenFormField(label: "6-digit code", hint: "Sent to \(viewModel.emailField)") {
                        OmenTextField(
                            value: $viewModel.otpField,
                            label: "6-digit code",
                            placeholder: "123456",
                            variant: .number,
                            enabled: !isOtpBusy
                        )
                    }
                    OmenButton(
                        title: "Verify code",
                        action: { viewModel.submitOtp() },
                        variant: .primary,
                        size: .lg,
                        enabled: !isOtpBusy,
                        loading: isOtpBusy
                    )
                } else {
                    OmenButton(
                        title: "Continue with email",
                        action: { viewModel.submitEmail() },
                        variant: .secondary,
                        size: .lg,
                        enabled: !isBusy,
                        loading: isEmailBusy
                    )
                }

                if let failureMessage {
                    Text(failureMessage)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.Data.riskHigh)
                        .accessibilityLabel("Error: \(failureMessage)")
                }

                if reauthPrompt, let onSignOut {
                    OmenButton(title: "Sign out and start over", action: onSignOut, variant: .link, size: .sm)
                }
            }
            .padding(OmenSpacing.step24)
        }
        .background(OmenColor.bg)
    }

    private var isBusy: Bool {
        switch viewModel.flowState {
        case .requestingOtp, .verifyingOtp, .launchingApple, .exchangingAppleToken:
            return true
        default:
            return false
        }
    }

    private var isAppleBusy: Bool {
        switch viewModel.flowState {
        case .launchingApple, .exchangingAppleToken:
            return true
        default:
            return false
        }
    }

    private var isEmailBusy: Bool {
        if case .requestingOtp = viewModel.flowState { return true }
        return false
    }

    private var isOtpBusy: Bool {
        if case .verifyingOtp = viewModel.flowState { return true }
        return false
    }

    private var awaitingOtp: Bool {
        if case .awaitingOtp = viewModel.flowState { return true }
        return false
    }

    private var failureMessage: String? {
        guard case .failed(let reason) = viewModel.flowState else { return nil }
        return reason.userMessage
    }

    private var emailErrorMessage: String? {
        guard case .failed(let reason) = viewModel.flowState, reason == .invalidEmail else { return nil }
        return reason.userMessage
    }
}
