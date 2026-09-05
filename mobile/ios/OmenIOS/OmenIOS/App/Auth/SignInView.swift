import SwiftUI


enum AuthSignInCopy {
    static let oauthBrowserDisclosure = "Google and Discord open a secure Omen sign-in page. We only receive the sign-in result."
}

/// First-run sign-in and re-auth surface. The cold-start path is provider first; email OTP
/// remains the recovery path and moves to its own six-digit screen after the email is submitted.
struct SignInView: View {
    @ObservedObject var viewModel: AuthViewModel
    var reauthPrompt = false
    var demoModeEnabled = false
    var onTryDemo: (() -> Void)?
    var onBack: (() -> Void)?
    var onSignOut: (() -> Void)?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var emailEntryVisible = false
    @State private var lockupPresented = false

    var body: some View {
        GeometryReader { proxy in
            ScrollView {
                Group {
                    if showCodeScreen {
                        emailCodeScreen
                    } else {
                        signInScreen
                    }
                }
                .padding(.horizontal, OmenSpacing.step24)
                .frame(maxWidth: .infinity, minHeight: proxy.size.height, alignment: .top)
            }
            .background(OmenColor.bg.ignoresSafeArea())
        }
        .onAppear {
            lockupPresented = true
            if !viewModel.appleSignInAvailable {
                emailEntryVisible = true
            }
        }
        .onChange(of: viewModel.flowState) { _, state in
            if case .awaitingOtp = state {
                emailEntryVisible = true
            }
        }
    }

