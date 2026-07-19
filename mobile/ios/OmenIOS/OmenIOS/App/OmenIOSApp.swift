import SwiftUI

@main
struct OmenIOSApp: App {
    @StateObject private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            AppShellView()
                .environmentObject(session)
                .environment(\.omenEnvironment, .fromBundle)
        }
    }
}
