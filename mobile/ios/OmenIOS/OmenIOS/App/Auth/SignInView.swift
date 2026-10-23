import SwiftUI


enum AuthSignInCopy {
    static let oauthBrowserDisclosure = "Google and Discord open a secure Omen sign-in page. We only receive the sign-in result."
    /// `SignIn.dc.html`'s subline. The shipped screen had the tagline and not this; the artboard
    /// has both, and this is the line that says what the product actually does for you.
    static let promise = "Connect ESPN, Yahoo or Sleeper. Omen reads every roster and tells you what to do, and why."
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

    @State private var emailEntryVisible = false

    var body: some View {
        signIn
    }

    private var signIn: some View {
        GeometryReader { proxy in
            ScrollView(showsIndicators: false) {
                Group {
                    if showCodeScreen { emailCodeScreen } else { welcome }
                }
                .padding(.horizontal, OmenSpacing.step24)
                .frame(maxWidth: .infinity, minHeight: proxy.size.height, alignment: .top)
            }
            .background(OmenColor.bg.ignoresSafeArea())
        }
        .onAppear { if !providersAvailable { emailEntryVisible = true } }
        .onChange(of: viewModel.flowState) { _, state in
            if case .awaitingOtp = state { emailEntryVisible = true }
        }
        .omenScreenReady(showCodeScreen ? "email-code" : "welcome")
    }

    private var providersAvailable: Bool {
        viewModel.appleSignInAvailable || viewModel.googleSignInAvailable || viewModel.discordSignInAvailable
    }

