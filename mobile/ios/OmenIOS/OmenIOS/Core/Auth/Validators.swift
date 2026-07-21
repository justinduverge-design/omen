import Foundation

/// Mirrors Android `core/auth/Validators.kt`'s `EmailValidator`. Pure, no I/O.
enum EmailValidator {
    private static let pattern = #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#

    static func isValid(_ email: String) -> Bool {
        let normalized = normalize(email)
        guard normalized.count >= 3, normalized.count <= 254 else { return false }
        return normalized.range(of: pattern, options: .regularExpression) != nil
    }

    static func normalize(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}

/// Mirrors Android `core/auth/Validators.kt`'s `OtpCodeValidator`: exactly six digits.
enum OtpCodeValidator {
    static func isValid(_ code: String) -> Bool {
        code.count == 6 && code.allSatisfy(\.isNumber)
    }
}
