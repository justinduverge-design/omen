import XCTest

/// `M4-Help-Support-Implementation` — iOS accessibility evidence.
///
/// The item's `Done when:` asks for a VoiceOver check. The iOS Simulator cannot provide one:
/// `com.apple.VoiceOverTouch` is a `LimitLoadToSessionType = Background` launchd job there and
/// never acquires a PID, so no simulator run drives a real screen reader. The documented
/// substitute in this repo — established by `ContextualHelpAccessibilityUITests` — is Apple's
/// `performAccessibilityAudit()`, which walks the same accessibility tree VoiceOver would and
/// reports missing or malformed element descriptions, contrast failures, hit regions under the
/// minimum target, and text clipped at large Dynamic Type.
///
/// An audit is **not** a human VoiceOver pass. It can tell you an element has a well-formed
/// name; it cannot tell you the announcement is *useful*, or that the reading order makes sense
/// in context. A real-device VoiceOver pass stays open and is recorded as such in the handoff.
///
/// These drive the deterministic `help-support.*` screenshot scenarios: no session, no network,
/// no provider state, so nothing here can touch a real credential or league.
final class HelpSupportAccessibilityUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    /// Every audit category except `.dynamicType`, matching `ContextualHelpAccessibilityUITests`.
    ///
    /// That exclusion is a known app-wide *mechanism* finding, not a defect and not this item's:
    /// `OmenTypography` vends `Font(UIFontMetrics.scaledFont(for:))`, whose point size is already
    /// resolved, so the audit cannot recognise it as scalable and reports every Omen screen as
    /// unsupported. The behavior was checked directly instead — this screen was rendered at the
    /// default content size and at `accessibility-extra-extra-extra-large`, and the text scales
    /// and reflows with no clipping (captures in `References/evidence/2026-08-22-m4-help-support-native/`).
    /// See `Direction/known_issues.md`. Excluding the category here keeps contrast, element
    /// description, hit region, clipped text, and trait enforced for real.
    private static let auditedCategories: XCUIAccessibilityAuditType =
        XCUIAccessibilityAuditType.all.subtracting(.dynamicType)

    private func launch(_ scenario: String, dynamicType: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-OMEN_SCREENSHOT_SCENARIO", scenario]
        if let dynamicType {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", dynamicType]
        }
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "\(scenario) did not reach the foreground")
        return app
    }

    private func audit(_ scenario: String) throws {
        let app = launch(scenario)
        try app.performAccessibilityAudit(for: Self.auditedCategories)
    }

    // Every registered Help + Support state is audited, and each gets its **own test method**
    // rather than a loop over all five.
    //
    // The loop was written first and failed with `XCTFuture Code=1000 — Timed out while running
    // accessibility audit`: five launch/audit/terminate cycles in one method exceed the audit's
    // internal budget, and the timeout says nothing about which state was at fault. Split, each
    // audit gets a fresh app and its own budget, and a real failure names the state that has it.
    //
    // The states are audited individually rather than sampled because they differ in the surface
    // that renders at the top — a recovery panel, an offline surface, a feedback-unavailable
    // surface — and that is exactly where a contrast or description defect would hide.

    func testAvailableStatePassesTheAccessibilityAudit() throws {
        try audit("help-support.available")
    }

    func testNoAccountStatePassesTheAccessibilityAudit() throws {
        try audit("help-support.no-account")
    }

    func testOfflineStatePassesTheAccessibilityAudit() throws {
        try audit("help-support.offline")
    }

    func testSubmissionUnavailableStatePassesTheAccessibilityAudit() throws {
        try audit("help-support.submission-unavailable")
    }

    func testProviderRecoveryStatePassesTheAccessibilityAudit() throws {
        try audit("help-support.provider-recovery")
    }

    /// The largest accessibility text size, where `textClipped` is the category that earns its keep.
    func testHelpSupportPassesTheAuditAtTheLargestDynamicType() throws {
        let app = launch(
            "help-support.available",
            dynamicType: "UICTContentSizeCategoryAccessibilityExtraExtraExtraLarge"
        )
        try app.performAccessibilityAudit(for: Self.auditedCategories)
    }

    /// Both interactive rows expose the name VoiceOver would announce.
    ///
    /// Asserted separately from the audit because the audit only checks that *some* description
    /// exists. These are the two controls that do something, and the copy is a privacy promise —
    /// "without private league data" is the sentence that tells a user what support will not take.
    func testFeedbackControlsAreReachableAndNamed() {
        let app = launch("help-support.available")

        for name in ["Share feedback", "Report a problem"] {
            let row = app.descendants(matching: .any)[name]
            XCTAssertTrue(row.waitForExistence(timeout: 10), "\(name) is missing or unlabeled")
        }
    }
}
