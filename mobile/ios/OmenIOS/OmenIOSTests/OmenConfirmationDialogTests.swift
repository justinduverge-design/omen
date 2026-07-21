import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenConfirmationDialogTest.kt`'s enum-contract assertions. XCTest can't
/// cheaply drive `.confirmationDialog` presentation without a snapshot library, so these
/// tests pin the two contract guarantees that don't need a renderer:
///   1. the two variants are distinct values (default vs destructive);
///   2. attaching the modifier does not crash and returns a view of the modified type.
final class OmenConfirmationDialogTests: XCTestCase {
    func testVariantsAreDistinct() {
        XCTAssertNotEqual(OmenConfirmationVariant.default, OmenConfirmationVariant.destructive)
    }

    func testModifierCompilesAndAttachesForDefault() {
        var confirmed = false
        let isPresented = Binding(get: { true }, set: { _ in })
        let host = Text("host").omenConfirmationDialog(
            title: "Leave draft?",
            message: "Your picks will be lost.",
            isPresented: isPresented,
            confirmLabel: "Leave",
            cancelLabel: "Stay",
            variant: .default,
            onConfirm: { confirmed = true }
        )
        // If the modifier crashed at construction the test would fail here; a view constant
        // is enough to verify the API surface without a renderer.
        XCTAssertFalse(confirmed) // onConfirm never ran without user tap
        _ = host
    }

    func testModifierCompilesAndAttachesForDestructive() {
        let isPresented = Binding(get: { true }, set: { _ in })
        let host = Text("host").omenConfirmationDialog(
            title: "Delete lineup?",
            message: "This cannot be undone.",
            isPresented: isPresented,
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            variant: .destructive,
            onConfirm: {}
        )
        _ = host
    }
}
