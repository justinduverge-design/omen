import XCTest

/// R7 — no shipped native copy may promise a draft feature.
///
/// Draft is cut from 1.0 and the entire draft path is dark (facts-of-record #9;
/// founder decision 2026-08-16). `M6-ContextualHelp` already banned the exact
/// string "Draft Assistant" from *help* copy, and that ban held — which is
/// exactly why the two claims this suite exists for survived it:
///
///   1. The League placeholder promised "seasonal Draft entry" — a forward
///      promise of a cut feature, which reads to a user as "coming soon", the
///      phrasing `CLAUDE.md` prohibits. It also leaked an internal sprint
///      identifier ("the M4-League-Screen slice") into user-facing copy.
///   2. The off-season Waiver Watch state said Omen "will surface relevant
///      draft and roster opportunities". With the draft path dark, 1.0 surfaces
///      no draft opportunities at all — a capability claim Omen cannot meet.
///
/// Neither string contained "Draft Assistant", so a product-name ban could not
/// have found either. This suite bans the *word* inside user-facing string
/// literals, which is the level the claim actually lives at.
///
/// Why a source scanner rather than value assertions: this copy is written as
/// plain literals inside SwiftUI view bodies, with no enumerable title/message
/// accessor to read. Adding production API purely so a test could observe it
/// would be a worse trade than scanning. This mirrors `PrimitiveEnforcementTests`,
/// which already establishes source scanning as the pattern in this target.
final class DraftClaimAbsenceTests: XCTestCase {

    /// Files whose "draft" usage is not a fantasy-draft claim. Every entry MUST
    /// say why, so the list cannot quietly become a place to hide violations.
    /// Empty today.
    ///
    /// Note on scope: this scans `OmenIOS/App/` only, matching
    /// `PrimitiveEnforcementTests`. `DesignSystem/DesignSystemGalleryView.swift`
    /// contains "Leave draft?" — a discard-unsaved-work confirmation, a
    /// different sense of the word in a dev-only gallery — and sits outside this
    /// root, so it needs no allowlist entry. If the root ever widens to include
    /// `DesignSystem/`, that file will need one.
    private static let allowlistedRelativePaths: Set<String> = []