    /// Frame Welcome: the promise, a sample of the weekly move, then sign-in.
    private var welcome: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let onBack {
                OmenBackButton(title: "Back", action: onBack).padding(.top, OmenSpacing.step8)
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                Text("OMEN").omenTextStyle(OmenTypography.cardLead).tracking(4.8).foregroundStyle(OmenColor.accentHover)
                    .accessibilityLabel("Omen")
                Text(reauthPrompt ? "Sign in again." : "The best move in your league. Every week.")
                    .omenTextStyle(OmenTypography.h1).foregroundStyle(OmenColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                Text(reauthPrompt ? "Your session expired. Sign in again to keep going." : AuthSignInCopy.promise)
                    .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, onBack == nil ? OmenSpacing.step48 : OmenSpacing.step16)

            if !reauthPrompt {
                // A labelled sample, never shown as anyone's real call.
                OmenAnswerSurface(padding: OmenSpacing.step16) {
                    VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                        HStack {
                            Text("THIS WEEK\u{2019}S MOVE").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                            Spacer()
                            Text("Sample").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        }
                        Text("Start Jakobi Meyers in your flex.").omenTextStyle(OmenTypography.h3).foregroundStyle(OmenColor.textPrimary)
                        Text("The Giants put their best corner on Smith and leave the slot to a rookie.")
                            .omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                        HStack(spacing: OmenSpacing.step16) {
                            Text("+3.1 pts").omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.accentHover)
                            Text("Omen 13.4 \u{00B7} ESPN 10.6").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        }
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Sample move: Start Jakobi Meyers in your flex. Plus 3.1 points.")
                .padding(.top, OmenSpacing.step24)
            }

            Spacer(minLength: OmenSpacing.step32)

            VStack(spacing: OmenSpacing.step10) {
                if viewModel.appleSignInAvailable {
                    OmenAuthPrimaryButton(title: "Continue with Apple", icon: Image("AuthApple"), action: { viewModel.signInWithApple() },
                                          enabled: !isBusy, loading: isAppleBusy, tintsIcon: true)
                }
                if viewModel.googleSignInAvailable || viewModel.discordSignInAvailable {
                    HStack(spacing: OmenSpacing.step10) {
                        if viewModel.googleSignInAvailable {
                            OmenAuthPrimaryButton(title: "Google", icon: Image("AuthGoogle"), action: { viewModel.signInWithOAuth(providerId: "google") },
                                                  enabled: !isBusy, loading: isGoogleBusy, variant: .secondary)
                                .accessibilityLabel("Continue with Google")
                        }
                        if viewModel.discordSignInAvailable {
                            OmenAuthPrimaryButton(title: "Discord", icon: Image("AuthDiscord"), action: { viewModel.signInWithOAuth(providerId: "discord") },
                                                  enabled: !isBusy, loading: isDiscordBusy, variant: .secondary)
                                .accessibilityLabel("Continue with Discord")
                        }
                    }
                }
                if !providersAvailable {
                    Text("Apple, Google and Discord sign-in aren\u{2019}t set up in this build. Use email.")
                        .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if emailEntryVisible {
                    emailEntry
                } else {
                    OmenButton(title: "Use email", action: { emailEntryVisible = true }, variant: .secondary, size: .lg, enabled: !isBusy, fullWidth: true)
                }
                if let failureMessage {
                    Text(failureMessage)
                        .omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.Data.riskMedium)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityLabel("Error: \(failureMessage)")
                }
                if demoModeEnabled, !reauthPrompt, let onTryDemo {
                    OmenBarTextButton(title: "Look around with a sample league", action: onTryDemo).disabled(isBusy)
                }
                if reauthPrompt, let onSignOut {
                    OmenBarTextButton(title: "Sign out and start over", tone: OmenColor.textSecondary, action: onSignOut)
                }
                if viewModel.googleSignInAvailable || viewModel.discordSignInAvailable {
                    Text(AuthSignInCopy.oauthBrowserDisclosure)
                        .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                }
                Text("By continuing you confirm you\u{2019}re 13 or older and agree to the Terms and Privacy Notice.")
                    .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                    .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            }
            .padding(.bottom, OmenSpacing.step24)
        }
    }

    private var emailEntry: some View {
        VStack(spacing: OmenSpacing.step10) {
            OmenFormField(label: "Email", errorMessage: emailErrorMessage) {
                OmenTextField(value: $viewModel.emailField, label: "Email", placeholder: "you@example.com", variant: .email, enabled: !isBusy)
            }
            OmenButton(title: "Email me a code", action: { viewModel.submitEmail() }, variant: .primary, size: .lg,
                       enabled: !isBusy, loading: isEmailBusy, fullWidth: true)
        }
    }

    /// Frame EmailCode: the code fills in from Mail and submits itself at six digits.
    private var emailCodeScreen: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step16) {
            OmenBackButton(title: "Back", action: resetEmailStep).disabled(isOtpBusy).padding(.top, OmenSpacing.step8)
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                Text("Check your email").omenTextStyle(OmenTypography.h1).foregroundStyle(OmenColor.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                Text("We sent a 6-digit code to \(Self.masked(viewModel.emailField)).")
                    .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, OmenSpacing.step24)
            codeEntry
                .onChange(of: viewModel.otpField) { _, code in
                    if OtpCodeValidator.isValid(code), !isOtpBusy { viewModel.submitOtp() }
                }
            Text(isOtpBusy ? "Checking the code\u{2026}" : "The code fills in from Mail on its own.")
                .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
            if let failureMessage {
                Text(failureMessage).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.Data.riskMedium)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityLabel("Error: \(failureMessage)")
            }
            codeDeliveryHelp
            Spacer(minLength: 0)
            OmenBarTextButton(title: "Use a different email", tone: OmenColor.textSecondary, action: resetEmailStep)
                .disabled(isOtpBusy)
                .frame(maxWidth: .infinity)
                .padding(.bottom, OmenSpacing.step24)
        }
    }

    /// "j•••@icloud.com": enough to recognise the address on a shared screen.
    static func masked(_ email: String) -> String {
        let parts = email.split(separator: "@", maxSplits: 1)
        guard parts.count == 2, let first = parts[0].first else { return email }
        return "\(first)\u{2022}\u{2022}\u{2022}@\(parts[1])"
    }

    private var codeEntry: some View {
        OmenOtpCodeField(code: $viewModel.otpField, enabled: !isOtpBusy)
    }

    /// What to do when the code does not turn up.
    @ViewBuilder
    private var codeDeliveryHelp: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            let wait = viewModel.otpResendSecondsRemaining
            OmenBarTextButton(
                title: wait > 0 ? String(format: "Resend in %d:%02d", wait / 60, wait % 60) : "Resend the code",
                tone: wait == 0 && !isOtpBusy ? OmenColor.accentHover : OmenColor.textTertiary,
                action: { viewModel.resendOtp() }
            )
            .disabled(wait > 0 || isOtpBusy)
            if viewModel.otpResent {
                Text("Sent again.").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
            }
            if let resendError = viewModel.otpResendError {
                Text(resendError).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.Data.riskMedium)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
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
