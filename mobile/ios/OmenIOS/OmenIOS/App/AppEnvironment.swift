import Foundation
import SwiftUI

struct AppEnvironment: Equatable {
    let apiBaseURL: URL
    let demoModeEnabled: Bool

    static let fromBundle = AppEnvironment(
        apiBaseURL: URL(string: Bundle.main.object(forInfoDictionaryKey: "OMEN_API_BASE_URL") as? String ?? "https://example.invalid")!,
        demoModeEnabled: true
    )
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
