import Foundation

/// Mirrors Android `core/auth/AuthMechanism.kt`. iOS's native ID-token mechanism is Apple, not
/// Google (App Store 4.8: Sign in with Apple is required whenever any third-party/social login
/// is offered). `.googleIDToken` is kept only for contract parity with the Android enum and is
/// not implemented on iOS.
enum AuthMechanism {
    case appleIDToken
    case emailOTP
    case googleIDToken
}