    func testNoShippedStringLiteralPromisesADraftFeature() throws {
        let root = try repoAppSourcesRoot()
        // Double-quoted literals only. Comments and symbol names are not copy —
        // the removal sites deliberately carry `P1-DraftAssistantSideline`
        // comments naming what was taken out, and those must not fail this.
        let literal = try NSRegularExpression(pattern: #""([^"\\]|\\.)*""#)

        var violations: [String] = []
        let enumerator = FileManager.default.enumerator(atPath: root.path)
        while let relative = enumerator?.nextObject() as? String {
            guard relative.hasSuffix(".swift") else { continue }
            let normalized = relative.replacingOccurrences(of: "\\", with: "/")
            if Self.allowlistedRelativePaths.contains(normalized) { continue }

            let file = root.appendingPathComponent(relative)
            let text = (try? String(contentsOf: file, encoding: .utf8)) ?? ""
            let stripped = Self.strippingComments(from: text)
            let range = NSRange(stripped.startIndex..., in: stripped)

            for match in literal.matches(in: stripped, range: range) {
                guard let r = Range(match.range, in: stripped) else { continue }
                let value = String(stripped[r])
                guard value.lowercased().contains("draft") else { continue }
                violations.append("\(normalized): 1.0 ships no draft surface, so no copy may name one — \(value)")
            }
        }

        if !violations.isEmpty {
            XCTFail("Draft claims found in shipped native copy:\n" + violations.joined(separator: "\n"))
        }
    }

    /// Found while fixing the Draft claim: both "landing next" placeholders told
    /// the user their feature would arrive "in the M4-League-Screen slice" /
    /// "the M4-Trade-Screen slice". A sprint identifier is not a date, a version,
    /// or anything a user can act on — it is internal planning vocabulary that
    /// escaped into the product. The Draft scanner above cannot catch this
    /// (no "draft" in the Trade string), so it gets its own rule.
    func testNoShippedCopyLeaksAnInternalSprintIdentifier() throws {
        let root = try repoAppSourcesRoot()
        let literal = try NSRegularExpression(pattern: #""([^"\\]|\\.)*""#)
        // Sprint keys look like M4-Something-Screen / M6-ContextualHelp. Matching
        // the shape rather than a list means a newly-minted key cannot slip past.
        let sprintKey = try NSRegularExpression(pattern: #"\b[A-Z]\d+[A-Za-z]*-[A-Za-z0-9]+"#)

        var violations: [String] = []
        let enumerator = FileManager.default.enumerator(atPath: root.path)
        while let relative = enumerator?.nextObject() as? String {
            guard relative.hasSuffix(".swift") else { continue }
            let file = root.appendingPathComponent(relative)
            let text = (try? String(contentsOf: file, encoding: .utf8)) ?? ""
            let stripped = Self.strippingComments(from: text)
            let range = NSRange(stripped.startIndex..., in: stripped)

            for match in literal.matches(in: stripped, range: range) {
                guard let r = Range(match.range, in: stripped) else { continue }
                let value = String(stripped[r])
                let vRange = NSRange(value.startIndex..., in: value)
                guard sprintKey.firstMatch(in: value, range: vRange) != nil else { continue }
                violations.append("\(relative): user-facing copy must not name an internal sprint item — \(value)")
            }
        }

        if !violations.isEmpty {
            XCTFail("Internal sprint identifiers found in shipped copy:\n" + violations.joined(separator: "\n"))
        }
    }

    /// R7: the app-shell contract once defined the League destination as carrying a
    /// "seasonal Draft entry". Draft is cut from 1.0 and the whole draft path is dark, so
    /// **this screen must not offer one**.
    ///
    /// This used to pin the League *placeholder* sentence by value. The placeholder is gone —
    /// `M5` slice F replaced it with the real screen — so pinning that string would now assert
    /// only that the screen had not shipped. The invariant R7 actually cares about is asserted
    /// against the real screen instead, where it can still fail for a real reason.
    func testLeagueDestinationOffersNoDraftEntry() throws {
        let root = try repoAppSourcesRoot()

        for relative in ["Auth/CommandCenterView.swift", "CommandCenter/OmenLeagueScreen.swift"] {
            let text = try String(
                contentsOf: root.appendingPathComponent(relative),
                encoding: .utf8
            )
            let body = Self.strippingComments(from: text).lowercased()
            XCTAssertFalse(
                body.contains("draft"),
                "\(relative): the League destination must not offer a Draft entry — Draft is cut from 1.0."
            )
        }
    }

    /// The real screen has to actually be mounted. Without this, deleting the screen and
    /// leaving a blank tab would pass every other assertion in this file.
    func testLeagueDestinationRendersTheRealScreen() throws {
        let root = try repoAppSourcesRoot()
        let text = try String(
            contentsOf: root.appendingPathComponent("Auth/CommandCenterView.swift"),
            encoding: .utf8
        )
        let body = Self.strippingComments(from: text)

        XCTAssertTrue(body.contains("OmenLeagueScreen("), "the League tab must render the real screen")
        XCTAssertFalse(
            body.contains("League is landing next"),
            "the League placeholder must not survive alongside the real screen"
        )
    }

    // MARK: - Helpers

    private static func strippingComments(from source: String) -> String {
        var text = source
        if let block = try? NSRegularExpression(pattern: #"/\*[\s\S]*?\*/"#) {
            text = block.stringByReplacingMatches(
                in: text, range: NSRange(text.startIndex..., in: text), withTemplate: ""
            )
        }
        if let line = try? NSRegularExpression(pattern: #"(?m)^\s*//.*$"#) {
            text = line.stringByReplacingMatches(
                in: text, range: NSRange(text.startIndex..., in: text), withTemplate: ""
            )
        }
        return text
    }

    private func repoAppSourcesRoot() throws -> URL {
        let thisFile = URL(fileURLWithPath: #file)
        // .../OmenIOS/OmenIOSTests/DraftClaimAbsenceTests.swift -> .../OmenIOS/OmenIOS/App
        let root = thisFile
            .deletingLastPathComponent() // OmenIOSTests/
            .deletingLastPathComponent() // OmenIOS/
            .appendingPathComponent("OmenIOS")
            .appendingPathComponent("App")
        guard FileManager.default.fileExists(atPath: root.path) else {
            throw NSError(
                domain: "DraftClaimAbsenceTests",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "OmenIOS/App source root not found at \(root.path)"]
            )
        }
        return root
    }
}
