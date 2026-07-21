import Foundation

/// Mirrors Android `core/auth/AuthRepository.kt`. `SupabaseAuthRepository` is the production
/// implementation; `FakeAuthRepository` is the deterministic, network-free double used in tests
/// and SwiftUI previews.
protocol AuthRepository {
    func requestEmailOtp(email: String) async -> AuthOutcome
    func verifyEmailOtp(email: String, code: String) async -> AuthOutcome
    func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome
    func refresh() async -> AuthOutcome
    func signOut() async
}
