import Foundation
import SwiftUI

/// Public, non-secret runtime configuration. Values come from Info.plist keys that are
/// substituted at build time from `Config/Base.xcconfig` (committed defaults) optionally
/// overridden by a git-ignored `Config/Local.xcconfig` — the iOS analog of Android's
/// `local.properties` → `BuildConfig` pattern. Never put a secret here: only a public API base
/// URL and a public Supabase URL/anon key belong in this struct.
struct AppEnvironment: Equatable {
    let apiBaseURL: URL
    let demoModeEnabled: Bool
    let supabaseURL: URL?
    let supabaseAnonKey: String?

    /// True only when both a Supabase URL and anon key are present, matching Android's
    /// `supabaseConfigured` flag. When false, the app falls back to `FakeAuthRepository` and
    /// `UnconfiguredAppleIDTokenProvider` rather than claiming a live auth path it can't back.
    var supabaseConfigured: Bool {
        supabaseURL != nil && !(supabaseAnonKey ?? "").isEmpty
    }

    static let fromBundle: AppEnvironment = {
        let info = Bundle.main.infoDictionary ?? [:]

        let apiBaseURLString = info["OMEN_API_BASE_URL"] as? String
        let apiBaseURL = apiBaseURLString.flatMap(URL.init(string:)) ?? URL(string: "https://example.invalid")!

        let supabaseURLString = (info["OMEN_SUPABASE_URL"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let supabaseURL = supabaseURLString.flatMap { $0.isEmpty ? nil : URL(string: $0) }

        let anonKey = (info["OMEN_SUPABASE_ANON_KEY"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
        let supabaseAnonKey = anonKey.flatMap { $0.isEmpty ? nil : $0 }

        return AppEnvironment(
            apiBaseURL: apiBaseURL,
            demoModeEnabled: true,
            supabaseURL: supabaseURL,
            supabaseAnonKey: supabaseAnonKey
        )
    }()
}

private struct OmenEnvironmentKey: EnvironmentKey {
    static let defaultValue = AppEnvironment.fromBundle
}

extension EnvironmentValues {
    var omenEnvironment: AppEnvironment {
        get { self[OmenEnvironmentKey.self] }
        set { self[OmenEnvironmentKey.self] = newValue }
    }
}
