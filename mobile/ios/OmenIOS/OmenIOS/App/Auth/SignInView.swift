import SwiftUI

/// Sign-in surface for both the cold-start ("Get started") path and the `.needsReauth` path.
/// Native credential methods are passkey and Sign in with Apple; email OTP remains the recovery
/// path (not a magic link, to avoid mobile deep-link fragility). Provider OAuth renders only when
/// explicitly configured.
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

                if viewModel.passkeySignInAvailable {
                    OmenButton(
                        title: "Continue with a passkey",
                        action: { viewModel.signInWithPasskey() },
                        variant: .primary,
                        tone: .accent,
                        size: .lg,
                        enabled: !isBusy,
                        loading: isPasskeyBusy
                    )
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

                // M4-Auth-Providers-v1 §4 — first user of the provider-agnostic OAuth seam.
                // Only rendered when Supabase config is present; hidden entirely otherwise so
                // the auth surface stays clean on unconfigured / demo builds.
                if viewModel.discordSignInAvailable {
                    OmenButton(
                        title: "Continue with Discord",
                        action: { viewModel.signInWithOAuth(providerId: "discord") },
                        variant: .secondary,
                        size: .lg,
                        enabled: !isBusy,
                        loading: isDiscordBusy
                    )
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
                    codeDeliveryHelp
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
        case .requestingOtp, .verifyingOtp, .launchingApple, .exchangingAppleToken,
             .launchingOAuth, .exchangingOAuthCode, .launchingPasskey,
             .exchangingPasskeyAssertion:
            return true
        default:
            return false
        }
    }

    private var isPasskeyBusy: Bool {
        switch viewModel.flowState {
        case .launchingPasskey, .exchangingPasskeyAssertion:
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

    private var isDiscordBusy: Bool {
        switch viewModel.flowState {
        case .launchingOAuth(let providerId), .exchangingOAuthCode(let providerId):
            return providerId == "discord"
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

    /// What to do when the code does not turn up.
    ///
    /// This screen used to end at "Verify code". A request that Supabase accepts still has to
    /// survive the send, the receiving provider, and the user's spam filter, and when it did
    /// not there was nothing here to press and nothing to read — the tester simply stopped.
    @ViewBuilder
    private var codeDeliveryHelp: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text("It usually lands within a minute. If it hasn't, check your spam or junk folder — and on Yahoo or iCloud, look in Promotions too.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            OmenButton(
                title: viewModel.otpResendSecondsRemaining > 0
                    ? "Resend in \(viewModel.otpResendSecondsRemaining)s"
                    : "Send a new code",
                action: { viewModel.resendOtp() },
                variant: .secondary,
                size: .md,
                enabled: viewModel.otpResendSecondsRemaining == 0 && !isOtpBusy
            )

            if viewModel.otpResent {
                Text("Sent again. If the second one doesn't arrive either, the problem is on our side.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let resendError = viewModel.otpResendError {
                Text(resendError)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.Data.riskHigh)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
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
