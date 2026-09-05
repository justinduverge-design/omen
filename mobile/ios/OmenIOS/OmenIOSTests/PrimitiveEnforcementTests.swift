import XCTest

/// M1-P P4 enforcement: files under `OmenIOS/App/` must compose approved shared `Omen*`
/// primitives from `DesignSystem/`, not clone raw SwiftUI primitives or color literals.
///
/// Banned in feature/app-shell code:
///   - `Button(`, `TextField(`, `SecureField(`, `Alert(`, `TextEditor(`
///   - `Color(red:`, `Color(hue:`, `Color(hex:`, `Color(0x`, `Color("<asset>")`
///
/// The `DesignSystem/` module is out of scope because it *is* the primitive layer — its
/// files are allowed and expected to touch raw SwiftUI to implement Omen primitives.
///
/// Allowlist. `allowlistedRelativePaths` names files intentionally exempted; each entry MUST
/// document why and when it will be retired. Today the list is empty.
///
/// Why this is a scanner and not SwiftLint yet. The iOS target has no SwiftLint config;
/// adding one is a larger change. A source-scanning XCTest proves the rule today and is
/// deletable when SwiftLint rules land later.
final class PrimitiveEnforcementTests: XCTestCase {

    /// A hardcoded near-black tile surface in `ConnectView`/`SignInView` shipped to a real phone
    /// and rendered dark tiles with dark `textPrimary` text on a light background — the provider
    /// names on the Connect screen were invisible in light mode. Both now use
    /// `OmenColor.surface1`, which is trait-aware. This test already banned `Color(red:`; it was
    /// reporting only the first violation per file, so the color literal sat behind a `Button(`
    /// hit and was never surfaced.
    func testNoAppSourceHardcodesAColorLiteralInsteadOfATraitAwareToken() throws {
        let root = try repoAppSourcesRoot()
        let pattern = try NSRegularExpression(pattern: #"\bColor\(red:"#)

        var violations: [String] = []
        let enumerator = FileManager.default.enumerator(atPath: root.path)
        while let relative = enumerator?.nextObject() as? String {
            guard relative.hasSuffix(".swift") else { continue }
            let text = (try? String(contentsOf: root.appendingPathComponent(relative), encoding: .utf8)) ?? ""
            let range = NSRange(text.startIndex..., in: text)
            if pattern.firstMatch(in: text, range: range) != nil {
                violations.append("\(relative): hardcoded Color(red:) — use an OmenColor token so light mode works")
            }
        }

        XCTAssertEqual(violations, [], violations.joined(separator: "\n"))
    }

    func testAppSourcesUseOmenPrimitivesInsteadOfRawSwiftUIOrColorLiterals() throws {
        let root = try repoAppSourcesRoot()
        let bannedPrimitives = [
            #"\bButton\("#,
            #"\bTextField\("#,
            #"\bSecureField\("#,
            #"\bAlert\("#,
            #"\bTextEditor\("#,
        ]
        let bannedColors = [
            #"\bColor\(red:"#,
            #"\bColor\(hue:"#,
            #"\bColor\(hex:"#,
            #"\bColor\(0x"#,
            #"\bColor\("[^"]+"\)"#,
        ]
        let bannedPatterns = (bannedPrimitives + bannedColors).map {
            try! NSRegularExpression(pattern: $0)
        }

        var violations: [String] = []
        let enumerator = FileManager.default.enumerator(atPath: root.path)
        while let relative = enumerator?.nextObject() as? String {
            guard relative.hasSuffix(".swift") else { continue }
            if Self.allowlistedRelativePaths.contains(relative.replacingOccurrences(of: "\\", with: "/")) {
                continue
            }
            let file = root.appendingPathComponent(relative)
            let text = (try? String(contentsOf: file, encoding: .utf8)) ?? ""
            for pattern in bannedPatterns {
                let range = NSRange(text.startIndex..., in: text)
                if pattern.firstMatch(in: text, range: range) != nil {
                    violations.append("\(relative): raw usage of \(pattern.pattern) — use an Omen* primitive from DesignSystem/")
                    break
                }
            }
        }

        if !violations.isEmpty {
            XCTFail(
                """
                M1-P P4 primitive enforcement failed. Compose from DesignSystem/'s Omen* primitives.
                Allowlist a file only with a written reason + retirement plan in \
                PrimitiveEnforcementTests.allowlistedRelativePaths.

                \(violations.joined(separator: "\n"))
                """
            )
        }
    }

    // MARK: helpers

    /// Files exempted from this check. Each entry MUST document why and when it will be
    /// retired. Adding to this list is a design-steward decision, not a build fix.
    ///
    /// **Still empty, and there is now a precedent for keeping it that way.** This test was red
    /// from `5936142` until 2026-09-05 over six violations in `SignInView` and `ConnectView`.
    /// The obvious move was to allowlist both files. That was rejected: exempting a 541-line
    /// file for one line also blanket-exempts every violation added to it later, so the
    /// allowlist would have hidden more than it recorded.
    ///
    /// All six were primitives sitting in the wrong folder, and all six moved to
    /// `DesignSystem/` — including the invisible one-time-code capture field, which looked
    /// like the unavoidable exception and became `OmenOtpCodeField` instead. Two of them had
    /// already been copy-pasted between the two files and **drifted**, which is the concrete
    /// cost `private` primitives impose and the reason the move was worth more than the
    /// exemption.
    ///
    /// Before adding an entry here, check whether the offender is a primitive in a feature
    /// folder. It usually is.
    private static let allowlistedRelativePaths: Set<String> = []

    /// Locates `OmenIOS/OmenIOS/App` from this test file. Uses `#file` so this works from
    /// both Xcode and command-line `xcodebuild` runs.
    private func repoAppSourcesRoot() throws -> URL {
        let thisFile = URL(fileURLWithPath: #file)
        // .../OmenIOS/OmenIOSTests/PrimitiveEnforcementTests.swift -> .../OmenIOS/OmenIOS/App
        let iosProjectRoot = thisFile
            .deletingLastPathComponent() // OmenIOSTests/
            .deletingLastPathComponent() // OmenIOS/
        let root = iosProjectRoot
            .appendingPathComponent("OmenIOS")
            .appendingPathComponent("App")
        guard FileManager.default.fileExists(atPath: root.path) else {
            throw NSError(
                domain: "PrimitiveEnforcementTests",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "OmenIOS/App source root not found at \(root.path)"]
            )
        }
        return root
    }
}
