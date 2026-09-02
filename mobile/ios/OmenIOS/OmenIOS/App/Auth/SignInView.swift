import SwiftUI

private let canvasTileSurface = Color(red: 20 / 255, green: 20 / 255, blue: 22 / 255)

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
                    CanvasAuthPrimaryButton(
                        title: "Continue with Apple",
                        icon: Image("AuthApple"),
                        action: { viewModel.signInWithApple() },
                        enabled: !isBusy,
                        loading: isAppleBusy
                    )
                }

                HStack(spacing: OmenSpacing.step12) {
                    if viewModel.googleSignInAvailable {
                        CanvasAuthIconTile(
                            contentDescription: "Continue with Google",
                            icon: Image("AuthGoogle"),
                            action: { viewModel.signInWithOAuth(providerId: "google") },
                            enabled: !isBusy,
                            loading: isGoogleBusy
                        )
                    }
                    if viewModel.discordSignInAvailable {
                        CanvasAuthIconTile(
                            contentDescription: "Continue with Discord",
                            icon: Image("AuthDiscord"),
                            action: { viewModel.signInWithOAuth(providerId: "discord") },
                            enabled: !isBusy,
                            loading: isDiscordBusy
                        )
                    }
                    CanvasAuthIconTile(
                        contentDescription: "Continue with email",
                        icon: Image("AuthEmail"),
                        action: { emailEntryVisible = true },
                        enabled: !isBusy
                    )
                }
                .accessibilityElement(children: .contain)

                if emailEntryVisible {
                    emailEntry
                }

                if demoModeEnabled, !reauthPrompt, let onTryDemo {
                    CanvasTextAction(
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

            CanvasAuthPrimaryButton(
                title: "Continue",
                action: { viewModel.submitOtp() },
                enabled: OtpCodeValidator.isValid(viewModel.otpField) && !isOtpBusy,
                loading: isOtpBusy
            )

            Color.clear.frame(height: OmenSpacing.step16)

            codeDeliveryHelp

            Spacer(minLength: 0)

            CanvasTextAction(
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
        ZStack {
            HStack(spacing: OmenSpacing.step8) {
                ForEach(0..<6, id: \.self) { index in
                    let digit = digit(at: index)
                    Text(digit)
                        .omenTextStyle(OmenTypography.h2)
                        .foregroundStyle(OmenColor.textPrimary)
                        .frame(maxWidth: .infinity, minHeight: 60)
                        .background(digit.isEmpty ? canvasTileSurface : OmenColor.accentMuted)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(digit.isEmpty ? OmenColor.border : OmenColor.accent, lineWidth: 1)
                        )
                }
            }
            .accessibilityHidden(true)

            TextField(
                "6-digit code",
                text: Binding(
                    get: { viewModel.otpField },
                    set: { viewModel.otpField = String(OtpCodeValidator.normalize($0).prefix(6)) }
                )
            )
            .keyboardType(.numberPad)
            .textContentType(.oneTimeCode)
            .foregroundStyle(.clear)
            .tint(.clear)
            .opacity(0.02)
            .frame(height: 60)
            .disabled(isOtpBusy)
            .accessibilityLabel("6-digit code")
        }
    }

    /// What to do when the code does not turn up.
    @ViewBuilder
    private var codeDeliveryHelp: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            CanvasTextAction(
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

private struct CanvasAuthPrimaryButton: View {
    let title: String
    var icon: Image? = nil
    let action: () -> Void
    var enabled = true
    var loading = false

    private var isInteractable: Bool { enabled && !loading }

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step8) {
                if loading {
                    ProgressView()
                        .tint(isInteractable ? OmenColor.textOnAccent : OmenColor.textTertiary)
                }
                if let icon, !loading {
                    icon
                        .renderingMode(.original)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 19, height: 19)
                        .accessibilityHidden(true)
                }
                Text(title)
                    .omenTextStyle(OmenTypography.h3)
                    .fontWeight(.semibold)
            }
            .foregroundStyle(isInteractable ? OmenColor.textOnAccent : OmenColor.textTertiary)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(isInteractable ? OmenColor.textPrimary : OmenColor.surface3)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .disabled(!isInteractable)
        .accessibilityLabel(loading ? "\(title), loading" : title)
    }
}

private struct CanvasAuthIconTile: View {
    let contentDescription: String
    let icon: Image
    let action: () -> Void
    var enabled = true
    var loading = false

    private var isInteractable: Bool { enabled && !loading }

    var body: some View {
        Button(action: action) {
            Group {
                if loading {
                    ProgressView().tint(isInteractable ? OmenColor.textPrimary : OmenColor.textTertiary)
                } else {
                    icon
                        .renderingMode(.original)
                        .resizable()
                        .scaledToFit()
                        .accessibilityHidden(true)
                }
            }
            .frame(width: 22, height: 22)
            .opacity(isInteractable ? 1 : 0.45)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(canvasTileSurface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(OmenColor.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(!isInteractable)
        .accessibilityLabel(contentDescription)
        .accessibilityValue(loading ? "Loading" : "")
    }
}

private struct CanvasTextAction: View {
    let title: String
    let action: () -> Void
    let color: Color
    let weight: Font.Weight
    let height: CGFloat
    var enabled = true

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: weight))
                .foregroundStyle(enabled ? color : OmenColor.textTertiary)
                .frame(maxWidth: .infinity, minHeight: height, alignment: .center)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}