    private var signInScreen: some View {
        VStack(alignment: .center, spacing: 0) {
            if let onBack {
                OmenIconButton(
                    contentDescription: "Back",
                    icon: Image("CanvasChevronLeft"),
                    action: onBack,
                    size: .sm
                )
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, OmenSpacing.step12)
            } else {
                Color.clear.frame(height: 34)
            }

            VStack(alignment: .center, spacing: 0) {
                Image("OmenLockupStacked")
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 300, maxHeight: 216)
                    .opacity(lockupPresented ? 1 : 0.88)
                    .offset(y: lockupPresented || reduceMotion ? 0 : 6)
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.45), value: lockupPresented)
                    .accessibilityLabel("Omen")

                if reauthPrompt {
                    Color.clear.frame(height: OmenSpacing.step16)
                    Text("Sign in again.")
                        .omenTextStyle(OmenTypography.h1)
                        .foregroundStyle(OmenColor.textPrimary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, OmenSpacing.step16)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Your session expired. Sign in again to keep going.")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

            if !reauthPrompt {
                Text("See the move before the league does.")
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, OmenSpacing.step16)
                    .fixedSize(horizontal: false, vertical: true)
                Color.clear.frame(height: OmenSpacing.step32)
            }

            VStack(alignment: .center, spacing: OmenSpacing.step12) {
                if viewModel.appleSignInAvailable {
                    OmenAuthPrimaryButton(
                        title: "Continue with Apple",
                        icon: Image("AuthApple"),
                        action: { viewModel.signInWithApple() },
                        enabled: !isBusy,
                        loading: isAppleBusy
                    )
                }

                HStack(spacing: OmenSpacing.step12) {
                    if viewModel.googleSignInAvailable {
                        OmenAuthIconTile(
                            contentDescription: "Continue with Google",
                            icon: Image("AuthGoogle"),
                            action: { viewModel.signInWithOAuth(providerId: "google") },
                            enabled: !isBusy,
                            loading: isGoogleBusy
                        )
                    }
                    if viewModel.discordSignInAvailable {
                        OmenAuthIconTile(
                            contentDescription: "Continue with Discord",
                            icon: Image("AuthDiscord"),
                            action: { viewModel.signInWithOAuth(providerId: "discord") },
                            enabled: !isBusy,
                            loading: isDiscordBusy
                        )
                    }
                    OmenAuthIconTile(
                        contentDescription: "Continue with email",
                        icon: Image("AuthEmail"),
                        action: { emailEntryVisible = true },
                        enabled: !isBusy
                    )
                }
                .accessibilityElement(children: .contain)

                if viewModel.googleSignInAvailable || viewModel.discordSignInAvailable {
                    Text(AuthSignInCopy.oauthBrowserDisclosure)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textTertiary)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, OmenSpacing.step16)
                }

                if emailEntryVisible {
                    emailEntry
                }

                if demoModeEnabled, !reauthPrompt, let onTryDemo {
                    OmenCanvasTextAction(
                        title: "Look around without an account →",
                        action: onTryDemo,
                        color: OmenColor.accent,
                        weight: .semibold,
                        height: 48,
                        enabled: !isBusy
                    )
                }
            }

            Color.clear.frame(height: 10)

            Text("By continuing you confirm you're 13 or older and agree to the Terms and Privacy Notice.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, OmenSpacing.step16)

            Color.clear.frame(height: OmenSpacing.step24)

            if let failureMessage {
                Text(failureMessage)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.Data.riskHigh)
                    .accessibilityLabel("Error: \(failureMessage)")
                    .fixedSize(horizontal: false, vertical: true)
            }

            if reauthPrompt, let onSignOut {
                OmenButton(
                    title: "Sign out and start over",
                    action: onSignOut,
                    variant: .link,
                    size: .sm
                )
            }

        }
    }

    private var emailEntry: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            OmenFormField(label: "Email", errorMessage: emailErrorMessage) {
                OmenTextField(
                    value: $viewModel.emailField,
                    label: "Email",
                    placeholder: "you@example.com",
                    variant: .email,
                    enabled: !isBusy
                )
            }
            OmenButton(
                title: "Email me a code",
                action: { viewModel.submitEmail() },
                variant: .secondary,
                size: .lg,
                enabled: !isBusy,
                loading: isEmailBusy
            )
            .frame(maxWidth: .infinity)
        }
        .padding(OmenSpacing.step16)
        .background(OmenColor.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(OmenColor.border, lineWidth: 1)
        )
    }

    private var emailCodeScreen: some View {
        VStack(alignment: .leading, spacing: 0) {
            Color.clear.frame(height: OmenSpacing.step12)
            OmenIconButton(
                contentDescription: "Use a different email",
                icon: Image("CanvasChevronLeft"),
                action: resetEmailStep,
                size: .sm,
                enabled: !isOtpBusy
            )
            .frame(height: 44)

            Color.clear.frame(height: 40)

            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                Text("Check your email.")
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)
                Text("We sent a six-digit code to \(viewModel.emailField). It's good for ten minutes.")
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Color.clear.frame(height: OmenSpacing.step32)

            codeEntry

            Color.clear.frame(height: OmenSpacing.step24)

            OmenAuthPrimaryButton(
                title: "Continue",
                action: { viewModel.submitOtp() },
                enabled: OtpCodeValidator.isValid(viewModel.otpField) && !isOtpBusy,
                loading: isOtpBusy
            )

            Color.clear.frame(height: OmenSpacing.step16)

            codeDeliveryHelp

            Spacer(minLength: 0)

            OmenCanvasTextAction(
                title: "Use a different email",
                action: resetEmailStep,
                color: OmenColor.textTertiary,
                weight: .medium,
                height: 44,
                enabled: !isOtpBusy
            )

            Color.clear.frame(height: OmenSpacing.step24)

            if let failureMessage {
                Text(failureMessage)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.Data.riskHigh)
                    .accessibilityLabel("Error: \(failureMessage)")
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var codeEntry: some View {
        OmenOtpCodeField(code: $viewModel.otpField, enabled: !isOtpBusy)
    }

    /// What to do when the code does not turn up.
    @ViewBuilder
    private var codeDeliveryHelp: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            OmenCanvasTextAction(
                title: viewModel.otpResendSecondsRemaining > 0
                    ? "Send it again in \(viewModel.otpResendSecondsRemaining)s"
                    : "Send it again",
                action: { viewModel.resendOtp() },
                color: viewModel.otpResendSecondsRemaining == 0 && !isOtpBusy
                    ? OmenColor.accent
                    : OmenColor.textTertiary,
                weight: .semibold,
                height: 44,
                enabled: viewModel.otpResendSecondsRemaining == 0 && !isOtpBusy
            )

            if viewModel.otpResent {
                Text("Sent again.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }
            if let resendError = viewModel.otpResendError {
                Text(resendError)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.Data.riskHigh)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func digit(at index: Int) -> String {
        let normalized = OtpCodeValidator.normalize(viewModel.otpField)
        guard index < normalized.count else { return "" }
        let stringIndex = normalized.index(normalized.startIndex, offsetBy: index)
        return String(normalized[stringIndex])
    }

    private func resetEmailStep() {
        viewModel.reset()
        viewModel.otpField = ""
        emailEntryVisible = true
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

    private var isAppleBusy: Bool {
        switch viewModel.flowState {
        case .launchingApple, .exchangingAppleToken:
            return true
        default:
            return false
        }
    }

    private var isGoogleBusy: Bool {
        switch viewModel.flowState {
        case .launchingOAuth(let providerId), .exchangingOAuthCode(let providerId):
            return providerId == "google"
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

    private var awaitingOtp: Bool {
        if case .awaitingOtp = viewModel.flowState { return true }
        return false
    }

    private var showCodeScreen: Bool {
        if awaitingOtp || isOtpBusy { return true }
        if case .failed(let reason) = viewModel.flowState, reason == .invalidCode, !viewModel.emailField.isEmpty {
            return true
        }
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
